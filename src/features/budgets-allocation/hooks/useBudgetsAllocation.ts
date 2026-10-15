// features/budgets-allocation/hooks/useBudgetsAllocation.ts
// Presupuestos del mes comparados con el real + reparto CORP del mes.

import { useCallback, useEffect, useState } from 'react';
import { getMovements } from '../../movements/services/movement-service';
import type { EnrichedMovement } from '../../movements/types';
import { summarizeAllocation, type AllocationSummary } from '../../results-cash/domain/calculations';
import { compareBudgets, type BudgetComparison } from '../domain/budget-comparison';
import { getAllocation, getBudgets, type MonthAllocation } from '../services/budget-service';

export function useBudgetsAllocation(month: string) {
  const [comparisons, setComparisons] = useState<BudgetComparison[]>([]);
  const [movements, setMovements] = useState<EnrichedMovement[]>([]);
  const [allocation, setAllocation] = useState<MonthAllocation>({ pcts: {}, note: '' });
  const [summary, setSummary] = useState<AllocationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [budgets, movs, alloc] = await Promise.all([getBudgets(month), getMovements(), getAllocation(month)]);
      setMovements(movs);
      setComparisons(compareBudgets(budgets, movs));
      setAllocation(alloc);
      setSummary(summarizeAllocation(movs, month, alloc.pcts));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los presupuestos.');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { void load(); }, [load]);

  return { comparisons, movements, allocation, summary, loading, error, refetch: load };
}
