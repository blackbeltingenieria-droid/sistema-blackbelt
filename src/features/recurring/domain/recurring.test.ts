import { describe, expect, it } from 'vitest';
import { SEED_BUSINESS_UNITS, SEED_COST_CATEGORIES } from '../../catalogs/services/seed-data';
import { EXCEL_DB_MOVEMENTS } from '../../excel-data/excel-local';
import { EXCEL_EGRESOS } from '../../excel-data/excel-raw';
import { enrichMovement } from '../../movements/domain/movement-rules';
import { buildRecurringReport, serviceKey } from './recurring';

const code = (id: number) => SEED_BUSINESS_UNITS.find((u) => u.id === id)?.code ?? '';
const movs = EXCEL_DB_MOVEMENTS.map((m) => enrichMovement(m, code(m.business_unit_id)));
const catCode = (id: number) => SEED_COST_CATEGORIES.find((c) => c.id === id)?.code;
const excelSum = (groups: string[]) => Math.round(EXCEL_EGRESOS.filter((e) => groups.includes(e.group)).reduce((a, e) => a + e.amount, 0) * 100) / 100;

describe('servicios y marketing', () => {
  it('teléfono + publicidad = filas de TABLA_EGRESOS de esos grupos', () => {
    const r = buildRecurringReport(movs, catCode, ['servicios', 'marketing']);
    expect(r.groupTotals.servicios).toBe(119.7);            // Bitel × 3
    expect(r.groupTotals.marketing).toBe(326.4);            // Publicidad FB 250.06 + 76.34
    expect(r.total).toBe(Math.round((119.7 + 326.4) * 100) / 100);
    const bitel = r.services.find((s) => s.key === 'BITEL');
    expect(bitel).toMatchObject({ recurring: true, lastAmount: 39.9, change: 0, nextDate: '2026-11-14' });
    expect(Object.keys(bitel?.byMonth ?? {})).toEqual(['2026-08', '2026-09', '2026-10']);
  });

  it('herramientas digitales = grupo HERRAMIENTAS DIGITALES del Excel', () => {
    const r = buildRecurringReport(movs, catCode, ['herramientas']);
    expect(r.total).toBe(excelSum(['HERRAMIENTAS DIGITALES']));
    expect(r.months).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(r.services.find((s) => s.key === 'CANVA')?.recurring).toBe(true);
  });

  it('nombre del servicio', () => {
    expect(serviceKey({ counterparty: null, detail: 'Pago Bitel octubre' })).toBe('BITEL');
    expect(serviceKey({ counterparty: 'BITEL ', detail: 'x' })).toBe('BITEL');
  });
});
