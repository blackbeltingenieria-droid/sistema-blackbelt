// features/movements/components/MovementBadges.tsx
// Chips de estado (BORRADOR/VALIDADO) y de control automático. Colores = belt-stripe oficial.

import type { ControlStatus, MovementStatus } from '../types';

const BASE = 'inline-flex items-center rounded-full px-2 py-0.5 bb-mono text-[10px] font-medium whitespace-nowrap';

export function StatusBadge({ status }: { status: MovementStatus }) {
  const cls = status === 'VALIDADO' ? 'bg-belt-hecho text-paper' : 'bg-belt-backlog text-ink';
  return <span className={`${BASE} ${cls}`}>{status}</span>;
}

export function ControlBadge({ control }: { control: ControlStatus }) {
  const cls =
    control === 'OK'
      ? 'bg-belt-en_revision text-paper'
      : control === 'INCOMPLETO'
        ? 'bg-rust text-paper'
        : 'bg-belt-por_hacer text-ink';
  return <span className={`${BASE} ${cls}`} title={control === 'OK' ? 'Alimenta reportes si está VALIDADO' : 'No alimenta reportes hasta corregirse'}>{control}</span>;
}
