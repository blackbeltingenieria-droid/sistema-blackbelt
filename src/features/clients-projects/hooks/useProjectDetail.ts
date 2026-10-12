// features/clients-projects/hooks/useProjectDetail.ts
// Custom hook that fetches a single project's detail (with calculated balances).

import { useEffect, useState } from 'react';
import { getProjectDetail } from '../services/project-service';
import type { ProjectDetail } from '../types';

interface UseProjectDetailResult {
  detail: ProjectDetail | null;
  loading: boolean;
  error: string | null;
}

export function useProjectDetail(projectId: number | null): UseProjectDetailResult {
  const [detail, setDetail]   = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (projectId === null) { setDetail(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);

    getProjectDetail(projectId)
      .then((data) => { if (!cancelled) setDetail(data); })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error desconocido');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [projectId]);

  return { detail, loading, error };
}
