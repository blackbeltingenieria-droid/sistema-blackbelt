import { describe, expect, it } from 'vitest';
import { SEED_BUSINESS_UNITS } from '../../catalogs/services/seed-data';
import { EXCEL_DB_MOVEMENTS } from '../../excel-data/excel-local';
import { enrichMovement } from '../../movements/domain/movement-rules';
import { computeCashForMonths, computeResults, computeResultsForMonths } from './calculations';
import { EXCEL_TOTALES } from '../../excel-data/excel-raw';
import { periodLabel, periodMonths, previousLabel, previousMonths } from './period';

const code = (id: number) => SEED_BUSINESS_UNITS.find((u) => u.id === id)?.code ?? '';
const movs = EXCEL_DB_MOVEMENTS.map((m) => enrichMovement(m, code(m.business_unit_id)));
const dataMonths = [...new Set(movs.map((m) => m.mes))];

describe('periodos de Resultados y caja', () => {
  it('meses de cada periodo', () => {
    expect(periodMonths({ kind: 'month', month: '2026-10' }, dataMonths, '2026-10')).toEqual(['2026-10']);
    expect(periodMonths({ kind: 'range', from: '2026-08', to: '2026-10' }, dataMonths, '2026-10')).toEqual(['2026-08', '2026-09', '2026-10']);
    const all = periodMonths({ kind: 'all' }, dataMonths, '2026-11');
    expect(all).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);   // la empresa empezó en agosto 2026
    expect(periodMonths({ kind: 'year', year: '2026' }, dataMonths, '2026-11')).toHaveLength(11);
  });

  it('periodo anterior del mismo largo', () => {
    expect(previousMonths({ kind: 'range', from: '2026-08', to: '2026-10' }, ['2026-08', '2026-09', '2026-10'])).toEqual(['2026-05', '2026-06', '2026-07']);
    expect(previousMonths({ kind: 'month', month: '2026-01' }, ['2026-01'])).toEqual(['2025-12']);
    expect(previousMonths({ kind: 'all' }, ['2026-01'])).toEqual([]);
    expect(previousLabel({ kind: 'month', month: '2026-10' }, ['2026-09'])).toBe('septiembre');
    expect(periodLabel({ kind: 'range', from: '2026-08', to: '2026-10' }, ['2026-08', '2026-09', '2026-10'])).toBe('agosto 2026 – octubre 2026');
  });

  it('TODO desde el inicio cuadra con el Excel: vendiste 5,340, gastaste 6,282.10, caja 557.90', () => {
    const E = EXCEL_TOTALES;
    const all = periodMonths({ kind: 'all' }, dataMonths, '2026-11');
    const r = computeResultsForMonths(movs, all, () => ({}));
    expect(r.totals.income).toBe(E.ingresos);
    expect(Math.round((r.totals.income - r.totals.finalResult) * 100) / 100).toBe(E.egresos);
    expect(r.totals.finalResult).toBe(Math.round((E.ingresos - E.egresos) * 100) / 100);
    expect(r.reconciliation.ok).toBe(true);
    const c = computeCashForMonths(movs, all, 0);
    expect(c.closingBalance).toBe(E.fondoEnCaja);
    expect(c.netFlow).toBe(E.fondoEnCaja);
    expect(c.periodOpening).toBe(0);
    expect(c.month.cobros.amount).toBe(E.ingresos);
    expect(c.month.aportes.amount).toBe(E.inversion);
    expect(c.month.pagos.amount).toBe(E.egresos);
  });

  it('un rango = suma de sus meses; la caja arranca con lo que había antes', () => {
    const months = ['2026-08', '2026-09', '2026-10'];
    const r = computeResultsForMonths(movs, months, () => ({}));
    const sum = months.reduce((a, m) => a + computeResults(movs, m, {}).totals.finalResult, 0);
    expect(r.totals.finalResult).toBe(Math.round(sum * 100) / 100);
    const c = computeCashForMonths(movs, ['2026-09', '2026-10'], 0);
    const aug = computeCashForMonths(movs, ['2026-08'], 0);
    expect(c.periodOpening).toBe(aug.closingBalance);   // septiembre arranca con lo que quedó en agosto
    expect(c.closingBalance).toBe(computeCashForMonths(movs, ['2026-10'], 0).closingBalance);
  });
});
