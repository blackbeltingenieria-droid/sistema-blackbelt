// ─── finance-giros service layer ──────────────────────────────────────────────
// Único punto de acceso a Supabase para este módulo.
// Los montos prorrateados se calculan aquí, nunca se guardan como columna.

import { supabase } from '../../../lib/supabase';
import type {
  DbTransaction,
  DbTransactionAllocation,
} from '../../../types/database';
import { TOOL_SCOPE } from '../../../types/database';
import type {
  AllocationInput,
  BusinessUnitComparison,
  BusinessUnitCostSummary,
  CostCategory,
  CreateToolPayload,
  CreateTransactionPayload,
  LaborCostByUnit,
  Tool,
  ToolHistoryRow,
  ToolSpendRank,
  TransactionRow,
} from '../types';
import {
  SEED_ALLOCATIONS,
  SEED_COST_CATEGORIES,
  SEED_TOOL_BUSINESS_UNITS,
  SEED_TOOLS,
  SEED_TRANSACTIONS,
} from './seed-data';
import { SEED_BUSINESS_UNITS } from '../../clients-projects/services/seed-data';

// ─── Helper: ¿Supabase configurado? ──────────────────────────────────────────
function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return Boolean(url && !url.includes('placeholder') && url.startsWith('https://'));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any;

// ─── Helper: calcular monto prorrateado ───────────────────────────────────────
// Principio de 03-modelo-de-datos.md: valores calculados NO se almacenan.
function calcAllocatedAmount(amount: number, pct: number): number {
  return Math.round((amount * pct) / 100 * 100) / 100;
}

// ─── Helper: derivar período actual vs. anterior basado en mes ───────────────
// Con el seed data (Sep/Oct 2024), "current" = Oct, "previous" = Sep.
// Con datos reales de Supabase, usa el mes más reciente vs. el anterior.
function splitByPeriod(txRows: TransactionRow[]): {
  current: TransactionRow[];
  previous: TransactionRow[];
} {
  if (txRows.length === 0) return { current: [], previous: [] };

  // Encontrar el mes más reciente
  const dates = txRows.map((r) => r.transactionDate).sort().reverse();
  const latestDate = dates[0];
  const [latestY, latestM] = latestDate.split('-').map(Number);

  // Período actual = mismo año/mes del más reciente
  // Período anterior = mes calendario anterior
  const prevM = latestM === 1 ? 12 : latestM - 1;
  const prevY = latestM === 1 ? latestY - 1 : latestY;

  const current  = txRows.filter((r) => {
    const [y, m] = r.transactionDate.split('-').map(Number);
    return y === latestY && m === latestM;
  });
  const previous = txRows.filter((r) => {
    const [y, m] = r.transactionDate.split('-').map(Number);
    return y === prevY && m === prevM;
  });

  return { current, previous };
}

function calcVariationPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10; // 1 decimal
}

// ─── getCostCategories ────────────────────────────────────────────────────────
export async function getCostCategories(): Promise<CostCategory[]> {
  if (!isSupabaseConfigured()) return SEED_COST_CATEGORIES;
  const { data, error } = await sb().from('cost_categories').select('*').order('id');
  if (error) throw new Error(`getCostCategories: ${error.message}`);
  return (data ?? []) as CostCategory[];
}

// ─── getTools ─────────────────────────────────────────────────────────────────
export async function getTools(): Promise<Tool[]> {
  if (!isSupabaseConfigured()) {
    const busUnitsMap = new Map(SEED_BUSINESS_UNITS.map((b) => [b.id, b.name]));
    return SEED_TOOLS.map((t) => ({
      ...t,
      sharedUnits: SEED_TOOL_BUSINESS_UNITS.filter((tbu) => tbu.tool_id === t.id),
      exclusiveUnitName:
        t.scope === TOOL_SCOPE.EXCLUSIVE && t.exclusive_business_unit_id
          ? busUnitsMap.get(t.exclusive_business_unit_id)
          : undefined,
    }));
  }

  const [toolsRes, tbuRes, busRes] = await Promise.all([
    sb().from('tools').select('*').order('name'),
    sb().from('tool_business_units').select('*'),
    sb().from('business_units').select('id, name'),
  ]);
  if (toolsRes.error) throw new Error(`getTools: ${toolsRes.error.message}`);

  const busMap = new Map<number, string>(
    ((busRes.data ?? []) as { id: number; name: string }[]).map((b) => [b.id, b.name]),
  );
  const tbuAll = (tbuRes.data ?? []) as { id: number; tool_id: number; business_unit_id: number; default_pct: number }[];

  return (toolsRes.data ?? []).map((t: ReturnType<typeof Object.assign>) => ({
    ...t,
    sharedUnits: tbuAll.filter((tbu) => tbu.tool_id === t.id),
    exclusiveUnitName:
      t.scope === TOOL_SCOPE.EXCLUSIVE && t.exclusive_business_unit_id
        ? busMap.get(t.exclusive_business_unit_id)
        : undefined,
  })) as Tool[];
}

// ─── createTool ───────────────────────────────────────────────────────────────
export async function createTool(payload: CreateToolPayload): Promise<number> {
  if (!isSupabaseConfigured()) {
    throw new Error('Conecta Supabase para crear registros reales.');
  }

  const { data, error } = await sb()
    .from('tools')
    .insert({
      name:                        payload.name,
      scope:                       payload.scope,
      exclusive_business_unit_id:  payload.exclusiveBusinessUnitId,
      monthly_reference_cost:      payload.monthlyReferenceCost,
      notes:                       payload.notes,
    })
    .select()
    .single();
  if (error) throw new Error(`createTool: ${error.message}`);

  const toolId = (data as { id: number }).id;

  if (payload.scope === TOOL_SCOPE.SHARED && payload.sharedUnits?.length) {
    const rows = payload.sharedUnits.map((u) => ({
      tool_id:          toolId,
      business_unit_id: u.businessUnitId,
      default_pct:      u.pct,
    }));
    const { error: tbuErr } = await sb().from('tool_business_units').insert(rows);
    if (tbuErr) throw new Error(`createTool/sharedUnits: ${tbuErr.message}`);
  }

  return toolId;
}

// ─── resolveAllocationsForTool ────────────────────────────────────────────────
export function resolveAllocationsForTool(
  tool: Tool,
  allBusinessUnitIds: number[],
): AllocationInput[] {
  switch (tool.scope) {
    case TOOL_SCOPE.GENERAL:
      return allBusinessUnitIds.map((id) => ({ businessUnitId: id, pct: 20 }));
    case TOOL_SCOPE.SHARED:
      return tool.sharedUnits.map((tbu) => ({
        businessUnitId: tbu.business_unit_id,
        pct:            tbu.default_pct,
      }));
    case TOOL_SCOPE.EXCLUSIVE:
      if (tool.exclusive_business_unit_id === null) return [];
      return [{ businessUnitId: tool.exclusive_business_unit_id, pct: 100 }];
    default:
      return [];
  }
}

// ─── createTransactionWithAllocations ────────────────────────────────────────
export async function createTransactionWithAllocations(
  payload: CreateTransactionPayload,
): Promise<number> {
  const totalPct = payload.allocations.reduce((s, a) => s + a.pct, 0);
  if (Math.abs(totalPct - 100) > 0.01) {
    throw new Error(`El reparto por giro debe sumar 100%. Actualmente suma ${totalPct.toFixed(1)}%.`);
  }
  if (payload.allocations.length === 0) {
    throw new Error('Debes asignar al menos un giro de negocio al gasto.');
  }

  if (!isSupabaseConfigured()) {
    const nextTxId = SEED_TRANSACTIONS.reduce((max, t) => Math.max(max, t.id), 0) + 1;
    const newTx: DbTransaction = {
      id: nextTxId,
      description: payload.description,
      amount: payload.amount,
      transaction_date: payload.transactionDate,
      payment_method: payload.paymentMethod,
      cost_category_id: payload.costCategoryId,
      tool_id: payload.toolId,
      project_id: payload.projectId,
      created_at: new Date().toISOString(),
      updated_at: null,
    };
    SEED_TRANSACTIONS.unshift(newTx);

    let nextAllocId = SEED_ALLOCATIONS.reduce((max, a) => Math.max(max, a.id), 0) + 1;
    for (const a of payload.allocations) {
      SEED_ALLOCATIONS.push({
        id: nextAllocId++,
        transaction_id: nextTxId,
        business_unit_id: a.businessUnitId,
        pct: a.pct,
      });
    }

    return nextTxId;
  }

  const { data: txData, error: txErr } = await sb()
    .from('transactions')
    .insert({
      description:      payload.description,
      amount:           payload.amount,
      transaction_date: payload.transactionDate,
      payment_method:   payload.paymentMethod,
      cost_category_id: payload.costCategoryId,
      tool_id:          payload.toolId,
      project_id:       payload.projectId,
    })
    .select()
    .single();
  if (txErr) throw new Error(`createTransaction: ${txErr.message}`);

  const txId = (txData as { id: number }).id;

  const allocationRows = payload.allocations.map((a) => ({
    transaction_id:   txId,
    business_unit_id: a.businessUnitId,
    pct:              a.pct,
  }));
  const { error: allocErr } = await sb().from('transaction_allocations').insert(allocationRows);
  if (allocErr) throw new Error(`createAllocations: ${allocErr.message}`);

  return txId;
}

// ─── updateTransactionWithAllocations ────────────────────────────────────────
// Actualiza el gasto y vuelve a calcular/guardar su reparto por giro.
// Validación igual que en creación: el reparto por giro debe seguir sumando 100%.
export async function updateTransactionWithAllocations(
  transactionId: number,
  payload: CreateTransactionPayload,
): Promise<void> {
  const totalPct = payload.allocations.reduce((s, a) => s + a.pct, 0);
  if (Math.abs(totalPct - 100) > 0.01) {
    throw new Error(`El reparto por giro debe sumar 100%. Actualmente suma ${totalPct.toFixed(1)}%.`);
  }
  if (payload.allocations.length === 0) {
    throw new Error('Debes asignar al menos un giro de negocio al gasto.');
  }

  const updatedAtIso = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    const tx = SEED_TRANSACTIONS.find((t) => t.id === transactionId);
    if (!tx) {
      throw new Error(`No se encontró el gasto con id ${transactionId}.`);
    }

    tx.description = payload.description;
    tx.amount = payload.amount;
    tx.transaction_date = payload.transactionDate;
    tx.payment_method = payload.paymentMethod;
    tx.cost_category_id = payload.costCategoryId;
    tx.tool_id = payload.toolId;
    tx.project_id = payload.projectId;
    tx.updated_at = updatedAtIso;

    // Eliminar las asignaciones anteriores
    for (let i = SEED_ALLOCATIONS.length - 1; i >= 0; i--) {
      if (SEED_ALLOCATIONS[i].transaction_id === transactionId) {
        SEED_ALLOCATIONS.splice(i, 1);
      }
    }

    // Insertar nuevas asignaciones
    let nextAllocId = SEED_ALLOCATIONS.reduce((max, a) => Math.max(max, a.id), 0) + 1;
    for (const a of payload.allocations) {
      SEED_ALLOCATIONS.push({
        id: nextAllocId++,
        transaction_id: transactionId,
        business_unit_id: a.businessUnitId,
        pct: a.pct,
      });
    }

    return;
  }

  // Actualizar tabla transactions en Supabase
  const { error: txErr } = await sb()
    .from('transactions')
    .update({
      description:      payload.description,
      amount:           payload.amount,
      transaction_date: payload.transactionDate,
      payment_method:   payload.paymentMethod,
      cost_category_id: payload.costCategoryId,
      tool_id:          payload.toolId,
      project_id:       payload.projectId,
      updated_at:       updatedAtIso,
    })
    .eq('id', transactionId);

  if (txErr) throw new Error(`updateTransaction: ${txErr.message}`);

  // Reemplazar transaction_allocations (borrar anteriores e insertar nuevas)
  const { error: delErr } = await sb()
    .from('transaction_allocations')
    .delete()
    .eq('transaction_id', transactionId);

  if (delErr) throw new Error(`deleteAllocations: ${delErr.message}`);

  const allocationRows = payload.allocations.map((a) => ({
    transaction_id:   transactionId,
    business_unit_id: a.businessUnitId,
    pct:              a.pct,
  }));
  const { error: allocErr } = await sb().from('transaction_allocations').insert(allocationRows);
  if (allocErr) throw new Error(`updateAllocations: ${allocErr.message}`);
}

// ─── getTransactionRows ───────────────────────────────────────────────────────
export async function getTransactionRows(filters?: {
  businessUnitId?: number;
  costCategoryId?: number;
}): Promise<TransactionRow[]> {
  if (!isSupabaseConfigured()) {
    return buildTransactionRows(
      SEED_TRANSACTIONS,
      SEED_ALLOCATIONS,
      SEED_COST_CATEGORIES,
      SEED_TOOLS,
      SEED_BUSINESS_UNITS,
      filters,
    );
  }

  const [txRes, allocRes, catRes, toolsRes, busRes] = await Promise.all([
    sb().from('transactions').select('*').order('transaction_date', { ascending: false }),
    sb().from('transaction_allocations').select('*'),
    sb().from('cost_categories').select('*'),
    sb().from('tools').select('id, name'),
    sb().from('business_units').select('id, name'),
  ]);
  if (txRes.error)    throw new Error(`getTransactionRows: ${txRes.error.message}`);
  if (allocRes.error) throw new Error(`getTransactionRows/alloc: ${allocRes.error.message}`);

  return buildTransactionRows(
    txRes.data ?? [],
    allocRes.data ?? [],
    catRes.data ?? [],
    toolsRes.data ?? [],
    busRes.data ?? [],
    filters,
  );
}

function buildTransactionRows(
  transactions: DbTransaction[],
  allocations: DbTransactionAllocation[],
  categories: CostCategory[],
  tools: { id: number; name: string }[],
  businessUnits: { id: number; name: string }[],
  filters?: { businessUnitId?: number; costCategoryId?: number },
): TransactionRow[] {
  const catMap   = new Map(categories.map((c) => [c.id, c]));
  const toolMap  = new Map(tools.map((t) => [t.id, t.name]));
  const busMap   = new Map(businessUnits.map((b) => [b.id, b.name]));
  const allocMap = new Map<number, DbTransactionAllocation[]>();

  for (const a of allocations) {
    if (!allocMap.has(a.transaction_id)) allocMap.set(a.transaction_id, []);
    allocMap.get(a.transaction_id)!.push(a);
  }

  let rows: TransactionRow[] = transactions.map((tx) => {
    const cat   = catMap.get(tx.cost_category_id);
    const alloc = (allocMap.get(tx.id) ?? []).map((a) => ({
      businessUnitId:   a.business_unit_id,
      businessUnitName: busMap.get(a.business_unit_id) ?? '—',
      pct:              a.pct,
      allocatedAmount:  calcAllocatedAmount(tx.amount, a.pct),
    }));

    return {
      id:                tx.id,
      description:       tx.description,
      amount:            tx.amount,
      transactionDate:   tx.transaction_date,
      paymentMethod:     tx.payment_method,
      costCategoryId:    tx.cost_category_id,
      costCategoryName:  cat?.name ?? '—',
      costCategoryCode:  cat?.code ?? 'MO',
      toolId:            tx.tool_id,
      toolName:          tx.tool_id ? (toolMap.get(tx.tool_id) ?? null) : null,
      projectId:         tx.project_id,
      allocations:       alloc,
      updatedAt:         tx.updated_at ?? null,
    };
  });

  if (filters?.businessUnitId) {
    const buId = filters.businessUnitId;
    rows = rows.filter((r) => r.allocations.some((a) => a.businessUnitId === buId));
  }
  if (filters?.costCategoryId) {
    rows = rows.filter((r) => r.costCategoryId === filters.costCategoryId);
  }

  return rows;
}

// ─── getToolHistory ───────────────────────────────────────────────────────────
export async function getToolHistory(toolId: number): Promise<ToolHistoryRow[]> {
  if (!isSupabaseConfigured()) {
    const txs = SEED_TRANSACTIONS.filter((t) => t.tool_id === toolId);
    return txs.map((tx) => {
      const alloc = SEED_ALLOCATIONS.filter((a) => a.transaction_id === tx.id).map((a) => ({
        businessUnitId:   a.business_unit_id,
        businessUnitName: SEED_BUSINESS_UNITS.find((b) => b.id === a.business_unit_id)?.name ?? '—',
        pct:              a.pct,
        allocatedAmount:  calcAllocatedAmount(tx.amount, a.pct),
      }));
      return {
        transactionId:   tx.id,
        description:     tx.description,
        amount:          tx.amount,
        transactionDate: tx.transaction_date,
        paymentMethod:   tx.payment_method,
        allocations:     alloc,
      };
    });
  }

  const [txRes, allocRes, busRes] = await Promise.all([
    sb().from('transactions').select('*').eq('tool_id', toolId).order('transaction_date', { ascending: false }),
    sb().from('transaction_allocations').select('*'),
    sb().from('business_units').select('id, name'),
  ]);
  if (txRes.error) throw new Error(`getToolHistory: ${txRes.error.message}`);

  const busMap = new Map<number, string>(
    ((busRes.data ?? []) as { id: number; name: string }[]).map((b) => [b.id, b.name]),
  );
  const txIds = new Set<number>((txRes.data ?? []).map((t: { id: number }) => t.id));
  const relevantAlloc = ((allocRes.data ?? []) as DbTransactionAllocation[]).filter((a) =>
    txIds.has(a.transaction_id),
  );
  const allocMap = new Map<number, DbTransactionAllocation[]>();
  for (const a of relevantAlloc) {
    if (!allocMap.has(a.transaction_id)) allocMap.set(a.transaction_id, []);
    allocMap.get(a.transaction_id)!.push(a);
  }

  return (txRes.data ?? []).map((tx: DbTransaction) => ({
    transactionId:   tx.id,
    description:     tx.description,
    amount:          tx.amount,
    transactionDate: tx.transaction_date,
    paymentMethod:   tx.payment_method,
    allocations:     (allocMap.get(tx.id) ?? []).map((a) => ({
      businessUnitId:   a.business_unit_id,
      businessUnitName: busMap.get(a.business_unit_id) ?? '—',
      pct:              a.pct,
      allocatedAmount:  calcAllocatedAmount(tx.amount, a.pct),
    })),
  }));
}

// ─── getCostTotalsByBusinessUnit ──────────────────────────────────────────────
// Totales prorrateados + KPIs desagregados (labor, tools, variación, herramientas).
// Todo calculado aquí — ningún valor almacenado en columna.
export async function getCostTotalsByBusinessUnit(): Promise<BusinessUnitCostSummary[]> {
  const [allTxRows, categories, businessUnits, tools] = await Promise.all([
    getTransactionRows(),
    getCostCategories(),
    isSupabaseConfigured()
      ? sb()
          .from('business_units')
          .select('id, code, name, color')
          .then((r: { data: { id: number; code?: string; name: string; color?: string }[] | null; error: Error | null }) => {
            if (r.error) throw new Error(r.error.message);
            return r.data ?? [];
          })
      : Promise.resolve(SEED_BUSINESS_UNITS as unknown as { id: number; code?: string; name: string; color?: string }[]),
    getTools(),
  ]);

  const { current: currentTxRows, previous: previousTxRows } = splitByPeriod(allTxRows);

  // IDs de categorías clave (Modelo C)
  const laborCatId  = categories.find((c) => c.code === 'MO' || (c.code as string) === 'mano_de_obra')?.id ?? 1;
  const toolsCatId  = categories.find((c) => c.code === 'SOFT' || c.code === 'MAQ' || (c.code as string) === 'maquinaria')?.id ?? 3;

  // Mapas de tools para nombre y scope
  const toolMap = new Map(tools.map((t) => [t.id, t]));

  // Acumuladores por (buId, catId)
  function buildAccum(txRows: TransactionRow[]) {
    const acc = new Map<string, number>();
    for (const tx of txRows) {
      for (const alloc of tx.allocations) {
        const key = `${alloc.businessUnitId}__${tx.costCategoryId}`;
        acc.set(key, (acc.get(key) ?? 0) + alloc.allocatedAmount);
      }
    }
    return acc;
  }

  const currentAccum  = buildAccum(currentTxRows);
  const previousAccum = buildAccum(previousTxRows);

  return (businessUnits as { id: number; code?: string; name: string; color?: string }[]).map((bu) => {
    // Totales por clasificación de gasto (período completo)
    const byCategory = categories
      .map((cat) => ({
        costCategoryId:   cat.id,
        costCategoryName: cat.name,
        costCategoryCode: cat.code,
        total:            (currentAccum.get(`${bu.id}__${cat.id}`) ?? 0)
                        + (previousAccum.get(`${bu.id}__${cat.id}`) ?? 0),
      }))
      .filter((c) => c.total > 0);

    const grandTotal = byCategory.reduce((s, c) => s + c.total, 0);

    // KPIs desagregados (período completo)
    const laborTotal = byCategory.find((c) => c.costCategoryId === laborCatId)?.total ?? 0;
    const toolsTotal = byCategory.find((c) => c.costCategoryId === toolsCatId)?.total ?? 0;

    // Variación: compara el total del período actual vs. anterior para este giro
    const currentTotal  = categories.reduce((s, cat) =>
      s + (currentAccum.get(`${bu.id}__${cat.id}`) ?? 0), 0);
    const previousTotal = categories.reduce((s, cat) =>
      s + (previousAccum.get(`${bu.id}__${cat.id}`) ?? 0), 0);
    const variationPct = calcVariationPct(currentTotal, previousTotal);

    // Herramientas que impactan este giro — con gasto prorrateado + tendencia
    // Agrupa las transacciones de tipo "herramienta" que tienen alloc en este giro
    const toolAccum = new Map<number, { amounts: number[] }>(); // toolId → montos prorrateados cronológicos
    const allTxSorted = [...allTxRows].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));

    for (const tx of allTxSorted) {
      if (!tx.toolId) continue;
      const alloc = tx.allocations.find((a) => a.businessUnitId === bu.id);
      if (!alloc) continue;
      if (!toolAccum.has(tx.toolId)) toolAccum.set(tx.toolId, { amounts: [] });
      toolAccum.get(tx.toolId)!.amounts.push(alloc.allocatedAmount);
    }

    const impactingTools = Array.from(toolAccum.entries()).map(([toolId, { amounts }]) => {
      const tool = toolMap.get(toolId);
      const totalAllocated = amounts.reduce((s, a) => s + a, 0);
      let trend: 'up' | 'down' | 'same' | null = null;
      if (amounts.length >= 2) {
        const last = amounts[amounts.length - 1];
        const prev = amounts[amounts.length - 2];
        trend = last > prev ? 'up' : last < prev ? 'down' : 'same';
      }
      return {
        toolId,
        toolName:      tool?.name ?? '—',
        scope:         tool?.scope ?? 'general',
        totalAllocated,
        trend,
      };
    });

    return {
      businessUnitId:   bu.id,
      businessUnitCode: bu.code,
      businessUnitColor: bu.color,
      businessUnitName: bu.name,
      grandTotal,
      byCategory,
      laborTotal,
      toolsTotal,
      variationPct,
      impactingTools,
    };
  });
}

// ─── getAllBusinessUnitsComparison ─────────────────────────────────────────────
// Ranking de los 5 giros por gasto total — período actual vs. anterior.
export async function getAllBusinessUnitsComparison(): Promise<BusinessUnitComparison[]> {
  const summaries = await getCostTotalsByBusinessUnit();

  const ranked = summaries
    .map((bu) => ({
      businessUnitId:      bu.businessUnitId,
      businessUnitCode:    bu.businessUnitCode,
      businessUnitColor:   bu.businessUnitColor,
      businessUnitName:    bu.businessUnitName,
      currentPeriodTotal:  bu.grandTotal,   // full total (simplificado para demo)
      previousPeriodTotal: 0,               // se calcula dentro de getCostTotalsByBusinessUnit
      variationPct:        bu.variationPct,
    }))
    .sort((a, b) => b.currentPeriodTotal - a.currentPeriodTotal)
    .map((bu, idx) => ({ ...bu, rank: idx + 1 }));

  return ranked;
}

// ─── getToolsRankingBySpend ────────────────────────────────────────────────────
// Herramientas ordenadas por gasto acumulado total + giros que impactan.
export async function getToolsRankingBySpend(): Promise<ToolSpendRank[]> {
  const [allTxRows, tools, businessUnits] = await Promise.all([
    getTransactionRows(),
    getTools(),
    isSupabaseConfigured()
      ? sb()
          .from('business_units')
          .select('id, name')
          .then((r: { data: { id: number; name: string }[] | null; error: Error | null }) => {
            if (r.error) throw new Error(r.error.message);
            return r.data ?? [];
          })
      : Promise.resolve(SEED_BUSINESS_UNITS as { id: number; name: string }[]),
  ]);

  const busMap  = new Map((businessUnits as { id: number; name: string }[]).map((b) => [b.id, b.name]));
  const toolMap = new Map(tools.map((t) => [t.id, t]));

  // Acumular gasto total por herramienta + giros impactados
  const accum = new Map<number, { totalSpend: number; buIds: Set<number>; count: number }>();

  for (const tx of allTxRows) {
    if (!tx.toolId) continue;
    if (!accum.has(tx.toolId)) accum.set(tx.toolId, { totalSpend: 0, buIds: new Set(), count: 0 });
    const entry = accum.get(tx.toolId)!;
    entry.totalSpend += tx.amount;
    entry.count      += 1;
    for (const alloc of tx.allocations) entry.buIds.add(alloc.businessUnitId);
  }

  return Array.from(accum.entries())
    .map(([toolId, { totalSpend, buIds, count }]) => {
      const tool = toolMap.get(toolId);
      return {
        toolId,
        toolName:          tool?.name ?? '—',
        scope:             tool?.scope ?? 'general',
        totalSpend,
        transactionCount:  count,
        impactedUnitNames: Array.from(buIds).map((id) => busMap.get(id) ?? '—'),
      };
    })
    .sort((a, b) => b.totalSpend - a.totalSpend);
}

// ─── getLaborCostByBusinessUnit ────────────────────────────────────────────────
// Mano de obra prorrateada por giro. pctOfTotalLabor calculado aquí.
export async function getLaborCostByBusinessUnit(): Promise<LaborCostByUnit[]> {
  const [summaries, businessUnits] = await Promise.all([
    getCostTotalsByBusinessUnit(),
    isSupabaseConfigured()
      ? sb()
          .from('business_units')
          .select('id, name')
          .then((r: { data: { id: number; name: string }[] | null; error: Error | null }) => {
            if (r.error) throw new Error(r.error.message);
            return r.data ?? [];
          })
      : Promise.resolve(SEED_BUSINESS_UNITS as { id: number; name: string }[]),
  ]);

  const summaryMap = new Map(summaries.map((s) => [s.businessUnitId, s]));
  const totalLabor = summaries.reduce((s, bu) => s + bu.laborTotal, 0);

  return (businessUnits as { id: number; name: string }[]).map((bu) => {
    const summary   = summaryMap.get(bu.id);
    const laborCost = summary?.laborTotal ?? 0;
    return {
      businessUnitId:   bu.id,
      businessUnitName: bu.name,
      laborCost,
      pctOfTotalLabor:  totalLabor > 0
        ? Math.round((laborCost / totalLabor) * 1000) / 10
        : 0,
    };
  });
}
