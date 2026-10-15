// features/work-hours/WorkHoursPage.tsx
// Horas-hombre: registro por persona, proyecto y tarea, con resumen de horas por proyecto.
// El colaborador solo ve y registra sus propias horas.

import { useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { KpiCard } from '../../components/ui/KpiCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { formatDateShort } from '../../lib/format';
import type { DbWorkHour } from '../../types/database';
import { useAuth } from '../auth/hooks/useAuth';
import { HoursForm } from './components/HoursForm';
import { ProjectHoursSummary } from './components/ProjectHoursSummary';
import { summarizeHoursByProject, totalHours } from './hours-summary';
import { useWorkHours } from './hooks/useWorkHours';
import { formatDuration } from './time-range';
import { createWorkHour, deleteWorkHour, type WorkHourPayload } from './services/work-hours-service';

export function WorkHoursPage() {
  const { user } = useAuth();
  const locked = user?.role === 'colaborador' ? (user.specialistId ?? -1) : null;
  const { entries, projects, specialists, tasksByProject, loading, error, refetch } = useWorkHours(locked);
  const [actionError, setActionError] = useState<string | null>(null);

  const summaries = useMemo(() => summarizeHoursByProject(entries), [entries]);
  const name = (id: number) => specialists.find((s) => s.id === id)?.full_name ?? '—';
  const project = (id: number) => projects.find((p) => p.id === id);

  async function add(payload: WorkHourPayload) {
    await createWorkHour(payload);
    await refetch();
  }

  async function remove(id: number) {
    setActionError(null);
    try {
      await deleteWorkHour(id);
      await refetch();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo eliminar.');
    }
  }

  const columns: Column<DbWorkHour>[] = [
    { key: 'date', header: 'Fecha', mobile: 'title', render: (r) => <span className="bb-mono text-xs text-ink">{formatDateShort(r.work_date)}</span> },
    { key: 'who', header: 'Persona', mobile: 'key', render: (r) => <span className="bb-body text-sm text-ink">{name(r.specialist_id)}</span> },
    { key: 'proj', header: 'Proyecto', mobile: 'key', render: (r) => <span className="bb-mono text-xs text-ink">{project(r.project_id)?.code ?? `#${r.project_id}`}</span> },
    { key: 'desc', header: 'Descripción', mobile: 'detail', render: (r) => <span className="bb-body text-xs text-ink-soft">{r.description ?? '—'}</span> },
    {
      key: 'range', header: 'Horario', mobile: 'key',
      render: (r) => r.start_time && r.end_time ? (
        <span className="bb-mono text-xs text-ink whitespace-nowrap">
          {r.start_time}–{r.end_time}
          {r.break_minutes ? <span className="block bb-body text-[11px] text-ink-soft">descanso {formatDuration(r.break_minutes)}</span> : null}
        </span>
      ) : <span className="bb-body text-xs text-ink-soft">—</span>,
    },
    { key: 'hours', header: 'Horas', mobile: 'highlight', className: 'text-right', render: (r) => <span className="bb-mono text-sm font-medium text-ink whitespace-nowrap">{formatDuration(r.hours * 60)}</span> },
    {
      key: 'act', header: 'Acciones', mobile: 'action',
      render: (r) => (
        <button type="button" onClick={() => void remove(r.id)} aria-label={`Eliminar registro del ${formatDateShort(r.work_date)}`}
          className="px-3 py-1.5 border border-line rounded-card bb-body text-xs text-rust hover:bg-canvas">Eliminar</button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
        <PageHeader title="Horas-hombre" subtitle="Registra de qué hora a qué hora trabajaste y tus descansos; las horas se calculan solas." />
        {error && <ErrorBanner message={error} onRetry={() => void refetch()} />}
        {actionError && <ErrorBanner message={actionError} onClose={() => setActionError(null)} />}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <KpiCard label={locked === null ? 'Horas registradas' : 'Mis horas'} value={`${totalHours(entries)} h`} />
          <KpiCard label="Proyectos con horas" value={String(summaries.length)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr] gap-4 items-start">
          {!loading && (
            <HoursForm specialists={specialists} projects={projects} tasksByProject={tasksByProject} lockedSpecialistId={locked} onSubmit={add}
              entries={entries} mySpecialistId={user?.specialistId ?? null} />
          )}
          <div className="space-y-4 min-w-0">
            <ProjectHoursSummary summaries={summaries} projects={projects} specialists={specialists} />
            <Card padding="p-0" plainBelow="md">
              {loading ? (
                <p className="bb-body text-ink-soft text-center py-10 text-sm">Cargando…</p>
              ) : (
                <DataTable columns={columns} rows={entries} getRowKey={(r) => r.id} emptyMessage="Aún no hay horas registradas." />
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
