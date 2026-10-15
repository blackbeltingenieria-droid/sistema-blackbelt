import { describe, expect, it } from 'vitest';
import { breaksFromText, breaksToText, computeWorkedHours, formatDuration, toMinutes } from './time-range';

describe('horas de "desde" a "hasta" menos descansos', () => {
  it('jornada normal con almuerzo: 08:00–17:00 − 1 h = 8 h', () => {
    expect(computeWorkedHours('08:00', '17:00', [{ start: '13:00', end: '14:00' }])).toEqual({
      hours: 8, grossMinutes: 540, breakMinutes: 60, error: null,
    });
  });
  it('varios descansos y minutos: 08:30–18:15 − (1 h + 15 min) = 8.5 h', () => {
    const r = computeWorkedHours('08:30', '18:15', [{ start: '13:00', end: '14:00' }, { start: '16:00', end: '16:15' }]);
    expect([r.hours, r.breakMinutes, r.error]).toEqual([8.5, 75, null]);
  });
  it('sin descansos', () => {
    expect(computeWorkedHours('09:00', '12:30', []).hours).toBe(3.5);
  });
  it('turno que cruza la medianoche, con descanso pasada la medianoche', () => {
    const r = computeWorkedHours('22:00', '06:00', [{ start: '02:00', end: '02:30' }]);
    expect([r.hours, r.error]).toEqual([7.5, null]);
  });
  it('errores en palabras simples', () => {
    expect(computeWorkedHours('', '17:00', []).error).toContain('hora de inicio');
    expect(computeWorkedHours('08:00', '08:00', []).error).toContain('distinta');
    expect(computeWorkedHours('08:00', '12:00', [{ start: '12:30', end: '13:00' }]).error).toContain('dentro del horario');
    expect(computeWorkedHours('08:00', '12:00', [{ start: '09:00', end: '10:00' }, { start: '09:30', end: '09:45' }]).error).toContain('se cruza');
    expect(computeWorkedHours('08:00', '09:00', [{ start: '08:00', end: '09:00' }]).error).toContain('todo el horario');
    expect(computeWorkedHours('08:00', '12:00', [{ start: '10:00', end: '' }]).error).toContain('descanso 1');
  });
});

describe('formatos', () => {
  it('minutos y duraciones', () => {
    expect(toMinutes('07:45')).toBe(465);
    expect(toMinutes('25:00')).toBeNull();
    expect(formatDuration(450)).toBe('7 h 30 min');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(480)).toBe('8 h');
  });
  it('descansos ida y vuelta como texto', () => {
    const b = [{ start: '13:00', end: '14:00' }, { start: '16:00', end: '16:15' }];
    expect(breaksToText(b)).toBe('13:00-14:00, 16:00-16:15');
    expect(breaksFromText(breaksToText(b))).toEqual(b);
    expect(breaksToText([])).toBeNull();
  });
});
