// features/investments/services/investment-service.ts
// Inversiones: aportes de socios (patrimonio) y préstamos (deuda). Sin Supabase: memoria (datos del Excel).
// Registrar una inversión también registra el dinero que entra a caja (movimiento enlazado), así caja,
// resultados e inversiones cuadran siempre.

import { isSupabaseConfigured, supabase } from '../../../lib/supabase';
import { EXPENSE_CLASS, MOVEMENT_STATUS, RECORD_TYPE, type DbInvestment, type InvestmentKind } from '../../../types/database';
import { getAreas, getBusinessUnits, getCostCategories } from '../../catalogs/services/catalog-service';
import { demoData } from '../../demo/demo-data';
import { EXCEL_DB_INVESTMENTS } from '../../excel-data/excel-local';
import { buildCashPair } from '../../movements/domain/quick-entry';
import { createMovement, deleteMovement, getMovements, setMovementStatus } from '../../movements/services/movement-service';
import type { MovementFormValues } from '../../movements/types';
import { investmentNote, nextInvestmentCode } from '../domain/performance';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- patrón del proyecto
const sb = () => supabase as any;

const mem: { rows: DbInvestment[] } = { rows: demoData ? [] : EXCEL_DB_INVESTMENTS.map((i) => ({ ...i })) };

export interface InvestmentInput {
  kind: InvestmentKind;
  investorName: string;
  investorDoc: string | null;
  amount: number;
  date: string;
  paymentMethod: string | null;
  description: string | null;
  interestRate: number;        // % anual (deuda)
  termMonths: number | null;   // plazo (deuda)
}

export function validateInvestment(i: InvestmentInput): string | null {
  if (!i.investorName.trim()) return i.kind === 'deuda' ? 'Escribe quién presta el dinero.' : 'Escribe el nombre del socio.';
  if (!(i.amount > 0)) return 'Escribe un monto mayor que 0.';
  if (!i.date) return 'Pon la fecha.';
  if (i.kind === 'deuda' && i.interestRate < 0) return 'La tasa no puede ser negativa.';
  return null;
}

export async function getInvestments(): Promise<DbInvestment[]> {
  if (!isSupabaseConfigured()) return mem.rows.map((r) => ({ ...r }));
  const { data, error } = await sb().from('investments').select('*').order('investment_date').order('id');
  if (error) throw new Error(`No se pudieron leer las inversiones (¿aplicaste la migración 20261017000001?): ${error.message}`);
  return ((data ?? []) as DbInvestment[]).map((r) => ({ ...r, amount: Number(r.amount), interest_rate: Number(r.interest_rate) }));
}

async function catalogIds() {
  const [units, areas, cats] = await Promise.all([getBusinessUnits(), getAreas(), getCostCategories()]);
  const pick = <T extends { id: number; code: string }>(l: T[], c: string) => l.find((x) => x.code === c)?.id ?? 0;
  return { corp: pick(units, 'CORP'), fin: pick(areas, 'FIN'), soc: pick(cats, 'SOC'), otr: pick(cats, 'OTR'), ban: pick(cats, 'BAN'), cxp: pick(cats, 'CXP') };
}

const baseMovement = (ids: Awaited<ReturnType<typeof catalogIds>>, v: Partial<MovementFormValues>): MovementFormValues => ({
  movement_date: '', record_type: RECORD_TYPE.APORTE_SOCIO, amount: 0, business_unit_id: ids.corp, area_id: ids.fin,
  responsible: null, cost_category_id: ids.otr, expense_class: EXPENSE_CLASS.NO_APLICA, project_id: null,
  counterparty: null, detail: null, payment_method: null, voucher_number: null, status: MOVEMENT_STATUS.VALIDADO, notes: null, ...v,
});

/** Registra la inversión y el dinero que entra a caja (aporte de socio o préstamo recibido). */
export async function createInvestment(input: InvestmentInput): Promise<DbInvestment> {
  const problem = validateInvestment(input);
  if (problem) throw new Error(problem);
  const existing = await getInvestments();
  const row: Omit<DbInvestment, 'id'> = {
    code: nextInvestmentCode(existing.map((i) => i.code), input.date),
    kind: input.kind,
    investor_name: input.investorName.trim().toUpperCase(),
    investor_doc: input.investorDoc?.trim() || null,
    amount: input.amount,
    investment_date: input.date,
    payment_method: input.paymentMethod,
    description: input.description?.trim() || (input.kind === 'deuda' ? 'Préstamo recibido' : 'Aporte de socio'),
    interest_rate: input.kind === 'deuda' ? input.interestRate : 0,
    term_months: input.kind === 'deuda' ? input.termMonths : null,
  };
  let saved: DbInvestment;
  if (!isSupabaseConfigured()) {
    saved = { id: mem.rows.reduce((m, r) => Math.max(m, r.id), 0) + 1, ...row };
    mem.rows.push(saved);
  } else {
    const { data, error } = await sb().from('investments').insert(row).select('*').single();
    if (error) throw new Error(`createInvestment: ${error.message}`);
    saved = data as DbInvestment;
  }
  const ids = await catalogIds();
  await createMovement(baseMovement(ids, {
    movement_date: row.investment_date,
    record_type: row.kind === 'deuda' ? RECORD_TYPE.PRESTAMO_RECIBIDO : RECORD_TYPE.APORTE_SOCIO,
    amount: row.amount,
    cost_category_id: row.kind === 'deuda' ? ids.otr : ids.soc,
    counterparty: row.investor_name,
    detail: row.description,
    payment_method: row.payment_method,
    notes: investmentNote(row.code),
  }));
  return { ...saved };
}

/** Pago de un préstamo: el capital devuelto (sale de caja, no es gasto) y los intereses (sí son gasto). */
export async function registerLoanPayment(inv: DbInvestment, p: { date: string; capital: number; interest: number; paymentMethod: string | null }): Promise<void> {
  if (!(p.capital > 0) && !(p.interest > 0)) throw new Error('Escribe cuánto de capital o de intereses pagaste.');
  const ids = await catalogIds();
  const common = { movement_date: p.date, counterparty: inv.investor_name, payment_method: p.paymentMethod, notes: investmentNote(inv.code) };
  if (p.capital > 0) {
    await createMovement(baseMovement(ids, { ...common, record_type: RECORD_TYPE.PAGO_PRESTAMO, amount: p.capital, detail: `Devolución de préstamo ${inv.code}` }));
  }
  if (p.interest > 0) {
    const interest = await createMovement(baseMovement(ids, {
      ...common, record_type: RECORD_TYPE.COSTO_RECONOCIDO, amount: p.interest, cost_category_id: ids.ban,
      expense_class: EXPENSE_CLASS.COMPARTIDO, detail: `Intereses del préstamo ${inv.code}`,
    }));
    const areas = await getAreas();
    const cats = await getCostCategories();
    await createMovement(buildCashPair(interest, interest.movement_code, { areas, categories: cats }));
  }
}

/** Elimina la inversión y todos sus movimientos (entrada de dinero, pagos e intereses). */
export async function deleteInvestment(inv: DbInvestment): Promise<void> {
  const movs = await getMovements();
  const linked = movs.filter((m) => (m.notes ?? '').includes(investmentNote(inv.code)));
  const pairs = movs.filter((m) => linked.some((l) => m.notes === `Contrapartida de ${l.movement_code}`));
  for (const m of [...pairs, ...linked]) {
    await setMovementStatus(m.id, MOVEMENT_STATUS.BORRADOR);
    await deleteMovement(m.id);
  }
  if (!isSupabaseConfigured()) {
    mem.rows = mem.rows.filter((r) => r.id !== inv.id);
    return;
  }
  const { error } = await sb().from('investments').delete().eq('id', inv.id);
  if (error) throw new Error(`deleteInvestment: ${error.message}`);
}
