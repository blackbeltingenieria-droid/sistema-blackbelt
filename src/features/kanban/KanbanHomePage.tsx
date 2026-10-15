// features/kanban/KanbanHomePage.tsx
// Portada del módulo (/kanban): lista de proyectos con acceso a su tablero.

import { Link } from 'react-router-dom';
import { useAuth } from '../auth/hooks/useAuth';
import { useKanbanProjects } from './hooks/useKanbanProjects';
import { StatusChip } from '../../components/ui/StatusChip';
import type { ProjectStatus } from '../../types/database';

export function KanbanHomePage() {
  const { user } = useAuth();
  const mine = user?.role === 'colaborador' ? (user.specialistId ?? -1) : null;
  const { projects, counts, loading, error, refetch } = useKanbanProjects(mine);

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
        <h1 className="bb-display font-bold text-ink text-2xl">Kanban</h1>
        <p className="bb-body text-sm text-ink-soft mb-5">{mine === null ? 'Elige un proyecto para ver su tablero.' : 'Estos son los proyectos donde tienes tareas asignadas.'}</p>

        {loading ? (
          <p className="bb-body text-ink-soft py-10 text-center">Cargando proyectos…</p>
        ) : error ? (
          <div className="bg-paper border border-rust/40 rounded-card p-4" role="alert">
            <p className="bb-body text-sm text-rust mb-3">{error}</p>
            <button onClick={() => void refetch()} className="min-h-[44px] sm:min-h-0 px-4 py-2 border border-line rounded-card bb-body text-sm hover:bg-canvas">
              Reintentar
            </button>
          </div>
        ) : projects.length === 0 ? (
          <p className="bb-body text-ink-soft py-10 text-center">Aún no hay proyectos.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {projects.map((p) => {
              const c = counts[p.id] ?? { total: 0, done: 0 };
              return (
                <li key={p.id}>
                  <Link
                    to={`/kanban/${p.id}`}
                    className="block bg-paper border border-line rounded-card p-4 min-h-[44px] hover:border-ink transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="bb-mono text-xs text-ink-soft">{p.code ?? `#${p.id}`}</p>
                      <StatusChip status={p.status as ProjectStatus} />
                    </div>
                    <p className="bb-display font-bold text-ink break-words">{p.name}</p>
                    <p className="bb-body text-sm text-ink-soft mb-2">{p.clientName}</p>
                    <p className="bb-mono text-xs text-ink">{c.done}/{c.total} tareas hechas</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
