// features/kanban/components/KanbanColumn.tsx
// Una columna del tablero: franja belt-stripe, título, contador y zona para soltar tarjetas.

import { useState, type ReactNode } from 'react';
import type { KanbanColumnDef, TaskStatus } from '../types';

interface KanbanColumnProps {
  column: KanbanColumnDef;
  count: number;
  children: ReactNode;
  onDropTask: (taskId: number, status: TaskStatus) => void;
  /** Oculta el encabezado (en mobile ya lo muestran las pestañas). */
  hideHeaderOnMobile?: boolean;
}

export function KanbanColumn({ column, count, children, onDropTask, hideHeaderOnMobile = false }: KanbanColumnProps) {
  const [over, setOver] = useState(false);

  return (
    <section
      aria-label={column.label}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = Number(e.dataTransfer.getData('text/plain'));
        if (id) onDropTask(id, column.status);
      }}
      className={`min-w-0 rounded-card xl:bg-canvas xl:border xl:p-2 transition-colors ${
        over ? 'xl:border-gold xl:bg-gold/10' : 'xl:border-line'
      }`}
    >
      <header className={`${hideHeaderOnMobile ? 'hidden xl:block' : ''} mb-2`}>
        <div className={`h-1.5 rounded-full ${column.stripeClass}`} />
        <div className="flex items-center justify-between mt-2 px-0.5">
          <h3 className="bb-display font-semibold text-ink text-sm">{column.label}</h3>
          <span className="bb-mono text-xs text-ink-soft">{count}</span>
        </div>
      </header>
      <div className="space-y-2.5">{children}</div>
      {count === 0 && (
        <p className="bb-body text-xs text-ink-soft text-center py-8 border border-dashed border-line rounded-card">
          Sin tareas en {column.label.toLowerCase()}
        </p>
      )}
    </section>
  );
}
