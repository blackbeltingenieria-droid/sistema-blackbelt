// features/movements/components/TraceModal.tsx
// Trazabilidad: lista los movimientos (con su movement_code) que componen una cifra.
// Toda cifra de dashboard / resultados / caja / presupuesto abre este modal.

import { ModalShell } from '../../../components/ui/ModalShell';
import { formatDateShort, formatPen } from '../../../lib/format';
import type { EnrichedMovement } from '../types';

interface TraceModalProps {
  title: string;
  ids: number[];
  movements: EnrichedMovement[];
  onClose: () => void;
}

export function TraceModal({ title, ids, movements, onClose }: TraceModalProps) {
  const set = new Set(ids);
  const rows = movements.filter((m) => set.has(m.id));
  const total = rows.reduce((a, m) => a + m.amount, 0);

  return (
    <ModalShell
      title={title}
      subtitle={`${rows.length} movimiento${rows.length === 1 ? '' : 's'} · ${formatPen(total)}`}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose}
          className="flex-1 min-h-[44px] sm:min-h-0 py-2.5 border border-line rounded-card bb-body text-sm text-ink hover:bg-canvas">
          Cerrar
        </button>
      }
    >
      {rows.length === 0 ? (
        <p className="bb-body text-sm text-ink-soft text-center py-6">Esta cifra no tiene movimientos asociados.</p>
      ) : (
        <ul className="divide-y divide-line" aria-label="Movimientos que componen la cifra">
          {rows.map((m) => (
            <li key={m.id} className="py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="bb-mono text-xs font-medium text-ink">{m.movement_code}</p>
                <p className="bb-body text-xs text-ink-soft break-words">
                  {formatDateShort(m.movement_date)} · {m.record_type} · {m.unitCode}
                  {m.counterparty ? ` · ${m.counterparty}` : ''}
                </p>
                {m.detail && <p className="bb-body text-xs text-ink-soft break-words">{m.detail}</p>}
              </div>
              <span className="bb-mono text-sm font-medium text-ink shrink-0">{formatPen(m.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </ModalShell>
  );
}
