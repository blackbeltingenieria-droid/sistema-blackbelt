// features/results-cash/services/results-service.ts
// Resultados Modelo C y caja para un mes. Toda cifra se calcula (nunca se guarda) a partir de
// movimientos VALIDADO + OK, y viaja con los movement_id que la componen.

import { isSupabaseConfigured, supabase } from '../../../lib/supabase';
import { SETTING_KEY } from '../../../types/database';
import { getAllocationsByMonth } from '../../budgets-allocation/services/budget-service';
import { getMovements } from '../../movements/services/movement-service';
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
const mem = { openingCash: DEFAULT_OPENING_CASH };

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
}

export async function getMonthReport(mes: string): Promise<MonthReport> {
  const [movements, allocations, opening] = await Promise.all([getMovements(), getAllocationsByMonth(), getOpeningCash()]);
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
    pendingReview: movements.filter((m) => m.control !== 'OK').length,
    validMovementsInMonth: movements.filter((m) => m.mes === mes && m.status === 'VALIDADO' && m.control === 'OK').length,
  };
}
