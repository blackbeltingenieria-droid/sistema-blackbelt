// features/work-hours/services/seed-data.ts — sin Supabase: el Excel no trae horas registradas.
import type { DbWorkHour } from '../../../types/database';
import { demoData } from '../../demo/demo-data';

export const SEED_WORK_HOURS: DbWorkHour[] = demoData ? demoData.workHours : [];
