// features/kanban/components/KanbanBoard.tsx
// Tablero con las 5 columnas belt-stripe.
//  - ≥1280px (xl): las 5 columnas lado a lado, con arrastrar y soltar.
//  - <1280px (mobile/tablet): una columna a la vez; pestañas con contador para cambiar.

import { useState } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { KANBAN_COLUMNS, type Specialist, type Sprint, type Task, type TaskStatus } from '../types';

interface KanbanBoardProps {
  tasks: Task[];
  specialists: Specialist[];
  sprints: Sprint[];
  onOpenTask: (task: Task) => void;
  onMoveTask: (taskId: number, status: TaskStatus) => void;
}

export function KanbanBoard({ tasks, specialists, sprints, onOpenTask, onMoveTask }: KanbanBoardProps) {
  const [activeStatus, setActiveStatus] = useState<TaskStatus>('por_hacer');

  const byStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status);
  const renderCards = (status: TaskStatus) =>
    byStatus(status).map((task) => (
      <TaskCard
        key={task.id}
        task={task}
        assignee={specialists.find((s) => s.id === task.assignee_id) ?? null}
        sprint={sprints.find((s) => s.id === task.sprint_id) ?? null}
        onOpen={onOpenTask}
        onMove={(t, status) => onMoveTask(t.id, status)}
      />
    ));

  return (
    <div>
      {/* Pestañas de columna (mobile/tablet) */}
      <div role="tablist" aria-label="Columnas del tablero" className="grid grid-cols-5 gap-1 mb-3 xl:hidden">
        {KANBAN_COLUMNS.map((col) => {
          const selected = col.status === activeStatus;
          return (
            <button
              key={col.status}
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveStatus(col.status)}
              className={`min-h-[56px] rounded-card border px-1 pt-0 pb-1.5 text-center overflow-hidden transition-colors ${
                selected ? 'bg-paper border-ink' : 'bg-canvas border-line'
              }`}
            >
              <span className={`block h-1.5 ${col.stripeClass}`} />
              <span className="block bb-mono text-base font-medium text-ink mt-1 leading-none">{byStatus(col.status).length}</span>
              <span className={`block bb-body text-[11px] mt-0.5 leading-tight ${selected ? 'text-ink font-semibold' : 'text-ink-soft'}`}>
                {col.shortLabel}
              </span>
            </button>
          );
        })}
      </div>

      <div className="xl:flex xl:gap-3 xl:items-start xl:overflow-x-auto xl:pb-3">
        {KANBAN_COLUMNS.map((col) => (
          <div key={col.status} className={col.status === activeStatus ? 'block xl:flex-1 xl:min-w-[250px]' : 'hidden xl:block xl:flex-1 xl:min-w-[250px]'}>
            <KanbanColumn
              column={col}
              count={byStatus(col.status).length}
              onDropTask={onMoveTask}
              hideHeaderOnMobile
            >
              {renderCards(col.status)}
            </KanbanColumn>
          </div>
        ))}
      </div>
    </div>
  );
}
