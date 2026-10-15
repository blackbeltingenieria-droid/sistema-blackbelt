// features/results-cash/ResultsCashPage.tsx
// Resultados Modelo C (contribución, margen, resultado final) y caja de un mes.
// Todo calculado desde movimientos VALIDADO + OK; cada cifra abre su trazabilidad.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { KpiCard } from '../../components/ui/KpiCard';
import { MonthSelect } from '../../components/ui/MonthSelect';
import { PageHeader } from '../../components/ui/PageHeader';
import { currentMonth, formatPct, formatPen, monthRange } from '../../lib/format';
import { useMovementCatalogs } from '../movements/hooks/useMovementCatalogs';
import { TraceModal } from '../movements/components/TraceModal';
import { CashSummary } from './components/CashSummary';
import { ReconciliationCard } from './components/ReconciliationCard';
import { ResultsByUnit } from './components/ResultsByUnit';
import { useMonthReport } from './hooks/useMonthReport';
import { setOpeningCash } from './services/results-service';

export function ResultsCashPage() {
  const [month, setMonth] = useState(currentMonth());
  const { report, loading, error, refetch } = useMonthReport(month);
  const { units } = useMovementCatalogs();
  const [trace, setTrace] = useState<{ title: string; ids: number[] } | null>(null);

  const months = useMemo(() => {
    const set = new Set(monthRange('2026-01', currentMonth()));
    report?.movements.forEach((m) => m.mes && set.add(m.mes));
    set.add(month);
    return [...set].sort().reverse();
  }, [report, month]);

  const r = report?.results;
  const alloc = report?.allocation;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
        <PageHeader title="Resultados y caja" subtitle="Contribución, margen y resultado final por unidad, más la caja. Nada se guarda: todo se calcula." />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 items-end">
          <MonthSelect id="rc-month" label="Mes de análisis" value={month} months={months} onChange={setMonth} />
          {alloc && (
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2 pb-1">
              <span className="bb-label-xs text-ink-soft">Reparto CORP</span>
              <span data-testid="allocation-status" className={`bb-mono text-[11px] px-2 py-0.5 rounded-full ${alloc.status === 'COMPLETO' ? 'bg-belt-en_revision text-paper' : alloc.status === 'REVISAR >100%' ? 'bg-rust text-paper' : 'bg-belt-por_hacer text-ink'}`}>
                {alloc.status}
              </span>
              <Link to="/budgets" className="bb-body text-xs text-ink underline underline-offset-2">Definir reparto</Link>
            </div>
          )}
        </div>

        {error && <ErrorBanner message={error} onRetry={() => void refetch()} />}
        {loading && !report && <p className="bb-body text-ink-soft text-center py-12 text-sm">Calculando…</p>}

        {report && r && (
          <>
            {report.pendingReview > 0 && (
              <p className="bb-body text-xs text-ink-soft mb-3" data-testid="pending-note">
                {report.pendingReview} movimiento{report.pendingReview === 1 ? '' : 's'} con control distinto de OK quedan fuera de estas cifras.{' '}
                <Link to="/movements" className="underline underline-offset-2 text-ink">Revisarlos</Link>
              </p>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <KpiCard label="Ingresos reconocidos" value={formatPen(r.totals.income)} />
              <KpiCard label="Contribución total" value={formatPen(r.totals.contribution)} subtext="Antes de gastos CORP" />
              <KpiCard label="Gasto CORP compartido" value={formatPen(r.corpSharedExpense.amount)} subtext={`Sin repartir: ${formatPen(r.corpUnassigned)}`} valueColor="text-rust" />
              <KpiCard label="Resultado consolidado" value={formatPen(r.totals.finalResult)} subtext={`Margen ${formatPct(r.totals.marginPct)}`} valueColor={r.totals.finalResult < 0 ? 'text-rust' : 'text-ink'} />
            </div>

            <h2 className="bb-display font-semibold text-ink text-base mb-2">Resultados por unidad</h2>
            <div className="mb-4">
              <ResultsByUnit units={r.units} catalog={units} onTrace={(title, ids) => setTrace({ title, ids })} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                <ReconciliationCard results={r} />
                <Card>
                  <h2 className="bb-display font-semibold text-ink text-base mb-2">CORP sin repartir</h2>
                  <p className="bb-mono text-xl text-ink" data-testid="corp-unassigned">{formatPen(r.corpUnassigned)}</p>
                  <p className="bb-body text-xs text-ink-soft mt-1">
                    {alloc?.status === 'SIN REPARTIR'
                      ? 'Todo el gasto compartido de CORP sigue sin repartir: aún no hay reparto documentado para este mes.'
                      : 'Parte del gasto compartido que no recibió reparto este mes.'}
                  </p>
                </Card>
              </div>
              <CashSummary
                cash={report.cash}
                onTrace={(title, ids) => setTrace({ title, ids })}
                onSaveOpening={async (v) => { await setOpeningCash(v); await refetch(); }}
              />
            </div>
          </>
        )}
      </div>

      {trace && report && (
        <TraceModal title={trace.title} ids={trace.ids} movements={report.movements} onClose={() => setTrace(null)} />
      )}
    </div>
  );
}
