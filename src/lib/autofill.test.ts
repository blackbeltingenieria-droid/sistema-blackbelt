import { describe, expect, it } from 'vitest';
import { addDays, addMonths, nextCode, normalizeText, todayIso } from './autofill';

describe('autofill helpers', () => {
  it('fechas', () => {
    expect(todayIso(new Date(2026, 9, 5))).toBe('2026-10-05');
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-10-15', 3)).toBe('2027-01-15');
  });
  it('siguiente código', () => {
    expect(nextCode(['PRY-2026-001', 'PRY-2026-007', 'PRY-2024-020', null], 'PRY', 2026)).toBe('PRY-2026-008');
    expect(nextCode([], 'PRY', 2027)).toBe('PRY-2027-001');
  });
  it('normaliza textos', () => {
    expect(normalizeText('  Pago  Bitél ')).toBe('pago bitel');
  });
});
