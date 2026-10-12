// features/finance-giros/hooks/useTools.ts

import { useEffect, useState } from 'react';
import { getTools } from '../services/finance-service';
import type { Tool } from '../types';

interface UseToolsResult {
  tools: Tool[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTools(): UseToolsResult {
  const [tools, setTools]     = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [tick, setTick]       = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTools()
      .then((d) => { if (!cancelled) setTools(d); })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tick]);

  return { tools, loading, error, refetch: () => setTick((t) => t + 1) };
}
