// features/work-hours/hours-defaults.ts
// Autorrelleno del registro de horas a partir del último registro de la persona.

import type { DbWorkHour } from '../../types/database';
import type { Task } from '../kanban/types';
import { breaksFromText, type TimeBreak } from './time-range';

export interface HoursDefaults {
  projectId: number;
  start: string;
  end: string;
  breaks: TimeBreak[];
}

/** Proyecto y horario del último registro (con horario) de esa persona. null si no tiene. */
export function lastEntryDefaults(entries: DbWorkHour[], specialistId: number): HoursDefaults | null {
  const mine = entries
    .filter((e) => e.specialist_id === specialistId)
    .sort((a, b) => b.work_date.localeCompare(a.work_date) || b.id - a.id);
  if (!mine.length) return null;
  const withTimes = mine.find((e) => e.start_time && e.end_time);
  return {
    projectId: mine[0].project_id,
    start: withTimes?.start_time?.slice(0, 5) ?? '08:00',
    end: withTimes?.end_time?.slice(0, 5) ?? '',
    breaks: breaksFromText(withTimes?.breaks),
  };
}

/** Tarea sugerida: la que la persona tiene "en curso" en ese proyecto (si es solo una). */
export function suggestedTaskId(tasks: Task[], specialistId: number): number {
  const mine = tasks.filter((t) => t.assignee_id === specialistId && t.status === 'en_curso');
  return mine.length === 1 ? mine[0].id : 0;
}
