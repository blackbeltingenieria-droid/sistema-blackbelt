// features/kanban/types.ts
// Tipos de dominio del tablero Kanban/Scrum. Las filas de BD viven en types/database.ts.

import type { DbSprint, DbSpecialist, DbTask, TaskStatus } from '../../types/database';
import { TASK_STATUS } from '../../types/database';

export type { TaskStatus };
export type Sprint = DbSprint;
export type Specialist = DbSpecialist;
export type Task = DbTask;

/** Proyecto mínimo que necesita el tablero (cabecera y selector). */
export interface KanbanProject {
  id: number;
  code: string | null;
  name: string;
  clientName: string;
  status: string;
}

export interface CreateTaskPayload {
  projectId: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  sprintId: number | null;
  assigneeId: number | null;
  dueDate: string | null;
}

export type UpdateTaskPayload = Partial<Omit<CreateTaskPayload, 'projectId'>>;

export interface CreateSprintPayload {
  projectId: number;
  name: string;
  goal?: string | null;
  startDate: string | null;
  endDate: string | null;
  status: Sprint['status'];
}

/** Columnas del tablero en orden. Colores = motivo belt-stripe (tokens `belt-*`). */
export interface KanbanColumnDef {
  status: TaskStatus;
  label: string;
  shortLabel: string; // para las pestañas angostas de mobile
  stripeClass: string; // clase literal de Tailwind para la franja de color
}

export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { status: TASK_STATUS.BACKLOG,     label: 'Backlog',     shortLabel: 'Backlog',   stripeClass: 'bg-belt-backlog' },
  { status: TASK_STATUS.POR_HACER,   label: 'Por hacer',   shortLabel: 'Por hacer', stripeClass: 'bg-belt-por_hacer' },
  { status: TASK_STATUS.EN_CURSO,    label: 'En curso',    shortLabel: 'En curso',  stripeClass: 'bg-belt-en_curso' },
  { status: TASK_STATUS.EN_REVISION, label: 'En revisión', shortLabel: 'Revisión',  stripeClass: 'bg-belt-en_revision' },
  { status: TASK_STATUS.HECHO,       label: 'Hecho',       shortLabel: 'Hecho',     stripeClass: 'bg-belt-hecho' },
];
