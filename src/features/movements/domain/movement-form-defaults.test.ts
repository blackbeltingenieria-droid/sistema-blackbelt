import { describe, expect, it } from 'vitest';
import { emptyMovementForm, suggestClass } from './movement-form-defaults';

describe('formulario de movimiento — valores por defecto', () => {
  it('nace en CORP, BORRADOR y clase COMPARTIDO', () => {
    const f = emptyMovementForm(6, '2026-10-14');
    expect(f).toMatchObject({ business_unit_id: 6, status: 'BORRADOR', expense_class: 'COMPARTIDO', record_type: 'COSTO_RECONOCIDO' });
  });
  it('tipos que no son costo fuerzan NO_APLICA', () => {
    for (const t of ['COBRO', 'PAGO', 'APORTE_SOCIO', 'RETIRO_SOCIO', 'COMPRA_ACTIVO', 'INGRESO_RECONOCIDO'] as const) {
      expect(suggestClass(t, 'UN01', false, 'DIRECTO')).toBe('NO_APLICA');
    }
  });
  it('volver a costo desde NO_APLICA propone según unidad y proyecto', () => {
    expect(suggestClass('COSTO_RECONOCIDO', 'CORP', false, 'NO_APLICA')).toBe('COMPARTIDO');
    expect(suggestClass('COSTO_RECONOCIDO', 'UN02', true, 'NO_APLICA')).toBe('DIRECTO');
    expect(suggestClass('COSTO_RECONOCIDO', 'UN02', false, 'NO_APLICA')).toBe('ATRIBUIBLE');
  });
  it('cambiar de CORP a unidad deja de ser COMPARTIDO; de unidad a CORP pasa a COMPARTIDO', () => {
    expect(suggestClass('COSTO_RECONOCIDO', 'UN03', false, 'COMPARTIDO')).toBe('ATRIBUIBLE');
    expect(suggestClass('COSTO_RECONOCIDO', 'CORP', false, 'DIRECTO')).toBe('COMPARTIDO');
  });
  it('respeta una clase de costo ya coherente', () => {
    expect(suggestClass('COSTO_RECONOCIDO', 'UN03', true, 'ATRIBUIBLE')).toBe('ATRIBUIBLE');
  });
});
