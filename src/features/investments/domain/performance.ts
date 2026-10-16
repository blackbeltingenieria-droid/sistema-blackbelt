// features/investments/domain/performance.ts
// Rendimiento de las inversiones, en palabras simples. Funciones puras.
//  - Patrimonio (aportes de socios): cuánto ganó la empresa con ese dinero (utilidad acumulada ÷ capital).
//  - Deuda (préstamos): cuánto falta devolver, cuánto se pagó de intereses y la cuota aproximada.
// La utilidad sale de los MISMOS movimientos que Resultados (solo VALIDADO + OK).

import { RECORD_TYPE, type DbInvestment } from '../../../types/database';
import { isEligible } from '../../movements/domain/movement-rules';
import type { EnrichedMovement } from '../../movements/types';

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const money = (n: number) => `S/ ${Math.abs(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const investmentNote = (code: string) => `Inversión ${code}`;
const linkedTo = (m: { notes: string | null }, code: string) => (m.notes ?? '').includes(investmentNote(code));

/** Meses completos entre dos fechas 'AAAA-MM-DD' (mínimo 1 si hay al menos un día). */
export function monthsBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  const months = (y2 - y1) * 12 + (m2 - m1) + (d2 >= d1 ? 0 : -1);
  return Math.max(to > from ? 1 : 0, months);
}

/** Cuota mensual fija (sistema francés). Sin tasa: capital ÷ plazo. */
export function monthlyInstallment(principal: number, annualRatePct: number, months: number): number {
  if (!(months > 0)) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return r2(principal / months);
  return r2((principal * r) / (1 - (1 + r) ** -months));
}

export interface InvestorSummary {
  name: string;
  doc: string | null;
  contributed: number;     // total aportado
  sharePct: number;        // % del capital de socios
  profitShare: number;     // utilidad que le corresponde según su %
  valueToday: number;      // aporte + su parte de la utilidad
  investments: DbInvestment[];
}

export interface DebtSummary {
  investment: DbInvestment;
  capitalPaid: number;
  interestPaid: number;
  outstanding: number;
  installment: number;     // cuota aproximada por mes (si hay plazo)
  yearlyInterest: number;  // interés al año sobre lo que falta devolver
  monthsElapsed: number;
  paymentIds: number[];
}

export interface InvestmentsReport {
  equityCapital: number;          // capital de socios (aportes − retiros)
  withdrawals: number;            // retiros de socios
  debtOutstanding: number;        // deuda que falta devolver
  accumulatedProfit: number;      // utilidad acumulada desde el inicio (ingresos − gastos)
  returnPct: number | null;       // utilidad ÷ capital de socios × 100
  perSol: number | null;          // utilidad por cada S/ 1 aportado
  monthsActive: number;
  investors: InvestorSummary[];
  debts: DebtSummary[];
  phrases: string[];              // 2–4 frases simples
}

export function buildInvestmentsReport(investments: DbInvestment[], movements: EnrichedMovement[], today: string): InvestmentsReport {
  const eligible = movements.filter((m) => isEligible(m) && m.movement_date <= today);
  const sum = (list: EnrichedMovement[]) => r2(list.reduce((a, m) => a + m.amount, 0));
  const accumulatedProfit = r2(
    sum(eligible.filter((m) => m.record_type === RECORD_TYPE.INGRESO_RECONOCIDO)) -
    sum(eligible.filter((m) => m.record_type === RECORD_TYPE.COSTO_RECONOCIDO)),
  );
  const withdrawals = sum(eligible.filter((m) => m.record_type === RECORD_TYPE.RETIRO_SOCIO));

  // Patrimonio por socio
  const equity = investments.filter((i) => i.kind === 'patrimonio' && i.investment_date <= today);
  const totalContributed = r2(equity.reduce((a, i) => a + i.amount, 0));
  const byInvestor = new Map<string, DbInvestment[]>();
  for (const i of equity) {
    const key = (i.investor_doc || i.investor_name).trim().toUpperCase();
    byInvestor.set(key, [...(byInvestor.get(key) ?? []), i]);
  }
  const investors: InvestorSummary[] = [...byInvestor.values()].map((list) => {
    const contributed = r2(list.reduce((a, i) => a + i.amount, 0));
    const share = totalContributed ? contributed / totalContributed : 0;
    const profitShare = r2(accumulatedProfit * share);
    return {
      name: list[0].investor_name, doc: list[0].investor_doc, contributed, sharePct: r2(share * 100),
      profitShare, valueToday: r2(contributed + profitShare), investments: list,
    };
  }).sort((a, b) => b.contributed - a.contributed);

  // Deuda
  const debts: DebtSummary[] = investments.filter((i) => i.kind === 'deuda' && i.investment_date <= today).map((inv) => {
    const linked = eligible.filter((m) => linkedTo(m, inv.code));
    const capitalPaid = sum(linked.filter((m) => m.record_type === RECORD_TYPE.PAGO_PRESTAMO));
    const interestPaid = sum(linked.filter((m) => m.record_type === RECORD_TYPE.COSTO_RECONOCIDO));
    const outstanding = r2(Math.max(0, inv.amount - capitalPaid));
    return {
      investment: inv, capitalPaid, interestPaid, outstanding,
      installment: inv.term_months ? monthlyInstallment(inv.amount, inv.interest_rate, inv.term_months) : 0,
      yearlyInterest: r2(outstanding * (inv.interest_rate / 100)),
      monthsElapsed: monthsBetween(inv.investment_date, today),
      paymentIds: linked.filter((m) => m.record_type !== RECORD_TYPE.PRESTAMO_RECIBIDO).map((m) => m.id),
    };
  });
  const debtOutstanding = r2(debts.reduce((a, d) => a + d.outstanding, 0));

  const equityCapital = r2(totalContributed - withdrawals);
  const returnPct = equityCapital > 0 ? r2((accumulatedProfit / equityCapital) * 100) : null;
  const perSol = equityCapital > 0 ? r2(accumulatedProfit / equityCapital) : null;
  const first = [...investments].map((i) => i.investment_date).sort()[0];
  const monthsActive = first ? monthsBetween(first, today) : 0;

  const phrases: string[] = [];
  if (equityCapital > 0) {
    phrases.push(`Los socios aportaron ${money(totalContributed)}${withdrawals ? ` y retiraron ${money(withdrawals)}` : ''}.`);
    phrases.push(accumulatedProfit >= 0
      ? `Con ese dinero la empresa lleva ganados ${money(accumulatedProfit)}: un rendimiento de ${returnPct} % (S/ ${perSol?.toFixed(2)} por cada sol aportado) en ${monthsActive} ${monthsActive === 1 ? 'mes' : 'meses'}.`
      : `Hasta hoy la empresa lleva perdidos ${money(accumulatedProfit)} sobre el capital aportado (${returnPct} %).`);
  }
  if (debts.length) {
    const interest = r2(debts.reduce((a, d) => a + d.interestPaid, 0));
    phrases.push(`Deuda: falta devolver ${money(debtOutstanding)}; se han pagado ${money(interest)} de intereses.`);
    const avgRate = debts.reduce((a, d) => a + d.investment.interest_rate, 0) / debts.length;
    if (returnPct !== null && monthsActive > 0) {
      const yearlyReturn = (returnPct / monthsActive) * 12;
      phrases.push(yearlyReturn > avgRate
        ? `La empresa rinde más (≈ ${yearlyReturn.toFixed(0)} % al año) que lo que cuesta la deuda (${avgRate.toFixed(1)} % al año): el préstamo conviene.`
        : `Ojo: la deuda cuesta ${avgRate.toFixed(1)} % al año y la empresa rinde ≈ ${yearlyReturn.toFixed(0)} % al año.`);
    }
  }
  if (!investments.length) phrases.push('Aún no hay inversiones registradas.');

  return { equityCapital, withdrawals, debtOutstanding, accumulatedProfit, returnPct, perSol, monthsActive, investors, debts, phrases };
}

/** Siguiente código INV-AAAA-NNN. */
export function nextInvestmentCode(existing: string[], date: string): string {
  const year = date.slice(0, 4);
  const max = existing.reduce((mx, c) => {
    const m = new RegExp(`^INV-${year}-(\\d+)$`).exec(c);
    return m ? Math.max(mx, Number(m[1])) : mx;
  }, 0);
  return `INV-${year}-${String(max + 1).padStart(3, '0')}`;
}
