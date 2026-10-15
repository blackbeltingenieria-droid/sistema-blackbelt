// features/kanban/hooks/useKanbanProjects.ts
// Lista de proyectos con su conteo de tareas, para la portada /kanban.

import { useCallback, useEffect, useState } from 'react';
import { getKanbanProjects, getTaskCountsByProject, getTasksBySpecialist } from '../services/kanban-service';
import type { KanbanProject } from '../types';

/** `onlySpecialistId`: el colaborador solo ve los proyectos donde tiene tareas, y cuenta solo las suyas. */
export function useKanbanProjects(onlySpecialistId: number | null = null) {
  const [projects, setProjects] = useState<KanbanProject[]>([]);
  const [counts, setCounts]     = useState<Record<number, { total: number; done: number }>>({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (onlySpecialistId === null) {
        const [p, c] = await Promise.all([getKanbanProjects(), getTaskCountsByProject()]);
        setProjects(p);
        setCounts(c);
      } else {
        const [p, mine] = await Promise.all([getKanbanProjects(), getTasksBySpecialist(onlySpecialistId)]);
        const own: Record<number, { total: number; done: number }> = {};
        for (const t of mine) {
          const c = (own[t.project_id] ??= { total: 0, done: 0 });
          c.total += 1;
          if (t.status === 'hecho') c.done += 1;
        }
        setProjects(p.filter((x) => own[x.id]));
        setCounts(own);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los proyectos.');
    } finally {
      setLoading(false);
    }
  }, [onlySpecialistId]);

  useEffect(() => { void load(); }, [load]);

  return { projects, counts, loading, error, refetch: load };
}
