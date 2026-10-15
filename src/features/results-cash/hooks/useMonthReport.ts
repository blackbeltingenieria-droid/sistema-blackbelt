// features/results-cash/hooks/useMonthReport.ts
import { useCallback, useEffect, useState } from 'react';
import { getMonthReport, type MonthReport } from '../services/results-service';

export function useMonthReport(month: string) {
  const [report, setReport] = useState<MonthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await getMonthReport(month));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo calcular el reporte.');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { void load(); }, [load]);

  return { report, loading, error, refetch: load };
}
