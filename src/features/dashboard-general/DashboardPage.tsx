// features/dashboard-general/DashboardPage.tsx
// Dashboard general con estilo de tablero (como el de la sede Pucallpa): panel de filtros a la izquierda
// (Vista: «Todo el tiempo» o «Por mes», y el mes), banner y tarjetas/gráficos.
// «Todo el tiempo»: la empresa desde el inicio. «Por mes»: indicadores del mes, comparativa de unidades y
// ranking de herramientas. Todo se deriva de movimientos VALIDADO + OK y es trazable hasta su movement_id.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { MonthSelect } from '../../components/ui/MonthSelect';
import { currentMonth, formatPen, monthLabel, monthRange } from '../../lib/format';
import { TraceModal } from '../movements/components/TraceModal';
import type { EnrichedMovement } from '../movements/types';
import { CompanyOverview } from './components/CompanyOverview';
import { Banner, CajaFiltro, OpcionFiltro, PanelFiltros, TarjetaCifra } from './components/Tablero';
import { ToolRankingCard } from './components/ToolRankingCard';
import { UnitComparison } from './components/UnitComparison';
import { useDashboardData } from './hooks/useDashboardData';

export function DashboardPage() {
  const [view, setView] = useState<'all' | 'month'>('all');
  const [month, setMonth] = useState(currentMonth());
  const { data, loading, error, refetch } = useDashboardData(month);
  const [trace, setTrace] = useState<{ title: string; ids: number[]; movements?: EnrichedMovement[] } | null>(null);

  const months = useMemo(() => {
    const set = new Set(monthRange('2026-01', currentMonth()));
    data?.report.movements.forEach((m) => m.mes && set.add(m.mes));
    set.add(month);
    return [...set].sort().reverse();
  }, [data, month]);

  const r = data?.report.results;
  const cash = data?.report.cash;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7 grid grid-cols-1 lg:grid-cols-[210px_minmax(0,1fr)] gap-3">
        <PanelFiltros>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
            <CajaFiltro titulo="Vista">
              <div role="tablist" aria-label="Qué ver" className="space-y-1">
                {([['all', 'Todo el tiempo'], ['month', 'Por mes']] as const).map(([id, label]) => (
                  <OpcionFiltro key={id} role="tab" activo={view === id} testId={`dash-view-${id}`} onClick={() => setView(id)}>{label}</OpcionFiltro>
                ))}
              </div>
            </CajaFiltro>
            {view === 'month' && (
              <CajaFiltro titulo="Periodo">
                <MonthSelect id="dash-month" label="Mes de análisis" value={month} months={months} onChange={setMonth} />
              </CajaFiltro>
            )}
          </div>
        </PanelFiltros>

        <div className="space-y-3 min-w-0">
          <Banner titulo="Dashboard general"
            subtitulo={view === 'all' ? 'Cómo va la empresa desde el inicio hasta hoy. Cada cifra se puede rastrear hasta sus registros.' : `Cómo le fue a la empresa en ${monthLabel(month)}.`} />

          {view === 'all' ? (
            <CompanyOverview onTrace={(title, ids, report) => setTrace({ title, ids, movements: report.movements })} />
          ) : (<>
            {error && <ErrorBanner message={error} onRetry={() => void refetch()} />}
            {loading && !data && <p className="bb-body text-ink-soft text-center py-12 text-sm">Cargando…</p>}

            {data && r && cash && (
              <>
                {data.report.validMovementsInMonth === 0 && (
                  <p className="bb-body text-sm text-ink-soft bg-paper border border-line rounded-card px-4 py-3" data-testid="dash-empty">
                    Aún no hay movimientos validados con control OK en este mes.{' '}
                    <Link to="/movements" className="underline underline-offset-2 text-ink">Ir a Movimientos</Link>
                  </p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3">
                  <TarjetaCifra etiqueta="Ingresos reconocidos" valor={formatPen(r.totals.income)} color="text-belt-en_revision" />
                  <TarjetaCifra etiqueta="Contribución total" valor={formatPen(r.totals.contribution)} nota="Antes de gastos corporativos" />
                  <TarjetaCifra etiqueta="Gastos corporativos" valor={formatPen(r.corpSharedExpense.amount)} nota={`Sin repartir: ${formatPen(r.corpUnassigned)}`} color="text-rust" />
                  <TarjetaCifra etiqueta="Resultado consolidado" valor={formatPen(r.totals.finalResult)} color={r.totals.finalResult < 0 ? 'text-rust' : 'text-ink'} />
                  <TarjetaCifra etiqueta="Flujo neto del mes" valor={formatPen(cash.netFlow)} nota="Cobros + aportes − pagos − retiros" color={cash.netFlow < 0 ? 'text-rust' : 'text-ink'} />
                  <TarjetaCifra etiqueta="Caja acumulada" valor={formatPen(cash.closingBalance)} color={cash.closingBalance < 0 ? 'text-rust' : 'text-ink'} />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3 items-start">
                  <UnitComparison units={r.units} catalog={data.units} onTrace={(title, ids) => setTrace({ title, ids })} />
                  <ToolRankingCard ranking={data.toolRanking} onTrace={(title, ids) => setTrace({ title, ids })} />
                </div>
              </>
            )}
          </>)}
        </div>
      </div>
      {trace && (trace.movements ?? data?.report.movements) && (
        <TraceModal title={trace.title} ids={trace.ids} movements={trace.movements ?? data?.report.movements ?? []} onClose={() => setTrace(null)} />
      )}
    </div>
  );
}
