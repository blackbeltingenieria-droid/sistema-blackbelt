// features/budgets-allocation/domain/budget-status.ts
// "¿Vas bien con tu presupuesto?": compara lo PLANEADO (metas) con lo REAL (solo VALIDADO + OK)
// de forma simple: por mes, por unidad y por categoría de gasto. No cambia la tabla de metas ni
// la comparación exacta del Excel (budget-comparison.ts sigue disponible en "Detalle").

import type { DbBudget } from '../../../types/database';
import { RECORD_TYPE } from '../../../types/database';
import type { BusinessUnit, CostCategory } from '../../catalogs/types';
import { isEligible } from '../../movements/domain/movement-rules';
import type { EnrichedMovement } from '../../movements/types';

export type SalesState = 'sin-meta' | 'cumplida' | 'en-camino' | 'baja';
export type SpendState = 'sin-meta' | 'dentro' | 'cerca' | 'pasado';

export interface Progress {
  target: number;
  actual: number;
  pct: number | null; // actual / target × 100 (null sin meta)
  diff: number;       // actual − target
  ids: number[];      // movimientos del real (trazabilidad)
}

export interface UnitBudgetStatus {
  unitId: number;
  code: string;
  name: string;
  color: string;
  sales: Progress & { state: SalesState };
  spend: Progress & { state: SpendState };
}

export interface CategoryOverspend {
  name: string;
  target: number;
  actual: number;
  over: number;
  ids: number[];
}

export interface BudgetStatus {
  hasBudgets: boolean;
  sales: Progress & { state: SalesState };
  spend: Progress & { state: SpendState };
  tone: 'good' | 'warn' | 'bad' | 'none';
  verdict: string;
  byUnit: UnitBudgetStatus[];
  overspent: CategoryOverspend[];
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const money = (n: number) => `S/ ${Math.abs(n).toLocaleString('es-PE', { maximumFractionDigits: 0 })}`;

function progress(target: number, movs: EnrichedMovement[]): Progress {
  const actual = r2(movs.reduce((a, m) => a + m.amount, 0));
  return { target: r2(target), actual, pct: target > 0 ? (actual / target) * 100 : null, diff: r2(actual - target), ids: movs.map((m) => m.id) };
}

/** Ventas: ¿llegas a la meta? En el mes en curso se compara con lo esperado a la fecha. */
export function salesState(p: Progress, mes: string, today: string): SalesState {
  if (p.target <= 0) return 'sin-meta';
  if (p.actual >= p.target) return 'cumplida';
  const current = today.slice(0, 7);
  if (mes > current) return 'en-camino';
  if (mes < current) return 'baja';
  const day = Number(today.slice(8, 10));
  const [y, m] = mes.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const expected = p.target * (day / daysInMonth);
  return p.actual >= expected * 0.9 ? 'en-camino' : 'baja';
}

/** Gastos: ¿te pasaste del límite? 90 % o más = cerca del límite. */
export function spendState(p: Progress): SpendState {
  if (p.target <= 0) return 'sin-meta';
  if (p.actual > p.target) return 'pasado';
  if (p.actual >= p.target * 0.9) return 'cerca';
  return 'dentro';
}

export function buildBudgetStatus(input: {
  mes: string;
  today: string;
  budgets: DbBudget[];
  movements: EnrichedMovement[];
  units: BusinessUnit[];
  categoryName: (c: CostCategory | undefined, id: number) => string;
  categories: CostCategory[];
}): BudgetStatus {
  const { mes, today, units, categories, categoryName } = input;
  const budgets = input.budgets.filter((b) => b.month === mes);
  const real = input.movements.filter((m) => isEligible(m) && m.mes === mes);
  const incomes = real.filter((m) => m.record_type === RECORD_TYPE.INGRESO_RECONOCIDO);
  const costs = real.filter((m) => m.record_type === RECORD_TYPE.COSTO_RECONOCIDO);
  // "Toda la empresa" (CORP) no vende: su meta de ventas no se cuenta.
  const corpId = units.find((u) => u.code === 'CORP')?.id;
  const sum = (list: DbBudget[], k: 'income_target' | 'cost_target') =>
    list.reduce((a, b) => a + (k === 'income_target' && b.business_unit_id === corpId ? 0 : b[k]), 0);

  // Total del mes
  const salesP = progress(sum(budgets, 'income_target'), incomes);
  const spendP = progress(sum(budgets, 'cost_target'), costs);
  const sales = { ...salesP, state: salesState(salesP, mes, today) };
  const spend = { ...spendP, state: spendState(spendP) };

  // Por unidad (solo las que tienen meta)
  const unitIds = [...new Set(budgets.map((b) => b.business_unit_id))];
  const byUnit: UnitBudgetStatus[] = unitIds.map((id) => {
    const u = units.find((x) => x.id === id);
    const own = budgets.filter((b) => b.business_unit_id === id);
    const sp = progress(sum(own, 'income_target'), incomes.filter((m) => m.business_unit_id === id));
    const cp = progress(sum(own, 'cost_target'), costs.filter((m) => m.business_unit_id === id));
    return {
      unitId: id, code: u?.code ?? '—', name: u?.code === 'CORP' ? 'Toda la empresa' : (u?.name ?? '—'), color: u?.color ?? '',
      sales: { ...sp, state: salesState(sp, mes, today) },
      spend: { ...cp, state: spendState(cp) },
    };
  });
  const rank = (u: UnitBudgetStatus) => (u.spend.state === 'pasado' ? 0 : u.sales.state === 'baja' ? 1 : u.spend.state === 'cerca' ? 2 : 3);
  byUnit.sort((a, b) => rank(a) - rank(b) || b.spend.diff - a.spend.diff);

  // Categorías donde te pasaste (por unidad + categoría con meta de gasto, sin "Otros")
  const otr = categories.find((c) => c.code === 'OTR')?.id;
  const groups = new Map<number, { target: number; movs: EnrichedMovement[] }>();
  for (const b of budgets) {
    if (b.cost_target <= 0 || b.cost_category_id === otr) continue;
    const g = groups.get(b.cost_category_id) ?? { target: 0, movs: [] };
    g.target += b.cost_target;
    groups.set(b.cost_category_id, g);
  }
  for (const [catId, g] of groups) {
    const budgetUnits = new Set(budgets.filter((b) => b.cost_category_id === catId && b.cost_target > 0).map((b) => b.business_unit_id));
    g.movs = costs.filter((m) => m.cost_category_id === catId && budgetUnits.has(m.business_unit_id));
  }
  const overspent: CategoryOverspend[] = [...groups.entries()]
    .map(([catId, g]) => {
      const actual = r2(g.movs.reduce((a, m) => a + m.amount, 0));
      return { name: categoryName(categories.find((c) => c.id === catId), catId), target: r2(g.target), actual, over: r2(actual - g.target), ids: g.movs.map((m) => m.id) };
    })
    .filter((c) => c.over > 0)
    .sort((a, b) => b.over - a.over);

  // Frase final
  let tone: BudgetStatus['tone'] = 'good';
  let verdict: string;
  if (!budgets.length) {
    tone = 'none';
    verdict = 'Aún no pusiste metas para este mes.';
  } else if (spend.state === 'pasado') {
    tone = 'bad';
    verdict = `Cuidado: gastaste ${money(spend.diff)} más de lo planeado.`;
  } else if (sales.state === 'baja') {
    tone = 'warn';
    verdict = `Las ventas van por debajo de la meta: llevas el ${Math.round(sales.pct ?? 0)} %.`;
  } else if (spend.state === 'cerca') {
    tone = 'warn';
    verdict = `Vas bien, pero estás cerca del límite de gastos (${Math.round(spend.pct ?? 0)} %).`;
  } else {
    verdict = sales.state === 'cumplida'
      ? '¡Vas bien! Cumpliste la meta de ventas y tus gastos están dentro del presupuesto.'
      : 'Vas bien: ventas según lo planeado y gastos dentro del presupuesto.';
  }

  return { hasBudgets: budgets.length > 0, sales, spend, tone, verdict, byUnit, overspent };
}

/** Metas de un mes copiadas a otro (sin repetir combinaciones que ya existan). */
export function budgetsToCopy(from: DbBudget[], existingTarget: DbBudget[], toMonth: string): Omit<DbBudget, 'id'>[] {
  const key = (b: Pick<DbBudget, 'business_unit_id' | 'area_id' | 'cost_category_id'>) => `${b.business_unit_id}|${b.area_id}|${b.cost_category_id}`;
  const taken = new Set(existingTarget.map(key));
  return from
    .filter((b) => !taken.has(key(b)))
    .map((b) => ({
      month: toMonth, business_unit_id: b.business_unit_id, area_id: b.area_id, cost_category_id: b.cost_category_id,
      income_target: b.income_target, cost_target: b.cost_target, comment: b.comment,
    }));
}
