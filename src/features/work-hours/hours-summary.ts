// features/work-hours/hours-summary.ts
// Resumen de horas-hombre: por proyecto y por persona. Funciones puras.

import type { DbWorkHour } from '../../types/database';

export const MAX_HOURS_PER_ENTRY = 24;

/** Valida una entrada de horas (0 < horas ≤ 24). Devuelve mensaje de error o null. */
export function validateHours(hours: number): string | null {
  if (!Number.isFinite(hours) || hours <= 0) return 'Las horas deben ser mayores que 0.';
  if (hours > MAX_HOURS_PER_ENTRY) return `Un registro no puede superar ${MAX_HOURS_PER_ENTRY} horas.`;
  return null;
}

export interface ProjectHoursSummary {
  projectId: number;
  totalHours: number;
  bySpecialist: { specialistId: number; hours: number }[];
  entries: number;
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function summarizeHoursByProject(entries: DbWorkHour[]): ProjectHoursSummary[] {
  const byProject = new Map<number, DbWorkHour[]>();
  for (const e of entries) byProject.set(e.project_id, [...(byProject.get(e.project_id) ?? []), e]);

  return [...byProject.entries()]
    .map(([projectId, list]) => {
      const per = new Map<number, number>();
      for (const e of list) per.set(e.specialist_id, (per.get(e.specialist_id) ?? 0) + e.hours);
      return {
        projectId,
        totalHours: round2(list.reduce((a, e) => a + e.hours, 0)),
        bySpecialist: [...per.entries()]
          .map(([specialistId, hours]) => ({ specialistId, hours: round2(hours) }))
          .sort((a, b) => b.hours - a.hours),
        entries: list.length,
      };
    })
    .sort((a, b) => b.totalHours - a.totalHours);
}

export function totalHours(entries: DbWorkHour[]): number {
  return round2(entries.reduce((a, e) => a + e.hours, 0));
}
