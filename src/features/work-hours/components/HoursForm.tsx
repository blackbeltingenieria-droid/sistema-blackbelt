// features/work-hours/components/HoursForm.tsx
// Registro de horas (pensado para celular): persona, proyecto, tarea, fecha, desde–hasta y descansos.
// Las horas se calculan solas: (hasta − desde) − descansos.

import { type FormEvent, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import type { ProjectRow } from '../../clients-projects/types';
import type { Specialist, Task } from '../../kanban/types';
import type { WorkHourPayload } from '../services/work-hours-service';
import { breaksToText, computeWorkedHours, formatDuration, type TimeBreak } from '../time-range';
import { lastEntryDefaults, suggestedTaskId } from '../hours-defaults';
import type { DbWorkHour } from '../../../types/database';

interface HoursFormProps {
  specialists: Specialist[];
  projects: ProjectRow[];
  tasksByProject: Record<number, Task[]>;
  lockedSpecialistId: number | null;
  onSubmit: (payload: WorkHourPayload) => Promise<void>;
  /** Registros existentes: se usa el último de la persona para rellenar proyecto y horario. */
  entries?: DbWorkHour[];
  /** Especialista del usuario que entra (Admin vinculado): persona por defecto. */
  mySpecialistId?: number | null;
}

const LUNCH: TimeBreak = { start: '13:00', end: '14:00' };

export function HoursForm({ specialists, projects, tasksByProject, lockedSpecialistId, onSubmit, entries = [], mySpecialistId = null }: HoursFormProps) {
  const initialPerson = lockedSpecialistId ?? mySpecialistId ?? 0;
  const initialDefaults = initialPerson ? lastEntryDefaults(entries, initialPerson) : null;
  const [specialistId, setSpecialistId] = useState<number>(initialPerson);
  const [projectId, setProjectId] = useState<number>(initialDefaults?.projectId ?? 0);
  const [taskId, setTaskId] = useState<number>(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState(initialDefaults?.start ?? '08:00');
  const [end, setEnd] = useState(initialDefaults?.end ?? '');
  const [breaks, setBreaks] = useState<TimeBreak[]>(initialDefaults?.breaks ?? []);
  const [hint, setHint] = useState<string | null>(initialDefaults ? 'Relleno con tu último registro: proyecto y horario. Cámbialo si hoy fue distinto.' : null);

  /** Al elegir a la persona, se rellenan proyecto y horario con su último registro. */
  function choosePerson(id: number) {
    setSpecialistId(id);
    const d = id ? lastEntryDefaults(entries, id) : null;
    if (!d) { setHint(null); return; }
    setProjectId(d.projectId);
    setTaskId(suggestedTaskId(tasksByProject[d.projectId] ?? [], id));
    setStart(d.start); setEnd(d.end); setBreaks(d.breaks);
    setHint('Relleno con su último registro: proyecto y horario. Cámbialo si hoy fue distinto.');
  }
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tasks = projectId ? (tasksByProject[projectId] ?? []) : [];
  const calc = computeWorkedHours(start, end, breaks);
  const setBreak = (i: number, changes: Partial<TimeBreak>) =>
    setBreaks((list) => list.map((b, j) => (j === i ? { ...b, ...changes } : b)));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (calc.error) { setError(calc.error); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        specialist_id: lockedSpecialistId ?? specialistId,
        project_id: projectId,
        task_id: taskId || null,
        work_date: date,
        hours: calc.hours,
        description: description.trim() || null,
        start_time: start,
        end_time: end,
        break_minutes: calc.breakMinutes,
        breaks: breaksToText(breaks),
      });
      // Se mantienen persona, proyecto y horario para el siguiente registro; solo se limpia lo propio de este.
      setDescription('');
      setTaskId(0);
      setHint(null);
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
            <select id="wh-person" className="bb-input" value={specialistId} onChange={(e) => choosePerson(Number(e.target.value))}>
              <option value={0}>Elige…</option>
              {specialists.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="bb-label" htmlFor="wh-project">Proyecto</label>
          <select id="wh-project" className="bb-input" value={projectId} onChange={(e) => { const id = Number(e.target.value); setProjectId(id); setTaskId(suggestedTaskId(tasksByProject[id] ?? [], lockedSpecialistId ?? specialistId)); }}>
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
        <div>
          <label className="bb-label" htmlFor="wh-date">Fecha</label>
          <input id="wh-date" type="date" className="bb-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="bb-label" htmlFor="wh-start">Desde</label><input id="wh-start" type="time" className="bb-input bb-mono" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><label className="bb-label" htmlFor="wh-end">Hasta</label><input id="wh-end" type="time" className="bb-input bb-mono" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        </div>

        <fieldset className="min-w-0 border border-line rounded-card p-3 space-y-2">
          <legend className="bb-label-xs text-ink-soft px-1">Descansos — opcional</legend>
          {breaks.length === 0 && <p className="bb-body text-xs text-ink-soft">Sin descansos.</p>}
          {breaks.map((b, i) => (
            <div key={i} data-testid={`break-${i}`}>
              <div className="flex items-center justify-between">
                <p className="bb-body text-xs font-semibold text-ink">Descanso {i + 1}</p>
                <button type="button" aria-label={`Quitar descanso ${i + 1}`} onClick={() => setBreaks((l) => l.filter((_, j) => j !== i))}
                  className="px-2 py-1 bb-body text-xs text-rust underline">Quitar</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="bb-label" htmlFor={`wh-b${i}-s`}>Desde</label>
                  <input id={`wh-b${i}-s`} aria-label={`Descanso ${i + 1}: desde`} type="time" className="bb-input bb-mono" value={b.start} onChange={(e) => setBreak(i, { start: e.target.value })} /></div>
                <div><label className="bb-label" htmlFor={`wh-b${i}-e`}>Hasta</label>
                  <input id={`wh-b${i}-e`} aria-label={`Descanso ${i + 1}: hasta`} type="time" className="bb-input bb-mono" value={b.end} onChange={(e) => setBreak(i, { end: e.target.value })} /></div>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            {!breaks.some((b) => b.start === LUNCH.start && b.end === LUNCH.end) && (
              <button type="button" onClick={() => setBreaks((l) => [...l, LUNCH])}
                className="px-3 py-2 min-h-[40px] border border-line rounded-card bb-body text-xs text-ink hover:bg-canvas">+ Almuerzo 13:00–14:00</button>
            )}
            <button type="button" onClick={() => setBreaks((l) => [...l, { start: '', end: '' }])}
              className="px-3 py-2 min-h-[40px] border border-line rounded-card bb-body text-xs text-ink hover:bg-canvas">+ Agregar descanso</button>
          </div>
        </fieldset>

        <p className="bb-body text-sm bg-canvas rounded-card px-3 py-2" data-testid="hours-total">
          {end && !calc.error ? (
            <>
              <strong className="text-ink">Total: {formatDuration(calc.hours * 60)}</strong>
              {calc.breakMinutes > 0 && <span className="text-ink-soft"> ({formatDuration(calc.grossMinutes)} − {formatDuration(calc.breakMinutes)} de descanso)</span>}
            </>
          ) : (
            <span className="text-ink-soft">{end ? calc.error : 'Pon la hora de inicio y de fin para calcular las horas.'}</span>
          )}
        </p>

        <div><label className="bb-label" htmlFor="wh-desc">¿Qué hiciste? — opcional</label><input id="wh-desc" className="bb-input" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        {hint && <p className="bb-body text-xs text-belt-en_revision" data-testid="hours-hint">✓ {hint}</p>}
        {error && <p role="alert" className="bb-body text-sm text-rust">{error}</p>}
        <button type="submit" disabled={submitting}
          className="w-full min-h-[44px] sm:min-h-0 py-2.5 bg-gold text-ink rounded-card bb-body text-sm font-semibold hover:bg-gold/90 disabled:opacity-50">
          {submitting ? 'Guardando…' : 'Registrar horas'}
        </button>
      </form>
    </Card>
  );
}
