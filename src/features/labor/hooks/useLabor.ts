// features/labor/hooks/useLabor.ts — contratos de mano de obra + lo necesario para calcular lo pagado.
import { useCallback, useEffect, useState } from 'react';
import type { DbLaborContract, DbSpecialist } from '../../../types/database';
import { getBusinessUnits } from '../../catalogs/services/catalog-service';
import type { BusinessUnit } from '../../catalogs/types';
import { getProjectRows } from '../../clients-projects/services/project-service';
import type { ProjectRow } from '../../clients-projects/types';
import { getSpecialists } from '../../kanban/services/kanban-service';
import { getMovements } from '../../movements/services/movement-service';
import type { EnrichedMovement } from '../../movements/types';
import { getLaborContracts } from '../services/labor-service';

export function useLabor() {
  const [contracts, setContracts] = useState<DbLaborContract[]>([]);
  const [movements, setMovements] = useState<EnrichedMovement[]>([]);
  const [specialists, setSpecialists] = useState<DbSpecialist[]>([]);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [c, m, s, u, p] = await Promise.all([
        getLaborContracts(), getMovements(), getSpecialists().catch(() => []), getBusinessUnits(), getProjectRows().catch(() => []),
      ]);
      setContracts(c); setMovements(m); setSpecialists(s as DbSpecialist[]); setUnits(u); setProjects(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la mano de obra.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  return { contracts, movements, specialists, units, projects, loading, error, refetch: load };
}
