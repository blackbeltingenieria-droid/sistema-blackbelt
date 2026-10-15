// features/kanban/kanban-defaults.ts
// Autorrelleno del Kanban: sprint activo, responsable habitual, fecha límite y datos del siguiente sprint.

import { addDays } from '../../lib/autofill';
import type { Sprint, Task } from './types';

/** Sprint por defecto para una tarea nueva: el filtrado, o el activo más reciente. */
export function defaultSprintId(sprints: Sprint[], filtered: number | null): number | null {
  if (filtered) return filtered;
  const active = sprints.filter((s) => s.status === 'activo').sort((a, b) => b.id - a.id);
  return active[0]?.id ?? null;
}

/** Responsable por defecto: el colaborador para sí mismo; el admin, el de la última tarea creada (o él). */
export function defaultAssigneeId(tasks: Task[], mySpecialistId: number | null, isCollaborator: boolean): number | null {
  if (isCollaborator) return mySpecialistId;
  const last = [...tasks].filter((t) => t.assignee_id).sort((a, b) => b.id - a.id)[0];
  return last?.assignee_id ?? mySpecialistId;
}

/** Fecha límite sugerida: el fin del sprint. */
export function sprintEnd(sprints: Sprint[], sprintId: number | null): string {
  return sprints.find((s) => s.id === sprintId)?.end_date ?? '';
}

/** Siguiente sprint: "Sprint N", empieza al día siguiente del último (o hoy) y dura 2 semanas. */
export function nextSprintDefaults(sprints: Sprint[], today: string): { name: string; start: string; end: string } {
  const lastEnd = sprints.map((s) => s.end_date).filter((d): d is string => Boolean(d)).sort().pop();
  const start = lastEnd && lastEnd >= today ? addDays(lastEnd, 1) : today;
  return { name: `Sprint ${sprints.length + 1}`, start, end: addDays(start, 13) };
}
