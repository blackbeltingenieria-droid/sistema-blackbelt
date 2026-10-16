// features/results-cash/domain/period.ts
// Periodo de análisis de Resultados y caja: un mes, varios meses (desde–hasta), un año o todo
// desde el inicio. Un periodo es solo una LISTA DE MESES: los cálculos del Modelo C se hacen mes
// a mes (cada uno con su reparto CORP) y luego se suman, así ninguna regla cambia.

import { monthLabel, monthRange } from '../../../lib/format';

export type Period =
  | { kind: 'month'; month: string }
  | { kind: 'range'; from: string; to: string }
  | { kind: 'year'; year: string }
  | { kind: 'all' };

export type PeriodKind = Period['kind'];

const asc = (from: string, to: string) => (from <= to ? monthRange(from, to) : monthRange(to, from)).reverse();

/** Primer y último mes con datos (o el mes actual si no hay datos). */
export function dataBounds(dataMonths: string[], current: string): { first: string; last: string } {
  const valid = dataMonths.filter((m) => /^\d{4}-\d{2}$/.test(m)).sort();
  const first = valid[0] && valid[0] < current ? valid[0] : current;
  const last = valid.at(-1) && (valid.at(-1) as string) > current ? (valid.at(-1) as string) : current;
  return { first, last };
}

/** Meses del periodo, del más antiguo al más reciente. */
export function periodMonths(p: Period, dataMonths: string[], current: string): string[] {
  const { first, last } = dataBounds(dataMonths, current);
  switch (p.kind) {
    case 'month': return [p.month];
    case 'range': return asc(p.from, p.to);
    case 'year': {
      const end = `${p.year}-12` < last ? `${p.year}-12` : last;
      const start = `${p.year}-01`;
      return end < start ? [start] : asc(start, end);
    }
    case 'all': return asc(first, last);
  }
}

/** Texto para el título: "octubre 2026", "agosto 2026 – octubre 2026", "el año 2026", "desde el inicio". */
export function periodLabel(p: Period, months: string[]): string {
  if (p.kind === 'month') return monthLabel(p.month);
  if (p.kind === 'year') return `el año ${p.year}`;
  if (p.kind === 'all') return months.length ? `desde el inicio (${monthLabel(months[0])} – ${monthLabel(months[months.length - 1])})` : 'desde el inicio';
  return months.length === 1 ? monthLabel(months[0]) : `${monthLabel(months[0])} – ${monthLabel(months[months.length - 1])}`;
}

/** Periodo anterior del mismo largo (para comparar). "Todo" no tiene periodo anterior. */
export function previousMonths(p: Period, months: string[]): string[] {
  if (p.kind === 'all' || months.length === 0) return [];
  const n = months.length;
  const [y, m] = months[0].split('-').map(Number);
  const before = new Date(Date.UTC(y, m - 1 - n, 1));
  const start = `${before.getUTCFullYear()}-${String(before.getUTCMonth() + 1).padStart(2, '0')}`;
  const endD = new Date(Date.UTC(y, m - 2, 1));
  const end = `${endD.getUTCFullYear()}-${String(endD.getUTCMonth() + 1).padStart(2, '0')}`;
  return asc(start, end);
}

/** Cómo se nombra el periodo anterior en las frases ("septiembre", "los 3 meses anteriores"). */
export function previousLabel(p: Period, prev: string[]): string {
  if (prev.length === 0) return '';
  if (prev.length === 1) return monthLabel(prev[0]).split(' ')[0];
  if (p.kind === 'year') return `el año ${prev[0].slice(0, 4)}`;
  return `los ${prev.length} meses anteriores`;
}
