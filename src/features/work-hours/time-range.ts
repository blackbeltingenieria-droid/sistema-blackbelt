// features/work-hours/time-range.ts
// Horas trabajadas a partir de "desde – hasta" menos los descansos. Funciones puras.
// Si "hasta" es menor que "desde", el turno cruza la medianoche (trabajo de campo nocturno).

export interface TimeBreak {
  start: string; // 'HH:MM'
  end: string;   // 'HH:MM'
}

export interface TimeRangeResult {
  hours: number;          // horas trabajadas (ya sin descansos), 2 decimales
  grossMinutes: number;   // de "desde" a "hasta"
  breakMinutes: number;   // suma de descansos
  error: string | null;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** 'HH:MM' → minutos desde las 00:00, o null si no es una hora válida. */
export function toMinutes(t: string): number | null {
  const m = TIME_RE.exec(t.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Duración en minutos de un tramo (cruza medianoche si fin < inicio). null si no es válido o dura 0. */
function span(start: string, end: string): { from: number; to: number } | null {
  const a = toMinutes(start);
  const b = toMinutes(end);
  if (a === null || b === null || a === b) return null;
  return { from: a, to: b > a ? b : b + 24 * 60 };
}

/** Pasa un tramo al eje del turno (si el descanso es después de medianoche en un turno nocturno). */
function inShift(s: { from: number; to: number }, shiftFrom: number) {
  return s.from < shiftFrom ? { from: s.from + 24 * 60, to: s.to + 24 * 60 } : s;
}

export function computeWorkedHours(start: string, end: string, breaks: TimeBreak[]): TimeRangeResult {
  const empty = { hours: 0, grossMinutes: 0, breakMinutes: 0 };
  if (toMinutes(start) === null || toMinutes(end) === null) return { ...empty, error: 'Pon la hora de inicio y de fin (ej.: 08:00 y 17:00).' };
  const shift = span(start, end);
  if (!shift) return { ...empty, error: 'La hora de fin debe ser distinta de la de inicio.' };
  const gross = shift.to - shift.from;

  const used: { from: number; to: number }[] = [];
  let breakMinutes = 0;
  for (const [i, b] of breaks.entries()) {
    const s0 = span(b.start, b.end);
    if (!s0) return { ...empty, grossMinutes: gross, error: `Revisa el descanso ${i + 1}: pon desde y hasta (ej.: 13:00 a 14:00).` };
    const s = inShift(s0, shift.from);
    if (s.from < shift.from || s.to > shift.to) {
      return { ...empty, grossMinutes: gross, error: `El descanso ${i + 1} debe estar dentro del horario de trabajo.` };
    }
    if (used.some((u) => s.from < u.to && u.from < s.to)) {
      return { ...empty, grossMinutes: gross, error: `El descanso ${i + 1} se cruza con otro descanso.` };
    }
    used.push(s);
    breakMinutes += s.to - s.from;
  }

  const worked = gross - breakMinutes;
  if (worked <= 0) return { ...empty, grossMinutes: gross, breakMinutes, error: 'Los descansos no pueden ocupar todo el horario.' };
  if (worked > 24 * 60) return { ...empty, grossMinutes: gross, breakMinutes, error: 'Un registro no puede superar 24 horas.' };
  return { hours: Math.round((worked / 60) * 100) / 100, grossMinutes: gross, breakMinutes, error: null };
}

/** "7 h 30 min", "45 min", "8 h". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Texto guardado de los descansos: "13:00-14:00, 16:00-16:15". */
export function breaksToText(breaks: TimeBreak[]): string | null {
  return breaks.length ? breaks.map((b) => `${b.start}-${b.end}`).join(', ') : null;
}

export function breaksFromText(text: string | null | undefined): TimeBreak[] {
  if (!text) return [];
  return text.split(',').map((p) => p.trim().split('-')).filter((p) => p.length === 2).map(([start, end]) => ({ start, end }));
}
