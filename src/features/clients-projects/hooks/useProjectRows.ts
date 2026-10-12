// features/clients-projects/hooks/useProjectRows.ts
// Custom hook that fetches project rows and manages loading/error state.
// Components stay clean — no data logic inside them.

import { useEffect, useState } from 'react';
import { getProjectRows } from '../services/project-service';
import type { ProjectRow } from '../types';

interface UseProjectRowsResult {
  rows: ProjectRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProjectRows(): UseProjectRowsResult {
  const [rows, setRows]     = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [tick, setTick]     = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getProjectRows()
      .then((data) => { if (!cancelled) setRows(data); })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error desconocido');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [tick]);

  return { rows, loading, error, refetch: () => setTick((t) => t + 1) };
}
