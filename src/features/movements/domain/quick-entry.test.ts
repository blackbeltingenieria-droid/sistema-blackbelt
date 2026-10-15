import { describe, expect, it } from 'vitest';
import { SEED_AREAS, SEED_BUSINESS_UNITS, SEED_COST_CATEGORIES } from '../../catalogs/services/seed-data';
import type { ProjectRow } from '../../clients-projects/types';
import { computeControl, enrichMovement } from './movement-rules';
import {
  buildCashPair, buildMainMovement, groupEvents, pairedCode, pendingBalances, quickInputFromMovement,
  suggestCategoryCode, validateQuick, type QuickEntryInput,
} from './quick-entry';

const project: ProjectRow = {
  id: 1, code: 'PRY-2026-001', clientId: 1, clientName: 'WILMER SANCHEZ', projectName: 'Desarrollo de tesis',
  businessUnitId: 3, businessUnitCode: 'UN03', businessUnitName: 'Investigación y Desarrollo', businessUnitColor: '#6C3FC5',
  status: 'activo', contractedAmount: 3000, paidAmount: 0, pendingBalance: 3000,
} as ProjectRow;
const C = { units: SEED_BUSINESS_UNITS, areas: SEED_AREAS, categories: SEED_COST_CATEGORIES, projects: [project] };
const code = (list: { id: number; code: string }[], id: number) => list.find((x) => x.id === id)?.code;
const unitCode = (id: number) => code(SEED_BUSINESS_UNITS, id) ?? '';

const base: QuickEntryInput = {
  kind: 'EGRESO', date: '2026-10-08', amount: 39.9, concept: 'Bitel mensajes y llamadas', settled: true,
  paymentMethod: 'YAPE', counterparty: null, unitId: null, projectId: null, categoryId: null,
};

describe('suggestCategoryCode — conceptos del Excel (12_LEGADO)', () => {
  it.each([
    ['Bitel servicio telefónico', 'SERV'],
    ['CANVA diseño', 'SOFT'],
    ['Google Meet reuniones', 'SOFT'],
    ['Página web', 'SOFT'],
    ['Pago a la notaría', 'ADM'],
    ['Trámite en la SUNARP', 'ADM'],
    ['Meta Ads desarrollo web', 'PUB'],
    ['Honorario especialista tesis', 'MO'],
    ['Taxi a obra', 'MOV'],
    ['Algo raro', null],
  ])('%s → %s', (concept, expected) => {
    expect(suggestCategoryCode(concept)).toBe(expected);
  });
});

describe('buildMainMovement — egreso sin clasificar', () => {
  it('va a toda la empresa (CORP), se clasifica solo y cuenta al guardar', () => {
    const v = buildMainMovement(base, C);
    expect(v.record_type).toBe('COSTO_RECONOCIDO');
    expect(unitCode(v.business_unit_id)).toBe('CORP');
    expect(code(SEED_COST_CATEGORIES, v.cost_category_id)).toBe('SERV');
    expect(code(SEED_AREAS, v.area_id)).toBe('ADM');
    expect(v.expense_class).toBe('COMPARTIDO');
    expect(computeControl({ movement_code: 'X', ...v }, 'CORP')).toBe('OK');
    expect(v.status).toBe('VALIDADO');
  });
  it('con unidad elegida → ATRIBUIBLE; con proyecto → DIRECTO en la unidad del proyecto', () => {
    const a = buildMainMovement({ ...base, concept: 'Meta Ads tesis', unitId: 3 }, C);
    expect([unitCode(a.business_unit_id), a.expense_class, code(SEED_AREAS, a.area_id)]).toEqual(['UN03', 'ATRIBUIBLE', 'MKT']);
    const d = buildMainMovement({ ...base, concept: 'Honorario especialista', projectId: 1 }, C);
    expect([unitCode(d.business_unit_id), d.expense_class, d.status]).toEqual(['UN03', 'DIRECTO', 'VALIDADO']);
  });
  it('sin palabra conocida → categoría Otros, y sigue contando', () => {
    const v = buildMainMovement({ ...base, concept: 'Varios' }, C);
    expect(code(SEED_COST_CATEGORIES, v.cost_category_id)).toBe('OTR');
    expect(v.status).toBe('VALIDADO');
  });
});

describe('ingreso', () => {
  it('exige unidad o proyecto', () => {
    expect(validateQuick({ ...base, kind: 'INGRESO' }, C).unit).toBeTruthy();
    expect(validateQuick({ ...base, kind: 'INGRESO', projectId: 1 }, C)).toEqual({});
  });
  it('del proyecto: unidad del proyecto, NO_APLICA, control OK', () => {
    const v = buildMainMovement({ ...base, kind: 'INGRESO', concept: 'Cuota tesis', amount: 1500, projectId: 1 }, C);
    expect([v.record_type, unitCode(v.business_unit_id), v.expense_class, v.status]).toEqual(['INGRESO_RECONOCIDO', 'UN03', 'NO_APLICA', 'VALIDADO']);
  });
});

describe('cobro/pago enlazado', () => {
  it('el pago copia monto y unidad, va a FIN/CXP y apunta al gasto', () => {
    const main = buildMainMovement(base, C);
    const pay = buildCashPair(main, 'MOV-2026-0007', C);
    expect([pay.record_type, pay.amount, unitCode(pay.business_unit_id), code(SEED_AREAS, pay.area_id), code(SEED_COST_CATEGORIES, pay.cost_category_id)])
      .toEqual(['PAGO', 39.9, 'CORP', 'FIN', 'CXP']);
    expect(pairedCode(pay.notes)).toBe('MOV-2026-0007');
    expect(computeControl({ movement_code: 'X', ...pay }, 'CORP')).toBe('OK');
  });
  it('un cobro de ingreso es COBRO + CXC', () => {
    const main = buildMainMovement({ ...base, kind: 'INGRESO', projectId: 1 }, C);
    expect(buildCashPair(main, 'MOV-1', C).record_type).toBe('COBRO');
  });
});

describe('groupEvents y pendientes', () => {
  const main = { id: 1, movement_code: 'MOV-1', ...buildMainMovement(base, C) };
  const pay = { id: 2, movement_code: 'MOV-2', ...buildCashPair(main, 'MOV-1', C) };
  const other = { id: 3, movement_code: 'MOV-3', ...buildMainMovement({ ...base, settled: false, amount: 100 }, C) };

  it('el pago enlazado no aparece aparte; el gasto lo lleva', () => {
    const g = groupEvents([main, pay, other]);
    expect(g.map((e) => [e.main.movement_code, e.pair?.movement_code ?? null])).toEqual([['MOV-1', 'MOV-2'], ['MOV-3', null]]);
  });
  it('debes = gastos − pagos', () => {
    const rows = [main, pay, other].map((r) => enrichMovement(r, unitCode(r.business_unit_id)));
    expect(pendingBalances(rows, '2026-10')).toEqual({ receivable: 0, payable: 100 });
  });
  it('editar recupera los datos del formulario simple', () => {
    const q = quickInputFromMovement(main, true, C);
    expect([q.kind, q.amount, q.unitId, q.settled, q.concept]).toEqual(['EGRESO', 39.9, null, true, base.concept]);
  });
});
