import { describe, expect, it } from 'vitest';
import type { DbBudget } from '../../../types/database';
import { SEED_BUSINESS_UNITS, SEED_COST_CATEGORIES } from '../../catalogs/services/seed-data';
import { AREA_ID, CAT_ID, mov } from '../../../test/factories';
import { budgetsToCopy, buildBudgetStatus, salesState, spendState } from './budget-status';

const b = (o: Partial<DbBudget>): DbBudget => ({
  id: Math.random(), month: '2026-10', business_unit_id: 3, area_id: AREA_ID['U03-MET'], cost_category_id: CAT_ID.OTR,
  income_target: 0, cost_target: 0, comment: null, ...o,
});
const income = (unit: string, amount: number) =>
  mov({ unit, record_type: 'INGRESO_RECONOCIDO', amount, expense_class: 'NO_APLICA', cost_category_id: CAT_ID.OTR });
const cost = (unit: string, amount: number, cat: number = CAT_ID.MO) =>
  mov({ unit, amount, expense_class: unit === 'CORP' ? 'COMPARTIDO' : 'ATRIBUIBLE', cost_category_id: cat, area_id: AREA_ID.MKT });

const status = (budgets: DbBudget[], movements: ReturnType<typeof mov>[], today = '2026-11-02') =>
  buildBudgetStatus({
    mes: '2026-10', today, budgets, movements, units: SEED_BUSINESS_UNITS, categories: SEED_COST_CATEGORIES,
    categoryName: (c, id) => c?.name ?? String(id),
  });

describe('estados simples', () => {
  const p = (target: number, actual: number) => ({ target, actual, pct: null, diff: actual - target, ids: [] });
  it('gastos: dentro, cerca (≥90 %), pasado', () => {
    expect(spendState(p(1000, 500))).toBe('dentro');
    expect(spendState(p(1000, 950))).toBe('cerca');
    expect(spendState(p(1000, 1001))).toBe('pasado');
    expect(spendState(p(0, 50))).toBe('sin-meta');
  });
  it('ventas del mes en curso se comparan con lo esperado a la fecha', () => {
    expect(salesState(p(3100, 1500), '2026-10', '2026-10-15')).toBe('en-camino'); // 15/31 ≈ 48 %
    expect(salesState(p(3100, 500), '2026-10', '2026-10-15')).toBe('baja');
    expect(salesState(p(3100, 500), '2026-10', '2026-11-02')).toBe('baja');       // mes cerrado
    expect(salesState(p(3100, 3200), '2026-10', '2026-10-05')).toBe('cumplida');
  });
});

describe('¿vas bien con tu presupuesto?', () => {
  it('sin metas lo dice en palabras simples', () => {
    const s = status([], [income('UN03', 100)]);
    expect([s.hasBudgets, s.tone, s.verdict]).toEqual([false, 'none', 'Aún no pusiste metas para este mes.']);
  });

  it('te pasaste en gastos → aviso rojo con cuánto y dónde', () => {
    const s = status(
      [b({ income_target: 2000, cost_target: 500, cost_category_id: CAT_ID.MO }), b({ business_unit_id: 6, area_id: AREA_ID.ADM, cost_target: 300, income_target: 999 })],
      [income('UN03', 2500), cost('UN03', 800), cost('CORP', 200, CAT_ID.SERV)],
    );
    expect(s.sales).toMatchObject({ target: 2000, actual: 2500, state: 'cumplida' });
    expect(s.spend).toMatchObject({ target: 800, actual: 1000, diff: 200, state: 'pasado' });
    expect(s.tone).toBe('bad');
    expect(s.verdict).toBe('Cuidado: gastaste S/ 200 más de lo planeado.');
    expect(s.byUnit[0]).toMatchObject({ code: 'UN03', spend: { state: 'pasado', diff: 300 } });
    expect(s.byUnit.find((u) => u.code === 'CORP')?.name).toBe('Toda la empresa');
    expect(s.overspent).toEqual([expect.objectContaining({ name: 'Mano de obra y especialistas', target: 500, actual: 800, over: 300 })]);
  });

  it('todo en orden → "vas bien"', () => {
    const s = status([b({ income_target: 1000, cost_target: 1000 })], [income('UN03', 1200), cost('UN03', 400)]);
    expect(s.tone).toBe('good');
    expect(s.verdict).toContain('Vas bien');
  });

  it('solo cuenta lo validado y en OK', () => {
    const draft = mov({ unit: 'UN03', amount: 9999, status: 'BORRADOR', expense_class: 'ATRIBUIBLE', cost_category_id: CAT_ID.MO, area_id: AREA_ID.MKT });
    const s = status([b({ cost_target: 100 })], [draft]);
    expect(s.spend.actual).toBe(0);
  });
});

describe('copiar metas del mes anterior', () => {
  it('copia al nuevo mes sin duplicar combinaciones', () => {
    const prev = [b({ month: '2026-09', cost_target: 100 }), b({ month: '2026-09', cost_category_id: CAT_ID.PUB, cost_target: 50 })];
    const existing = [b({ month: '2026-10' })];
    const copy = budgetsToCopy(prev, existing, '2026-10');
    expect(copy).toHaveLength(1);
    expect(copy[0]).toMatchObject({ month: '2026-10', cost_category_id: CAT_ID.PUB, cost_target: 50 });
    expect('id' in copy[0]).toBe(false);
  });
});
