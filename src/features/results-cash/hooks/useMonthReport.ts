// features/results-cash/hooks/useMonthReport.ts — reporte de un periodo (un mes, varios meses o todo).
import { useCallback, useEffect, useState } from 'react';
import type { Period } from '../domain/period';
import { getPeriodReport, type MonthReport } from '../services/results-service';

export function useMonthReport(period: Period) {
  const [report, setReport] = useState<MonthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(period);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await getPeriodReport(JSON.parse(key) as Period));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo calcular el reporte.');
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => { void load(); }, [load]);

  return { report, loading, error, refetch: load };
}
