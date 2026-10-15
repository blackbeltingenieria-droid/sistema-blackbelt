import { describe, expect, it } from 'vitest';
import { AREA_ID, CAT_ID, mov } from '../../../test/factories';
import { computeControl, computeMes, defaultMovementState, isEligible, nextMovementCode } from './movement-rules';

// Casos de la hoja 11_EJEMPLOS del Excel Modelo C: cada uno, bien clasificado, debe dar control OK.
const EJEMPLOS = [
  { caso: 'Bitel compartido',            area: 'ADM',     unit: 'CORP', cat: 'SERV', clase: 'COMPARTIDO', tipo: 'COSTO_RECONOCIDO' },
  { caso: 'Anuncio UN01',                area: 'MKT',     unit: 'UN01', cat: 'PUB',  clase: 'ATRIBUIBLE', tipo: 'COSTO_RECONOCIDO' },
  { caso: 'Anuncio UN02',                area: 'MKT',     unit: 'UN02', cat: 'PUB',  clase: 'ATRIBUIBLE', tipo: 'COSTO_RECONOCIDO' },
  { caso: 'Anuncio UN03',                area: 'MKT',     unit: 'UN03', cat: 'PUB',  clase: 'ATRIBUIBLE', tipo: 'COSTO_RECONOCIDO' },
  { caso: 'Canva compartido',            area: 'MKT',     unit: 'CORP', cat: 'SOFT', clase: 'COMPARTIDO', tipo: 'COSTO_RECONOCIDO' },
  { caso: 'Especialista tesis',          area: 'U03-MET', unit: 'UN03', cat: 'MO',   clase: 'DIRECTO',    tipo: 'COSTO_RECONOCIDO' },
  { caso: 'Material prototipo',          area: 'U03-TEC', unit: 'UN03', cat: 'MAT',  clase: 'DIRECTO',    tipo: 'COSTO_RECONOCIDO' },
  { caso: 'Equipo geofísico',            area: 'U04-CAM', unit: 'UN04', cat: 'ACT',  clase: 'NO_APLICA',  tipo: 'COMPRA_ACTIVO' },
  { caso: 'Servicio de innovación U05',  area: 'U05-INN', unit: 'UN05', cat: 'OTR',  clase: 'NO_APLICA',  tipo: 'INGRESO_RECONOCIDO' },
  { caso: 'Contrato de tesis',           area: 'U03-MET', unit: 'UN03', cat: 'OTR',  clase: 'NO_APLICA',  tipo: 'INGRESO_RECONOCIDO' },
  { caso: 'Abono de cliente',            area: 'FIN',     unit: 'UN03', cat: 'CXC',  clase: 'NO_APLICA',  tipo: 'COBRO' },
  { caso: 'Aporte de socio',             area: 'FIN',     unit: 'CORP', cat: 'SOC',  clase: 'NO_APLICA',  tipo: 'APORTE_SOCIO' },
  { caso: 'Marketing como servicio',     area: 'U05-MER', unit: 'UN05', cat: 'MO',   clase: 'DIRECTO',    tipo: 'COSTO_RECONOCIDO' },
] as const;

describe('11_EJEMPLOS — clasificación correcta da control OK', () => {
  it.each(EJEMPLOS)('$caso', (e) => {
    const m = mov({
      unit: e.unit,
      area_id: AREA_ID[e.area],
      cost_category_id: CAT_ID[e.cat as keyof typeof CAT_ID],
      expense_class: e.clase,
      record_type: e.tipo,
    });
    expect(m.control).toBe('OK');
  });
});

describe('computeControl — reglas de revisión del Excel', () => {
  it('compartido fuera de CORP → REVISAR CORP', () => {
    expect(mov({ unit: 'UN03', expense_class: 'COMPARTIDO' }).control).toBe('REVISAR CORP');
  });
  it('directo/atribuible en CORP → REVISAR UNIDAD', () => {
    expect(mov({ unit: 'CORP', expense_class: 'DIRECTO' }).control).toBe('REVISAR UNIDAD');
    expect(mov({ unit: 'CORP', expense_class: 'ATRIBUIBLE' }).control).toBe('REVISAR UNIDAD');
  });
  it('ingreso reconocido en CORP → REVISAR INGRESO', () => {
    expect(mov({ unit: 'CORP', record_type: 'INGRESO_RECONOCIDO', expense_class: 'NO_APLICA' }).control).toBe('REVISAR INGRESO');
  });
  it('costo con clase NO_APLICA → REVISAR CLASE', () => {
    expect(mov({ unit: 'UN01', record_type: 'COSTO_RECONOCIDO', expense_class: 'NO_APLICA' }).control).toBe('REVISAR CLASE');
  });
  it('no-costo con clase distinta de NO_APLICA → USAR NO_APLICA', () => {
    expect(mov({ unit: 'UN01', record_type: 'PAGO', expense_class: 'DIRECTO' }).control).toBe('USAR NO_APLICA');
  });
  it('importe 0, negativo o NaN → INCOMPLETO', () => {
    expect(mov({ amount: 0 }).control).toBe('INCOMPLETO');
    expect(mov({ amount: -5 }).control).toBe('INCOMPLETO');
    expect(mov({ amount: Number.NaN }).control).toBe('INCOMPLETO');
  });
  it('sin fecha, sin área o sin categoría → INCOMPLETO', () => {
    expect(mov({ movement_date: '' }).control).toBe('INCOMPLETO');
    expect(mov({ area_id: 0 }).control).toBe('INCOMPLETO');
    expect(mov({ cost_category_id: 0 }).control).toBe('INCOMPLETO');
  });
  it('INCOMPLETO tiene prioridad sobre las revisiones', () => {
    expect(
      computeControl(
        { movement_code: 'X', movement_date: '2026-10-01', record_type: 'COSTO_RECONOCIDO', amount: 0, business_unit_id: 3, area_id: 1, cost_category_id: 1, expense_class: 'COMPARTIDO' },
        'UN03',
      ),
    ).toBe('INCOMPLETO');
  });
});

describe('mes calculado', () => {
  it('toma AAAA-MM de la fecha', () => {
    expect(computeMes('2026-10-12')).toBe('2026-10');
    expect(computeMes('2027-01-31T10:00:00Z')).toBe('2027-01');
  });
  it('vacío si no hay fecha', () => {
    expect(computeMes('')).toBe('');
    expect(computeMes(null)).toBe('');
  });
});

describe('elegibilidad VALIDADO + OK', () => {
  it('solo VALIDADO con control OK alimenta reportes', () => {
    expect(isEligible(mov({ status: 'VALIDADO' }))).toBe(true);
    expect(isEligible(mov({ status: 'BORRADOR' }))).toBe(false);
    expect(isEligible(mov({ status: 'VALIDADO', amount: 0 }))).toBe(false);
    expect(isEligible(mov({ status: 'VALIDADO', unit: 'UN01', expense_class: 'COMPARTIDO' }))).toBe(false);
  });
});

describe('valores por defecto y código', () => {
  it('un movimiento nuevo nace en CORP y BORRADOR', () => {
    expect(defaultMovementState(6)).toEqual({ business_unit_id: 6, status: 'BORRADOR' });
  });
  it('genera MOV-AAAA-NNNN correlativo por año', () => {
    expect(nextMovementCode([], '2026-10-12')).toBe('MOV-2026-0001');
    expect(nextMovementCode(['MOV-2026-0002', 'MOV-2026-0009', 'MOV-2025-0050'], '2026-11-01')).toBe('MOV-2026-0010');
    expect(nextMovementCode(['MOV-2026-0002'], '2027-01-05')).toBe('MOV-2027-0001');
  });
});
