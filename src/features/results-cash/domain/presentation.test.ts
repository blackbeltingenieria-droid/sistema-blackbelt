import { describe, expect, it } from 'vitest';
import { AREA_ID, CAT_ID, mov } from '../../../test/factories';
import { computeResults } from './calculations';
import {
  buildNarrative, buildWaterfall, cashEvolution, expensesByCategory, lastMonths,
  monthlyEvolution, pctChange, previousMonth, unitBars,
} from './presentation';

const D = '2026-10-10';
const data = [
  mov({ unit: 'UN01', record_type: 'INGRESO_RECONOCIDO', amount: 5000, expense_class: 'NO_APLICA', cost_category_id: CAT_ID.OTR, movement_date: D }),
  mov({ unit: 'UN03', record_type: 'INGRESO_RECONOCIDO', amount: 3000, expense_class: 'NO_APLICA', cost_category_id: CAT_ID.OTR, movement_date: D }),
  mov({ unit: 'UN01', record_type: 'COSTO_RECONOCIDO', amount: 1200, expense_class: 'DIRECTO', cost_category_id: CAT_ID.MO, area_id: AREA_ID.MKT, movement_date: D }),
  mov({ unit: 'UN03', record_type: 'COSTO_RECONOCIDO', amount: 400, expense_class: 'ATRIBUIBLE', cost_category_id: CAT_ID.PUB, area_id: AREA_ID.MKT, movement_date: D }),
  mov({ unit: 'CORP', record_type: 'COSTO_RECONOCIDO', amount: 600, expense_class: 'COMPARTIDO', cost_category_id: CAT_ID.SOFT, movement_date: D }),
  mov({ unit: 'CORP', record_type: 'COSTO_RECONOCIDO', amount: 200, expense_class: 'COMPARTIDO', cost_category_id: CAT_ID.SERV, movement_date: D, status: 'BORRADOR' }),
  mov({ unit: 'CORP', record_type: 'COBRO', amount: 2000, expense_class: 'NO_APLICA', cost_category_id: CAT_ID.CXC, movement_date: D }),
  mov({ unit: 'CORP', record_type: 'PAGO', amount: 700, expense_class: 'NO_APLICA', cost_category_id: CAT_ID.SERV, movement_date: '2026-09-15' }),
  mov({ unit: 'CORP', record_type: 'APORTE_SOCIO', amount: 1000, expense_class: 'NO_APLICA', cost_category_id: CAT_ID.SOC, movement_date: '2026-09-02' }),
];
const pcts = { UN01: 50, UN03: 30 }; // 80 % repartido → 20 % sin repartir

describe('variación mensual', () => {
  it('calcula % con signo y evita dividir por cero', () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(50, 100)).toBe(-50);
    expect(pctChange(10, 0)).toBeNull();
    expect(pctChange(-50, -100)).toBe(50); // mejora de pérdida
  });
  it('mes anterior y ventana de 6 meses cruzan el año', () => {
    expect(previousMonth('2026-01')).toBe('2025-12');
    expect(lastMonths('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(lastMonths('2026-10')).toHaveLength(6);
  });
});

describe('cascada (waterfall)', () => {
  const r = computeResults(data, '2026-10', pcts);
  const w = buildWaterfall(r);
  it('tiene los 5 pasos en orden', () => {
    expect(w.map((s) => s.key)).toEqual(['income', 'direct', 'attributable', 'corp', 'result']);
  });
  it('encadena inicio/fin y cuadra con la conciliación', () => {
    expect(w[0].end).toBe(8000);
    expect(w[1].start).toBe(8000);
    expect(w[1].end).toBe(6800);
    expect(w[2].end).toBe(6400);
    expect(w[3].end).toBe(5800);
    const last = w[4];
    expect(last.end).toBe(r.reconciliation.sumFinalPlusCorpUnassigned);
    expect(last.end).toBe(r.reconciliation.incomeMinusAllExpenses);
    expect(r.reconciliation.ok).toBe(true);
  });
  it('el borrador no entra al gasto CORP', () => {
    expect(w[3].value).toBe(-600);
  });
  it('lleva los ids de cada paso para la trazabilidad', () => {
    expect(w[0].ids.length).toBe(2);
    expect(w[3].ids.length).toBe(1);
  });
});

describe('barras por unidad', () => {
  it('suma costos directos + atribuibles y conserva la contribución', () => {
    const bars = unitBars(computeResults(data, '2026-10', pcts));
    const un01 = bars.find((b) => b.unit === 'UN01')!;
    expect(un01).toMatchObject({ income: 5000, costs: 1200, contribution: 3800 });
    const un03 = bars.find((b) => b.unit === 'UN03')!;
    expect(un03).toMatchObject({ income: 3000, costs: 400, contribution: 2600 });
  });
});

describe('evolución mensual y caja', () => {
  it('cada mes usa su propio reparto y coincide con computeResults', () => {
    const series = monthlyEvolution(data, { '2026-10': { pcts } }, ['2026-09', '2026-10']);
    expect(series[1]).toMatchObject({ mes: '2026-10', income: 8000, costs: 2200, result: 5800 });
    expect(series[0]).toMatchObject({ income: 0, costs: 0, result: 0 });
  });
  it('caja: entradas, salidas y saldo acumulado', () => {
    const cash = cashEvolution(data, 500, ['2026-09', '2026-10']);
    expect(cash[0]).toMatchObject({ inflow: 1000, outflow: 700, balance: 800 });
    expect(cash[1]).toMatchObject({ inflow: 2000, outflow: 0, balance: 2800 });
  });
});

describe('gastos por categoría', () => {
  const names = new Map<number, string>([[CAT_ID.MO, 'Mano de obra'], [CAT_ID.PUB, 'Publicidad'], [CAT_ID.SOFT, 'Software']]);
  it('ordena de mayor a menor y ignora borradores', () => {
    const bars = expensesByCategory(data, '2026-10', names);
    expect(bars.map((b) => b.name)).toEqual(['Mano de obra', 'Software', 'Publicidad']);
    expect(bars[0].amount).toBe(1200);
  });
  it('agrupa la cola en «Otras categorías»', () => {
    const many = [1, 2, 3, 4, 5].map((c) => mov({ unit: 'UN01', record_type: 'COSTO_RECONOCIDO', amount: c * 10, expense_class: 'DIRECTO', cost_category_id: c, movement_date: D }));
    const bars = expensesByCategory(many, '2026-10', new Map(), 3);
    expect(bars).toHaveLength(3);
    expect(bars[2]).toMatchObject({ name: 'Otras categorías', amount: 60 });
  });
});

describe('frases y variación de KPIs', () => {
  const cur = computeResults(data, '2026-10', pcts);
  const prev = computeResults(data, '2026-09', {});
  const n = buildNarrative(cur, prev);
  it('nombra la unidad más rentable', () => {
    expect(n.contribution.phrase).toContain('UN01 es la unidad más rentable');
  });
  it('sin mes anterior no hay variación', () => {
    expect(n.income.delta).toBeNull();
  });
  it('gasto CORP: baja es bueno y avisa lo no repartido', () => {
    expect(n.corpExpense.goodWhen).toBe('down');
    expect(n.corpExpense.phrase).toContain('no se reparte');
  });
  it('resultado positivo/negativo en lenguaje simple', () => {
    expect(n.finalResult.phrase).toContain('gana');
    const loss = computeResults([mov({ unit: 'UN01', record_type: 'COSTO_RECONOCIDO', amount: 100, expense_class: 'DIRECTO', cost_category_id: CAT_ID.MO, movement_date: D })], '2026-10', {});
    expect(buildNarrative(loss, prev).finalResult.phrase).toContain('pierde');
  });
});
