// features/dashboard-general/hooks/useDashboardData.ts
// Dashboard general: resultados/caja del mes + ranking de herramientas, todo derivado de movements.

import { useCallback, useEffect, useState } from 'react';
import { getCostCategories } from '../../catalogs/services/catalog-service';
import type { BusinessUnit } from '../../catalogs/types';
import { getBusinessUnits } from '../../catalogs/services/catalog-service';
import { getMonthReport, type MonthReport } from '../../results-cash/services/results-service';
import { rankSoftwareTools, type ToolRank } from '../domain/tool-ranking';

export interface DashboardData {
  report: MonthReport;
  units: BusinessUnit[];
  toolRanking: ToolRank[];
}

export function useDashboardData(month: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [report, units, cats] = await Promise.all([getMonthReport(month), getBusinessUnits(), getCostCategories()]);
      const softId = cats.find((c) => c.code === 'SOFT')?.id ?? -1;
      setData({ report, units, toolRanking: rankSoftwareTools(report.movements, softId, month) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el dashboard.');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { void load(); }, [load]);

  return { data, loading, error, refetch: load };
}
