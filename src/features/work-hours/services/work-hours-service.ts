// features/work-hours/services/work-hours-service.ts
// Registro de horas-hombre por persona, proyecto y tarea.

import { isSupabaseConfigured, supabase } from '../../../lib/supabase';
import type { DbWorkHour } from '../../../types/database';
import { validateHours } from '../hours-summary';
import { SEED_WORK_HOURS } from './seed-data';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- patrón del proyecto
const sb = () => supabase as any;

const mem = { rows: SEED_WORK_HOURS.map((r) => ({ ...r })) };

export type WorkHourPayload = Omit<DbWorkHour, 'id' | 'created_at'>;

export async function getWorkHours(filter?: { specialistId?: number }): Promise<DbWorkHour[]> {
  if (!isSupabaseConfigured()) {
    return mem.rows
      .filter((r) => filter?.specialistId === undefined || r.specialist_id === filter.specialistId)
      .sort((a, b) => b.work_date.localeCompare(a.work_date) || b.id - a.id)
      .map((r) => ({ ...r }));
  }
  let q = sb().from('work_hours').select('*').order('work_date', { ascending: false }).order('id', { ascending: false });
  if (filter?.specialistId !== undefined) q = q.eq('specialist_id', filter.specialistId);
  const { data, error } = await q;
  if (error) throw new Error(`getWorkHours: ${error.message}`);
  return ((data ?? []) as DbWorkHour[]).map((r) => ({
    ...r,
    hours: Number(r.hours),
    start_time: r.start_time ? r.start_time.slice(0, 5) : null,
    end_time: r.end_time ? r.end_time.slice(0, 5) : null,
  }));
}

function validate(p: WorkHourPayload): void {
  if (!p.specialist_id) throw new Error('Elige la persona.');
  if (!p.project_id) throw new Error('Elige el proyecto.');
  if (!p.work_date) throw new Error('La fecha es obligatoria.');
  const problem = validateHours(p.hours);
  if (problem) throw new Error(problem);
}

/** Error de Postgres/PostgREST por columna inexistente (migración no aplicada). */
function isMissingColumn(error: { code?: string; message?: string }): boolean {
  return error.code === '42703' || error.code === 'PGRST204' || /column/i.test(error.message ?? '');
}

export async function createWorkHour(payload: WorkHourPayload): Promise<void> {
  validate(payload);
  if (!isSupabaseConfigured()) {
    mem.rows.push({ id: mem.rows.reduce((m, r) => Math.max(m, r.id), 0) + 1, ...payload });
    return;
  }
  const { error } = await sb().from('work_hours').insert(payload);
  if (error && isMissingColumn(error) && payload.start_time) {
    // La base aún no tiene la migración 20261016000001: se guardan las horas y el horario va en la descripción.
    const legacy = {
      specialist_id: payload.specialist_id, project_id: payload.project_id, task_id: payload.task_id,
      work_date: payload.work_date, hours: payload.hours,
    };
    const note = `${payload.start_time}–${payload.end_time}${payload.break_minutes ? ` (descanso ${payload.break_minutes} min)` : ''}`;
    const retry = await sb().from('work_hours').insert({ ...legacy, description: [note, payload.description].filter(Boolean).join(' · ') });
    if (retry.error) throw new Error(`createWorkHour: ${retry.error.message}`);
    return;
  }
  if (error) throw new Error(`createWorkHour: ${error.message}`);
}

export async function deleteWorkHour(id: number): Promise<void> {
  if (!isSupabaseConfigured()) {
    mem.rows = mem.rows.filter((r) => r.id !== id);
    return;
  }
  const { error } = await sb().from('work_hours').delete().eq('id', id);
  if (error) throw new Error(`deleteWorkHour: ${error.message}`);
}
