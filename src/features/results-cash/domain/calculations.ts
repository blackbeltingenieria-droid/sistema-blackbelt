// features/results-cash/domain/calculations.ts
// Resultados y caja del Modelo C. Funciones PURAS: reciben movimientos enriquecidos y
// devuelven cifras calculadas (nunca se guardan). Réplica de las hojas 08, 09 y 10 del Excel.
// Cada cifra viene con `ids`: los movement_id que la componen (trazabilidad).

import { EXPENSE_CLASS, RECORD_TYPE } from '../../../types/database';
import { CORP_CODE, isEligible } from '../../movements/domain/movement-rules';
import type { EnrichedMovement } from '../../movements/types';

export const COMMERCIAL_UNIT_CODES = ['UN01', 'UN02', 'UN03', 'UN04', 'UN05'] as const;
export type CommercialUnitCode = (typeof COMMERCIAL_UNIT_CODES)[number];

/** Cifra con su rastro: suma y los movimientos que la componen. */
export interface TracedAmount {
  amount: number;
  ids: number[];
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

function sumTraced(movs: EnrichedMovement[]): TracedAmount {
  return { amount: round2(movs.reduce((a, m) => a + m.amount, 0)), ids: movs.map((m) => m.id) };
}

// ─── 08_REPARTO ──────────────────────────────────────────────────────────────
export const ALLOCATION_STATUS = {
  SIN_REPARTIR: 'SIN REPARTIR',
  PARCIAL:      'PARCIAL',
  COMPLETO:     'COMPLETO',
  REVISAR:      'REVISAR >100%',
} as const;

export type AllocationStatus = (typeof ALLOCATION_STATUS)[keyof typeof ALLOCATION_STATUS];

/** Porcentajes (0–100) por unidad comercial para un mes. Ausente = 0. */
export type AllocationPcts = Partial<Record<CommercialUnitCode, number>>;

export function sumAllocation(pcts: AllocationPcts): number {
  return COMMERCIAL_UNIT_CODES.reduce((a, c) => a + (pcts[c] ?? 0), 0);
}

/** Excel: SI(suma=0,"SIN REPARTIR", SI(suma>100,"REVISAR >100%", SI(|suma-100|<tol,"COMPLETO","PARCIAL"))). */
export function allocationStatus(pcts: AllocationPcts): AllocationStatus {
  const sum = sumAllocation(pcts);
  if (sum === 0) return ALLOCATION_STATUS.SIN_REPARTIR;
  if (sum > 100.0001) return ALLOCATION_STATUS.REVISAR;
  if (Math.abs(sum - 100) < 0.0001) return ALLOCATION_STATUS.COMPLETO;
  return ALLOCATION_STATUS.PARCIAL;
}

/** % efectivo de una unidad: si el total supera 100 no se reparte nada (como en 09_RESULTADOS!F). */
export function effectivePct(pcts: AllocationPcts, unit: CommercialUnitCode): number {
  return sumAllocation(pcts) > 100.0001 ? 0 : (pcts[unit] ?? 0);
}

/** Gasto CORP COMPARTIDO reconocido del mes (validado + OK). Base del reparto. */
export function corpSharedExpense(movements: EnrichedMovement[], mes: string): TracedAmount {
  return sumTraced(
    movements.filter(
      (m) =>
        isEligible(m) &&
        m.mes === mes &&
        m.unitCode === CORP_CODE &&
        m.record_type === RECORD_TYPE.COSTO_RECONOCIDO &&
        m.expense_class === EXPENSE_CLASS.COMPARTIDO,
    ),
  );
}

export interface AllocationSummary {
  status: AllocationStatus;
  sumPct: number;
  corpExpense: TracedAmount;
  unassigned: number; // "Sin asignar (S/)"
}

export function summarizeAllocation(movements: EnrichedMovement[], mes: string, pcts: AllocationPcts): AllocationSummary {
  const status = allocationStatus(pcts);
  const corpExpense = corpSharedExpense(movements, mes);
  const sumFraction = sumAllocation(pcts) / 100;
  const unassigned =
    status === ALLOCATION_STATUS.REVISAR ? corpExpense.amount : round2(corpExpense.amount * (1 - sumFraction));
  return { status, sumPct: sumAllocation(pcts), corpExpense, unassigned };
}

// ─── 09_RESULTADOS ───────────────────────────────────────────────────────────
export interface UnitResult {
  unit: CommercialUnitCode;
  income: TracedAmount;
  directCosts: TracedAmount;
  attributableExpenses: TracedAmount;
  contribution: number;       // ingresos − directos − atribuibles
  allocationPct: number;      // reparto % efectivo (0–100)
  allocatedCommonExpense: number;
  finalResult: number;        // contribución − reparto recibido
  marginPct: number;          // resultado final / ingresos (0 si no hay ingresos)
}

export interface Reconciliation {
  incomeMinusAllExpenses: number;   // ingresos − directos − atribuibles − gasto CORP compartido
  sumFinalPlusCorpUnassigned: number; // Σ resultado final + (−CORP sin repartir)
  difference: number;
  ok: boolean;
}

export interface ResultsReport {
  mes: string;
  units: UnitResult[];
  corpSharedExpense: TracedAmount;
  corpUnassigned: number;           // positivo = gasto CORP sin repartir
  totals: {
    income: number;
    directCosts: number;
    attributableExpenses: number;
    contribution: number;
    allocatedCommonExpense: number;
    finalResult: number;            // incluye CORP sin repartir
    marginPct: number;
  };
  reconciliation: Reconciliation;
}

export function computeResults(movements: EnrichedMovement[], mes: string, pcts: AllocationPcts): ResultsReport {
  const month = movements.filter((m) => isEligible(m) && m.mes === mes);
  const corp = corpSharedExpense(movements, mes);

  const units: UnitResult[] = COMMERCIAL_UNIT_CODES.map((unit) => {
    const own = month.filter((m) => m.unitCode === unit);
    const income = sumTraced(own.filter((m) => m.record_type === RECORD_TYPE.INGRESO_RECONOCIDO));
    const costs = own.filter((m) => m.record_type === RECORD_TYPE.COSTO_RECONOCIDO);
    const directCosts = sumTraced(costs.filter((m) => m.expense_class === EXPENSE_CLASS.DIRECTO));
    const attributableExpenses = sumTraced(costs.filter((m) => m.expense_class === EXPENSE_CLASS.ATRIBUIBLE));
    const contribution = round2(income.amount - directCosts.amount - attributableExpenses.amount);
    const allocationPct = effectivePct(pcts, unit);
    const allocatedCommonExpense = round2(corp.amount * (allocationPct / 100));
    const finalResult = round2(contribution - allocatedCommonExpense);
    const marginPct = income.amount ? (finalResult / income.amount) * 100 : 0;
    return { unit, income, directCosts, attributableExpenses, contribution, allocationPct, allocatedCommonExpense, finalResult, marginPct };
  });

  const sum = (f: (u: UnitResult) => number) => round2(units.reduce((a, u) => a + f(u), 0));
  const allocatedTotal = sum((u) => u.allocatedCommonExpense);
  const corpUnassigned = round2(corp.amount - allocatedTotal);
  const income = sum((u) => u.income.amount);
  const directCosts = sum((u) => u.directCosts.amount);
  const attributableExpenses = sum((u) => u.attributableExpenses.amount);
  const finalResult = round2(sum((u) => u.finalResult) - corpUnassigned);

  const incomeMinusAll = round2(income - directCosts - attributableExpenses - corp.amount);
  const difference = round2(incomeMinusAll - finalResult);

  return {
    mes,
    units,
    corpSharedExpense: corp,
    corpUnassigned,
    totals: {
      income,
      directCosts,
      attributableExpenses,
      contribution: sum((u) => u.contribution),
      allocatedCommonExpense: allocatedTotal,
      finalResult,
      marginPct: income ? (finalResult / income) * 100 : 0,
    },
    reconciliation: {
      incomeMinusAllExpenses: incomeMinusAll,
      sumFinalPlusCorpUnassigned: finalResult,
      difference,
      ok: Math.abs(difference) < 0.005,
    },
  };
}

// ─── 10_CAJA ─────────────────────────────────────────────────────────────────
export interface CashReport {
  mes: string;
  openingBalance: number;
  accumulated: CashFlows;
  closingBalance: number;       // inicial + cobros + aportes + préstamos − pagos − retiros − pagos de préstamo (a la fecha)
  month: CashFlows;
  netFlow: number;              // lo mismo, solo el mes
}

/** Entradas y salidas de caja. Préstamos (deuda): entran al recibirlos y salen al devolver capital. */
export interface CashFlows {
  cobros: TracedAmount; aportes: TracedAmount; prestamos: TracedAmount;
  pagos: TracedAmount; retiros: TracedAmount; pagosPrestamo: TracedAmount;
}

const netOf = (f: CashFlows) =>
  f.cobros.amount + f.aportes.amount + f.prestamos.amount - f.pagos.amount - f.retiros.amount - f.pagosPrestamo.amount;

export function computeCash(movements: EnrichedMovement[], mes: string, openingBalance: number): CashReport {
  const eligible = movements.filter(isEligible);
  const pick = (type: EnrichedMovement['record_type'], inMonthOnly: boolean): TracedAmount =>
    sumTraced(eligible.filter((m) => m.record_type === type && (inMonthOnly ? m.mes === mes : m.mes <= mes)));

  const flows = (inMonthOnly: boolean): CashFlows => ({
    cobros: pick(RECORD_TYPE.COBRO, inMonthOnly),
    aportes: pick(RECORD_TYPE.APORTE_SOCIO, inMonthOnly),
    prestamos: pick(RECORD_TYPE.PRESTAMO_RECIBIDO, inMonthOnly),
    pagos: pick(RECORD_TYPE.PAGO, inMonthOnly),
    retiros: pick(RECORD_TYPE.RETIRO_SOCIO, inMonthOnly),
    pagosPrestamo: pick(RECORD_TYPE.PAGO_PRESTAMO, inMonthOnly),
  });
  const accumulated = flows(false);
  const month = flows(true);
  return {
    mes,
    openingBalance,
    accumulated,
    closingBalance: round2(openingBalance + netOf(accumulated)),
    month,
    netFlow: round2(netOf(month)),
  };
}

// ─── Varios meses (periodo) ─────────────────────────────────────────────────
// Un periodo se calcula MES A MES (cada mes con su propio reparto CORP) y luego se suma.
// Así el resultado de un rango siempre es la suma de los resultados de sus meses.

const addTraced = (a: TracedAmount, b: TracedAmount): TracedAmount => ({ amount: round2(a.amount + b.amount), ids: [...a.ids, ...b.ids] });
const EMPTY: TracedAmount = { amount: 0, ids: [] };

/** Suma reportes mensuales en uno solo. `label` reemplaza al mes (p. ej. "2026-08..2026-10"). */
export function combineResults(reports: ResultsReport[], label: string): ResultsReport {
  const units: UnitResult[] = COMMERCIAL_UNIT_CODES.map((unit) => {
    const list = reports.map((r) => r.units.find((u) => u.unit === unit)).filter((u): u is UnitResult => Boolean(u));
    const income = list.reduce((a, u) => addTraced(a, u.income), EMPTY);
    const directCosts = list.reduce((a, u) => addTraced(a, u.directCosts), EMPTY);
    const attributableExpenses = list.reduce((a, u) => addTraced(a, u.attributableExpenses), EMPTY);
    const contribution = round2(list.reduce((a, u) => a + u.contribution, 0));
    const allocatedCommonExpense = round2(list.reduce((a, u) => a + u.allocatedCommonExpense, 0));
    const finalResult = round2(list.reduce((a, u) => a + u.finalResult, 0));
    return {
      unit, income, directCosts, attributableExpenses, contribution, allocatedCommonExpense, finalResult,
      allocationPct: 0, // se completa abajo: % efectivo del periodo = recibido / gasto CORP
      marginPct: income.amount ? (finalResult / income.amount) * 100 : 0,
    };
  });
  const corp = reports.reduce((a, r) => addTraced(a, r.corpSharedExpense), EMPTY);
  for (const u of units) u.allocationPct = corp.amount ? round2((u.allocatedCommonExpense / corp.amount) * 100) : 0;
  const sum = (f: (r: ResultsReport) => number) => round2(reports.reduce((a, r) => a + f(r), 0));
  const income = sum((r) => r.totals.income);
  const directCosts = sum((r) => r.totals.directCosts);
  const attributableExpenses = sum((r) => r.totals.attributableExpenses);
  const finalResult = sum((r) => r.totals.finalResult);
  const incomeMinusAll = round2(income - directCosts - attributableExpenses - corp.amount);
  const difference = round2(incomeMinusAll - finalResult);
  return {
    mes: label,
    units,
    corpSharedExpense: corp,
    corpUnassigned: sum((r) => r.corpUnassigned),
    totals: {
      income, directCosts, attributableExpenses,
      contribution: sum((r) => r.totals.contribution),
      allocatedCommonExpense: sum((r) => r.totals.allocatedCommonExpense),
      finalResult,
      marginPct: income ? (finalResult / income) * 100 : 0,
    },
    reconciliation: { incomeMinusAllExpenses: incomeMinusAll, sumFinalPlusCorpUnassigned: finalResult, difference, ok: Math.abs(difference) < 0.005 },
  };
}

/** Resultados de varios meses: cada mes con su reparto (`pctsOf`) y luego sumados. */
export function computeResultsForMonths(
  movements: EnrichedMovement[], months: string[], pctsOf: (mes: string) => AllocationPcts, label?: string,
): ResultsReport {
  if (months.length === 1) return computeResults(movements, months[0], pctsOf(months[0]));
  return combineResults(months.map((mes) => computeResults(movements, mes, pctsOf(mes))), label ?? `${months[0]}..${months.at(-1) ?? ''}`);
}

/** Caja de un periodo: entradas y salidas DEL PERIODO (`month`) y saldo acumulado al último mes.
 *  `periodOpening` = dinero que había al empezar el periodo. */
export function computeCashForMonths(movements: EnrichedMovement[], months: string[], openingBalance: number): CashReport & { periodOpening: number } {
  const last = months.at(-1) ?? '';
  const base = computeCash(movements, last, openingBalance);
  const set = new Set(months);
  const eligible = movements.filter((m) => isEligible(m) && set.has(m.mes));
  const pick = (type: EnrichedMovement['record_type']) => sumTraced(eligible.filter((m) => m.record_type === type));
  const month: CashFlows = {
    cobros: pick(RECORD_TYPE.COBRO), aportes: pick(RECORD_TYPE.APORTE_SOCIO), prestamos: pick(RECORD_TYPE.PRESTAMO_RECIBIDO),
    pagos: pick(RECORD_TYPE.PAGO), retiros: pick(RECORD_TYPE.RETIRO_SOCIO), pagosPrestamo: pick(RECORD_TYPE.PAGO_PRESTAMO),
  };
  const netFlow = round2(netOf(month));
  return { ...base, month, netFlow, periodOpening: round2(base.closingBalance - netFlow) };
}
