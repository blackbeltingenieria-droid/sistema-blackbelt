// features/dashboard-general/MyDashboardPage.tsx
// «Mi panel». Admin: resumen general de la empresa (+ sus tareas personales si está vinculado a un
// especialista). Colaborador: solo lo suyo (tareas por estado y horas).

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { KpiCard } from '../../components/ui/KpiCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusChip } from '../../components/ui/StatusChip';
import { currentMonth, formatDateShort } from '../../lib/format';
import { ROLE_CODE } from '../../types/database';
import type { DbWorkHour } from '../../types/database';
import { useAuth } from '../auth/hooks/useAuth';
import { getTasksBySpecialist } from '../kanban/services/kanban-service';
import { KANBAN_COLUMNS, type Task } from '../kanban/types';
import { totalHours } from '../work-hours/hours-summary';
import { getWorkHours } from '../work-hours/services/work-hours-service';
import type { AdminOverview } from './domain/admin-overview';
import { getAdminOverview } from './services/admin-overview-service';

function AdminSummary({ data }: { data: AdminOverview }) {
  return (
    <section aria-labelledby="company-summary" className="mb-6" data-testid="admin-summary">
      <h2 id="company-summary" className="bb-display font-semibold text-ink text-base mb-2">Resumen de la empresa</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <KpiCard label="Tareas abiertas del equipo" value={String(data.openTasks)} subtext={`${data.doneTasks} ${data.doneTasks === 1 ? 'hecha' : 'hechas'}`} />
        <KpiCard label="Horas del mes (todos)" value={`${data.monthHours} h`} />
        <KpiCard label="Proyectos activos" value={String(data.activeProjects)} />
        <KpiCard label="Por validar" value={String(data.pendingValidation)} subtext="Movimientos en borrador" valueColor={data.pendingValidation ? 'text-rust' : 'text-ink'} />
      </div>
      <Card>
        <h3 className="bb-display font-semibold text-ink text-sm mb-2">Alertas</h3>
        {data.alerts.length === 0 ? (
          <p className="bb-body text-sm text-ink-soft" data-testid="no-alerts">Todo en orden: sin alertas por ahora.</p>
        ) : (
          <ul className="divide-y divide-line" data-testid="alerts">
            {data.alerts.map((a) => (
              <li key={a.key} className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                <p className="bb-body text-sm text-ink"><span aria-hidden="true" className="text-rust mr-1.5">●</span>{a.text}</p>
                <Link to={a.link} className="bb-body text-sm text-ink underline underline-offset-2 shrink-0 min-h-[32px] flex items-center">{a.linkLabel}</Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

export function MyDashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLE_CODE.ADMIN;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hours, setHours] = useState<DbWorkHour[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const specialistId = user?.specialistId ?? null;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const jobs: Promise<unknown>[] = [];
    if (isAdmin) jobs.push(getAdminOverview().then((o) => alive && setOverview(o)));
    if (specialistId !== null) {
      jobs.push(Promise.all([getTasksBySpecialist(specialistId), getWorkHours({ specialistId })])
        .then(([t, h]) => { if (alive) { setTasks(t); setHours(h); } }));
    } else {
      setTasks([]); setHours([]);
    }
    Promise.all(jobs)
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'No se pudo cargar tu panel.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [specialistId, isAdmin]);

  const month = currentMonth();
  const monthHours = totalHours(hours.filter((h) => h.work_date.startsWith(month)));
  const open = tasks.filter((t) => t.status !== 'hecho');

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
        <PageHeader
          title="Mi panel"
          subtitle={user ? (isAdmin ? `Hola, ${user.fullName.replace(/^DEMO - /, '').split(' ')[0]}. Así va la empresa.` : `Hola, ${user.fullName.replace(/^DEMO - /, '').split(' ')[0]}. Esto es lo tuyo.`) : undefined}
        />
        {error && <ErrorBanner message={error} />}

        {isAdmin && overview && <AdminSummary data={overview} />}

        {specialistId === null && !loading && (
          <p className="bb-body text-sm text-ink-soft bg-paper border border-line rounded-card px-4 py-3 mb-4" data-testid="not-linked">
            Tu usuario aún no está vinculado a un especialista, por eso no hay tareas ni horas propias que mostrar.{' '}
            {isAdmin
              ? <Link to="/users" className="text-ink underline underline-offset-2 font-medium" data-testid="link-users">Vincular mi usuario</Link>
              : 'Pide a un administrador que te vincule.'}
          </p>
        )}

        {specialistId !== null && (
          <section aria-labelledby="my-work" data-testid="my-work">
            {isAdmin && <h2 id="my-work" className="bb-display font-semibold text-ink text-base mb-2">Mis tareas y horas</h2>}
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
          </section>
        )}
      </div>
    </div>
  );
}
