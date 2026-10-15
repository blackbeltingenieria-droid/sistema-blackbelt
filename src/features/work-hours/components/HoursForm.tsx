// features/work-hours/components/HoursForm.tsx
// Registro rápido de horas (pensado para celular): persona, proyecto, tarea, fecha y horas.

import { type FormEvent, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import type { ProjectRow } from '../../clients-projects/types';
import type { Specialist, Task } from '../../kanban/types';
import type { WorkHourPayload } from '../services/work-hours-service';

interface HoursFormProps {
  specialists: Specialist[];
  projects: ProjectRow[];
  tasksByProject: Record<number, Task[]>;
  lockedSpecialistId: number | null;
  onSubmit: (payload: WorkHourPayload) => Promise<void>;
}

export function HoursForm({ specialists, projects, tasksByProject, lockedSpecialistId, onSubmit }: HoursFormProps) {
  const [specialistId, setSpecialistId] = useState<number>(lockedSpecialistId ?? 0);
  const [projectId, setProjectId] = useState<number>(0);
  const [taskId, setTaskId] = useState<number>(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tasks = projectId ? (tasksByProject[projectId] ?? []) : [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        specialist_id: lockedSpecialistId ?? specialistId,
        project_id: projectId,
        task_id: taskId || null,
        work_date: date,
        hours: Number(hours.replace(',', '.')),
        description: description.trim() || null,
      });
      setHours('');
      setDescription('');
      setTaskId(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <h2 className="bb-display font-semibold text-ink text-base mb-3">Registrar horas</h2>
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {lockedSpecialistId === null && (
          <div>
            <label className="bb-label" htmlFor="wh-person">Persona</label>
            <select id="wh-person" className="bb-input" value={specialistId} onChange={(e) => setSpecialistId(Number(e.target.value))}>
              <option value={0}>Elige…</option>
              {specialists.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="bb-label" htmlFor="wh-project">Proyecto</label>
          <select id="wh-project" className="bb-input" value={projectId} onChange={(e) => { setProjectId(Number(e.target.value)); setTaskId(0); }}>
            <option value={0}>Elige…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.code ?? `#${p.id}`} · {p.projectName}</option>)}
          </select>
        </div>
        <div>
          <label className="bb-label" htmlFor="wh-task">Tarea — opcional</label>
          <select id="wh-task" className="bb-input" value={taskId} disabled={!projectId} onChange={(e) => setTaskId(Number(e.target.value))}>
            <option value={0}>Sin tarea</option>
            {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="bb-label" htmlFor="wh-date">Fecha</label><input id="wh-date" type="date" className="bb-input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label className="bb-label" htmlFor="wh-hours">Horas</label><input id="wh-hours" className="bb-input bb-mono" inputMode="decimal" placeholder="0.0" value={hours} onChange={(e) => setHours(e.target.value)} /></div>
        </div>
        <div><label className="bb-label" htmlFor="wh-desc">Descripción — opcional</label><input id="wh-desc" className="bb-input" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        {error && <p role="alert" className="bb-body text-sm text-rust">{error}</p>}
        <button type="submit" disabled={submitting}
          className="w-full min-h-[44px] sm:min-h-0 py-2.5 bg-gold text-ink rounded-card bb-body text-sm font-semibold hover:bg-gold/90 disabled:opacity-50">
          {submitting ? 'Guardando…' : 'Registrar horas'}
        </button>
      </form>
    </Card>
  );
}
