import { describe, expect, it } from 'vitest';
import { CAT_ID, mov } from '../../../test/factories';
import { rankSoftwareTools } from './tool-ranking';

describe('ranking de herramientas (SOFT por proveedor)', () => {
  const soft = (over: Parameters<typeof mov>[0]) => mov({ cost_category_id: CAT_ID.SOFT, ...over });
  const movs = [
    soft({ counterparty: 'CANVA', amount: 55 }),
    soft({ counterparty: 'canva ', amount: 45 }),
    soft({ counterparty: 'ZOOM', amount: 30, unit: 'UN02', expense_class: 'ATRIBUIBLE' }),
    soft({ counterparty: null, detail: 'Licencia Figma', amount: 20, unit: 'UN01', expense_class: 'ATRIBUIBLE' }),
    // excluidos
    soft({ counterparty: 'CANVA', amount: 999, status: 'BORRADOR' }),
    soft({ counterparty: 'CANVA', amount: 999, movement_date: '2026-09-02' }),
    mov({ counterparty: 'BITEL', amount: 999, cost_category_id: CAT_ID.SERV }),
    soft({ counterparty: 'OTRO', amount: 50, record_type: 'PAGO', expense_class: 'NO_APLICA' }),
  ];

  it('agrupa por proveedor sin distinguir mayúsculas ni espacios y ordena por gasto', () => {
    const r = rankSoftwareTools(movs, CAT_ID.SOFT, '2026-10');
    expect(r.map((x) => [x.name, x.total])).toEqual([['CANVA', 100], ['ZOOM', 30], ['Licencia Figma', 20]]);
  });
  it('calcula la participación y es trazable', () => {
    const r = rankSoftwareTools(movs, CAT_ID.SOFT, '2026-10');
    expect(r[0].sharePct).toBeCloseTo((100 / 150) * 100, 6);
    expect(r[0].ids).toHaveLength(2);
  });
  it('sin mes considera todo el período elegible', () => {
    const r = rankSoftwareTools(movs, CAT_ID.SOFT);
    expect(r.find((x) => x.name === 'CANVA')?.total).toBe(1099);
  });
  it('solo cuenta costo reconocido (no PAGO)', () => {
    expect(rankSoftwareTools(movs, CAT_ID.SOFT, '2026-10').some((x) => x.name === 'OTRO')).toBe(false);
  });
});
