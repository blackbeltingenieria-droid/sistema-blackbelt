// features/kanban/components/TaskCard.tsx
// Tarjeta de tarea: StatusChip (belt-stripe), responsable, fecha y botones para mover de columna.
// Mobile: botones de 44px para mover sin arrastrar. Desktop (xl): también se arrastra.

import { StatusChip } from '../../../components/ui/StatusChip';
import { formatShortDate, initials, isOverdue } from '../format';
import { KANBAN_COLUMNS, type Specialist, type Sprint, type Task, type TaskStatus } from '../types';

interface TaskCardProps {
  task: Task;
  assignee: Specialist | null;
  sprint: Sprint | null;
  onOpen: (task: Task) => void;
  onMove: (task: Task, status: TaskStatus) => void;
}

export function TaskCard({ task, assignee, sprint, onOpen, onMove }: TaskCardProps) {
  const index = KANBAN_COLUMNS.findIndex((c) => c.status === task.status);
  const prev = KANBAN_COLUMNS[index - 1];
  const next = KANBAN_COLUMNS[index + 1];
  const late = task.status !== 'hecho' && isOverdue(task.due_date);

  const moveBtn =
    'flex-1 min-h-[44px] xl:min-h-0 xl:py-1 px-2 border border-line rounded-card bb-body text-xs text-ink-soft ' +
    'hover:text-ink hover:border-gold active:bg-canvas transition-colors truncate';

  return (
    <article
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(task.id)); e.dataTransfer.effectAllowed = 'move'; }}
      className="bg-paper border border-line rounded-card p-3 xl:cursor-grab"
    >
      <button type="button" onClick={() => onOpen(task)} className="block w-full text-left">
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
          <p className="bb-body text-sm font-medium text-ink break-words flex-1 basis-[10rem] min-w-0">{task.title}</p>
          <StatusChip status={task.status} />
        </div>
        {task.description && (
          <p className="bb-body text-xs text-ink-soft mt-1 line-clamp-2">{task.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5">
          {assignee ? (
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="w-5 h-5 rounded-full bg-ink text-paper bb-display text-[9px] font-bold flex items-center justify-center shrink-0">
                {initials(assignee.full_name)}
              </span>
              <span className="bb-body text-xs text-ink-soft truncate">{assignee.full_name}</span>
            </span>
          ) : (
            <span className="bb-body text-xs text-ink-soft italic">Sin asignar</span>
          )}
          {task.due_date && (
            <span className={`bb-mono text-xs ${late ? 'text-rust font-semibold' : 'text-ink-soft'}`}>
              {late ? '⚠ ' : ''}{formatShortDate(task.due_date)}
            </span>
          )}
          {sprint && (
            <span className="bb-mono text-[10px] bg-canvas border border-line px-1.5 py-0.5 rounded text-ink-soft truncate max-w-full">
              {sprint.name.split(' — ')[0]}
            </span>
          )}
        </div>
      </button>

      <div className="flex gap-2 mt-3 pt-3 border-t border-line">
        {prev ? (
          <button type="button" onClick={() => onMove(task, prev.status)} className={moveBtn} aria-label={`Mover a ${prev.label}`}>
            ← {prev.shortLabel}
          </button>
        ) : <span className="flex-1" />}
        {next ? (
          <button type="button" onClick={() => onMove(task, next.status)} className={moveBtn} aria-label={`Mover a ${next.label}`}>
            {next.shortLabel} →
          </button>
        ) : <span className="flex-1" />}
      </div>
    </article>
  );
}
