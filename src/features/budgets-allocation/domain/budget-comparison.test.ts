import { describe, expect, it } from 'vitest';
import { AREA_ID, CAT_ID, UNIT_ID, mov } from '../../../test/factories';
import type { DbBudget } from '../../../types/database';
import { compareBudget, isDuplicateBudget } from './budget-comparison';

const budget: DbBudget = {
  id: 1, month: '2026-10', business_unit_id: UNIT_ID.UN01, area_id: AREA_ID.MKT, cost_category_id: CAT_ID.PUB,
  income_target: 0, cost_target: 1000, comment: null,
};

describe('presupuesto vs real', () => {
  const movs = [
    mov({ unit: 'UN01', area_id: AREA_ID.MKT, cost_category_id: CAT_ID.PUB, expense_class: 'ATRIBUIBLE', amount: 300 }),
    mov({ unit: 'UN01', area_id: AREA_ID.MKT, cost_category_id: CAT_ID.PUB, expense_class: 'ATRIBUIBLE', amount: 150 }),
    // no coinciden: otra unidad, otro área, otra categoría, otro mes, borrador
    mov({ unit: 'UN02', area_id: AREA_ID.MKT, cost_category_id: CAT_ID.PUB, expense_class: 'ATRIBUIBLE', amount: 5000 }),
    mov({ unit: 'UN01', area_id: AREA_ID.ADM, cost_category_id: CAT_ID.PUB, expense_class: 'ATRIBUIBLE', amount: 5000 }),
    mov({ unit: 'UN01', area_id: AREA_ID.MKT, cost_category_id: CAT_ID.SOFT, expense_class: 'ATRIBUIBLE', amount: 5000 }),
    mov({ unit: 'UN01', area_id: AREA_ID.MKT, cost_category_id: CAT_ID.PUB, expense_class: 'ATRIBUIBLE', amount: 5000, movement_date: '2026-09-01' }),
    mov({ unit: 'UN01', area_id: AREA_ID.MKT, cost_category_id: CAT_ID.PUB, expense_class: 'ATRIBUIBLE', amount: 5000, status: 'BORRADOR' }),
  ];
  it('suma solo movimientos validados+OK de la misma combinación', () => {
    const c = compareBudget(budget, movs);
    expect(c.actualCost).toBe(450);
    expect(c.costDeviation).toBe(550);
    expect(c.movementIds).toHaveLength(2);
  });
  it('detecta combinaciones duplicadas (una fila por combinación)', () => {
    expect(isDuplicateBudget(budget, [budget])).toBe(true);
    expect(isDuplicateBudget(budget, [budget], 1)).toBe(false);
    expect(isDuplicateBudget({ ...budget, month: '2026-11' }, [budget])).toBe(false);
  });
});
