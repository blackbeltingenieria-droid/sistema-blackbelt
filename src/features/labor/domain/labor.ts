// features/labor/domain/labor.ts
// Mano de obra (TABLA_M.O del Excel): cuánto se acordó pagar a cada colaborador, cuánto ya se le pagó,
// cuánto falta y hasta cuándo. Funciones puras.
// Lo PAGADO sale de los egresos enlazados al contrato (notes "Mano de obra CMO-…") que ya tienen su
// pago (solo VALIDADO + OK): los mismos registros de Ingresos y egresos, caja y resultados.

import { RECORD_TYPE, type DbLaborContract } from '../../../types/database';
import { isEligible } from '../../movements/domain/movement-rules';
import { pairedCode } from '../../movements/domain/quick-entry';
import type { EnrichedMovement } from '../../movements/types';

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const money = (n: number) => `S/ ${Math.abs(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const LABOR_PREFIX = 'Mano de obra ';
export const laborNote = (code: string) => `${LABOR_PREFIX}${code}`;
const TAG = /Mano de obra (CMO-\d{4}-\d{3,})/;

/** Código del contrato enlazado en las notas de un egreso, o null. */
export function laborCodeIn(notes: string | null | undefined): string | null {
  return TAG.exec(notes ?? '')?.[1] ?? null;
}

/** Pone (o quita, con null) el enlace a un contrato sin borrar el resto de las notas. */
export function withLaborTag(notes: string | null | undefined, code: string | null): string | null {
  const rest = (notes ?? '').replace(/\s*·?\s*Mano de obra CMO-\d{4}-\d{3,}/g, '').trim();
  if (!code) return rest || null;
  return rest ? `${rest} · ${laborNote(code)}` : laborNote(code);
}

/** Siguiente código CMO-AAAA-NNN para el año de la fecha. */
export function nextLaborCode(existing: string[], date: string): string {
  const year = date.slice(0, 4) || String(new Date().getFullYear());
  const prefix = `CMO-${year}-`;
  const max = existing.reduce((a, c) => (c.startsWith(prefix) ? Math.max(a, Number(c.slice(prefix.length)) || 0) : a), 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

/** Días entre dos fechas 'AAAA-MM-DD' (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export type LaborStatus = 'pagado' | 'vencido' | 'por_vencer' | 'pendiente';

export const LABOR_STATUS_TEXT: Record<LaborStatus, string> = {
  pagado: 'Pagado',
  vencido: 'Vencido',
  por_vencer: 'Vence pronto',
  pendiente: 'Pendiente',
};

export interface LaborPayment { id: number; code: string; date: string; amount: number; method: string | null }

export interface LaborRow {
  contract: DbLaborContract;
  paid: number;               // ya pagado (egreso enlazado + su pago)
  owedRegistered: number;     // egresos enlazados que aún no se pagan ("lo debo")
  pending: number;            // acordado − pagado
  paidPct: number;
  status: LaborStatus;
  daysLeft: number | null;    // días hasta la fecha de culminación (negativo = vencido)
  payments: LaborPayment[];   // pagos hechos, del más antiguo al más reciente
  unpaid: LaborPayment[];     // anotados como "aún lo debo" (sin pago todavía)
  lastPaymentDate: string | null;
  ids: number[];              // movimientos enlazados (trazabilidad)
}

export interface WorkerSummary { name: string; doc: string | null; agreed: number; paid: number; pending: number; contracts: number }

export interface LaborReport {
  rows: LaborRow[];
  totals: { agreed: number; paid: number; pending: number; overdue: number; workersOwed: number };
  workers: WorkerSummary[];
  phrases: string[];
}

const SOON_DAYS = 7;

export function buildLaborRow(c: DbLaborContract, movements: EnrichedMovement[], today: string): LaborRow {
  const linked = movements.filter((m) => isEligible(m) && m.record_type === RECORD_TYPE.COSTO_RECONOCIDO && laborCodeIn(m.notes) === c.code);
  const pairs = new Map<string, EnrichedMovement>();
  for (const m of movements) {
    const code = pairedCode(m.notes);
    if (code && isEligible(m) && m.record_type === RECORD_TYPE.PAGO) pairs.set(code, m);
  }
  const payments: LaborPayment[] = [];
  const unpaid: LaborPayment[] = [];
  let owed = 0;
  for (const m of linked) {
    const pay = pairs.get(m.movement_code);
    if (pay) payments.push({ id: m.id, code: m.movement_code, date: pay.movement_date, amount: m.amount, method: pay.payment_method ?? m.payment_method });
    else { owed += m.amount; unpaid.push({ id: m.id, code: m.movement_code, date: m.movement_date, amount: m.amount, method: null }); }
  }
  payments.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const paid = r2(payments.reduce((a, p) => a + p.amount, 0));
  const pending = r2(Math.max(0, c.agreed_amount - paid));
  const daysLeft = c.end_date ? daysBetween(today, c.end_date) : null;
  const status: LaborStatus = pending <= 0.005 ? 'pagado'
    : daysLeft !== null && daysLeft < 0 ? 'vencido'
      : daysLeft !== null && daysLeft <= SOON_DAYS ? 'por_vencer' : 'pendiente';
  return {
    contract: c, paid, owedRegistered: r2(owed), pending,
    paidPct: c.agreed_amount ? Math.min(100, r2((paid / c.agreed_amount) * 100)) : 0,
    status, daysLeft, payments, unpaid, lastPaymentDate: payments.at(-1)?.date ?? null,
    ids: [...linked.map((m) => m.id), ...linked.flatMap((m) => { const p = pairs.get(m.movement_code); return p ? [p.id] : []; })],
  };
}

const ORDER: Record<LaborStatus, number> = { vencido: 0, por_vencer: 1, pendiente: 2, pagado: 3 };

/** Todos los contratos (activos) con lo pagado y lo que falta; lo más urgente primero. */
export function buildLaborReport(contracts: DbLaborContract[], movements: EnrichedMovement[], today: string): LaborReport {
  const rows = contracts.filter((c) => c.active).map((c) => buildLaborRow(c, movements, today))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.contract.end_date ?? '9').localeCompare(b.contract.end_date ?? '9') || a.contract.id - b.contract.id);
  const sum = (f: (r: LaborRow) => number) => r2(rows.reduce((a, r) => a + f(r), 0));
  const byWorker = new Map<string, WorkerSummary>();
  for (const r of rows) {
    const key = r.contract.worker_name.toUpperCase();
    const w = byWorker.get(key) ?? { name: r.contract.worker_name, doc: r.contract.worker_doc, agreed: 0, paid: 0, pending: 0, contracts: 0 };
    w.agreed = r2(w.agreed + r.contract.agreed_amount); w.paid = r2(w.paid + r.paid); w.pending = r2(w.pending + r.pending); w.contracts += 1;
    byWorker.set(key, w);
  }
  const workers = [...byWorker.values()].sort((a, b) => b.pending - a.pending || a.name.localeCompare(b.name));
  const totals = {
    agreed: sum((r) => r.contract.agreed_amount),
    paid: sum((r) => r.paid),
    pending: sum((r) => r.pending),
    overdue: sum((r) => (r.status === 'vencido' ? r.pending : 0)),
    workersOwed: workers.filter((w) => w.pending > 0).length,
  };
  const phrases: string[] = [];
  if (rows.length) {
    phrases.push(totals.pending > 0
      ? `Falta pagar ${money(totals.pending)} a ${totals.workersOwed} colaborador${totals.workersOwed === 1 ? '' : 'es'} (de ${money(totals.agreed)} acordados).`
      : `Todo pagado: ${money(totals.paid)} a ${workers.length} colaborador${workers.length === 1 ? '' : 'es'}.`);
    if (totals.overdue > 0) phrases.push(`${money(totals.overdue)} ya pasó su fecha de pago.`);
    const next = rows.find((r) => r.status === 'por_vencer' || r.status === 'pendiente');
    if (next && next.contract.end_date) {
      phrases.push(`Próximo pago: ${next.contract.worker_name} — ${money(next.pending)} hasta el ${next.contract.end_date.split('-').reverse().join('/')}.`);
    }
  }
  return { rows, totals, workers, phrases };
}
