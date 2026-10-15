// features/results-cash/domain/summary.ts
// "¿Cómo va mi negocio?": resumen en palabras simples a partir de los MISMOS cálculos del
// Modelo C (resultado consolidado y caja). No agrega reglas: solo elige qué mostrar y cómo decirlo.

import { monthLabel } from '../../../lib/format';
import type { EnrichedMovement } from '../../movements/types';
import { pendingBalances } from '../../movements/domain/quick-entry';
import type { CashReport, ResultsReport } from './calculations';
import { expensesByCategory, type CategoryBar, type MonthlyPoint } from './presentation';

export interface BusinessSummary {
  verdict: 'gana' | 'pierde' | 'sin-datos';
  result: number;          // = resultado consolidado
  income: number;          // lo que vendiste
  spent: number;           // todo lo que gastaste (directos + atribuibles + gasto de toda la empresa)
  cash: number;            // dinero en caja a fin de mes
  receivable: number;      // te deben
  payable: number;         // debes
  reasons: string[];       // por qué, en 2–4 frases
  topExpenses: CategoryBar[];
  trend: MonthlyPoint[];
}

const money = (n: number) => `S/ ${Math.abs(n).toLocaleString('es-PE', { maximumFractionDigits: 0 })}`;
const r2 = (n: number) => Math.round(n * 100) / 100;

export function buildBusinessSummary(input: {
  mes: string;
  results: ResultsReport;
  previous: ResultsReport;
  cash: CashReport;
  movements: EnrichedMovement[];
  evolution: MonthlyPoint[];
  categoryNames: Map<number, string>;
  unitNames: Map<string, string>;
}): BusinessSummary {
  const { mes, results, previous, cash, movements, evolution, categoryNames, unitNames } = input;
  const t = results.totals;
  const income = t.income;
  const result = t.finalResult;
  const spent = r2(income - result);
  const { receivable, payable } = pendingBalances(movements, mes);
  const topExpenses = expensesByCategory(movements, mes, categoryNames, 5);
  const verdict = income === 0 && spent === 0 ? 'sin-datos' : result >= 0 ? 'gana' : 'pierde';

  const reasons: string[] = [];
  if (verdict !== 'sin-datos') {
    reasons.push(`Vendiste ${money(income)} y gastaste ${money(spent)}.`);
    const top = topExpenses[0];
    if (top && spent > 0) {
      reasons.push(`Tu mayor gasto fue ${top.name}: ${money(top.amount)} (${Math.round((top.amount / spent) * 100)} % de lo que gastaste).`);
    }
    const byResult = [...results.units].filter((u) => u.income.amount || u.finalResult).sort((a, b) => b.finalResult - a.finalResult);
    const best = byResult[0];
    const worst = byResult[byResult.length - 1];
    if (best && best.finalResult > 0) reasons.push(`${unitNames.get(best.unit) ?? best.unit} fue la que más ganó: ${money(best.finalResult)}.`);
    if (worst && worst.finalResult < 0) reasons.push(`${unitNames.get(worst.unit) ?? worst.unit} perdió ${money(worst.finalResult)}: gastó más de lo que vendió.`);
    const prevHasData = previous.totals.income > 0 || previous.totals.finalResult !== 0;
    if (prevHasData) {
      const diff = r2(result - previous.totals.finalResult);
      const prevName = monthLabel(previous.mes).split(' ')[0].toLowerCase();
      if (Math.abs(diff) >= 1) reasons.push(`Te fue ${money(diff)} ${diff > 0 ? 'mejor' : 'peor'} que en ${prevName}.`);
    }
  }

  return { verdict, result, income, spent, cash: cash.closingBalance, receivable, payable, reasons: reasons.slice(0, 4), topExpenses, trend: evolution };
}
