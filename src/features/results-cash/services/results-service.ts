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
  computeCash, computeResults, summarizeAllocation,
  type AllocationSummary, type CashReport, type ResultsReport,
} from '../domain/calculations';
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
  mes: string;
  results: ResultsReport;
  allocation: AllocationSummary;
  cash: CashReport;
  movements: EnrichedMovement[];   // para resolver ids → filas de trazabilidad
  pendingReview: number;           // movimientos sin control OK (excluidos de los reportes)
  validMovementsInMonth: number;
  // Solo presentación (gráficos): mismas funciones de cálculo, otros meses.
  previous: ResultsReport;          // mes anterior, para la variación de los KPIs
  evolution: MonthlyPoint[];        // últimos 6 meses
  cashByMonth: CashPoint[];         // últimos 6 meses
  budgets: DbBudget[];              // metas del mes (para el aviso de presupuesto del Resumen)
  projectsReceivable: number;       // lo que falta pagar de los proyectos no cancelados
}

export async function getMonthReport(mes: string): Promise<MonthReport> {
  const [movements, allocations, opening, budgets, projects] = await Promise.all([
    getMovements(), getAllocationsByMonth(), getOpeningCash(), getBudgets(mes), getProjectRows().catch(() => []),
  ]);
  const projectsReceivable = Math.round(projects.filter((p) => p.status !== 'cancelado')
    .reduce((a, p) => a + Math.max(0, p.pendingBalance), 0) * 100) / 100;
  const pcts = allocations[mes]?.pcts ?? {};
  const months = lastMonths(mes, 6);
  return {
    mes,
    results: computeResults(movements, mes, pcts),
    allocation: summarizeAllocation(movements, mes, pcts),
    cash: computeCash(movements, mes, opening),
    previous: computeResults(movements, previousMonth(mes), allocations[previousMonth(mes)]?.pcts ?? {}),
    evolution: monthlyEvolution(movements, allocations, months),
    cashByMonth: cashEvolution(movements, opening, months),
    movements,
    budgets,
    projectsReceivable,
    pendingReview: movements.filter((m) => m.control !== 'OK').length,
    validMovementsInMonth: movements.filter((m) => m.mes === mes && m.status === 'VALIDADO' && m.control === 'OK').length,
  };
}
