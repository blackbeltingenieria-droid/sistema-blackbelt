// features/kanban/hooks/useKanbanProjects.ts
// Lista de proyectos con su conteo de tareas, para la portada /kanban.

import { useCallback, useEffect, useState } from 'react';
import { getKanbanProjects, getTaskCountsByProject } from '../services/kanban-service';
import type { KanbanProject } from '../types';

export function useKanbanProjects() {
  const [projects, setProjects] = useState<KanbanProject[]>([]);
  const [counts, setCounts]     = useState<Record<number, { total: number; done: number }>>({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([getKanbanProjects(), getTaskCountsByProject()]);
      setProjects(p);
      setCounts(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los proyectos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { projects, counts, loading, error, refetch: load };
}
