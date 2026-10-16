import { describe, expect, it } from 'vitest';
import { SEED_BUSINESS_UNITS } from '../../catalogs/services/seed-data';
import { EXCEL_DB_MOVEMENTS } from '../../excel-data/excel-local';
import { enrichMovement } from '../../movements/domain/movement-rules';
import { computeCashForMonths, computeResults, computeResultsForMonths } from './calculations';
import { periodLabel, periodMonths, previousLabel, previousMonths } from './period';

const code = (id: number) => SEED_BUSINESS_UNITS.find((u) => u.id === id)?.code ?? '';
const movs = EXCEL_DB_MOVEMENTS.map((m) => enrichMovement(m, code(m.business_unit_id)));
const dataMonths = [...new Set(movs.map((m) => m.mes))];

describe('periodos de Resultados y caja', () => {
  it('meses de cada periodo', () => {
    expect(periodMonths({ kind: 'month', month: '2026-10' }, dataMonths, '2026-10')).toEqual(['2026-10']);
    expect(periodMonths({ kind: 'range', from: '2026-08', to: '2026-10' }, dataMonths, '2026-10')).toEqual(['2026-08', '2026-09', '2026-10']);
    const all = periodMonths({ kind: 'all' }, dataMonths, '2026-10');
    expect(all[0]).toBe('2025-10');            // los adelantos de 2025
    expect(all.at(-1)).toBe('2026-10');
    expect(all).toHaveLength(13);
    expect(periodMonths({ kind: 'year', year: '2026' }, dataMonths, '2026-10')).toHaveLength(10);
  });

  it('periodo anterior del mismo largo', () => {
    expect(previousMonths({ kind: 'range', from: '2026-08', to: '2026-10' }, ['2026-08', '2026-09', '2026-10'])).toEqual(['2026-05', '2026-06', '2026-07']);
    expect(previousMonths({ kind: 'month', month: '2026-01' }, ['2026-01'])).toEqual(['2025-12']);
    expect(previousMonths({ kind: 'all' }, ['2026-01'])).toEqual([]);
    expect(previousLabel({ kind: 'month', month: '2026-10' }, ['2026-09'])).toBe('septiembre');
    expect(periodLabel({ kind: 'range', from: '2026-08', to: '2026-10' }, ['2026-08', '2026-09', '2026-10'])).toBe('agosto 2026 – octubre 2026');
  });

  it('TODO desde el inicio cuadra con el Excel: vendiste 5,240, gastaste 4,839.73, caja 1,900.27', () => {
    const all = periodMonths({ kind: 'all' }, dataMonths, '2026-10');
    const r = computeResultsForMonths(movs, all, () => ({}));
    expect(r.totals.income).toBe(5240);
    expect(Math.round((r.totals.income - r.totals.finalResult) * 100) / 100).toBe(4839.73);
    expect(r.totals.finalResult).toBe(400.27);
    expect(r.reconciliation.ok).toBe(true);
    const c = computeCashForMonths(movs, all, 0);
    expect(c.closingBalance).toBe(1900.27);
    expect(c.netFlow).toBe(1900.27);
    expect(c.periodOpening).toBe(0);
    expect(c.month.cobros.amount).toBe(5240);
    expect(c.month.aportes.amount).toBe(1500);
    expect(c.month.pagos.amount).toBe(4839.73);
  });

  it('un rango = suma de sus meses; la caja arranca con lo que había antes', () => {
    const months = ['2026-08', '2026-09', '2026-10'];
    const r = computeResultsForMonths(movs, months, () => ({}));
    const sum = months.reduce((a, m) => a + computeResults(movs, m, {}).totals.finalResult, 0);
    expect(r.totals.finalResult).toBe(Math.round(sum * 100) / 100);
    expect(r.totals.finalResult).toBe(-3149.73);   // 400.27 − 3,550 de adelantos cobrados en 2025
    const c = computeCashForMonths(movs, months, 0);
    expect(c.periodOpening).toBe(3550);            // los adelantos de octubre 2025
    expect(c.closingBalance).toBe(1900.27);
  });
});
