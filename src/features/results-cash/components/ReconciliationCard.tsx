// features/results-cash/components/ReconciliationCard.tsx
// Conciliación obligatoria: ingresos − todos los gastos = Σ resultado final + CORP no repartido.

import { Card } from '../../../components/ui/Card';
import { formatPen } from '../../../lib/format';
import type { ResultsReport } from '../domain/calculations';

export function ReconciliationCard({ results }: { results: ResultsReport }) {
  const r = results.reconciliation;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="bb-display font-semibold text-ink text-base">Conciliación</h2>
        <span
          data-testid="reconciliation-status"
          className={`bb-mono text-[10px] px-2 py-0.5 rounded-full ${r.ok ? 'bg-belt-en_revision text-paper' : 'bg-rust text-paper'}`}
        >
          {r.ok ? 'CUADRA' : 'DIFERENCIA'}
        </span>
      </div>
      <dl className="space-y-2">
        <div className="flex justify-between gap-3"><dt className="bb-body text-sm text-ink-soft">Ingresos menos todos los gastos reconocidos</dt><dd className="bb-mono text-sm text-ink">{formatPen(r.incomeMinusAllExpenses)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="bb-body text-sm text-ink-soft">Σ resultados finales + CORP no repartido</dt><dd className="bb-mono text-sm text-ink">{formatPen(r.sumFinalPlusCorpUnassigned)}</dd></div>
        <div className="flex justify-between gap-3 border-t border-line pt-2"><dt className="bb-label-xs text-ink">Diferencia</dt><dd className="bb-mono text-sm font-medium text-ink">{formatPen(r.difference)}</dd></div>
      </dl>
    </Card>
  );
}
