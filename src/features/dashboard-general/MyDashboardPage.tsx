// features/dashboard-general/MyDashboardPage.tsx
// "Mi panel" del colaborador: sus tareas por estado y sus horas. Solo datos propios.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { KpiCard } from '../../components/ui/KpiCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusChip } from '../../components/ui/StatusChip';
import { currentMonth, formatDateShort } from '../../lib/format';
import { useAuth } from '../auth/hooks/useAuth';
import { getTasksBySpecialist } from '../kanban/services/kanban-service';
import { KANBAN_COLUMNS, type Task } from '../kanban/types';
import { totalHours } from '../work-hours/hours-summary';
import { getWorkHours } from '../work-hours/services/work-hours-service';
import type { DbWorkHour } from '../../types/database';

export function MyDashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hours, setHours] = useState<DbWorkHour[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const specialistId = user?.specialistId ?? null;

  useEffect(() => {
    let alive = true;
    if (specialistId === null) { setLoading(false); return; }
    Promise.all([getTasksBySpecialist(specialistId), getWorkHours({ specialistId })])
      .then(([t, h]) => { if (alive) { setTasks(t); setHours(h); } })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'No se pudo cargar tu panel.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [specialistId]);

  const month = currentMonth();
  const monthHours = totalHours(hours.filter((h) => h.work_date.startsWith(month)));
  const open = tasks.filter((t) => t.status !== 'hecho');

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
        <PageHeader title="Mi panel" subtitle={user ? `Hola, ${user.fullName.split(' ')[0]}. Esto es lo tuyo.` : undefined} />
        {error && <ErrorBanner message={error} />}
        {specialistId === null && !loading && (
          <p className="bb-body text-sm text-ink-soft bg-paper border border-line rounded-card px-4 py-3 mb-4">
            Tu usuario aún no está vinculado a un especialista, por eso no hay tareas ni horas propias que mostrar.
          </p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <KpiCard label="Tareas abiertas" value={String(open.length)} />
          <KpiCard label="Hechas" value={String(tasks.length - open.length)} />
          <KpiCard label="Horas del mes" value={`${monthHours} h`} />
          <KpiCard label="Horas totales" value={`${totalHours(hours)} h`} />
        </div>

        <Card>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="bb-display font-semibold text-ink text-base">Mis tareas</h2>
            <Link to="/kanban" className="bb-body text-sm text-ink underline underline-offset-2">Abrir mi Kanban</Link>
          </div>
          {loading ? (
            <p className="bb-body text-sm text-ink-soft py-4 text-center">Cargando…</p>
          ) : tasks.length === 0 ? (
            <p className="bb-body text-sm text-ink-soft py-4 text-center">No tienes tareas asignadas.</p>
          ) : (
            <ul className="divide-y divide-line">
              {KANBAN_COLUMNS.flatMap((c) => tasks.filter((t) => t.status === c.status)).map((t) => (
                <li key={t.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="bb-body text-sm text-ink break-words">{t.title}</p>
                    {t.due_date && <p className="bb-mono text-[11px] text-ink-soft">Vence {formatDateShort(t.due_date)}</p>}
                  </div>
                  <StatusChip status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
