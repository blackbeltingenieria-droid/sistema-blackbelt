import { describe, expect, it } from 'vitest';
import type { DbWorkHour } from '../../types/database';
import type { Task } from '../kanban/types';
import { lastEntryDefaults, suggestedTaskId } from './hours-defaults';

const e = (o: Partial<DbWorkHour>): DbWorkHour => ({ id: 1, specialist_id: 3, project_id: 1, task_id: null, work_date: '2026-10-01', hours: 8, description: null, ...o });

describe('autorrelleno de horas', () => {
  it('usa el proyecto y el horario del último registro de la persona', () => {
    const d = lastEntryDefaults([
      e({ id: 1, work_date: '2026-10-01', project_id: 1, start_time: '07:30', end_time: '16:30', breaks: '12:00-13:00' }),
      e({ id: 2, work_date: '2026-10-03', project_id: 2 }),
      e({ id: 3, work_date: '2026-10-09', specialist_id: 9, project_id: 5 }),
    ], 3);
    expect(d).toEqual({ projectId: 2, start: '07:30', end: '16:30', breaks: [{ start: '12:00', end: '13:00' }] });
  });
  it('sin registros no inventa nada', () => {
    expect(lastEntryDefaults([], 3)).toBeNull();
  });
  it('sugiere la tarea en curso si es solo una', () => {
    const t = (id: number, status: Task['status'], assignee_id: number | null) => ({ id, status, assignee_id }) as Task;
    expect(suggestedTaskId([t(1, 'en_curso', 3), t(2, 'por_hacer', 3)], 3)).toBe(1);
    expect(suggestedTaskId([t(1, 'en_curso', 3), t(2, 'en_curso', 3)], 3)).toBe(0);
  });
});
