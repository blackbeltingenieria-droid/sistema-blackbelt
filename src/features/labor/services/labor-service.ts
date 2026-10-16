// features/labor/services/labor-service.ts
// Contratos de mano de obra. Sin Supabase: memoria con los datos del Excel (TABLA_M.O).
// Registrar un pago crea un EGRESO normal (Especialistas y personal) con su pago, enlazado al contrato,
// así Mano de obra, Ingresos y egresos, caja y resultados cuadran siempre.

import { isSupabaseConfigured, supabase } from '../../../lib/supabase';
import { addMonths } from '../../../lib/autofill';
import type { DbLaborContract, DbMovement, LaborContractType } from '../../../types/database';
import { getAreas, getBusinessUnits, getCostCategories } from '../../catalogs/services/catalog-service';
import { getProjectRows } from '../../clients-projects/services/project-service';
import { demoData } from '../../demo/demo-data';
import { EXCEL_DB_LABOR_CONTRACTS } from '../../excel-data/excel-local';
import { CORP_CODE } from '../../movements/domain/movement-rules';
import { pairNote } from '../../movements/domain/quick-entry';
import { createQuickMovement, deleteQuickEvent, getMovements, updateMovement } from '../../movements/services/movement-service';
import { laborCodeIn, nextLaborCode, withLaborTag } from '../domain/labor';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- patrón del proyecto
const sb = () => supabase as any;

const mem: { rows: DbLaborContract[] } = { rows: demoData ? [] : EXCEL_DB_LABOR_CONTRACTS.map((c) => ({ ...c })) };

export interface LaborContractInput {
  workerName: string;
  workerDoc: string | null;
  specialistId: number | null;
  businessUnitId: number;          // CORP = toda la empresa
  projectId: number | null;
  clientLabel: string | null;
  service: string;
  description: string | null;
  contractType: LaborContractType;
  startDate: string;
  endDate: string | null;
  agreedAmount: number;
}

export function validateLaborContract(i: LaborContractInput): string | null {
  if (!i.workerName.trim()) return 'Escribe el nombre del colaborador.';
  if (!i.service.trim()) return 'Escribe qué trabajo hará (servicio).';
  if (!(i.agreedAmount > 0)) return 'Escribe el monto acordado (mayor que 0).';
  if (!i.startDate) return 'Pon la fecha de contratación.';
  if (i.endDate && i.endDate < i.startDate) return 'La fecha de culminación no puede ser antes de la contratación.';
  if (!i.businessUnitId) return 'Elige para quién trabaja.';
  return null;
}

const toRow = (r: DbLaborContract): DbLaborContract => ({ ...r, agreed_amount: Number(r.agreed_amount) });

export async function getLaborContracts(): Promise<DbLaborContract[]> {
  if (!isSupabaseConfigured()) return mem.rows.map((r) => ({ ...r }));
  const { data, error } = await sb().from('labor_contracts').select('*').order('start_date').order('id');
  if (error) throw new Error(`No se pudo leer la mano de obra (¿aplicaste la migración 20261018000001?): ${error.message}`);
  return ((data ?? []) as DbLaborContract[]).map(toRow);
}

function fromInput(i: LaborContractInput): Omit<DbLaborContract, 'id' | 'code' | 'active' | 'notes' | 'area_id'> {
  return {
    specialist_id: i.specialistId,
    worker_name: i.workerName.trim().toUpperCase(),
    worker_doc: i.workerDoc?.trim() || null,
    business_unit_id: i.businessUnitId,
    project_id: i.projectId,
    client_label: i.clientLabel?.trim() || null,
    service: i.service.trim().toUpperCase(),
    description: i.description?.trim() || null,
    contract_type: i.contractType,
    start_date: i.startDate,
    end_date: i.endDate || null,
    agreed_amount: Math.round(i.agreedAmount * 100) / 100,
  };
}

export async function createLaborContract(input: LaborContractInput): Promise<DbLaborContract> {
  const problem = validateLaborContract(input);
  if (problem) throw new Error(problem);
  const existing = await getLaborContracts();
  const row: Omit<DbLaborContract, 'id'> = {
    ...fromInput(input), code: nextLaborCode(existing.map((c) => c.code), input.startDate), area_id: null, active: true, notes: null,
  };
  if (!isSupabaseConfigured()) {
    const saved = { id: mem.rows.reduce((m, r) => Math.max(m, r.id), 0) + 1, ...row };
    mem.rows.push(saved);
    return { ...saved };
  }
  const { data, error } = await sb().from('labor_contracts').insert(row).select('*').single();
  if (error) throw new Error(`createLaborContract: ${error.message}`);
  return toRow(data as DbLaborContract);
}

export async function updateLaborContract(id: number, input: LaborContractInput): Promise<void> {
  const problem = validateLaborContract(input);
  if (problem) throw new Error(problem);
  const values = fromInput(input);
  if (!isSupabaseConfigured()) {
    mem.rows = mem.rows.map((r) => (r.id === id ? { ...r, ...values } : r));
    return;
  }
  const { error } = await sb().from('labor_contracts').update(values).eq('id', id);
  if (error) throw new Error(`updateLaborContract: ${error.message}`);
}

/** Quita el contrato. Sus pagos siguen siendo egresos reales (no se borran): solo se desenlazan. */
export async function deleteLaborContract(c: DbLaborContract): Promise<void> {
  const linked = (await getMovements()).filter((m) => laborCodeIn(m.notes) === c.code);
  for (const m of linked) {
    await updateMovement(m.id, {
      movement_date: m.movement_date, record_type: m.record_type, amount: m.amount, business_unit_id: m.business_unit_id,
      area_id: m.area_id, responsible: m.responsible, cost_category_id: m.cost_category_id, expense_class: m.expense_class,
      project_id: m.project_id, counterparty: m.counterparty, detail: m.detail, payment_method: m.payment_method,
      voucher_number: m.voucher_number, status: m.status, notes: withLaborTag(m.notes, null),
    });
  }
  if (!isSupabaseConfigured()) {
    mem.rows = mem.rows.filter((r) => r.id !== c.id);
    return;
  }
  const { error } = await sb().from('labor_contracts').delete().eq('id', c.id);
  if (error) throw new Error(`deleteLaborContract: ${error.message}`);
}

export interface LaborPaymentInput { date: string; amount: number; paymentMethod: string | null; settled: boolean }

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase());

/** Registra un pago al colaborador: egreso de "Especialistas y personal" (+ su pago) enlazado al contrato. */
export async function registerLaborPayment(c: DbLaborContract, p: LaborPaymentInput): Promise<DbMovement> {
  if (!(p.amount > 0)) throw new Error('Escribe cuánto le pagaste.');
  if (!p.date) throw new Error('Pon la fecha del pago.');
  const [units, areas, categories, projects] = await Promise.all([getBusinessUnits(), getAreas(), getCostCategories(), getProjectRows()]);
  const unit = units.find((u) => u.id === c.business_unit_id);
  return createQuickMovement({
    kind: 'EGRESO',
    date: p.date,
    amount: Math.round(p.amount * 100) / 100,
    concept: `Pago a ${titleCase(c.worker_name)} – ${titleCase(c.service)}`,
    settled: p.settled,
    paymentMethod: p.paymentMethod,
    counterparty: c.worker_name,
    unitId: unit && unit.code !== CORP_CODE ? unit.id : null,
    projectId: c.project_id,
    categoryId: categories.find((x) => x.code === 'MO')?.id ?? null,
    notes: withLaborTag(null, c.code),
  }, { units, areas, categories, projects });
}

/** Deshacer un pago a un colaborador (p. ej. si se registró por error): borra el egreso y su pago.
 *  El contrato vuelve a mostrar ese monto como "falta pagar" y la caja recupera el dinero. */
export async function undoLaborPayment(movementId: number): Promise<void> {
  const movs = await getMovements();
  const main = movs.find((m) => m.id === movementId);
  if (!main || !laborCodeIn(main.notes)) throw new Error('No se encontró ese pago.');
  const pair = movs.find((m) => m.notes === pairNote(main.movement_code)) ?? null;
  await deleteQuickEvent(main, pair);
}

/** Contrato mensual: crea el del mes siguiente con el mismo monto (fechas corridas un mes). */
export async function renewMonthly(c: DbLaborContract): Promise<DbLaborContract> {
  const start = c.end_date && c.end_date > c.start_date ? c.end_date : addMonths(c.start_date, 1);
  return createLaborContract({
    workerName: c.worker_name, workerDoc: c.worker_doc, specialistId: c.specialist_id, businessUnitId: c.business_unit_id,
    projectId: c.project_id, clientLabel: c.client_label, service: c.service, description: c.description,
    contractType: c.contract_type, startDate: start, endDate: addMonths(start, 1), agreedAmount: c.agreed_amount,
  });
}

/** Archivar sin borrar (deja de aparecer en la lista). */
export async function archiveLaborContract(c: DbLaborContract): Promise<void> {
  if (!isSupabaseConfigured()) {
    mem.rows = mem.rows.map((r) => (r.id === c.id ? { ...r, active: false } : r));
    return;
  }
  const { error } = await sb().from('labor_contracts').update({ active: false }).eq('id', c.id);
  if (error) throw new Error(`archiveLaborContract: ${error.message}`);
}

