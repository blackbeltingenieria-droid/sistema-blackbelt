// features/work-hours/services/seed-data.ts — datos de ejemplo (solo modo local).
import type { DbWorkHour } from '../../../types/database';

export const SEED_WORK_HOURS: DbWorkHour[] = [
  { id: 1, specialist_id: 1, project_id: 1, task_id: 1, work_date: '2026-10-08', hours: 4,   description: 'Revisión bibliográfica' },
  { id: 2, specialist_id: 1, project_id: 1, task_id: 2, work_date: '2026-10-12', hours: 3.5, description: 'Redacción del marco teórico' },
  { id: 3, specialist_id: 4, project_id: 1, task_id: 3, work_date: '2026-10-13', hours: 2,   description: 'Variables del estudio' },
  { id: 4, specialist_id: 2, project_id: 2, task_id: 7, work_date: '2026-10-12', hours: 5,   description: 'Mapeo de flujos' },
  { id: 5, specialist_id: 3, project_id: 1, task_id: 5, work_date: '2026-10-14', hours: 1.5, description: 'Cotización de equipos' },
];
