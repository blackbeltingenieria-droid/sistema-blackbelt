// features/kanban/services/seed-data.ts
// Datos de ejemplo para desarrollo local (sin Supabase configurado). Viven en memoria.

import type { DbSpecialist, DbSprint, DbTask } from '../../../types/database';

export const SEED_SPECIALISTS: DbSpecialist[] = [
  { id: 1, full_name: 'Henry Torres Rivera', specialty: 'Dirección general',          active: true },
  { id: 2, full_name: 'Juan Pérez Vásquez',  specialty: 'Transformación digital',     active: true },
  { id: 3, full_name: 'Marco Guzmán',        specialty: 'Geofísica y suelos',         active: true },
  { id: 4, full_name: 'Sofía Castro',        specialty: 'Incubación y emprendimiento', active: true },
];

export const SEED_SPRINTS: DbSprint[] = [
  { id: 1, project_id: 1, name: 'Sprint 1 — Marco teórico', goal: 'Cerrar revisión bibliográfica y diseño metodológico',
    start_date: '2026-10-05', end_date: '2026-10-19', status: 'activo' },
  { id: 2, project_id: 1, name: 'Sprint 2 — Experimentos', goal: null,
    start_date: '2026-10-20', end_date: '2026-11-03', status: 'planificado' },
  { id: 3, project_id: 2, name: 'Sprint 1 — Integración ERP', goal: 'Conectar ERP con flujos de facturación',
    start_date: '2026-10-05', end_date: '2026-10-19', status: 'activo' },
];

export const SEED_TASKS: DbTask[] = [
  { id: 1, project_id: 1, sprint_id: 1, title: 'Revisión bibliográfica (30 fuentes)', description: 'Priorizar artículos de los últimos 5 años.',
    status: 'hecho', assignee_id: 1, due_date: '2026-10-09' },
  { id: 2, project_id: 1, sprint_id: 1, title: 'Redactar marco teórico', description: null,
    status: 'en_revision', assignee_id: 1, due_date: '2026-10-15' },
  { id: 3, project_id: 1, sprint_id: 1, title: 'Diseño metodológico y variables', description: 'Definir hipótesis y operacionalización.',
    status: 'en_curso', assignee_id: 4, due_date: '2026-10-17' },
  { id: 4, project_id: 1, sprint_id: 1, title: 'Validar instrumento con experto', description: null,
    status: 'por_hacer', assignee_id: null, due_date: '2026-10-19' },
  { id: 5, project_id: 1, sprint_id: 2, title: 'Preparar ensayos de laboratorio', description: null,
    status: 'backlog', assignee_id: 3, due_date: null },
  { id: 6, project_id: 1, sprint_id: null, title: 'Cotizar equipos de medición', description: 'Pedir 3 cotizaciones.',
    status: 'backlog', assignee_id: null, due_date: null },
  { id: 7, project_id: 2, sprint_id: 3, title: 'Mapear flujos de facturación', description: null,
    status: 'en_curso', assignee_id: 2, due_date: '2026-10-12' },
  { id: 8, project_id: 2, sprint_id: 3, title: 'Configurar conector ERP Cloud', description: null,
    status: 'por_hacer', assignee_id: 2, due_date: '2026-10-16' },
];
