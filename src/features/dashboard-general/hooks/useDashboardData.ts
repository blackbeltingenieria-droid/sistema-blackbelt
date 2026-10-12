// features/dashboard-general/hooks/useDashboardData.ts
// Agrega los 3 servicios del dashboard en un solo hook coordinado.

import { useEffect, useState } from 'react';
import {
  getAllBusinessUnitsComparison,
  getToolsRankingBySpend,
  getLaborCostByBusinessUnit,
} from '../../finance-giros/services/finance-service';
import type {
  BusinessUnitComparison,
  LaborCostByUnit,
  ToolSpendRank,
} from '../../finance-giros/types';

interface UseDashboardDataResult {
  comparison: BusinessUnitComparison[];
  toolsRanking: ToolSpendRank[];
  laborByUnit: LaborCostByUnit[];
  loading: boolean;
  error: string | null;
}

export function useDashboardData(): UseDashboardDataResult {
  const [comparison, setComparison]   = useState<BusinessUnitComparison[]>([]);
  const [toolsRanking, setToolsRanking] = useState<ToolSpendRank[]>([]);
  const [laborByUnit, setLaborByUnit]   = useState<LaborCostByUnit[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      getAllBusinessUnitsComparison(),
      getToolsRankingBySpend(),
      getLaborCostByBusinessUnit(),
    ])
      .then(([comp, tools, labor]) => {
        if (cancelled) return;
        setComparison(comp);
        setToolsRanking(tools);
        setLaborByUnit(labor);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error desconocido');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  return { comparison, toolsRanking, laborByUnit, loading, error };
}
