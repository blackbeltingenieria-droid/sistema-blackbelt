// features/finance-giros/hooks/useTransactionRows.ts

import { useEffect, useState } from 'react';
import { getTransactionRows } from '../services/finance-service';
import type { TransactionRow } from '../types';

interface Filters {
  businessUnitId?: number;
  costCategoryId?: number;
}

interface UseTransactionRowsResult {
  rows: TransactionRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTransactionRows(filters: Filters = {}): UseTransactionRowsResult {
  const [rows, setRows]       = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [tick, setTick]       = useState(0);

  const buId  = filters.businessUnitId;
  const catId = filters.costCategoryId;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTransactionRows({ businessUnitId: buId, costCategoryId: catId })
      .then((d) => { if (!cancelled) setRows(d); })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tick, buId, catId]);

  return { rows, loading, error, refetch: () => setTick((t) => t + 1) };
}
