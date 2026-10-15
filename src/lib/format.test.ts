import { describe, expect, it } from 'vitest';
import { currentMonth, formatDateShort, monthLabel, monthRange } from './format';

describe('format', () => {
  it('currentMonth AAAA-MM', () => expect(currentMonth(new Date(2026, 9, 14))).toBe('2026-10'));
  it('monthLabel', () => expect(monthLabel('2026-10')).toBe('octubre 2026'));
  it('monthRange cruza de año, más reciente primero', () => {
    expect(monthRange('2026-11', '2027-02')).toEqual(['2027-02', '2027-01', '2026-12', '2026-11']);
  });
  it('formatDateShort', () => {
    expect(formatDateShort('2026-10-05')).toBe('05/10/2026');
    expect(formatDateShort(null)).toBe('—');
  });
});

describe('formatos para gráficos', () => {
  it('monthShort y formatPenShort', async () => {
    const { monthShort, formatPenShort } = await import('./format');
    expect(monthShort('2026-07')).toBe('jul 26');
    expect(formatPenShort(1250)).toBe('1.3k');
    expect(formatPenShort(-2000)).toBe('-2k');
    expect(formatPenShort(450)).toBe('450');
  });
});
