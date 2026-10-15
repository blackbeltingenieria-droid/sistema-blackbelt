import { describe, expect, it } from 'vitest';
import { CAT_ID, AREA_ID, mov } from '../../../test/factories';
import { computeCash, computeResults } from './calculations';
import { lastMonths, monthlyEvolution } from './presentation';
import { buildBusinessSummary } from './summary';

const D = '2026-10-10';
const data = [
  mov({ unit: 'UN01', record_type: 'INGRESO_RECONOCIDO', amount: 5000, expense_class: 'NO_APLICA', cost_category_id: CAT_ID.OTR, movement_date: D }),
  mov({ unit: 'UN03', record_type: 'INGRESO_RECONOCIDO', amount: 300, expense_class: 'NO_APLICA', cost_category_id: CAT_ID.OTR, movement_date: D }),
  mov({ unit: 'UN01', record_type: 'COSTO_RECONOCIDO', amount: 1200, expense_class: 'DIRECTO', cost_category_id: CAT_ID.MO, area_id: AREA_ID.MKT, movement_date: D }),
  mov({ unit: 'UN03', record_type: 'COSTO_RECONOCIDO', amount: 400, expense_class: 'ATRIBUIBLE', cost_category_id: CAT_ID.PUB, area_id: AREA_ID.MKT, movement_date: D }),
  mov({ unit: 'CORP', record_type: 'COSTO_RECONOCIDO', amount: 600, expense_class: 'COMPARTIDO', cost_category_id: CAT_ID.SOFT, movement_date: D }),
  mov({ unit: 'UN01', record_type: 'COBRO', amount: 2000, expense_class: 'NO_APLICA', cost_category_id: CAT_ID.CXC, movement_date: D }),
  mov({ unit: 'CORP', record_type: 'PAGO', amount: 1500, expense_class: 'NO_APLICA', cost_category_id: CAT_ID.SERV, movement_date: D }),
];
const names = new Map([[CAT_ID.MO, 'Especialistas'], [CAT_ID.PUB, 'Publicidad'], [CAT_ID.SOFT, 'Software']]);
const units = new Map([['UN01', 'Ingeniería'], ['UN03', 'I+D']]);

function summary(movs = data) {
  return buildBusinessSummary({
    mes: '2026-10', results: computeResults(movs, '2026-10', {}), previous: computeResults(movs, '2026-09', {}),
    cash: computeCash(movs, '2026-10', 500), movements: movs,
    evolution: monthlyEvolution(movs, {}, lastMonths('2026-10')), categoryNames: names, unitNames: units,
  });
}

describe('resumen del negocio', () => {
  const s = summary();
  it('vendiste − gastaste = resultado consolidado (cuadra con el Modelo C)', () => {
    expect(s.income).toBe(5300);
    expect(s.spent).toBe(2200);
    expect(s.result).toBe(3100);
    expect(s.income - s.spent).toBe(s.result);
    expect(s.verdict).toBe('gana');
  });
  it('caja y lo que te deben / debes', () => {
    expect(s.cash).toBe(500 + 2000 - 1500);
    expect(s.receivable).toBe(3300);
    expect(s.payable).toBe(700);
  });
  it('explica el porqué en frases simples', () => {
    expect(s.reasons[0]).toBe('Vendiste S/ 5,300 y gastaste S/ 2,200.');
    expect(s.reasons[1]).toContain('Especialistas');
    expect(s.reasons.some((r) => r.startsWith('Ingeniería fue la que más ganó'))).toBe(true);
    expect(s.reasons.some((r) => r.startsWith('I+D perdió S/ 100'))).toBe(true);
  });
  it('sin registros: no inventa veredicto', () => {
    expect(summary([]).verdict).toBe('sin-datos');
    expect(summary([]).reasons).toEqual([]);
  });
});
