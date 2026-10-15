// features/budgets-allocation/services/budget-service.ts
// Presupuestos (una fila por mes+unidad+área+categoría) y reparto mensual CORP → UN01–UN05.

import { isSupabaseConfigured, supabase } from '../../../lib/supabase';
import type { DbBudget, DbCorpAllocation } from '../../../types/database';
import { getBusinessUnits } from '../../catalogs/services/catalog-service';
import { COMMERCIAL_UNIT_CODES, type AllocationPcts, type CommercialUnitCode } from '../../results-cash/domain/calculations';
import { validateAllocationForm } from '../domain/allocation-validation';
import { isDuplicateBudget } from '../domain/budget-comparison';
import type { BudgetFormValues } from '../types';
import { SEED_ALLOCATION, SEED_BUDGETS } from './seed-data';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- patrón del proyecto
const sb = () => supabase as any;

const mem = {
  budgets: SEED_BUDGETS.map((b) => ({ ...b })),
  allocation: SEED_ALLOCATION.map((a) => ({ ...a })),
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// ─── Presupuestos ────────────────────────────────────────────────────────────
export async function getBudgets(month?: string): Promise<DbBudget[]> {
  if (!isSupabaseConfigured()) {
    return mem.budgets.filter((b) => !month || b.month === month).map((b) => ({ ...b }));
  }
  let q = sb().from('budgets').select('*').order('month').order('id');
  if (month) q = q.eq('month', month);
  const { data, error } = await q;
  if (error) throw new Error(`getBudgets: ${error.message}`);
  return ((data ?? []) as DbBudget[]).map((b) => ({ ...b, income_target: Number(b.income_target), cost_target: Number(b.cost_target) }));
}

function validateBudget(v: BudgetFormValues): void {
  if (!MONTH_RE.test(v.month)) throw new Error('El mes debe tener formato AAAA-MM.');
  if (!v.business_unit_id || !v.area_id || !v.cost_category_id) throw new Error('Unidad, área y categoría son obligatorias.');
  if (!(v.income_target >= 0) || !(v.cost_target >= 0)) throw new Error('Las metas no pueden ser negativas.');
}

export async function saveBudget(values: BudgetFormValues, id?: number): Promise<void> {
  validateBudget(values);
  const all = await getBudgets();
  if (isDuplicateBudget(values, all, id)) {
    throw new Error('Ya existe una meta para esa combinación de mes, unidad, área y categoría. Edítala en lugar de duplicarla.');
  }
  if (!isSupabaseConfigured()) {
    if (id) mem.budgets = mem.budgets.map((b) => (b.id === id ? { ...b, ...values } : b));
    else mem.budgets.push({ id: mem.budgets.reduce((m, b) => Math.max(m, b.id), 0) + 1, ...values });
    return;
  }
  const { error } = id
    ? await sb().from('budgets').update(values).eq('id', id)
    : await sb().from('budgets').insert(values);
  if (error) throw new Error(`saveBudget: ${error.message}`);
}

export async function deleteBudget(id: number): Promise<void> {
  if (!isSupabaseConfigured()) {
    mem.budgets = mem.budgets.filter((b) => b.id !== id);
    return;
  }
  const { error } = await sb().from('budgets').delete().eq('id', id);
  if (error) throw new Error(`deleteBudget: ${error.message}`);
}

// ─── Reparto mensual CORP ────────────────────────────────────────────────────
async function fetchAllocationRows(month?: string): Promise<DbCorpAllocation[]> {
  if (!isSupabaseConfigured()) return mem.allocation.filter((a) => !month || a.month === month).map((a) => ({ ...a }));
  let q = sb().from('corp_allocation').select('*');
  if (month) q = q.eq('month', month);
  const { data, error } = await q;
  if (error) throw new Error(`getAllocation: ${error.message}`);
  return ((data ?? []) as DbCorpAllocation[]).map((a) => ({ ...a, pct: Number(a.pct) }));
}

export interface MonthAllocation {
  pcts: AllocationPcts;
  note: string;
}

/** Reparto de un mes por código de unidad. Sin filas = vacío = SIN REPARTIR. */
export async function getAllocation(month: string): Promise<MonthAllocation> {
  const [rows, units] = await Promise.all([fetchAllocationRows(month), getBusinessUnits()]);
  const codeById = new Map(units.map((u) => [u.id, u.code]));
  const pcts: AllocationPcts = {};
  let note = '';
  for (const r of rows) {
    const code = codeById.get(r.business_unit_id) as CommercialUnitCode | undefined;
    if (code && (COMMERCIAL_UNIT_CODES as readonly string[]).includes(code)) pcts[code] = r.pct;
    if (r.note) note = r.note;
  }
  return { pcts, note };
}

/** Todos los repartos (para el listado mensual). */
export async function getAllocationsByMonth(): Promise<Record<string, MonthAllocation>> {
  const [rows, units] = await Promise.all([fetchAllocationRows(), getBusinessUnits()]);
  const codeById = new Map(units.map((u) => [u.id, u.code]));
  const out: Record<string, MonthAllocation> = {};
  for (const r of rows) {
    const code = codeById.get(r.business_unit_id) as CommercialUnitCode | undefined;
    if (!code || !(COMMERCIAL_UNIT_CODES as readonly string[]).includes(code)) continue;
    const cur = (out[r.month] ??= { pcts: {}, note: '' });
    cur.pcts[code] = r.pct;
    if (r.note) cur.note = r.note;
  }
  return out;
}

/** Guarda el reparto de un mes. Suma 100 % o se vacía (0 % = sin repartir). */
export async function saveAllocation(month: string, pcts: AllocationPcts, note: string): Promise<void> {
  if (!MONTH_RE.test(month)) throw new Error('El mes debe tener formato AAAA-MM.');
  const problem = validateAllocationForm(pcts, note);
  if (problem) throw new Error(problem);

  const units = await getBusinessUnits();
  const idByCode = new Map(units.map((u) => [u.code, u.id]));
  const rows = COMMERCIAL_UNIT_CODES
    .filter((c) => (pcts[c] ?? 0) > 0)
    .map((c) => ({ month, business_unit_id: idByCode.get(c) as number, pct: pcts[c] as number, note: note.trim() || null }));

  if (!isSupabaseConfigured()) {
    mem.allocation = mem.allocation.filter((a) => a.month !== month);
    rows.forEach((r, i) => mem.allocation.push({ id: Date.now() + i, ...r }));
    return;
  }
  const del = await sb().from('corp_allocation').delete().eq('month', month);
  if (del.error) throw new Error(`saveAllocation: ${del.error.message}`);
  if (rows.length) {
    const ins = await sb().from('corp_allocation').insert(rows);
    if (ins.error) throw new Error(`saveAllocation: ${ins.error.message}`);
  }
}
