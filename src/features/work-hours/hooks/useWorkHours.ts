// features/work-hours/hooks/useWorkHours.ts
import { useCallback, useEffect, useState } from 'react';
import type { DbWorkHour } from '../../../types/database';
import { getProjectRows } from '../../clients-projects/services/project-service';
import type { ProjectRow } from '../../clients-projects/types';
import { getSpecialists, getTasks } from '../../kanban/services/kanban-service';
import type { Specialist, Task } from '../../kanban/types';
import { getWorkHours } from '../services/work-hours-service';

/** `onlySpecialistId`: el colaborador solo ve y registra sus propias horas. */
export function useWorkHours(onlySpecialistId: number | null) {
  const [entries, setEntries] = useState<DbWorkHour[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [tasksByProject, setTasksByProject] = useState<Record<number, Task[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [rows, projs, specs] = await Promise.all([
        getWorkHours(onlySpecialistId === null ? undefined : { specialistId: onlySpecialistId }),
        getProjectRows(),
        getSpecialists(),
      ]);
      const taskLists = await Promise.all(projs.map((p) => getTasks(p.id).then((t) => [p.id, t] as const)));
      setEntries(rows);
      setProjects(projs);
      setSpecialists(specs);
      setTasksByProject(Object.fromEntries(taskLists));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las horas.');
    } finally {
      setLoading(false);
    }
  }, [onlySpecialistId]);

  useEffect(() => { void load(); }, [load]);

  return { entries, projects, specialists, tasksByProject, loading, error, refetch: load };
}
