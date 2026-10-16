// features/kanban/services/seed-data.ts
// Datos de ejemplo para desarrollo local (sin Supabase configurado). Viven en memoria.

import type { DbSpecialist, DbSprint, DbTask } from '../../../types/database';
import { demoData } from '../../demo/demo-data';
import { EXCEL_DB_SPECIALISTS } from '../../excel-data/excel-local';

// Sin Supabase: especialistas REALES del Excel (TABLA_M.O). El Excel no trae sprints ni tareas.
export const SEED_SPECIALISTS: DbSpecialist[] = demoData ? demoData.specialists : EXCEL_DB_SPECIALISTS.map((s) => ({ ...s }));

export const SEED_SPRINTS: DbSprint[] = demoData ? demoData.sprints : [];

export const SEED_TASKS: DbTask[] = demoData ? demoData.tasks : [];
