// features/kanban/components/TaskFormModal.tsx
// Alta y edición de tarea (ModalShell: hoja a pantalla completa en mobile).

import { type FormEvent, useState } from 'react';
import { ModalShell } from '../../../components/ui/ModalShell';
import { KANBAN_COLUMNS, type CreateTaskPayload, type Specialist, type Sprint, type Task, type TaskStatus } from '../types';

interface TaskFormModalProps {
  projectId: number;
  task?: Task | null;
  defaultStatus: TaskStatus;
  defaultSprintId: number | null;
  sprints: Sprint[];
  specialists: Specialist[];
  onSubmit: (payload: CreateTaskPayload) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

const FORM_ID = 'task-form';

export function TaskFormModal({
  projectId, task, defaultStatus, defaultSprintId, sprints, specialists, onSubmit, onDelete, onClose,
}: TaskFormModalProps) {
  const isEditing = Boolean(task);
  const [title, setTitle]             = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus]           = useState<TaskStatus>(task?.status ?? defaultStatus);
  const [sprintId, setSprintId]       = useState<number | ''>(task ? (task.sprint_id ?? '') : (defaultSprintId ?? ''));
  const [assigneeId, setAssigneeId]   = useState<number | ''>(task?.assignee_id ?? '');
  const [dueDate, setDueDate]         = useState(task?.due_date ?? '');
  const [submitting, setSubmitting]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        projectId,
        title,
        description,
        status,
        sprintId:   sprintId === '' ? null : sprintId,
        assigneeId: assigneeId === '' ? null : assigneeId,
        dueDate:    dueDate || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la tarea.');
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setSubmitting(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la tarea.');
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      title={isEditing ? 'Editar tarea' : 'Nueva tarea'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting}
            className="flex-1 min-h-[44px] sm:min-h-0 py-2.5 border border-line rounded-card bb-body text-sm text-ink-soft hover:text-ink transition-colors">
            Cancelar
          </button>
          <button type="submit" form={FORM_ID} disabled={submitting}
            className="flex-1 min-h-[44px] sm:min-h-0 py-2.5 bg-gold text-ink rounded-card bb-body text-sm font-semibold hover:bg-gold/90 disabled:opacity-50 transition-colors">
            {submitting ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear tarea'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="bb-label" htmlFor="task-title">Título</label>
          <input id="task-title" className="bb-input" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Redactar informe de avance" required autoFocus={!isEditing} />
        </div>
        <div>
          <label className="bb-label" htmlFor="task-desc">Descripción — opcional</label>
          <textarea id="task-desc" className="bb-input" rows={3} value={description ?? ''}
            onChange={(e) => setDescription(e.target.value)} placeholder="Detalle, criterio de aceptación…" />
        </div>
        <div>
          <label className="bb-label" htmlFor="task-status">Estado</label>
          <select id="task-status" className="bb-input" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {KANBAN_COLUMNS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="bb-label" htmlFor="task-assignee">Responsable</label>
          <select id="task-assignee" className="bb-input" value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">Sin asignar</option>
            {specialists.filter((s) => s.active || s.id === assigneeId).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="bb-label" htmlFor="task-sprint">Sprint</label>
          <select id="task-sprint" className="bb-input" value={sprintId}
            onChange={(e) => setSprintId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">Sin sprint (backlog general)</option>
            {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="bb-label" htmlFor="task-due">Fecha límite — opcional</label>
          <input id="task-due" type="date" className="bb-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        {error && (
          <div className="p-3 bg-rust/10 border border-rust/30 rounded-card" role="alert">
            <p className="bb-body text-rust text-sm">{error}</p>
          </div>
        )}

        {isEditing && onDelete && (
          <div className="pt-2 border-t border-line">
            {confirmDelete ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmDelete(false)}
                  className="flex-1 min-h-[44px] sm:min-h-0 py-2 border border-line rounded-card bb-body text-sm text-ink-soft">
                  No, conservar
                </button>
                <button type="button" onClick={handleDelete} disabled={submitting}
                  className="flex-1 min-h-[44px] sm:min-h-0 py-2 bg-rust text-paper rounded-card bb-body text-sm font-semibold">
                  Sí, eliminar
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)}
                className="min-h-[44px] sm:min-h-0 bb-body text-sm text-rust hover:underline">
                Eliminar tarea
              </button>
            )}
          </div>
        )}
      </form>
    </ModalShell>
  );
}
