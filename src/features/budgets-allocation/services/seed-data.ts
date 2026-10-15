// features/budgets-allocation/services/seed-data.ts — datos de ejemplo (solo modo local).
import type { DbBudget, DbCorpAllocation } from '../../../types/database';

// Un presupuesto de ejemplo; el reparto CORP arranca vacío = "SIN REPARTIR" (regla 2).
export const SEED_BUDGETS: DbBudget[] = [
  { id: 1, month: '2026-10', business_unit_id: 1, area_id: 2, cost_category_id: 2, income_target: 0, cost_target: 500, comment: 'Tope de pauta UN01' },
  { id: 2, month: '2026-10', business_unit_id: 3, area_id: 13, cost_category_id: 1, income_target: 3000, cost_target: 1000, comment: 'Honorarios especialista tesis' },
];

export const SEED_ALLOCATION: DbCorpAllocation[] = [];
