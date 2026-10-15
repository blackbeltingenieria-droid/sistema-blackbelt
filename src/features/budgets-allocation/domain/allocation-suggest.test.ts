import { describe, expect, it } from 'vitest';
import { allocationByIncome } from './allocation-suggest';

describe('reparto sugerido según ventas', () => {
  it('reparte en enteros que suman 100', () => {
    const p = allocationByIncome({ UN01: 1000, UN02: 1000, UN03: 1000 });
    expect(p).toEqual({ UN01: 34, UN02: 33, UN03: 33, UN04: 0, UN05: 0 });
    expect(Object.values(p ?? {}).reduce((a, b) => a + (b ?? 0), 0)).toBe(100);
  });
  it('sin ventas no sugiere nada', () => {
    expect(allocationByIncome({})).toBeNull();
  });
});
