// features/kanban/KanbanPage.tsx
// Tablero Kanban de un proyecto (/kanban/:projectId). Se abre desde el detalle del proyecto.

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useKanbanBoard } from './hooks/useKanbanBoard';
import { KanbanBoard } from './components/KanbanBoard';
import { KanbanToolbar, FILTER_ALL, FILTER_NO_SPRINT, type SprintFilter } from './components/KanbanToolbar';
import { TaskFormModal } from './components/TaskFormModal';
import { SprintFormModal } from './components/SprintFormModal';
import { TASK_STATUS } from '../../types/database';
import type { Task, TaskStatus } from './types';

type TaskModal = { mode: 'new'; status: TaskStatus } | { mode: 'edit'; task: Task } | null;

export function KanbanPage() {
  const { projectId: rawId } = useParams();
  const projectId = Number(rawId);
  const valid = Number.isInteger(projectId) && projectId > 0;

  const board = useKanbanBoard(valid ? projectId : 0);
  const [filter, setFilter]           = useState<SprintFilter>(FILTER_ALL);
  const [taskModal, setTaskModal]     = useState<TaskModal>(null);
  const [showSprintModal, setShowSprintModal] = useState(false);

  const visibleTasks = board.tasks.filter((t) => {
    if (filter === FILTER_ALL) return true;
    if (filter === FILTER_NO_SPRINT) return t.sprint_id === null;
    return t.sprint_id === filter;
  });

  const defaultSprintId = typeof filter === 'number' ? filter : null;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
        <Link to="/clients-projects" className="bb-body text-sm text-ink-soft hover:text-ink inline-flex items-center min-h-[44px] sm:min-h-0 mb-2">
          ← Clientes y Proyectos
        </Link>

        {!valid || (!board.loading && !board.error && !board.project) ? (
          <div className="bg-paper border border-line rounded-card p-6 text-center">
            <p className="bb-display font-bold text-ink mb-1">Proyecto no encontrado</p>
            <Link to="/kanban" className="bb-body text-sm text-ink underline">Ver todos los tableros</Link>
          </div>
        ) : board.loading ? (
          <p className="bb-body text-ink-soft py-10 text-center">Cargando tablero…</p>
        ) : board.error ? (
          <div className="bg-paper border border-rust/40 rounded-card p-4" role="alert">
            <p className="bb-body text-sm text-rust mb-3">{board.error}</p>
            <button onClick={() => void board.refetch()} className="min-h-[44px] sm:min-h-0 px-4 py-2 border border-line rounded-card bb-body text-sm hover:bg-canvas">
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="bb-mono text-xs text-ink-soft">
                {board.project?.code ? `${board.project.code} · ` : ''}{board.project?.clientName}
              </p>
              <h1 className="bb-display font-bold text-ink text-2xl break-words">{board.project?.name}</h1>
            </div>

            {board.actionError && (
              <div className="mb-3 bg-paper border border-rust/40 rounded-card px-3 py-2 flex items-start gap-2" role="alert">
                <p className="bb-body text-sm text-rust flex-1">{board.actionError}</p>
                <button onClick={board.clearActionError} className="bb-touch text-ink-soft" aria-label="Cerrar aviso">✕</button>
              </div>
            )}

            <KanbanToolbar
              sprints={board.sprints}
              filter={filter}
              onFilterChange={setFilter}
              onNewTask={() => setTaskModal({ mode: 'new', status: TASK_STATUS.BACKLOG })}
              onNewSprint={() => setShowSprintModal(true)}
            />

            <KanbanBoard
              tasks={visibleTasks}
              specialists={board.specialists}
              sprints={board.sprints}
              onOpenTask={(task) => setTaskModal({ mode: 'edit', task })}
              onMoveTask={(id, status) => void board.moveTask(id, status)}
            />
          </>
        )}
      </div>

      {taskModal && valid && (
        <TaskFormModal
          projectId={projectId}
          task={taskModal.mode === 'edit' ? taskModal.task : null}
          defaultStatus={taskModal.mode === 'new' ? taskModal.status : taskModal.task.status}
          defaultSprintId={defaultSprintId}
          sprints={board.sprints}
          specialists={board.specialists}
          onSubmit={async (payload) => {
            if (taskModal.mode === 'edit') {
              const { projectId: _p, ...changes } = payload;
              void _p;
              await board.editTask(taskModal.task.id, changes);
            } else {
              await board.addTask(payload);
            }
          }}
          onDelete={taskModal.mode === 'edit' ? async () => board.removeTask(taskModal.task.id) : undefined}
          onClose={() => setTaskModal(null)}
        />
      )}

      {showSprintModal && valid && (
        <SprintFormModal
          projectId={projectId}
          onSubmit={board.addSprint}
          onClose={() => setShowSprintModal(false)}
        />
      )}
    </div>
  );
}
