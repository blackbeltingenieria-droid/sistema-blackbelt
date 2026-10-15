// features/movements/hooks/useMovementCatalogs.ts
// Catálogos que necesita el formulario y los filtros de movimientos (unidades, áreas, categorías, proyectos).

import { useCallback, useEffect, useState } from 'react';
import { getAreas, getBusinessUnits, getCostCategories } from '../../catalogs/services/catalog-service';
import type { Area, BusinessUnit, CostCategory } from '../../catalogs/types';
import { getProjectRows } from '../../clients-projects/services/project-service';
import type { ProjectRow } from '../../clients-projects/types';

export function useMovementCatalogs() {
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [version, setVersion] = useState(0);
  /** Vuelve a leer (p. ej. el "falta pagar" de los proyectos después de registrar un cobro). */
  const refetch = useCallback(() => setVersion((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    Promise.all([getBusinessUnits(), getAreas(), getCostCategories(), getProjectRows()])
      .then(([u, a, c, p]) => {
        if (!alive) return;
        setUnits(u); setAreas(a); setCategories(c); setProjects(p);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'No se pudieron cargar los catálogos.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [version]);

  return { units, areas, categories, projects, loading, error, refetch };
}
