import { describe, expect, it } from 'vitest';
import { summarizeHoursByProject, totalHours, validateHours } from './hours-summary';

const e = (id: number, specialist_id: number, project_id: number, hours: number) => ({
  id, specialist_id, project_id, task_id: null, work_date: '2026-10-12', hours, description: null,
});

describe('horas-hombre', () => {
  const entries = [e(1, 1, 1, 4), e(2, 2, 1, 2.5), e(3, 1, 1, 1.5), e(4, 1, 2, 3)];
  it('resumen por proyecto con desglose por persona', () => {
    const s = summarizeHoursByProject(entries);
    expect(s[0]).toMatchObject({ projectId: 1, totalHours: 8, entries: 3 });
    expect(s[0].bySpecialist).toEqual([{ specialistId: 1, hours: 5.5 }, { specialistId: 2, hours: 2.5 }]);
    expect(s[1]).toMatchObject({ projectId: 2, totalHours: 3 });
  });
  it('total general', () => expect(totalHours(entries)).toBe(11));
  it('valida horas (0 < h ≤ 24)', () => {
    expect(validateHours(0)).not.toBeNull();
    expect(validateHours(-1)).not.toBeNull();
    expect(validateHours(25)).not.toBeNull();
    expect(validateHours(Number.NaN)).not.toBeNull();
    expect(validateHours(8)).toBeNull();
    expect(validateHours(0.5)).toBeNull();
  });
});
