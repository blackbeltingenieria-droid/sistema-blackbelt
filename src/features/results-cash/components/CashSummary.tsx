// features/results-cash/components/CashSummary.tsx
// Caja (10_CAJA): saldo acumulado y movimiento neto del mes. Solo COBRO/PAGO/APORTE_SOCIO/RETIRO_SOCIO.

import { type FormEvent, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { formatPen } from '../../../lib/format';
import { TraceFigure } from '../../movements/components/TraceFigure';
import type { CashReport } from '../domain/calculations';

interface CashSummaryProps {
  cash: CashReport;
  onTrace: (title: string, ids: number[]) => void;
  onSaveOpening: (value: number) => Promise<void>;
}

export function CashSummary({ cash, onTrace, onSaveOpening }: CashSummaryProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(cash.openingBalance));
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    const n = Number(text.replace(',', '.'));
    if (!Number.isFinite(n)) { setError('Escribe un número válido.'); return; }
    try {
      await onSaveOpening(n);
      setEditing(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    }
  }

  const line = (label: string, node: React.ReactNode, sign = '') => (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-line last:border-0">
      <dt className="bb-body text-sm text-ink-soft">{sign && <span className="bb-mono mr-1.5">{sign}</span>}{label}</dt>
      <dd>{node}</dd>
    </div>
  );

  return (
    <Card>
      <h2 className="bb-display font-semibold text-ink text-base mb-1">Caja</h2>
      <p className="bb-body text-xs text-ink-soft mb-3">Cobros + aportes − pagos − retiros. El costo reconocido no afecta la caja.</p>
      <dl>
        {line('Saldo inicial configurado', editing ? (
          <form onSubmit={save} className="flex items-center gap-2">
            <input aria-label="Saldo inicial de caja" className="bb-input bb-mono w-28" inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} />
            <button type="submit" className="bb-touch px-3 bg-gold text-ink rounded-card bb-body text-xs font-semibold">Guardar</button>
          </form>
        ) : (
          <button type="button" onClick={() => { setText(String(cash.openingBalance)); setEditing(true); }}
            className="bb-mono text-sm text-ink underline decoration-dotted underline-offset-4 min-h-[28px]">{formatPen(cash.openingBalance)}</button>
        ))}
        {line('Cobros de clientes · acumulado', <TraceFigure amount={cash.accumulated.cobros.amount} ids={cash.accumulated.cobros.ids} label="Cobros acumulados" onOpen={onTrace} />, '+')}
        {line('Aportes de socios · acumulado', <TraceFigure amount={cash.accumulated.aportes.amount} ids={cash.accumulated.aportes.ids} label="Aportes acumulados" onOpen={onTrace} />, '+')}
        {line('Pagos de la empresa · acumulado', <TraceFigure amount={cash.accumulated.pagos.amount} ids={cash.accumulated.pagos.ids} label="Pagos acumulados" onOpen={onTrace} />, '−')}
        {line('Retiros de socios · acumulado', <TraceFigure amount={cash.accumulated.retiros.amount} ids={cash.accumulated.retiros.ids} label="Retiros acumulados" onOpen={onTrace} />, '−')}
        <div className="flex items-center justify-between gap-3 py-3 mt-1 bg-canvas -mx-5 px-5">
          <dt className="bb-label-xs text-ink">Saldo de caja acumulado</dt>
          <dd className={`bb-mono text-base font-medium ${cash.closingBalance < 0 ? 'text-rust' : 'text-ink'}`} data-testid="cash-closing">{formatPen(cash.closingBalance)}</dd>
        </div>
        {line('Cobros del mes', <TraceFigure amount={cash.month.cobros.amount} ids={cash.month.cobros.ids} label="Cobros del mes" onOpen={onTrace} />)}
        {line('Aportes del mes', <TraceFigure amount={cash.month.aportes.amount} ids={cash.month.aportes.ids} label="Aportes del mes" onOpen={onTrace} />)}
        {line('Pagos del mes', <TraceFigure amount={cash.month.pagos.amount} ids={cash.month.pagos.ids} label="Pagos del mes" onOpen={onTrace} />)}
        {line('Retiros del mes', <TraceFigure amount={cash.month.retiros.amount} ids={cash.month.retiros.ids} label="Retiros del mes" onOpen={onTrace} />)}
        <div className="flex items-center justify-between gap-3 pt-3">
          <dt className="bb-label-xs text-ink">Movimiento neto del mes</dt>
          <dd className="bb-mono text-base font-medium text-ink" data-testid="cash-net">{formatPen(cash.netFlow)}</dd>
        </div>
      </dl>
      {error && <p role="alert" className="bb-body text-xs text-rust mt-2">{error}</p>}
    </Card>
  );
}
