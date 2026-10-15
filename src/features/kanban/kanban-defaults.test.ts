import { describe, expect, it } from 'vitest';
import type { Sprint, Task } from './types';
import { defaultAssigneeId, defaultSprintId, nextSprintDefaults, sprintEnd } from './kanban-defaults';

const sp = (id: number, status: Sprint['status'], end: string | null): Sprint =>
  ({ id, project_id: 1, name: `S${id}`, goal: null, start_date: null, end_date: end, status }) as Sprint;
const tk = (id: number, assignee_id: number | null) => ({ id, assignee_id }) as Task;

describe('autorrelleno del Kanban', () => {
  it('sprint activo por defecto', () => {
    const s = [sp(1, 'cerrado', '2026-09-30'), sp(2, 'activo', '2026-10-14'), sp(3, 'planificado', null)];
    expect(defaultSprintId(s, null)).toBe(2);
    expect(defaultSprintId(s, 3)).toBe(3);
    expect(sprintEnd(s, 2)).toBe('2026-10-14');
  });
  it('responsable por defecto', () => {
    expect(defaultAssigneeId([tk(1, 4), tk(2, 7)], 1, false)).toBe(7);
    expect(defaultAssigneeId([tk(1, 4)], 3, true)).toBe(3);
    expect(defaultAssigneeId([], 1, false)).toBe(1);
  });
  it('siguiente sprint de 2 semanas', () => {
    expect(nextSprintDefaults([sp(1, 'activo', '2026-10-20')], '2026-10-15')).toEqual({ name: 'Sprint 2', start: '2026-10-21', end: '2026-11-03' });
    expect(nextSprintDefaults([sp(1, 'cerrado', '2026-09-01')], '2026-10-15')).toEqual({ name: 'Sprint 2', start: '2026-10-15', end: '2026-10-28' });
  });
});
