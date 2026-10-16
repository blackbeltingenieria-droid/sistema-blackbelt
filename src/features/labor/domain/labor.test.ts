import { describe, expect, it } from 'vitest';
import { SEED_BUSINESS_UNITS } from '../../catalogs/services/seed-data';
import { EXCEL_DB_LABOR_CONTRACTS, EXCEL_DB_MOVEMENTS } from '../../excel-data/excel-local';
import { EXCEL_MANO_OBRA, EXCEL_TOTALES } from '../../excel-data/excel-raw';
import { enrichMovement } from '../../movements/domain/movement-rules';
import { buildLaborReport, laborCodeIn, nextLaborCode, withLaborTag } from './labor';

const code = (id: number) => SEED_BUSINESS_UNITS.find((u) => u.id === id)?.code ?? '';
const movs = EXCEL_DB_MOVEMENTS.map((m) => enrichMovement(m, code(m.business_unit_id)));

describe('mano de obra (TABLA_M.O)', () => {
  const r = buildLaborReport(EXCEL_DB_LABOR_CONTRACTS, movs, '2026-10-16');

  it('cuadra con el Excel: requerido 4,700 · pagado 3,300 · falta 1,400', () => {
    expect(r.totals.agreed).toBe(EXCEL_TOTALES.manoObraRequerido);
    expect(r.totals.paid).toBe(EXCEL_TOTALES.manoObraPagado);
    expect(r.totals.pending).toBe(EXCEL_TOTALES.manoObraFalta);
  });

  it('cada colaborador cuadra con su fila del Excel', () => {
    for (const m of EXCEL_MANO_OBRA) {
      const row = r.rows.find((x) => x.contract.worker_name === m.name);
      expect(row, m.name).toBeDefined();
      expect([row?.paid, row?.pending], m.name).toEqual([m.paid, m.pending]);
    }
  });

  it('fechas de pago y estado: Alanis vencido; Teddy y Henry vencen el 18/10; Johann pendiente', () => {
    const by = (n: string) => r.rows.find((x) => x.contract.worker_name.startsWith(n));
    expect(by('ALANIS')?.status).toBe('vencido');
    expect(by('TEDDY')?.status).toBe('por_vencer');
    expect(by('HENRY')?.daysLeft).toBe(2);
    expect(by('JOHANN')?.status).toBe('pendiente');
    expect(by('EDDY')?.payments.map((p) => [p.date, p.amount])).toEqual([['2026-09-15', 200], ['2026-10-15', 1300]]);
    expect(r.rows[0].status).toBe('vencido');   // lo más urgente primero
    expect(r.phrases[0]).toContain('S/ 1,400.00');
  });

  it('enlace en notas', () => {
    expect(laborCodeIn('Excel fila 3 · Mano de obra CMO-2026-004')).toBe('CMO-2026-004');
    expect(withLaborTag('Excel fila 3 · Mano de obra CMO-2026-004', 'CMO-2026-005')).toBe('Excel fila 3 · Mano de obra CMO-2026-005');
    expect(withLaborTag('Mano de obra CMO-2026-004', null)).toBeNull();
    expect(nextLaborCode(['CMO-2026-007'], '2026-11-01')).toBe('CMO-2026-008');
  });
});
