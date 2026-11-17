// features/dashboard-general/components/CompanyOverview.tsx
// "La empresa desde el inicio": todo el tiempo en una pantalla, con estilo de tablero (como el dashboard de
// la sede Pucallpa). Mismas cifras que Resultados y caja → periodo «Todo»: aquí solo cambia la presentación.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { TOKENS } from '../../../lib/design-tokens';
import { formatPen, formatPenShort, monthLabel, monthShort } from '../../../lib/format';
import { getCostCategories } from '../../catalogs/services/catalog-service';
import type { CostCategory } from '../../catalogs/types';
import { getProjectRows } from '../../clients-projects/services/project-service';
import type { ProjectRow } from '../../clients-projects/types';
import { CATEGORY_SHORT } from '../../movements/domain/quick-entry';
import { expensesByCategory } from '../../results-cash/domain/presentation';
import { buildBusinessSummary } from '../../results-cash/domain/summary';
import { MoneyTooltip } from '../../results-cash/components/charts/chart-parts';
import { AXIS_TICK, AXIS_TICK_X, GRID_STROKE } from '../../results-cash/components/charts/chart-utils';
import { getPeriodReport, type MonthReport } from '../../results-cash/services/results-service';
import { salesByClient } from '../domain/company-overview';
import { PanelGrafico, TarjetaCifra } from './Tablero';

interface Data { report: MonthReport; categories: CostCategory[]; projects: ProjectRow[] }

const SERIE = [TOKENS.gold, TOKENS.positive, TOKENS.rust, TOKENS.ink, TOKENS.inkSoft];

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
      {items.map((i, n) => (
        <li key={i.key}>
          <button type="button" className="w-full text-left group" onClick={() => onTrace(i.name, i.ids)}>
            <div className="flex justify-between gap-2 bb-body text-xs">
              <span className="text-ink group-hover:underline truncate">{i.name}</span>
              <span className="bb-mono text-ink whitespace-nowrap">{formatPen(i.amount)}</span>
            </div>
            <div className="h-2.5 bg-canvas rounded-sm mt-1 overflow-hidden">
              <div className="h-full rounded-sm" style={{ width: `${(i.amount / max) * 100}%`, background: color === 'serie' ? SERIE[n % SERIE.length] : color }} />
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
  const months = report.evolution.map((m) => ({ ...m, label: monthShort(m.mes) }));
  const cashPoints = report.cashByMonth.map((c) => ({ ...c, label: monthShort(c.mes) }));
  const winning = s.sinceStart.result >= 0;
  const green = 'text-belt-en_revision';

  return (
    <div className="space-y-3" data-testid="company-overview">
      <p className="bb-body text-sm text-ink bg-paper border border-line rounded-card px-3 py-2">
        <span className="text-ink-soft">{first ? `Desde ${monthLabel(first)} hasta hoy` : 'Desde el inicio'} · </span>
        <strong className={`bb-display ${winning ? green : 'text-rust'}`} data-testid="overview-verdict">
          {winning ? `La empresa ha ganado ${formatPen(s.sinceStart.result)}` : `La empresa ha perdido ${formatPen(Math.abs(s.sinceStart.result))}`}
        </strong>
        <span className="block sm:inline" data-testid="overview-phrase">
          {' '}Vendió {formatPen(s.sinceStart.income)} y gastó {formatPen(s.sinceStart.spent)}. Hoy hay {formatPen(s.cash)} en caja.
          {s.projected && (s.receivable > 0 || s.payable > 0) && <> Si cobra lo que le deben y paga lo que debe, quedaría con {formatPen(s.projected.result)} de ganancia.</>}
        </span>
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3" data-testid="overview-kpis">
        <TarjetaCifra etiqueta="Vendió" valor={formatPen(s.sinceStart.income)} color={green} testId="ov-income" />
        <TarjetaCifra etiqueta="Gastó" valor={formatPen(s.sinceStart.spent)} color="text-rust" testId="ov-spent" />
        <TarjetaCifra etiqueta={winning ? 'Ganó' : 'Perdió'} valor={formatPen(Math.abs(s.sinceStart.result))} color={winning ? green : 'text-rust'} testId="ov-result"
          nota={s.sinceStart.income > 0 ? `Margen ${Math.round((s.sinceStart.result / s.sinceStart.income) * 100)} %` : undefined} />
        <TarjetaCifra etiqueta="Dinero en caja" valor={formatPen(s.cash)} color={s.cash < 0 ? 'text-rust' : 'text-ink'} testId="ov-cash" />
        <TarjetaCifra etiqueta="Le deben" valor={formatPen(s.receivable)} testId="ov-receivable" nota="Clientes" />
        <TarjetaCifra etiqueta="Debe" valor={formatPen(s.payable)} color={s.payable > 0 ? 'text-rust' : 'text-ink'} testId="ov-payable"
          nota={s.loans > 0 ? 'Equipo, gastos y préstamos' : 'Equipo y gastos sin pagar'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <PanelGrafico titulo="Vendió y gastó por mes">
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={months} margin={{ top: 6, right: 6, bottom: 0, left: -10 }}>
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="label" tick={AXIS_TICK_X} tickLine={false} axisLine={{ stroke: GRID_STROKE }} />
              <YAxis tick={AXIS_TICK} tickFormatter={formatPenShort} tickLine={false} axisLine={false} width={44} />
              <Tooltip cursor={{ fill: TOKENS.canvas }} content={<MoneyTooltip />} />
              <Bar isAnimationActive={false} dataKey="income" name="Vendió" fill={TOKENS.positive} radius={[3, 3, 0, 0]} maxBarSize={26} />
              <Bar isAnimationActive={false} dataKey="costs" name="Gastó" fill={TOKENS.rust} radius={[3, 3, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-1 px-1 mt-1" data-testid="overview-months">
            {months.map((m) => (
              <div key={m.mes} className="flex-1 text-center" title={`${monthLabel(m.mes)}: vendió ${formatPen(m.income)}, gastó ${formatPen(m.costs)}`}>
                <p className={`bb-mono text-[10px] ${m.result >= 0 ? green : 'text-rust'}`}>{m.result >= 0 ? '+' : '−'}{formatPen(Math.abs(m.result))}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-ink-soft text-center mt-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-belt-en_revision align-middle mr-1" />Vendió
            <span className="inline-block w-2 h-2 rounded-sm bg-rust align-middle ml-3 mr-1" />Gastó · debajo: lo que ganó (+) o perdió (−)
          </p>
        </PanelGrafico>

        <PanelGrafico titulo="Ganancia por mes">
          <ResponsiveContainer width="100%" height={215}>
            <ComposedChart data={months} margin={{ top: 6, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="label" tick={AXIS_TICK_X} tickLine={false} axisLine={{ stroke: GRID_STROKE }} />
              <YAxis tick={AXIS_TICK} tickFormatter={formatPenShort} tickLine={false} axisLine={false} width={44}
                domain={[(min: number) => Math.min(0, min), (max: number) => Math.max(0, max)]} />
              <ReferenceLine y={0} stroke={TOKENS.inkSoft} strokeDasharray="2 2" />
              <Tooltip cursor={{ fill: TOKENS.canvas }} content={<MoneyTooltip />} />
              <Bar isAnimationActive={false} dataKey="result" name="Ganó / perdió" radius={[3, 3, 0, 0]} maxBarSize={30}>
                {months.map((m) => <Cell key={m.mes} fill={m.result >= 0 ? TOKENS.positive : TOKENS.rust} />)}
              </Bar>
              <Line isAnimationActive={false} type="linear" dataKey="result" name="Tendencia" stroke={TOKENS.ink} strokeWidth={2}
                dot={{ r: 3.5, fill: TOKENS.gold, stroke: TOKENS.paper, strokeWidth: 2 }} legendType="none" tooltipType="none" />
            </ComposedChart>
          </ResponsiveContainer>
        </PanelGrafico>

        <PanelGrafico titulo="Dinero en caja al cierre de cada mes" className="md:col-span-2 xl:col-span-1">
          <div data-testid="overview-cash">
            <ResponsiveContainer width="100%" height={215}>
              <BarChart data={cashPoints} margin={{ top: 6, right: 6, bottom: 0, left: -10 }}>
                <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                <XAxis dataKey="label" tick={AXIS_TICK_X} tickLine={false} axisLine={{ stroke: GRID_STROKE }} />
                <YAxis tick={AXIS_TICK} tickFormatter={formatPenShort} tickLine={false} axisLine={false} width={44}
                  domain={[(min: number) => Math.min(0, min), (max: number) => Math.max(0, max)]} />
                <ReferenceLine y={0} stroke={TOKENS.inkSoft} strokeDasharray="2 2" />
                <Tooltip cursor={{ fill: TOKENS.canvas }} content={<MoneyTooltip />} />
                <Bar isAnimationActive={false} dataKey="balance" name="Dinero en caja" radius={[3, 3, 0, 0]} maxBarSize={34}>
                  {cashPoints.map((c) => <Cell key={c.mes} fill={c.balance < 0 ? TOKENS.rust : TOKENS.gold} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PanelGrafico>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
        <PanelGrafico titulo="¿En qué se gastó?">
          <HBars items={view.expenses} color={TOKENS.rust} testId="overview-expenses" empty="Aún no hay gastos." onTrace={(n, ids) => trace(`Gastos: ${n}`, ids)} />
          <p className="bb-body text-[10px] text-ink-soft mt-3 text-center">Toca una barra para ver los registros.</p>
        </PanelGrafico>

        <PanelGrafico titulo="¿Quién nos pagó? (ventas por cliente)">
          <HBars items={view.sales} color="serie" testId="overview-sales" empty="Aún no hay ventas." onTrace={(n, ids) => trace(`Ventas: ${n}`, ids)} />
        </PanelGrafico>
      </div>
    </div>
  );
}
