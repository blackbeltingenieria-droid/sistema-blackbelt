// features/results-cash/services/results-service.ts
// Resultados Modelo C y caja para un mes. Toda cifra se calcula (nunca se guarda) a partir de
// movimientos VALIDADO + OK, y viaja con los movement_id que la componen.

import { isSupabaseConfigured, supabase } from '../../../lib/supabase';
import { SETTING_KEY, type DbBudget } from '../../../types/database';
import { demoData } from '../../demo/demo-data';
import { EXCEL_OPENING_CASH } from '../../excel-data/excel-local';
import { getAllocationsByMonth, getBudgets } from '../../budgets-allocation/services/budget-service';
import { getMovements } from '../../movements/services/movement-service';
import { getProjectRows } from '../../clients-projects/services/project-service';
import type { EnrichedMovement } from '../../movements/types';
import {
  computeCashForMonths, computeResults, computeResultsForMonths, summarizeAllocation,
  type AllocationSummary, type CashReport, type ResultsReport,
} from '../domain/calculations';
import { periodLabel, periodMonths, previousLabel, previousMonths, type Period } from '../domain/period';
import { currentMonth } from '../../../lib/format';
import { buildLaborReport } from '../../labor/domain/labor';
import { getLaborContracts } from '../../labor/services/labor-service';
import {
  cashEvolution, lastMonths, monthlyEvolution, previousMonth,
  type CashPoint, type MonthlyPoint,
} from '../domain/presentation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- patrón del proyecto
const sb = () => supabase as any;

const DEFAULT_OPENING_CASH = 500; // 00_INICIO del Excel oficial
// Local: el Excel real calcula la caja sin saldo inicial (0); la demo usa el de la plantilla (500).
const mem = { openingCash: demoData ? DEFAULT_OPENING_CASH : EXCEL_OPENING_CASH };

export async function getOpeningCash(): Promise<number> {
  if (!isSupabaseConfigured()) return mem.openingCash;
  const { data, error } = await sb().from('app_settings').select('value').eq('key', SETTING_KEY.OPENING_CASH).maybeSingle();
  if (error) throw new Error(`getOpeningCash: ${error.message}`);
  const n = Number(data?.value);
  return Number.isFinite(n) ? n : DEFAULT_OPENING_CASH;
}

export async function setOpeningCash(value: number): Promise<void> {
  if (!Number.isFinite(value)) throw new Error('El saldo inicial debe ser un número.');
  if (!isSupabaseConfigured()) {
    mem.openingCash = value;
    return;
  }
  const { error } = await sb().from('app_settings').upsert({ key: SETTING_KEY.OPENING_CASH, value: String(value) });
  if (error) throw new Error(`setOpeningCash: ${error.message}`);
}

export interface MonthReport {
  mes: string;                     // último mes del periodo (el mes elegido si es un solo mes)
  period: Period;
  months: string[];                // meses del periodo, del más antiguo al más reciente
  label: string;                   // "octubre 2026", "agosto 2026 – octubre 2026", "desde el inicio (…)"
  previousLabel: string;           // cómo se llama el periodo anterior en las frases ('' si no hay)
  dataMonths: string[];            // meses que tienen registros (para los selectores)
  results: ResultsReport;
  allocation: AllocationSummary;   // reparto CORP (solo tiene sentido en un mes)
  cash: CashReport & { periodOpening: number };
  movements: EnrichedMovement[];   // para resolver ids → filas de trazabilidad
  pendingReview: number;           // movimientos sin control OK (excluidos de los reportes)
  validMovementsInMonth: number;   // del periodo
  // Solo presentación (gráficos): mismas funciones de cálculo, otros meses.
  previous: ResultsReport;          // periodo anterior del mismo largo, para la variación de los KPIs
  evolution: MonthlyPoint[];        // un mes: últimos 6 · periodo: sus meses
  cashByMonth: CashPoint[];
  budgets: DbBudget[];              // metas del mes (para el aviso de presupuesto del Resumen)
  projectsReceivable: number;       // lo que falta pagar de los proyectos no cancelados
  laborPending: number;             // lo que falta pagar al equipo (Mano de obra)
  laborOwedRegistered: number;      // de eso, lo ya anotado como egreso "aún lo debo" (ya está en las cuentas)
}

/** Un solo mes (lo usa también el Dashboard). */
export async function getMonthReport(mes: string): Promise<MonthReport> {
  return getPeriodReport({ kind: 'month', month: mes });
}

/** Resultados y caja de un periodo: un mes, varios meses, un año o todo desde el inicio. */
export async function getPeriodReport(period: Period, current = currentMonth()): Promise<MonthReport> {
  const [movements, allocations, opening, projects, contracts] = await Promise.all([
    getMovements(), getAllocationsByMonth(), getOpeningCash(), getProjectRows().catch(() => []), getLaborContracts().catch(() => []),
  ]);
  const labor = buildLaborReport(contracts, movements, `${current}-28`);
  const laborPending = labor.totals.pending;
  const laborOwedRegistered = Math.round(labor.rows.reduce((a, r) => a + r.owedRegistered, 0) * 100) / 100;
  const dataMonths = [...new Set(movements.map((m) => m.mes).filter(Boolean))].sort();
  const months = periodMonths(period, dataMonths, current);
  const mes = months[months.length - 1];
  const budgets = period.kind === 'month' ? await getBudgets(mes) : [];
  const projectsReceivable = Math.round(projects.filter((p) => p.status !== 'cancelado')
    .reduce((a, p) => a + Math.max(0, p.pendingBalance), 0) * 100) / 100;
  const pctsOf = (m: string) => allocations[m]?.pcts ?? {};
  const prev = previousMonths(period, months);
  const set = new Set(months);
  // Gráficos: un mes → últimos 6; un periodo → sus meses con registros (sin barras vacías de meses sin datos).
  const withData = months.filter((m) => dataMonths.includes(m));
  // Un mes: últimos 6, pero sin meses antes de que empiece la empresa (primer registro).
  const firstData = dataMonths[0];
  const recent = lastMonths(mes, 6).filter((m) => !firstData || m >= firstData);
  const chartMonths = months.length === 1 ? (recent.length ? recent : [mes]) : withData.length ? withData : months;
  return {
    mes,
    period,
    months,
    label: periodLabel(period, months),
    previousLabel: previousLabel(period, prev),
    dataMonths,
    results: computeResultsForMonths(movements, months, pctsOf),
    allocation: summarizeAllocation(movements, mes, pctsOf(mes)),
    cash: computeCashForMonths(movements, months, opening),
    previous: prev.length ? computeResultsForMonths(movements, prev, pctsOf) : computeResults([], previousMonth(months[0]), {}),
    evolution: monthlyEvolution(movements, allocations, chartMonths),
    cashByMonth: cashEvolution(movements, opening, chartMonths),
    movements,
    budgets,
    projectsReceivable,
    laborPending,
    laborOwedRegistered,
    pendingReview: movements.filter((m) => m.control !== 'OK').length,
    validMovementsInMonth: movements.filter((m) => set.has(m.mes) && m.status === 'VALIDADO' && m.control === 'OK').length,
  };
}
