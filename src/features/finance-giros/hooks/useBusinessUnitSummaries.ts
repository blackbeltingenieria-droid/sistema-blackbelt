// features/finance-giros/hooks/useBusinessUnitSummaries.ts

import { useEffect, useState } from 'react';
import { getCostTotalsByBusinessUnit } from '../services/finance-service';
import type { BusinessUnitCostSummary } from '../types';

interface UseBusinessUnitSummariesResult {
  summaries: BusinessUnitCostSummary[];
  loading: boolean;
  error: string | null;
}

export function useBusinessUnitSummaries(): UseBusinessUnitSummariesResult {
  const [summaries, setSummaries] = useState<BusinessUnitCostSummary[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCostTotalsByBusinessUnit()
      .then((d) => { if (!cancelled) setSummaries(d); })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { summaries, loading, error };
}
