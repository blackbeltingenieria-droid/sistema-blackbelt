// features/budgets-allocation/domain/budget-comparison.ts
// Presupuesto vs. real (hoja 07_PRESUPUESTOS). El "real" sale SOLO de movimientos
// VALIDADO + OK, por la misma combinación mes + unidad + área + categoría.

import type { DbBudget } from '../../../types/database';
import { RECORD_TYPE } from '../../../types/database';
import { isEligible } from '../../movements/domain/movement-rules';
import type { EnrichedMovement } from '../../movements/types';

export interface BudgetComparison {
  budget: DbBudget;
  actualIncome: number;
  actualCost: number;
  costDeviation: number;   // costo meta − costo real (positivo = por debajo de la meta)
  incomeDeviation: number; // ingreso real − ingreso meta
  movementIds: number[];   // trazabilidad del real
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function compareBudget(budget: DbBudget, movements: EnrichedMovement[]): BudgetComparison {
  const matching = movements.filter(
    (m) =>
      isEligible(m) &&
      m.mes === budget.month &&
      m.business_unit_id === budget.business_unit_id &&
      m.area_id === budget.area_id &&
      m.cost_category_id === budget.cost_category_id,
  );
  const incomes = matching.filter((m) => m.record_type === RECORD_TYPE.INGRESO_RECONOCIDO);
  const costs = matching.filter((m) => m.record_type === RECORD_TYPE.COSTO_RECONOCIDO);
  const actualIncome = round2(incomes.reduce((a, m) => a + m.amount, 0));
  const actualCost = round2(costs.reduce((a, m) => a + m.amount, 0));
  return {
    budget,
    actualIncome,
    actualCost,
    costDeviation: round2(budget.cost_target - actualCost),
    incomeDeviation: round2(actualIncome - budget.income_target),
    movementIds: [...incomes, ...costs].map((m) => m.id),
  };
}

export function compareBudgets(budgets: DbBudget[], movements: EnrichedMovement[]): BudgetComparison[] {
  return budgets.map((b) => compareBudget(b, movements));
}

/** Regla 10: una fila por combinación. true si ya existe otra fila con la misma combinación. */
export function isDuplicateBudget(
  candidate: Pick<DbBudget, 'month' | 'business_unit_id' | 'area_id' | 'cost_category_id'>,
  existing: DbBudget[],
  ignoreId?: number,
): boolean {
  return existing.some(
    (b) =>
      b.id !== ignoreId &&
      b.month === candidate.month &&
      b.business_unit_id === candidate.business_unit_id &&
      b.area_id === candidate.area_id &&
      b.cost_category_id === candidate.cost_category_id,
  );
}
