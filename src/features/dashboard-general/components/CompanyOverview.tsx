// features/dashboard-general/components/CompanyOverview.tsx
// "La empresa desde el inicio": todo el tiempo en una pantalla, con gráficos simples (barras en CSS,
// sin librerías). Mismas cifras que Resultados y caja → periodo «Todo».

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { formatPen, monthLabel, monthShort } from '../../../lib/format';
import { getCostCategories } from '../../catalogs/services/catalog-service';
import type { CostCategory } from '../../catalogs/types';
import { getProjectRows } from '../../clients-projects/services/project-service';
import type { ProjectRow } from '../../clients-projects/types';
import { CATEGORY_SHORT } from '../../movements/domain/quick-entry';
import { expensesByCategory } from '../../results-cash/domain/presentation';
import { buildBusinessSummary } from '../../results-cash/domain/summary';
import { getPeriodReport, type MonthReport } from '../../results-cash/services/results-service';
import { salesByClient } from '../domain/company-overview';

interface Data { report: MonthReport; categories: CostCategory[]; projects: ProjectRow[] }

function useOverview() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      const [report, categories, projects] = await Promise.all([
        getPeriodReport({ kind: 'all' }), getCostCategories(), getProjectRows().catch(() => []),
      ]);
      setData({ report, categories, projects });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el resumen.');
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return { data, error, refetch: load };
}

/** Barra horizontal con nombre y monto (toca para ver los registros). */
function HBars({ items, color, testId, onTrace, empty }: {
  items: { key: string | number; name: string; amount: number; ids: number[] }[];
  color: string; testId: string; empty: string;
  onTrace: (title: string, ids: number[]) => void;
}) {
  const max = Math.max(1, ...items.map((i) => i.amount));
  if (items.length === 0) return <p className="bb-body text-sm text-ink-soft">{empty}</p>;
  return (
    <ul className="space-y-2.5" data-testid={testId}>
      {items.map((i) => (
        <li key={i.key}>
          <button type="button" className="w-full text-left group" onClick={() => onTrace(i.name, i.ids)}>
            <div className="flex justify-between gap-2 bb-body text-sm">
              <span className="text-ink group-hover:underline truncate">{i.name}</span>
              <span className="bb-mono text-ink whitespace-nowrap">{formatPen(i.amount)}</span>
            </div>
            <div className="h-2 bg-canvas rounded-full mt-1 overflow-hidden">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${(i.amount / max) * 100}%` }} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CompanyOverview({ onTrace }: { onTrace: (title: string, ids: number[], report: MonthReport) => void }) {
  const { data, error, refetch } = useOverview();

  const view = useMemo(() => {
    if (!data) return null;
    const { report, categories, projects } = data;
    const names = new Map(categories.map((c) => [c.id, CATEGORY_SHORT[c.code] ?? c.name]));
    const summary = buildBusinessSummary({
      mes: report.mes, months: report.months, results: report.results, previous: report.previous, cash: report.cash,
      movements: report.movements, evolution: report.evolution, categoryNames: names, unitNames: new Map(),
      projectsReceivable: report.projectsReceivable, laborPending: report.laborPending, laborOwedRegistered: report.laborOwedRegistered,
    });
    const clientOf = new Map(projects.map((p) => [p.id, p.clientName]));
    return {
      summary,
      expenses: expensesByCategory(report.movements, report.months, names, 6).map((e) => ({ key: e.categoryId, name: e.name, amount: e.amount, ids: e.ids })),
      sales: salesByClient(report.movements, clientOf),
    };
  }, [data]);

  if (error) return <ErrorBanner message={error} onRetry={() => void refetch()} />;
  if (!data || !view) return <p className="bb-body text-ink-soft text-center py-12 text-sm">Cargando…</p>;

  const { report } = data;
  const s = view.summary;
  const trace = (title: string, ids: number[]) => onTrace(title, ids, report);
  const first = report.dataMonths[0];
  const months = report.evolution;
  const maxMonth = Math.max(1, ...months.map((m) => Math.max(m.income, m.costs)));
  const cashPoints = report.cashByMonth;
  const maxCash = Math.max(1, ...cashPoints.map((c) => Math.abs(c.balance)));
  const winning = s.sinceStart.result >= 0;

  const kpi = (label: string, value: number, color: string, testId: string, note?: string) => (
    <Card>
      <p className="bb-label-xs text-ink-soft">{label}</p>
      <p className={`bb-mono text-base sm:text-xl font-semibold break-words ${color}`} data-testid={testId}>{formatPen(value)}</p>
      {note && <p className="bb-body text-[11px] text-ink-soft mt-0.5">{note}</p>}
    </Card>
  );

  return (
    <div className="space-y-4" data-testid="company-overview">
      <Card>
        <p className="bb-body text-sm text-ink-soft">{first ? `Desde ${monthLabel(first)} hasta hoy` : 'Desde el inicio'}</p>
        <p className={`bb-display font-semibold text-xl sm:text-2xl ${winning ? 'text-belt-en_revision' : 'text-rust'}`} data-testid="overview-verdict">
          {winning ? `La empresa ha ganado ${formatPen(s.sinceStart.result)}` : `La empresa ha perdido ${formatPen(Math.abs(s.sinceStart.result))}`}
        </p>
        <p className="bb-body text-sm text-ink mt-2" data-testid="overview-phrase">
          Vendió {formatPen(s.sinceStart.income)} y gastó {formatPen(s.sinceStart.spent)}. Hoy hay {formatPen(s.cash)} en caja.
          {s.projected && (s.receivable > 0 || s.payable > 0) && <> Si cobra lo que le deben y paga lo que debe, quedaría con {formatPen(s.projected.result)} de ganancia.</>}
        </p>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="overview-kpis">
        {kpi('Vendió', s.sinceStart.income, 'text-belt-en_revision', 'ov-income')}
        {kpi('Gastó', s.sinceStart.spent, 'text-rust', 'ov-spent')}
        {kpi(winning ? 'Ganó' : 'Perdió', Math.abs(s.sinceStart.result), winning ? 'text-belt-en_revision' : 'text-rust', 'ov-result')}
        {kpi('Dinero en caja', s.cash, s.cash < 0 ? 'text-rust' : 'text-ink', 'ov-cash')}
        {kpi('Le deben', s.receivable, 'text-ink', 'ov-receivable', 'Clientes')}
        {kpi('Debe', s.payable, s.payable > 0 ? 'text-rust' : 'text-ink', 'ov-payable', 'Equipo y gastos sin pagar')}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card>
          <h2 className="bb-display font-semibold text-ink text-base">Mes a mes: lo que entró y lo que salió</h2>
          <p className="bb-body text-xs text-ink-soft mb-3">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-belt-en_revision align-middle mr-1" />Vendió
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-rust align-middle ml-3 mr-1" />Gastó
          </p>
          <div className="flex items-end gap-3 sm:gap-6 h-44 border-b border-line px-1" data-testid="overview-months">
            {months.map((m) => (
              <div key={m.mes} className="flex-1 flex items-end justify-center gap-1 h-full" title={`${monthLabel(m.mes)}: vendió ${formatPen(m.income)}, gastó ${formatPen(m.costs)}`}>
                <div className="w-1/3 max-w-[28px] bg-belt-en_revision rounded-t" style={{ height: `${(m.income / maxMonth) * 100}%` }} />
                <div className="w-1/3 max-w-[28px] bg-rust rounded-t" style={{ height: `${(m.costs / maxMonth) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="flex gap-3 sm:gap-6 px-1 mt-1">
            {months.map((m) => (
              <div key={m.mes} className="flex-1 text-center">
                <p className="bb-body text-xs text-ink-soft">{monthShort(m.mes)}</p>
                <p className={`bb-mono text-[11px] ${m.result >= 0 ? 'text-belt-en_revision' : 'text-rust'}`}>{m.result >= 0 ? '+' : '−'}{formatPen(Math.abs(m.result))}</p>
              </div>
            ))}
          </div>
          <p className="bb-body text-[11px] text-ink-soft mt-2">Debajo de cada mes: lo que ganó (+) o perdió (−).</p>
        </Card>

        <Card>
          <h2 className="bb-display font-semibold text-ink text-base">Dinero en caja al cierre de cada mes</h2>
          <p className="bb-body text-xs text-ink-soft mb-3">Cuánto dinero había al terminar el mes.</p>
          <div className="flex items-end gap-3 sm:gap-6 h-44 border-b border-line px-1" data-testid="overview-cash">
            {cashPoints.map((c) => (
              <div key={c.mes} className="flex-1 flex items-end justify-center h-full" title={`${monthLabel(c.mes)}: ${formatPen(c.balance)}`}>
                <div className={`w-1/2 max-w-[44px] rounded-t ${c.balance < 0 ? 'bg-rust' : 'bg-gold'}`} style={{ height: `${(Math.abs(c.balance) / maxCash) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="flex gap-3 sm:gap-6 px-1 mt-1">
            {cashPoints.map((c) => (
              <div key={c.mes} className="flex-1 text-center">
                <p className="bb-body text-xs text-ink-soft">{monthShort(c.mes)}</p>
                <p className="bb-mono text-[11px] text-ink">{formatPen(c.balance)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="bb-display font-semibold text-ink text-base mb-3">¿En qué se gastó?</h2>
          <HBars items={view.expenses} color="bg-rust" testId="overview-expenses" empty="Aún no hay gastos." onTrace={(n, ids) => trace(`Gastos: ${n}`, ids)} />
          <p className="bb-body text-[11px] text-ink-soft mt-3">Toca una barra para ver los registros.</p>
        </Card>

        <Card>
          <h2 className="bb-display font-semibold text-ink text-base mb-3">¿Quién nos pagó? (ventas por cliente)</h2>
          <HBars items={view.sales} color="bg-belt-en_revision" testId="overview-sales" empty="Aún no hay ventas." onTrace={(n, ids) => trace(`Ventas: ${n}`, ids)} />
        </Card>
      </div>
    </div>
  );
}
