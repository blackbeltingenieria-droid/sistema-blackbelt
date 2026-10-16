// features/budgets-allocation/services/seed-data.ts — sin Supabase: el Excel no trae metas ni reparto
// (el reparto arranca "SIN REPARTIR", regla 2). Con `npm run dev:demo`: datos de demostración.
import type { DbBudget, DbCorpAllocation } from '../../../types/database';
import { demoData } from '../../demo/demo-data';

export const SEED_BUDGETS: DbBudget[] = demoData ? demoData.budgets : [];

export const SEED_ALLOCATION: DbCorpAllocation[] = demoData ? demoData.allocation : [];
