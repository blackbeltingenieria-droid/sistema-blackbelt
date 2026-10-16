// features/results-cash/ResultsCashPage.tsx
// Resultados Modelo C (contribución, margen, resultado final) y caja de un mes.
// Todo calculado desde movimientos VALIDADO + OK; cada cifra abre su trazabilidad.

import { lazy, Suspense, useMemo, useState } from 'react';
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
import { buildNarrative } from './domain/presentation';
import { buildBusinessSummary } from './domain/summary';
import { buildBudgetStatus } from '../budgets-allocation/domain/budget-status';
import { BusinessSummaryView } from './components/BusinessSummaryView';
import { CATEGORY_SHORT } from '../movements/domain/quick-entry';
import { useMonthReport } from './hooks/useMonthReport';
import { setOpeningCash } from './services/results-service';

const ResultsCharts = lazy(() => import('./components/ResultsCharts'));

type Tab = 'summary' | 'charts' | 'detail';

export function ResultsCashPage() {
  const [month, setMonth] = useState(currentMonth());
  const { report, loading, error, refetch } = useMonthReport(month);
  const { units, categories } = useMovementCatalogs();
  const [tab, setTab] = useState<Tab>('summary');
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
        <PageHeader title="Resultados y caja" subtitle="¿Estás ganando o perdiendo, y por qué?" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 items-end">
          <MonthSelect id="rc-month" label="Mes de análisis" value={month} months={months} onChange={setMonth} />
          {alloc && tab !== 'summary' && (
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
            {tab !== 'summary' && report.pendingReview > 0 && (
              <p className="bb-body text-xs text-ink-soft mb-3" data-testid="pending-note">
                {report.pendingReview} movimiento{report.pendingReview === 1 ? '' : 's'} con control distinto de OK quedan fuera de estas cifras.{' '}
                <Link to="/movements" className="underline underline-offset-2 text-ink">Revisarlos</Link>
              </p>
            )}

            {tab !== 'summary' && (() => {
              const n = buildNarrative(r, report.previous);
              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4" data-testid="results-kpis">
                  <KpiCard label="Ingresos reconocidos" value={formatPen(n.income.value)} delta={n.income.delta} deltaGood={n.income.goodWhen} note={n.income.phrase} />
                  <KpiCard label="Contribución total" value={formatPen(n.contribution.value)} delta={n.contribution.delta} deltaGood={n.contribution.goodWhen} note={n.contribution.phrase} />
                  <KpiCard label="Gasto CORP compartido" value={formatPen(n.corpExpense.value)} valueColor="text-rust" delta={n.corpExpense.delta} deltaGood={n.corpExpense.goodWhen} note={n.corpExpense.phrase} />
                  <KpiCard label="Resultado consolidado" value={formatPen(n.finalResult.value)} valueColor={n.finalResult.value < 0 ? 'text-rust' : 'text-ink'} delta={n.finalResult.delta} deltaGood={n.finalResult.goodWhen} note={n.finalResult.phrase} subtext={`Margen ${formatPct(r.totals.marginPct)}`} />
                </div>
              );
            })()}

            <div role="tablist" aria-label="Vista de resultados" className="flex gap-1 mb-4 border-b border-line">
              {([['summary', 'Resumen'], ['charts', 'Gráficos'], ['detail', 'Detalle']] as [Tab, string][]).map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                  className={`min-h-[44px] px-4 bb-body text-sm -mb-px border-b-2 ${tab === id ? 'border-gold text-ink font-semibold' : 'border-transparent text-ink-soft hover:text-ink'}`}>
                  {label}
                </button>
              ))}
            </div>

            {tab === 'summary' ? (
              <BusinessSummaryView
                mes={month}
                pendingReview={report.pendingReview}
                budget={buildBudgetStatus({
                  mes: month, today: new Date().toISOString().slice(0, 10), budgets: report.budgets, movements: report.movements,
                  units, categories, categoryName: (c, id) => (c ? CATEGORY_SHORT[c.code] ?? c.name : String(id)),
                })}
                onTrace={(title, ids) => setTrace({ title, ids })}
                summary={buildBusinessSummary({
                  mes: month, results: r, previous: report.previous, cash: report.cash, movements: report.movements,
                  evolution: report.evolution,
                  projectsReceivable: report.projectsReceivable,
                  categoryNames: new Map(categories.map((c) => [c.id, CATEGORY_SHORT[c.code] ?? c.name])),
                  unitNames: new Map(units.map((u) => [u.code, u.name])),
                })}
              />
            ) : tab === 'charts' ? (
              <Suspense fallback={<p className="bb-body text-ink-soft text-center py-12 text-sm">Cargando gráficos…</p>}>
                <ResultsCharts report={report} units={units} categories={categories} onTrace={(title, ids) => setTrace({ title, ids })} />
              </Suspense>
            ) : (
              <>
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
          </>
        )}
      </div>

      {trace && report && (
        <TraceModal title={trace.title} ids={trace.ids} movements={report.movements} onClose={() => setTrace(null)} />
      )}
    </div>
  );
}
