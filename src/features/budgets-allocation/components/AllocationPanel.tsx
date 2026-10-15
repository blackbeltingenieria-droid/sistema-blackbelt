// features/budgets-allocation/components/AllocationPanel.tsx
// Reparto mensual del gasto CORP compartido a UN01–UN05. Suma 100 % o queda "SIN REPARTIR".
// Nunca se precarga un reparto parejo.

import { type FormEvent, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { formatPen } from '../../../lib/format';
import { TraceFigure } from '../../movements/components/TraceFigure';
import {
  COMMERCIAL_UNIT_CODES, allocationStatus, sumAllocation,
  type AllocationPcts, type AllocationSummary,
} from '../../results-cash/domain/calculations';
import { validateAllocationForm } from '../domain/allocation-validation';
import type { MonthAllocation } from '../services/budget-service';

interface AllocationPanelProps {
  month: string;
  initial: MonthAllocation;
  summary: AllocationSummary;
  onTrace: (title: string, ids: number[]) => void;
  onSave: (pcts: AllocationPcts, note: string) => Promise<void>;
  /** Propuestas para rellenar con un clic (la persona revisa y guarda). */
  suggestions?: { previous?: MonthAllocation | null; byIncome?: AllocationPcts | null };
}

export function AllocationPanel({ month, initial, summary, onTrace, onSave, suggestions }: AllocationPanelProps) {
  const [texts, setTexts] = useState<Record<string, string>>(
    () => Object.fromEntries(COMMERCIAL_UNIT_CODES.map((c) => [c, initial.pcts[c] ? String(initial.pcts[c]) : ''])),
  );
  const [note, setNote] = useState(initial.note);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const pcts: AllocationPcts = Object.fromEntries(
    COMMERCIAL_UNIT_CODES.map((c) => [c, Number((texts[c] ?? '').replace(',', '.') || 0)]),
  );
  const sum = sumAllocation(pcts);
  const status = allocationStatus(pcts);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    const problem = validateAllocationForm(pcts, note);
    if (problem) { setError(problem); return; }
    try {
      await onSave(pcts, note);
      setError(null);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el reparto.');
    }
  }

  function applySuggestion(p: AllocationPcts, criterion: string) {
    setTexts(Object.fromEntries(COMMERCIAL_UNIT_CODES.map((c) => [c, p[c] ? String(p[c]) : ''])));
    if (!note.trim()) setNote(criterion);
    setSaved(false);
  }
  const prev = suggestions?.previous && sumAllocation(suggestions.previous.pcts) > 0 ? suggestions.previous : null;
  const byIncome = suggestions?.byIncome ?? null;

  return (
    <Card>
      <h2 className="bb-display font-semibold text-ink text-base">Reparto de CORP · {month}</h2>
      <p className="bb-body text-xs text-ink-soft mb-3">
        Solo se reparte el gasto CORP compartido, reconocido y validado. Por defecto 0 % (sin repartir): no se asume 20 % parejo.
      </p>
      {(prev || byIncome) && (
        <div className="flex flex-wrap items-center gap-2 mb-4" data-testid="allocation-suggestions">
          <span className="bb-body text-xs text-ink-soft">Rellenar con un clic:</span>
          {prev && (
            <button type="button" className="bb-touch px-3 border border-line rounded-card bb-body text-xs hover:bg-canvas"
              onClick={() => applySuggestion(prev.pcts, prev.note || 'Igual que el mes anterior')}>Igual que el mes anterior</button>
          )}
          {byIncome && (
            <button type="button" className="bb-touch px-3 border border-line rounded-card bb-body text-xs hover:bg-canvas"
              onClick={() => applySuggestion(byIncome, 'Proporcional a las ventas del mes')}>Según las ventas del mes</button>
          )}
        </div>
      )}
      <dl className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <dt className="bb-label-xs text-ink-soft mb-0.5">Gasto CORP del mes</dt>
          <dd><TraceFigure amount={summary.corpExpense.amount} ids={summary.corpExpense.ids} label={`Gasto CORP compartido ${month}`} onOpen={onTrace} /></dd>
        </div>
        <div>
          <dt className="bb-label-xs text-ink-soft mb-0.5">Sin asignar</dt>
          <dd className="bb-mono text-sm text-ink" data-testid="alloc-unassigned">{formatPen(summary.unassigned)}</dd>
        </div>
      </dl>

      <form onSubmit={submit} noValidate>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {COMMERCIAL_UNIT_CODES.map((c) => (
            <div key={c}>
              <label className="bb-label" htmlFor={`alloc-${c}`}>{c} %</label>
              <input id={`alloc-${c}`} className="bb-input bb-mono" inputMode="decimal" placeholder="0" value={texts[c]}
                onChange={(e) => { setTexts({ ...texts, [c]: e.target.value }); setSaved(false); }} />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <label className="bb-label" htmlFor="alloc-note">Criterio del reparto</label>
          <input id="alloc-note" className="bb-input" placeholder="Ej. proporcional a horas de soporte" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <span className="bb-mono text-xs text-ink">Suma: {sum.toFixed(2)} %</span>
          <span data-testid="alloc-form-status" className={`bb-mono text-[11px] px-2 py-0.5 rounded-full ${status === 'COMPLETO' ? 'bg-belt-en_revision text-paper' : status === 'REVISAR >100%' ? 'bg-rust text-paper' : 'bg-belt-por_hacer text-ink'}`}>{status}</span>
          <button type="button" onClick={() => { setTexts(Object.fromEntries(COMMERCIAL_UNIT_CODES.map((c) => [c, '']))); setSaved(false); }}
            className="bb-touch px-3 border border-line rounded-card bb-body text-xs hover:bg-canvas">Dejar sin repartir</button>
          <button type="submit" className="bb-touch px-4 bg-gold text-ink rounded-card bb-body text-sm font-semibold hover:bg-gold/90">Guardar reparto</button>
        </div>
        {error && <p role="alert" className="bb-body text-sm text-rust mt-2">{error}</p>}
        {saved && <p role="status" className="bb-body text-sm text-belt-en_revision mt-2">Reparto guardado.</p>}
      </form>
    </Card>
  );
}
