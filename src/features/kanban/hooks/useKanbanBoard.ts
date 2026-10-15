// features/kanban/hooks/useKanbanBoard.ts
// Estado del tablero de un proyecto: tareas, sprints y responsables.
// Mover una tarjeta es optimista (se ve al instante) y se revierte si la BD falla.

import { useCallback, useEffect, useState } from 'react';
import {
  createSprint,
  createTask,
  deleteTask,
  getKanbanProject,
  getAllSpecialists,
  getSprints,
  getTasks,
  updateTask,
} from '../services/kanban-service';
import type {
  CreateSprintPayload,
  CreateTaskPayload,
  KanbanProject,
  Specialist,
  Sprint,
  Task,
  TaskStatus,
  UpdateTaskPayload,
} from '../types';

export function useKanbanBoard(projectId: number) {
  const [project, setProject]       = useState<KanbanProject | null>(null);
  const [tasks, setTasks]           = useState<Task[]>([]);
  const [sprints, setSprints]       = useState<Sprint[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);   // error de carga
  const [actionError, setActionError] = useState<string | null>(null); // error al guardar/mover

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, t, s, sp] = await Promise.all([
        getKanbanProject(projectId),
        getTasks(projectId),
        getSprints(projectId),
        getAllSpecialists(),
      ]);
      setProject(p);
      setTasks(t);
      setSprints(s);
      setSpecialists(sp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el tablero.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const moveTask = useCallback(async (taskId: number, status: TaskStatus) => {
    const previous = tasks.find((t) => t.id === taskId);
    if (!previous || previous.status === status) return;
    setActionError(null);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    try {
      await updateTask(taskId, { status });
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: previous.status } : t)));
      setActionError(err instanceof Error ? err.message : 'No se pudo mover la tarea.');
    }
  }, [tasks]);

  const addTask = useCallback(async (payload: CreateTaskPayload) => {
    const created = await createTask(payload);
    setTasks((prev) => [...prev, created]);
  }, []);

  const editTask = useCallback(async (taskId: number, changes: UpdateTaskPayload) => {
    const updated = await updateTask(taskId, changes);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
  }, []);

  const removeTask = useCallback(async (taskId: number) => {
    await deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const addSprint = useCallback(async (payload: CreateSprintPayload) => {
    const created = await createSprint(payload);
    setSprints((prev) => [...prev, created]);
    return created;
  }, []);

  return {
    project, tasks, sprints, specialists, loading, error, actionError,
    clearActionError: () => setActionError(null),
    refetch: load, moveTask, addTask, editTask, removeTask, addSprint,
  };
}
