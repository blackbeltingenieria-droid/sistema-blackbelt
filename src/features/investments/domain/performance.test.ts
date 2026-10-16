import { describe, expect, it } from 'vitest';
import type { DbInvestment } from '../../../types/database';
import { CAT_ID, AREA_ID, mov } from '../../../test/factories';
import { EXCEL_DB_INVESTMENTS, EXCEL_DB_MOVEMENTS } from '../../excel-data/excel-local';
import { enrichMovement } from '../../movements/domain/movement-rules';
import { SEED_BUSINESS_UNITS } from '../../catalogs/services/seed-data';
import { buildInvestmentsReport, monthlyInstallment, monthsBetween, nextInvestmentCode } from './performance';

const inv = (o: Partial<DbInvestment>): DbInvestment => ({
  id: 1, code: 'INV-2026-001', kind: 'patrimonio', investor_name: 'SOCIO', investor_doc: '1', amount: 1000,
  investment_date: '2026-08-01', payment_method: 'YAPE', description: null, interest_rate: 0, term_months: null, ...o,
});

describe('rendimiento de inversiones', () => {
  it('Excel real: socio Hans aportó S/ 1,500 y la empresa ganó S/ 400.27', () => {
    const code = (id: number) => SEED_BUSINESS_UNITS.find((u) => u.id === id)?.code ?? '';
    const movs = EXCEL_DB_MOVEMENTS.map((m) => enrichMovement(m, code(m.business_unit_id)));
    const r = buildInvestmentsReport(EXCEL_DB_INVESTMENTS, movs, '2026-10-16');
    expect(r.equityCapital).toBe(1500);
    expect(r.accumulatedProfit).toBe(400.27);
    expect(r.returnPct).toBe(26.68);
    expect(r.investors).toHaveLength(1);
    expect(r.investors[0]).toMatchObject({ name: 'HANS CARLOS TORRES MURRIETA', contributed: 1500, sharePct: 100, valueToday: 1900.27 });
    expect(r.phrases[1]).toContain('rendimiento de 26.68 %');
  });

  it('dos socios: la utilidad se reparte según lo que aportó cada uno', () => {
    const movs = [
      mov({ unit: 'UN03', record_type: 'INGRESO_RECONOCIDO', amount: 1000, expense_class: 'NO_APLICA', cost_category_id: CAT_ID.OTR, movement_date: '2026-09-10' }),
    ];
    const r = buildInvestmentsReport([inv({ investor_doc: 'A', amount: 3000 }), inv({ id: 2, code: 'INV-2026-002', investor_name: 'B', investor_doc: 'B', amount: 1000 })], movs, '2026-10-01');
    expect(r.investors.map((i) => [i.sharePct, i.profitShare])).toEqual([[75, 750], [25, 250]]);
  });

  it('deuda: capital devuelto, intereses pagados, saldo y cuota', () => {
    const loan = inv({ kind: 'deuda', code: 'INV-2026-003', amount: 12000, interest_rate: 12, term_months: 12 });
    const movs = [
      mov({ unit: 'CORP', record_type: 'PAGO_PRESTAMO', amount: 1000, expense_class: 'NO_APLICA', cost_category_id: CAT_ID.OTR, area_id: AREA_ID.FIN, notes: 'Inversión INV-2026-003', movement_date: '2026-09-01' }),
      mov({ unit: 'CORP', record_type: 'COSTO_RECONOCIDO', amount: 120, expense_class: 'COMPARTIDO', cost_category_id: CAT_ID.SERV, area_id: AREA_ID.FIN, notes: 'Inversión INV-2026-003', movement_date: '2026-09-01' }),
    ];
    const d = buildInvestmentsReport([loan], movs, '2026-10-01').debts[0];
    expect(d).toMatchObject({ capitalPaid: 1000, interestPaid: 120, outstanding: 11000, installment: 1066.19, yearlyInterest: 1320, monthsElapsed: 2 });
  });

  it('ayudas', () => {
    expect(monthsBetween('2026-08-16', '2026-10-16')).toBe(2);
    expect(monthsBetween('2026-08-16', '2026-10-15')).toBe(1);
    expect(monthlyInstallment(1200, 0, 12)).toBe(100);
    expect(nextInvestmentCode(['INV-2026-001', 'INV-2026-002'], '2026-11-01')).toBe('INV-2026-003');
  });
});
