// features/movements/components/TraceFigure.tsx
// Cifra clicable: abre la trazabilidad (movement_code de cada movimiento que la compone).

import { formatPen } from '../../../lib/format';

interface TraceFigureProps {
  amount: number;
  ids: number[];
  label: string;               // nombre accesible, ej. "Ingresos UN03"
  onOpen: (title: string, ids: number[]) => void;
  className?: string;
}

export function TraceFigure({ amount, ids, label, onOpen, className = '' }: TraceFigureProps) {
  if (ids.length === 0) {
    return <span className={`bb-mono text-sm text-ink ${className}`}>{formatPen(amount)}</span>;
  }
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen(label, ids); }}
      className={`bb-mono text-sm text-ink underline decoration-dotted underline-offset-4 hover:text-gold min-h-[28px] text-left ${className}`}
      aria-label={`${label}: ${formatPen(amount)}. Ver ${ids.length} movimiento${ids.length === 1 ? '' : 's'}`}
    >
      {formatPen(amount)}
    </button>
  );
}
