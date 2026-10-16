// features/investments/hooks/useInvestments.ts — inversiones + movimientos para calcular su rendimiento.
import { useCallback, useEffect, useState } from 'react';
import type { DbInvestment } from '../../../types/database';
import { getMovements } from '../../movements/services/movement-service';
import type { EnrichedMovement } from '../../movements/types';
import { getInvestments } from '../services/investment-service';

export function useInvestments() {
  const [investments, setInvestments] = useState<DbInvestment[]>([]);
  const [movements, setMovements] = useState<EnrichedMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [i, m] = await Promise.all([getInvestments(), getMovements()]);
      setInvestments(i);
      setMovements(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las inversiones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  return { investments, movements, loading, error, refetch: load };
}
