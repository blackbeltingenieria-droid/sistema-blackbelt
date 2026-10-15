// features/movements/hooks/useMovements.ts
import { useCallback, useEffect, useState } from 'react';
import { getMovementRows } from '../services/movement-service';
import type { MovementRow } from '../types';

export function useMovements() {
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await getMovementRows());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los movimientos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { rows, loading, error, refetch: load };
}
