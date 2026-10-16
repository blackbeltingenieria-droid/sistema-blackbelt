// features/recurring/RecurringPage.tsx
// Servicios y marketing (solo Admin): los pagos que se repiten cada mes —teléfono, publicidad y
// herramientas digitales— por servicio y por mes, si suben o bajan y cuándo toca el próximo pago.
// Lee los mismos egresos de Ingresos y egresos (no hay que registrar nada aparte).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { KpiCard } from '../../components/ui/KpiCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { formatDateShort, formatPen, monthShort } from '../../lib/format';
import { todayIso } from '../../lib/autofill';
import { getCostCategories } from '../catalogs/services/catalog-service';
import type { CostCategory } from '../catalogs/types';
import { TraceModal } from '../movements/components/TraceModal';
import { getMovements } from '../movements/services/movement-service';
import type { EnrichedMovement } from '../movements/types';
import { GROUP_LABEL, buildRecurringReport, type RecurringGroup } from './domain/recurring';

const GROUPS: RecurringGroup[] = ['servicios', 'marketing', 'herramientas'];

function useRecurringData() {
  const [movements, setMovements] = useState<EnrichedMovement[]>([]);
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      const [m, c] = await Promise.all([getMovements(), getCostCategories()]);
      setMovements(m); setCategories(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los gastos.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return { movements, categories, loading, error, refetch: load };
}

export function RecurringPage() {
  const { movements, categories, loading, error, refetch } = useRecurringData();
  const [groups, setGroups] = useState<RecurringGroup[]>(GROUPS);
  const [trace, setTrace] = useState<{ title: string; ids: number[] } | null>(null);
  const catCode = useMemo(() => { const m = new Map(categories.map((c) => [c.id, c.code])); return (id: number) => m.get(id); }, [categories]);
  const report = useMemo(() => buildRecurringReport(movements, catCode, groups), [movements, catCode, groups]);
  const maxMonth = Math.max(1, ...Object.values(report.monthTotals));

  const toggle = (g: RecurringGroup) => setGroups((cur) => (cur.includes(g) ? (cur.length > 1 ? cur.filter((x) => x !== g) : cur) : [...cur, g]));
  const lastMes = report.months[report.months.length - 1];

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
        <PageHeader title="Servicios y marketing" subtitle="Los pagos que se repiten cada mes: cuánto gastas, si sube o baja y qué toca pagar." />

        {error && <ErrorBanner message={error} onRetry={() => void refetch()} />}
        {loading && <p className="bb-body text-ink-soft text-center py-12 text-sm">Cargando…</p>}

        {!loading && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Qué gastos ver">
              {GROUPS.map((g) => (
                <button key={g} type="button" aria-pressed={groups.includes(g)} data-testid={`rec-group-${g}`} onClick={() => toggle(g)}
                  className={`px-3 py-1.5 min-h-[36px] rounded-card border bb-body text-xs ${groups.includes(g) ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink'}`}>
                  {groups.includes(g) ? '✓ ' : ''}{GROUP_LABEL[g]}
                </button>
              ))}
            </div>

            <Card>
              <p className="bb-label-xs text-ink-soft">¿Cuánto se va en pagos de todos los meses?</p>
              <ul className="mt-2 space-y-1" data-testid="rec-phrases">
                {report.phrases.length ? report.phrases.map((p) => <li key={p} className="bb-body text-sm text-ink">• {p}</li>)
                  : <li className="bb-body text-sm text-ink-soft">Aún no hay pagos de estos tipos.</li>}
              </ul>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="rec-kpis">
              <KpiCard label="Total gastado" value={formatPen(report.total)} subtext={report.months.length ? `${monthShort(report.months[0])} – ${monthShort(lastMes)}` : '—'} />
              <KpiCard label="Este último mes" value={formatPen(lastMes ? report.monthTotals[lastMes] ?? 0 : 0)} subtext={lastMes ? monthShort(lastMes) : '—'} />
              <KpiCard label="Pagos fijos al mes" value={formatPen(report.fixedMonthly)} subtext="Último pago de cada servicio que se repite" />
              <KpiCard label="Promedio por mes" value={formatPen(report.months.length ? report.total / report.months.length : 0)} subtext={`${report.months.length} mes${report.months.length === 1 ? '' : 'es'}`} />
            </div>

            <Card>
              <h2 className="bb-display font-semibold text-ink text-base mb-3">Mes a mes</h2>
              <ul className="space-y-2" data-testid="rec-months">
                {report.months.map((mes, i) => {
                  const v = report.monthTotals[mes] ?? 0;
                  const prev = i > 0 ? report.monthTotals[report.months[i - 1]] ?? 0 : null;
                  const diff = prev === null ? null : Math.round((v - prev) * 100) / 100;
                  return (
                    <li key={mes} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2">
                      <span className="bb-body text-xs text-ink-soft">{monthShort(mes)}</span>
                      <div className="h-3 bg-canvas rounded-full overflow-hidden"><div className="h-full bg-gold rounded-full" style={{ width: `${(v / maxMonth) * 100}%` }} /></div>
                      <span className="bb-mono text-xs text-ink text-right whitespace-nowrap">
                        {formatPen(v)}{diff !== null && Math.abs(diff) >= 0.01 && <span className={diff > 0 ? 'text-rust' : 'text-belt-en_revision'}> {diff > 0 ? '↑' : '↓'}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                {groups.map((g) => (
                  <div key={g} className="bg-canvas rounded-card px-3 py-2">
                    <p className="bb-label-xs text-ink-soft">{GROUP_LABEL[g]}</p>
                    <p className="bb-mono text-sm text-ink" data-testid={`rec-total-${g}`}>{formatPen(report.groupTotals[g])}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card padding="p-0">
              <div className="px-4 sm:px-5 pt-4">
                <h2 className="bb-display font-semibold text-ink text-base">Por servicio</h2>
                <p className="bb-body text-xs text-ink-soft mt-0.5">↑ subió · ↓ bajó respecto al pago anterior. Toca un monto para ver los registros.</p>
              </div>
              <div className="overflow-x-auto mt-3">
                <table className="w-full bb-body text-sm" data-testid="rec-table">
                  <thead>
                    <tr className="text-left bb-label-xs text-ink-soft border-b border-line">
                      <th className="py-2 px-4 font-normal">Servicio</th>
                      {report.months.map((m) => <th key={m} className="py-2 px-2 font-normal text-right whitespace-nowrap">{monthShort(m)}</th>)}
                      <th className="py-2 px-2 font-normal text-right">Total</th>
                      <th className="py-2 px-4 font-normal whitespace-nowrap">Próximo pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.services.map((s) => (
                      <tr key={`${s.group}-${s.key}`} className="border-b border-line last:border-0 align-top">
                        <td className="py-2 px-4">
                          <p className="text-ink font-medium">{s.key}</p>
                          <p className="text-[11px] text-ink-soft">{GROUP_LABEL[s.group]}{s.recurring ? ' · se repite' : ' · pago único'}</p>
                        </td>
                        {report.months.map((m) => (
                          <td key={m} className="py-2 px-2 bb-mono text-right whitespace-nowrap">
                            {s.byMonth[m] ? (
                              <button type="button" className="hover:underline" onClick={() => setTrace({ title: `${s.key} · ${monthShort(m)}`, ids: s.payments.filter((p) => p.date.startsWith(m)).map((p) => p.id) })}>
                                {formatPen(s.byMonth[m])}
                              </button>
                            ) : <span className="text-ink-soft">—</span>}
                          </td>
                        ))}
                        <td className="py-2 px-2 bb-mono text-right whitespace-nowrap font-semibold">
                          {formatPen(s.total)}
                          {s.change !== null && Math.abs(s.change) >= 0.01 && <span className={s.change > 0 ? 'text-rust' : 'text-belt-en_revision'}> {s.change > 0 ? '↑' : '↓'}</span>}
                        </td>
                        <td className="py-2 px-4 whitespace-nowrap">
                          {s.nextDate ? (
                            <>
                              <p className={`text-xs ${s.nextDate <= todayIso() ? 'text-rust font-semibold' : 'text-ink'}`}>
                                {s.nextDate <= todayIso() ? 'Toca pagar · ' : '~'}{formatDateShort(s.nextDate)} · <span className="bb-mono">{formatPen(s.lastAmount)}</span>
                              </p>
                              <Link to={`/movements?repetir=${s.payments[s.payments.length - 1].id}`} className="text-[11px] underline text-ink" data-testid="rec-repeat">Pagar este mes</Link>
                            </>
                          ) : <span className="text-xs text-ink-soft">—</span>}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-ink font-semibold">
                      <td className="py-2 px-4">Total</td>
                      {report.months.map((m) => <td key={m} className="py-2 px-2 bb-mono text-right whitespace-nowrap">{formatPen(report.monthTotals[m] ?? 0)}</td>)}
                      <td className="py-2 px-2 bb-mono text-right whitespace-nowrap" data-testid="rec-grand-total">{formatPen(report.total)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
      {trace && <TraceModal title={trace.title} ids={trace.ids} movements={movements} onClose={() => setTrace(null)} />}
    </div>
  );
}
