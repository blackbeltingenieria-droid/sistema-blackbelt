// features/results-cash/domain/presentation.ts
// Datos para GRÁFICOS de Resultados y caja. Funciones PURAS que solo reorganizan lo que ya
// calculan `computeResults` / `computeCash`: no cambian fórmulas ni el filtro VALIDADO + OK.
// Cada punto lleva `ids` (movement_id) para abrir la trazabilidad al hacer clic.

import { RECORD_TYPE } from '../../../types/database';
import { isEligible } from '../../movements/domain/movement-rules';
import type { EnrichedMovement } from '../../movements/types';
import {
  computeCash, computeResults,
  type AllocationPcts, type CashReport, type ResultsReport, type UnitResult,
} from './calculations';

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

// ─── Variación contra el mes anterior ────────────────────────────────────────
/** Variación % = (actual − anterior) / |anterior| × 100. `null` si el anterior es 0 (no hay base). */
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return round2(((current - previous) / Math.abs(previous)) * 100);
}

/** Mes anterior de un 'AAAA-MM'. */
export function previousMonth(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

/** Los últimos `n` meses terminando en `mes` (más antiguo primero). */
export function lastMonths(mes: string, n = 6): string[] {
  const out = [mes];
  while (out.length < n) out.unshift(previousMonth(out[0]));
  return out;
}

// ─── Barras por unidad ───────────────────────────────────────────────────────
export interface UnitBarPoint {
  unit: string;
  income: number;
  costs: number;          // directos + atribuibles
  contribution: number;
  incomeIds: number[];
  costIds: number[];
}

export function unitBars(results: ResultsReport): UnitBarPoint[] {
  return results.units.map((u: UnitResult) => ({
    unit: u.unit,
    income: u.income.amount,
    costs: round2(u.directCosts.amount + u.attributableExpenses.amount),
    contribution: u.contribution,
    incomeIds: u.income.ids,
    costIds: [...u.directCosts.ids, ...u.attributableExpenses.ids],
  }));
}

// ─── Cascada del mes ─────────────────────────────────────────────────────────
export type WaterfallKind = 'income' | 'cost' | 'result';

export interface WaterfallStep {
  key: string;
  label: string;
  kind: WaterfallKind;
  value: number;            // con signo: ingresos +, costos −, resultado = total
  start: number;
  end: number;
  ids: number[];
}

/** Ingresos → costos directos → gastos atribuibles → gasto CORP → resultado final.
 *  El último paso termina exactamente en el resultado de la conciliación. */
export function buildWaterfall(r: ResultsReport): WaterfallStep[] {
  const direct = r.units.flatMap((u) => u.directCosts.ids);
  const attrib = r.units.flatMap((u) => u.attributableExpenses.ids);
  const income = r.units.flatMap((u) => u.income.ids);

  const steps: WaterfallStep[] = [];
  let acc = 0;
  const push = (key: string, label: string, kind: WaterfallKind, delta: number, ids: number[]) => {
    const start = acc;
    acc = round2(acc + delta);
    steps.push({ key, label, kind, value: delta, start, end: acc, ids });
  };
  push('income', 'Ingresos', 'income', r.totals.income, income);
  push('direct', 'Costos directos', 'cost', -r.totals.directCosts, direct);
  push('attributable', 'Gastos atribuibles', 'cost', -r.totals.attributableExpenses, attrib);
  push('corp', 'Gasto CORP', 'cost', -r.corpSharedExpense.amount, r.corpSharedExpense.ids);
  steps.push({ key: 'result', label: 'Resultado final', kind: 'result', value: acc, start: 0, end: acc, ids: [] });
  return steps;
}

// ─── Evolución mensual (6 meses) ─────────────────────────────────────────────
export interface MonthlyPoint {
  mes: string;
  income: number;
  costs: number;          // directos + atribuibles + gasto CORP compartido
  result: number;         // resultado final del mes (incluye CORP sin repartir)
}

export function monthlyEvolution(
  movements: EnrichedMovement[],
  allocationByMonth: Record<string, { pcts: AllocationPcts }>,
  months: string[],
): MonthlyPoint[] {
  return months.map((mes) => {
    const r = computeResults(movements, mes, allocationByMonth[mes]?.pcts ?? {});
    return {
      mes,
      income: r.totals.income,
      costs: round2(r.totals.directCosts + r.totals.attributableExpenses + r.corpSharedExpense.amount),
      result: r.totals.finalResult,
    };
  });
}

// ─── Caja por mes ────────────────────────────────────────────────────────────
export interface CashPoint {
  mes: string;
  inflow: number;       // cobros + aportes del mes
  outflow: number;      // pagos + retiros del mes
  balance: number;      // saldo acumulado al cierre del mes
  inflowIds: number[];
  outflowIds: number[];
}

export function cashEvolution(movements: EnrichedMovement[], opening: number, months: string[]): CashPoint[] {
  return months.map((mes) => {
    const c: CashReport = computeCash(movements, mes, opening);
    return {
      mes,
      inflow: round2(c.month.cobros.amount + c.month.aportes.amount),
      outflow: round2(c.month.pagos.amount + c.month.retiros.amount),
      balance: c.closingBalance,
      inflowIds: [...c.month.cobros.ids, ...c.month.aportes.ids],
      outflowIds: [...c.month.pagos.ids, ...c.month.retiros.ids],
    };
  });
}

// ─── Gastos por categoría ────────────────────────────────────────────────────
export interface CategoryBar {
  categoryId: number;
  name: string;
  amount: number;
  ids: number[];
}

/** Costos reconocidos (VALIDADO + OK) del mes por categoría, de mayor a menor. */
export function expensesByCategory(
  movements: EnrichedMovement[],
  mes: string,
  categoryNames: Map<number, string>,
  maxBars = 8,
): CategoryBar[] {
  const groups = new Map<number, EnrichedMovement[]>();
  for (const m of movements) {
    if (!isEligible(m) || m.mes !== mes || m.record_type !== RECORD_TYPE.COSTO_RECONOCIDO) continue;
    groups.set(m.cost_category_id, [...(groups.get(m.cost_category_id) ?? []), m]);
  }
  const bars: CategoryBar[] = [...groups.entries()].map(([categoryId, list]) => ({
    categoryId,
    name: categoryNames.get(categoryId) ?? `Categoría ${categoryId}`,
    amount: round2(list.reduce((a, m) => a + m.amount, 0)),
    ids: list.map((m) => m.id),
  }));
  bars.sort((a, b) => b.amount - a.amount);
  if (bars.length <= maxBars) return bars;
  const head = bars.slice(0, maxBars - 1);
  const tail = bars.slice(maxBars - 1);
  return [
    ...head,
    { categoryId: -1, name: 'Otras categorías', amount: round2(tail.reduce((a, b) => a + b.amount, 0)), ids: tail.flatMap((b) => b.ids) },
  ];
}

// ─── Frases en lenguaje simple + variación de KPIs ──────────────────────────
export interface KpiNarrative {
  value: number;
  delta: number | null;          // variación % vs mes anterior (null = sin base)
  goodWhen: 'up' | 'down';       // sube = bueno (ingresos) o baja = bueno (gastos)
  phrase: string;
}

export interface ResultsNarrative {
  income: KpiNarrative;
  contribution: KpiNarrative;
  corpExpense: KpiNarrative;
  finalResult: KpiNarrative;
}

const fmtMoney = (n: number) => `S/ ${Math.abs(n).toLocaleString('es-PE', { maximumFractionDigits: 0 })}`;

export function buildNarrative(current: ResultsReport, previous: ResultsReport): ResultsNarrative {
  const c = current.totals;
  const p = previous.totals;
  const best = [...current.units].sort((a, b) => b.contribution - a.contribution)[0];
  const topIncome = [...current.units].sort((a, b) => b.income.amount - a.income.amount)[0];
  const hasIncome = c.income > 0;

  const incomePhrase = hasIncome && topIncome
    ? `${topIncome.unit} trae la mayor parte: ${Math.round((topIncome.income.amount / c.income) * 100)} % de los ingresos.`
    : 'Este mes aún no hay ingresos reconocidos.';
  const contributionPhrase = hasIncome && best && best.contribution > 0
    ? `${best.unit} es la unidad más rentable este mes (${fmtMoney(best.contribution)}).`
    : 'Ninguna unidad deja contribución positiva este mes.';
  const corp = current.corpSharedExpense.amount;
  const corpPhrase = corp === 0
    ? 'No hay gasto compartido de CORP este mes.'
    : current.corpUnassigned > 0.005
      ? `${fmtMoney(current.corpUnassigned)} de ese gasto aún no se reparte entre unidades.`
      : 'Todo el gasto compartido está repartido entre las unidades.';
  const resultPhrase = c.finalResult >= 0
    ? `La empresa gana ${fmtMoney(c.finalResult)} este mes${c.income ? ` (margen ${c.marginPct.toFixed(0)} %)` : ''}.`
    : `La empresa pierde ${fmtMoney(c.finalResult)} este mes: los costos superan a los ingresos.`;

  return {
    income: { value: c.income, delta: pctChange(c.income, p.income), goodWhen: 'up', phrase: incomePhrase },
    contribution: { value: c.contribution, delta: pctChange(c.contribution, p.contribution), goodWhen: 'up', phrase: contributionPhrase },
    corpExpense: { value: corp, delta: pctChange(corp, previous.corpSharedExpense.amount), goodWhen: 'down', phrase: corpPhrase },
    finalResult: { value: c.finalResult, delta: pctChange(c.finalResult, p.finalResult), goodWhen: 'up', phrase: resultPhrase },
  };
}

