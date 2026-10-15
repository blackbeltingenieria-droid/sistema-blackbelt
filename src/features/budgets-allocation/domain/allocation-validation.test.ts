import { describe, expect, it } from 'vitest';
import { validateAllocationForm } from './allocation-validation';

describe('validación del reparto mensual', () => {
  it('vacío (0 %) es válido: queda sin repartir', () => expect(validateAllocationForm({}, '')).toBeNull());
  it('suma 100 % con criterio documentado es válido', () => {
    expect(validateAllocationForm({ UN01: 40, UN03: 60 }, 'Horas de soporte')).toBeNull();
  });
  it('suma 100 % sin criterio documentado se rechaza', () => {
    expect(validateAllocationForm({ UN01: 40, UN03: 60 }, '  ')).toMatch(/criterio/);
  });
  it('parcial o >100 % se rechaza (no se asume reparto parejo ni incompleto)', () => {
    expect(validateAllocationForm({ UN01: 50 }, 'x')).toMatch(/100 %/);
    expect(validateAllocationForm({ UN01: 70, UN02: 50 }, 'x')).toMatch(/100 %/);
  });
  it('porcentaje fuera de rango o NaN se rechaza', () => {
    expect(validateAllocationForm({ UN01: -5 }, 'x')).toMatch(/entre 0 y 100/);
    expect(validateAllocationForm({ UN02: Number.NaN }, 'x')).toMatch(/entre 0 y 100/);
  });
});
