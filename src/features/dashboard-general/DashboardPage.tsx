// features/dashboard-general/DashboardPage.tsx
// Dashboard general: indicadores del mes, comparativa de unidades y ranking de herramientas.
// Todo se deriva de movimientos VALIDADO + OK y es trazable hasta su movement_id.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { KpiCard } from '../../components/ui/KpiCard';
import { MonthSelect } from '../../components/ui/MonthSelect';
import { PageHeader } from '../../components/ui/PageHeader';
import { currentMonth, formatPen, monthRange } from '../../lib/format';
import { TraceModal } from '../movements/components/TraceModal';
import { ToolRankingCard } from './components/ToolRankingCard';
import { UnitComparison } from './components/UnitComparison';
import { useDashboardData } from './hooks/useDashboardData';

export function DashboardPage() {
  const [month, setMonth] = useState(currentMonth());
  const { data, loading, error, refetch } = useDashboardData(month);
  const [trace, setTrace] = useState<{ title: string; ids: number[] } | null>(null);

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
      <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
        <PageHeader title="Dashboard general" subtitle="Comparativo de unidades y herramientas. Cada cifra se puede rastrear hasta sus movimientos." />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <MonthSelect id="dash-month" label="Mes de análisis" value={month} months={months} onChange={setMonth} />
        </div>

        {error && <ErrorBanner message={error} onRetry={() => void refetch()} />}
        {loading && !data && <p className="bb-body text-ink-soft text-center py-12 text-sm">Cargando…</p>}

        {data && r && cash && (
          <>
            {data.report.validMovementsInMonth === 0 && (
              <p className="bb-body text-sm text-ink-soft bg-paper border border-line rounded-card px-4 py-3 mb-4" data-testid="dash-empty">
                Aún no hay movimientos validados con control OK en este mes.{' '}
                <Link to="/movements" className="underline underline-offset-2 text-ink">Ir a Movimientos</Link>
              </p>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <KpiCard label="Ingresos reconocidos" value={formatPen(r.totals.income)} />
              <KpiCard label="Contribución total" value={formatPen(r.totals.contribution)} subtext="Antes de gastos corporativos" />
              <KpiCard label="Gastos corporativos" value={formatPen(r.corpSharedExpense.amount)} subtext={`Sin repartir: ${formatPen(r.corpUnassigned)}`} valueColor="text-rust" />
              <KpiCard label="Resultado consolidado" value={formatPen(r.totals.finalResult)} valueColor={r.totals.finalResult < 0 ? 'text-rust' : 'text-ink'} />
              <KpiCard label="Flujo neto del mes" value={formatPen(cash.netFlow)} subtext="Cobros + aportes − pagos − retiros" />
              <KpiCard label="Caja acumulada" value={formatPen(cash.closingBalance)} />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4 items-start">
              <UnitComparison units={r.units} catalog={data.units} onTrace={(title, ids) => setTrace({ title, ids })} />
              <ToolRankingCard ranking={data.toolRanking} onTrace={(title, ids) => setTrace({ title, ids })} />
            </div>
          </>
        )}
      </div>
      {trace && data && <TraceModal title={trace.title} ids={trace.ids} movements={data.report.movements} onClose={() => setTrace(null)} />}
    </div>
  );
}
