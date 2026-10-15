// features/kanban/services/kanban-service.ts
// Capa de datos del Kanban. Los componentes nunca llaman a supabase.from() directamente.
// Sin Supabase configurado (desarrollo local) opera sobre datos de ejemplo en memoria.

import { isSupabaseConfigured, supabase } from '../../../lib/supabase';
import type { DbTask } from '../../../types/database';
import { SEED_CLIENTS, SEED_PROJECTS } from '../../clients-projects/services/seed-data';
import { SEED_SPECIALISTS, SEED_SPRINTS, SEED_TASKS } from './seed-data';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mismo patrón que el resto de servicios: filas tipadas en types/database.ts
const sb = () => supabase as any;

const TABLES_MISSING_MESSAGE =
  'Las tablas del Kanban todavía no existen en la base de datos. ' +
  'Ejecuta la migración 20261014000001_kanban_sprints_tasks.sql en Supabase y recarga.';

/** Convierte un error de Supabase en un Error legible (detecta "tablas sin migrar"). */
function toError(op: string, error: { code?: string; message: string }): Error {
  const missing =
    error.code === '42P01' || error.code === 'PGRST205' || /schema cache|does not exist/i.test(error.message);
  return new Error(missing ? TABLES_MISSING_MESSAGE : `${op}: ${error.message}`);
}

// ─── Estado en memoria (solo modo ejemplo) ───────────────────────────────────
const mem = {
  tasks:   SEED_TASKS.map((t) => ({ ...t })),
  sprints: SEED_SPRINTS.map((s) => ({ ...s })),
};
const nextId = (rows: { id: number }[]) => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;

// ─── Proyectos (cabecera del tablero y selector) ─────────────────────────────
export async function getKanbanProjects(): Promise<KanbanProject[]> {
  if (!isSupabaseConfigured()) {
    return SEED_PROJECTS.map((p) => ({
      id: p.id,
      code: p.code ?? null,
      name: p.name,
      clientName: SEED_CLIENTS.find((c) => c.id === p.client_id)?.name ?? '—',
      status: p.status,
    }));
  }

  const { data, error } = await sb()
    .from('projects')
    .select('id, code, name, status, clients(name)')
    .order('id');
  if (error) throw toError('getKanbanProjects', error);

  return ((data ?? []) as { id: number; code: string | null; name: string; status: string; clients: { name: string } | null }[])
    .map((p) => ({ id: p.id, code: p.code, name: p.name, status: p.status, clientName: p.clients?.name ?? '—' }));
}

export async function getKanbanProject(projectId: number): Promise<KanbanProject | null> {
  const all = await getKanbanProjects();
  return all.find((p) => p.id === projectId) ?? null;
}

// ─── Lecturas ────────────────────────────────────────────────────────────────
export async function getTasks(projectId: number): Promise<Task[]> {
  if (!isSupabaseConfigured()) return mem.tasks.filter((t) => t.project_id === projectId).map((t) => ({ ...t }));

  const { data, error } = await sb().from('tasks').select('*').eq('project_id', projectId).order('id');
  if (error) throw toError('getTasks', error);
  return (data ?? []) as Task[];
}

export async function getTaskCountsByProject(): Promise<Record<number, { total: number; done: number }>> {
  let rows: { project_id: number; status: TaskStatus }[];
  if (!isSupabaseConfigured()) {
    rows = mem.tasks;
  } else {
    const { data, error } = await sb().from('tasks').select('project_id, status');
    if (error) throw toError('getTaskCountsByProject', error);
    rows = (data ?? []) as { project_id: number; status: TaskStatus }[];
  }
  const out: Record<number, { total: number; done: number }> = {};
  for (const r of rows) {
    const c = (out[r.project_id] ??= { total: 0, done: 0 });
    c.total += 1;
    if (r.status === 'hecho') c.done += 1;
  }
  return out;
}

export async function getSprints(projectId: number): Promise<Sprint[]> {
  if (!isSupabaseConfigured()) return mem.sprints.filter((s) => s.project_id === projectId).map((s) => ({ ...s }));

  const { data, error } = await sb().from('sprints').select('*').eq('project_id', projectId).order('id');
  if (error) throw toError('getSprints', error);
  return (data ?? []) as Sprint[];
}

export async function getSpecialists(): Promise<Specialist[]> {
  if (!isSupabaseConfigured()) return SEED_SPECIALISTS;

  const { data, error } = await sb().from('specialists').select('*').eq('active', true).order('full_name');
  if (error) throw toError('getSpecialists', error);
  return (data ?? []) as Specialist[];
}

// ─── Escrituras: tareas ──────────────────────────────────────────────────────
function validateTitle(title: string): string {
  const clean = title.trim();
  if (!clean) throw new Error('La tarea necesita un título.');
  return clean;
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const row = {
    project_id:  payload.projectId,
    sprint_id:   payload.sprintId,
    title:       validateTitle(payload.title),
    description: payload.description?.trim() || null,
    status:      payload.status,
    assignee_id: payload.assigneeId,
    due_date:    payload.dueDate || null,
  };

  if (!isSupabaseConfigured()) {
    const task: DbTask = { id: nextId(mem.tasks), ...row, created_at: new Date().toISOString(), updated_at: null };
    mem.tasks.push(task);
    return { ...task };
  }

  const { data, error } = await sb().from('tasks').insert(row).select('*').single();
  if (error) throw toError('createTask', error);
  return data as Task;
}

export async function updateTask(taskId: number, changes: UpdateTaskPayload): Promise<Task> {
  const row: Partial<DbTask> = { updated_at: new Date().toISOString() };
  if (changes.title !== undefined)       row.title       = validateTitle(changes.title);
  if (changes.description !== undefined) row.description = changes.description?.trim() || null;
  if (changes.status !== undefined)      row.status      = changes.status;
  if (changes.sprintId !== undefined)    row.sprint_id   = changes.sprintId;
  if (changes.assigneeId !== undefined)  row.assignee_id = changes.assigneeId;
  if (changes.dueDate !== undefined)     row.due_date    = changes.dueDate || null;

  if (!isSupabaseConfigured()) {
    const task = mem.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('La tarea ya no existe.');
    Object.assign(task, row);
    return { ...task };
  }

  const { data, error } = await sb().from('tasks').update(row).eq('id', taskId).select('*').single();
  if (error) throw toError('updateTask', error);
  return data as Task;
}

export async function updateTaskStatus(taskId: number, status: TaskStatus): Promise<Task> {
  return updateTask(taskId, { status });
}

export async function deleteTask(taskId: number): Promise<void> {
  if (!isSupabaseConfigured()) {
    mem.tasks = mem.tasks.filter((t) => t.id !== taskId);
    return;
  }
  const { error } = await sb().from('tasks').delete().eq('id', taskId);
  if (error) throw toError('deleteTask', error);
}

// ─── Escrituras: sprints ─────────────────────────────────────────────────────
export async function createSprint(payload: CreateSprintPayload): Promise<Sprint> {
  const name = payload.name.trim();
  if (!name) throw new Error('El sprint necesita un nombre.');
  if (payload.startDate && payload.endDate && payload.endDate < payload.startDate) {
    throw new Error('La fecha de fin no puede ser anterior a la de inicio.');
  }
  const row = {
    project_id: payload.projectId,
    name,
    goal:       payload.goal?.trim() || null,
    start_date: payload.startDate || null,
    end_date:   payload.endDate || null,
    status:     payload.status,
  };

  if (!isSupabaseConfigured()) {
    const sprint: Sprint = { id: nextId(mem.sprints), ...row, created_at: new Date().toISOString() };
    mem.sprints.push(sprint);
    return { ...sprint };
  }

  const { data, error } = await sb().from('sprints').insert(row).select('*').single();
  if (error) throw toError('createSprint', error);
  return data as Sprint;
}
