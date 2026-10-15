// features/movements/hooks/useMovementCatalogs.ts
// Catálogos que necesita el formulario y los filtros de movimientos (unidades, áreas, categorías, proyectos).

import { useEffect, useState } from 'react';
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
  }, []);

  return { units, areas, categories, projects, loading, error };
}
