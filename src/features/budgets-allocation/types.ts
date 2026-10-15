// features/budgets-allocation/types.ts
import type { DbBudget, DbCorpAllocation } from '../../types/database';

export type Budget = DbBudget;
export type CorpAllocationRow = DbCorpAllocation;

export type BudgetFormValues = Omit<DbBudget, 'id'>;
