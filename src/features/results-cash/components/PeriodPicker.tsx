// features/results-cash/components/PeriodPicker.tsx
// Elegir qué periodo mirar: un mes, varios meses (desde–hasta), un año o todo desde el inicio.

import { monthLabel } from '../../../lib/format';
import type { Period, PeriodKind } from '../domain/period';

interface Props {
  value: Period;
  /** Meses disponibles (más reciente primero). */
  months: string[];
  onChange: (p: Period) => void;
}

const KINDS: [PeriodKind, string][] = [
  ['month', 'Un mes'],
  ['range', 'Varios meses'],
  ['year', 'Un año'],
  ['all', 'Todo'],
];

export function PeriodPicker({ value, months, onChange }: Props) {
  const newest = months[0];
  const oldest = months[months.length - 1];
  const years = [...new Set(months.map((m) => m.slice(0, 4)))];
  const endOf = (p: Period) => (p.kind === 'month' ? p.month : p.kind === 'range' ? p.to : newest);

  function pick(kind: PeriodKind) {
    const end = endOf(value);
    if (kind === 'month') onChange({ kind, month: end });
    else if (kind === 'range') {
      const idx = Math.min(months.length - 1, months.indexOf(end) + 2);
      onChange({ kind, from: months[idx] ?? oldest, to: end });
    } else if (kind === 'year') onChange({ kind, year: end.slice(0, 4) });
    else onChange({ kind });
  }

  const select = (id: string, label: string, v: string, set: (v: string) => void, options: [string, string][]) => (
    <div className="min-w-0">
      <label htmlFor={id} className="bb-label">{label}</label>
      <select id={id} className="bb-input !bg-paper" value={v} onChange={(e) => set(e.target.value)}>
        {options.map(([val, text]) => <option key={val} value={val}>{text}</option>)}
      </select>
    </div>
  );
  const monthOptions = months.map((m) => [m, monthLabel(m)] as [string, string]);

  return (
    <div className="space-y-2" data-testid="period-picker">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Periodo">
        {KINDS.map(([k, label]) => (
          <button key={k} type="button" aria-pressed={value.kind === k} data-testid={`period-${k}`} onClick={() => pick(k)}
            className={`px-3 py-1.5 min-h-[36px] rounded-card border bb-body text-xs ${value.kind === k ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink hover:border-ink-soft'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 max-w-md">
        {value.kind === 'month' && select('rc-month', 'Mes de análisis', value.month, (m) => onChange({ kind: 'month', month: m }), monthOptions)}
        {value.kind === 'range' && (
          <>
            {select('rc-from', 'Desde', value.from, (m) => onChange({ kind: 'range', from: m, to: m > value.to ? m : value.to }), monthOptions)}
            {select('rc-to', 'Hasta', value.to, (m) => onChange({ kind: 'range', from: m < value.from ? m : value.from, to: m }), monthOptions)}
          </>
        )}
        {value.kind === 'year' && select('rc-year', 'Año', value.year, (y) => onChange({ kind: 'year', year: y }), years.map((y) => [y, y]))}
        {value.kind === 'all' && (
          <p className="col-span-2 bb-body text-xs text-ink-soft self-center">
            Todo lo registrado{oldest ? `, de ${monthLabel(oldest)} a ${monthLabel(newest)}` : ''}.
          </p>
        )}
      </div>
    </div>
  );
}
