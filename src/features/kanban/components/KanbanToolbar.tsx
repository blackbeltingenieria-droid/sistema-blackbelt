// features/kanban/components/KanbanToolbar.tsx
// Filtro por sprint y acciones del tablero. En mobile: una columna, botones de 44px.

import type { Sprint } from '../types';

export const FILTER_ALL = 'all';
export const FILTER_NO_SPRINT = 'none';
export type SprintFilter = typeof FILTER_ALL | typeof FILTER_NO_SPRINT | number;

interface KanbanToolbarProps {
  sprints: Sprint[];
  filter: SprintFilter;
  onFilterChange: (filter: SprintFilter) => void;
  onNewTask: () => void;
  onNewSprint: () => void;
}

export function KanbanToolbar({ sprints, filter, onFilterChange, onNewTask, onNewSprint }: KanbanToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
      <div className="sm:flex-1 sm:max-w-sm">
        <label htmlFor="sprint-filter" className="bb-label">Sprint</label>
        <select
          id="sprint-filter"
          className="bb-input !bg-paper"
          value={String(filter)}
          onChange={(e) => {
            const v = e.target.value;
            onFilterChange(v === FILTER_ALL || v === FILTER_NO_SPRINT ? v : Number(v));
          }}
        >
          <option value={FILTER_ALL}>Todas las tareas</option>
          <option value={FILTER_NO_SPRINT}>Sin sprint</option>
          {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <button type="button" onClick={onNewSprint}
          className="flex items-center justify-center border border-line bg-paper text-ink px-3 py-2 min-h-[44px] sm:min-h-0 rounded-card bb-body text-sm font-medium hover:bg-canvas transition-colors">
          + Nuevo sprint
        </button>
        <button type="button" onClick={onNewTask}
          className="flex items-center justify-center bg-gold text-ink px-4 py-2 min-h-[44px] sm:min-h-0 rounded-card bb-body text-sm font-semibold hover:bg-gold/90 transition-colors">
          + Nueva tarea
        </button>
      </div>
    </div>
  );
}
