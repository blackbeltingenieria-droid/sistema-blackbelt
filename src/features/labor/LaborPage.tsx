// features/labor/LaborPage.tsx
// Mano de obra (solo Admin): seguimiento de lo que se debe a cada colaborador, como TABLA_M.O del Excel.
// Cuánto se acordó, cuánto ya se pagó (con fecha y medio de cada pago), cuánto falta y hasta cuándo.
// "Pagar" registra un egreso normal enlazado al contrato: cuenta en caja y resultados al instante.

import { type FormEvent, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { KpiCard } from '../../components/ui/KpiCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { todayIso } from '../../lib/autofill';
import { formatDateShort, formatPen } from '../../lib/format';
import type { DbLaborContract } from '../../types/database';
import { CORP_CODE } from '../movements/domain/movement-rules';
import { PAYMENT_METHODS } from '../movements/domain/quick-entry';
import { TraceModal } from '../movements/components/TraceModal';
import { LaborContractModal } from './components/LaborContractModal';
import { LABOR_STATUS_TEXT, buildLaborReport, type LaborRow, type LaborStatus } from './domain/labor';
import { useLabor } from './hooks/useLabor';
import {
  createLaborContract, deleteLaborContract, registerLaborPayment, renewMonthly, updateLaborContract,
} from './services/labor-service';

const btn = 'px-3 py-1.5 min-h-[36px] border border-line rounded-card bb-body text-xs hover:bg-canvas whitespace-nowrap';
const STATUS_COLOR: Record<LaborStatus, string> = {
  vencido: 'bg-rust text-paper',
  por_vencer: 'bg-belt-por_hacer text-ink',
  pendiente: 'bg-canvas text-ink border border-line',
  pagado: 'bg-belt-en_revision text-paper',
};
type Filter = 'todos' | 'falta' | 'vencidos' | 'pagados';

function whenText(r: LaborRow): string {
  if (r.status === 'pagado') return r.lastPaymentDate ? `Último pago ${formatDateShort(r.lastPaymentDate)}` : 'Pagado';
  if (r.daysLeft === null) return 'Sin fecha límite';
  if (r.daysLeft < 0) return `Venció hace ${-r.daysLeft} día${r.daysLeft === -1 ? '' : 's'} (${formatDateShort(r.contract.end_date)})`;
  if (r.daysLeft === 0) return 'Vence hoy';
  return `Vence en ${r.daysLeft} día${r.daysLeft === 1 ? '' : 's'} (${formatDateShort(r.contract.end_date)})`;
}

export function LaborPage() {
  const { contracts, movements, specialists, units, projects, loading, error, refetch } = useLabor();
  const [filter, setFilter] = useState<Filter>('todos');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ editing?: DbLaborContract } | null>(null);
  const [payFor, setPayFor] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [trace, setTrace] = useState<{ title: string; ids: number[] } | null>(null);

  const today = todayIso();
  const report = useMemo(() => buildLaborReport(contracts, movements, today), [contracts, movements, today]);
  const unitName = (id: number) => { const u = units.find((x) => x.id === id); return u?.code === CORP_CODE ? 'Toda la empresa' : (u?.name ?? '—'); };
  const projectCode = (id: number | null) => (id ? projects.find((p) => p.id === id)?.code ?? null : null);

  const q = search.trim().toUpperCase();
  const rows = report.rows.filter((r) =>
    (filter === 'todos' || (filter === 'falta' && r.pending > 0) || (filter === 'vencidos' && r.status === 'vencido') || (filter === 'pagados' && r.status === 'pagado'))
    && (!q || r.contract.worker_name.includes(q) || r.contract.service.includes(q) || (r.contract.client_label ?? '').toUpperCase().includes(q)));

  async function run(action: () => Promise<unknown>, done: string) {
    setActionError(null); setMsg(null);
    try {
      await action();
      await refetch();
      setMsg(done);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo completar la acción.');
    }
  }

  const counts: Record<Filter, number> = {
    todos: report.rows.length,
    falta: report.rows.filter((r) => r.pending > 0).length,
    vencidos: report.rows.filter((r) => r.status === 'vencido').length,
    pagados: report.rows.filter((r) => r.status === 'pagado').length,
  };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
        <PageHeader
          title="Mano de obra"
          subtitle="Lo acordado con cada colaborador, lo que ya se le pagó y lo que falta."
          actions={
            <button type="button" data-testid="labor-open" onClick={() => setModal({})}
              className="flex items-center justify-center bg-gold text-ink px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-card bb-body text-sm font-semibold hover:bg-gold/90">
              + Nuevo contrato
            </button>
          }
        />

        {error && <ErrorBanner message={error} onRetry={() => void refetch()} />}
        {actionError && <ErrorBanner message={actionError} onClose={() => setActionError(null)} />}
        {msg && <p role="status" className="bb-body text-sm text-ink bg-paper border border-line rounded-card px-4 py-2 mb-3">{msg}</p>}
        {loading && <p className="bb-body text-ink-soft text-center py-12 text-sm">Cargando…</p>}

        {!loading && (
          <div className="space-y-4">
            <Card>
              <p className="bb-label-xs text-ink-soft">¿Cuánto debo a mi equipo?</p>
              <p className={`bb-display font-semibold text-xl sm:text-2xl mt-1 ${report.totals.pending > 0 ? 'text-rust' : 'text-belt-en_revision'}`} data-testid="labor-headline">
                {report.rows.length === 0 ? 'Aún no hay contratos de mano de obra'
                  : report.totals.pending > 0 ? `Falta pagar ${formatPen(report.totals.pending)}` : 'Todo pagado'}
              </p>
              <ul className="mt-3 space-y-1" data-testid="labor-phrases">
                {report.phrases.map((p) => <li key={p} className="bb-body text-sm text-ink">• {p}</li>)}
              </ul>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="labor-kpis">
              <KpiCard label="Monto requerido" value={formatPen(report.totals.agreed)} subtext="Lo acordado" />
              <KpiCard label="Monto pagado" value={formatPen(report.totals.paid)} valueColor="text-belt-en_revision" subtext="Ya salió de caja" />
              <KpiCard label="Falta pagar" value={formatPen(report.totals.pending)} valueColor={report.totals.pending > 0 ? 'text-rust' : 'text-ink'} subtext={`${report.totals.workersOwed} colaborador${report.totals.workersOwed === 1 ? '' : 'es'}`} />
              <KpiCard label="Vencido" value={formatPen(report.totals.overdue)} valueColor={report.totals.overdue > 0 ? 'text-rust' : 'text-ink'} subtext="Ya pasó la fecha" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar">
                {([['todos', 'Todos'], ['falta', 'Falta pagar'], ['vencidos', 'Vencidos'], ['pagados', 'Pagados']] as [Filter, string][]).map(([k, label]) => (
                  <button key={k} type="button" aria-pressed={filter === k} data-testid={`labor-filter-${k}`} onClick={() => setFilter(k)}
                    className={`px-3 py-1.5 min-h-[36px] rounded-card border bb-body text-xs ${filter === k ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink'}`}>
                    {label} ({counts[k]})
                  </button>
                ))}
              </div>
              <input aria-label="Buscar colaborador" placeholder="Buscar colaborador o servicio" className="bb-input !bg-paper sm:max-w-xs sm:ml-auto"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start" data-testid="labor-list">
              {rows.length === 0 && <p className="bb-body text-sm text-ink-soft">No hay contratos con ese filtro.</p>}
              {rows.map((r) => {
                const c = r.contract;
                const code = projectCode(c.project_id);
                return (
                  <Card key={c.id}>
                    <div data-testid="labor-row" data-worker={c.worker_name}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="bb-body text-sm font-semibold text-ink break-words">{c.worker_name}{c.worker_doc && <span className="bb-mono text-[11px] text-ink-soft ml-2">{c.worker_doc}</span>}</p>
                          <p className="bb-body text-xs text-ink-soft break-words">{c.service} · {c.contract_type === 'MENSUAL' ? 'Mensual' : 'Por proyecto'}</p>
                          <p className="bb-body text-xs text-ink-soft break-words">Para: {c.client_label ?? unitName(c.business_unit_id)}{code ? ` (${code})` : ''} · {c.code}</p>
                        </div>
                        <span className={`bb-mono text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLOR[r.status]}`} data-testid="labor-status">{LABOR_STATUS_TEXT[r.status]}</span>
                      </div>

                      <dl className="grid grid-cols-3 gap-2 mt-3">
                        <div><dt className="bb-label-xs text-ink-soft">Acordado</dt><dd className="bb-mono text-sm text-ink">{formatPen(c.agreed_amount)}</dd></div>
                        <div><dt className="bb-label-xs text-ink-soft">Pagado</dt><dd className="bb-mono text-sm text-belt-en_revision" data-testid="labor-paid">{formatPen(r.paid)}</dd></div>
                        <div><dt className="bb-label-xs text-ink-soft">Falta</dt><dd className={`bb-mono text-sm font-semibold ${r.pending > 0 ? 'text-rust' : 'text-ink'}`} data-testid="labor-pending">{formatPen(r.pending)}</dd></div>
                      </dl>
                      <div className="h-2 bg-canvas rounded-full mt-2 overflow-hidden"><div className="h-full bg-belt-en_revision rounded-full" style={{ width: `${r.paidPct}%` }} /></div>
                      <p className="bb-body text-xs text-ink-soft mt-1">
                        {formatDateShort(c.start_date)} → {formatDateShort(c.end_date)} · <span className={r.status === 'vencido' ? 'text-rust' : ''}>{whenText(r)}</span>
                      </p>
                      {r.owedRegistered > 0 && <p className="bb-body text-xs text-rust mt-1">Hay {formatPen(r.owedRegistered)} anotado como "lo debo" sin pagar.</p>}

                      {r.payments.length > 0 && (
                        <details className="mt-2">
                          <summary className="bb-body text-xs text-ink cursor-pointer">Pagos hechos ({r.payments.length})</summary>
                          <ul className="mt-1 space-y-0.5" data-testid="labor-payments">
                            {r.payments.map((p) => (
                              <li key={p.id} className="bb-body text-xs text-ink-soft flex justify-between gap-2">
                                <span>{formatDateShort(p.date)}{p.method ? ` · ${p.method}` : ''} · {p.code}</span>
                                <span className="bb-mono text-ink">{formatPen(p.amount)}</span>
                              </li>
                            ))}
                          </ul>
                          <button type="button" className="bb-body text-[11px] underline text-ink mt-1" onClick={() => setTrace({ title: `Pagos de ${c.worker_name}`, ids: r.ids })}>Ver los registros</button>
                        </details>
                      )}

                      <div className="flex flex-wrap gap-2 mt-3">
                        {r.pending > 0 && (
                          <button type="button" className="px-3 py-1.5 min-h-[36px] bg-gold text-ink rounded-card bb-body text-xs font-semibold" data-testid="labor-pay"
                            onClick={() => setPayFor(payFor === c.id ? null : c.id)}>
                            Pagar · falta {formatPen(r.pending)}
                          </button>
                        )}
                        <button type="button" className={btn} onClick={() => setModal({ editing: c })}>Editar</button>
                        {c.contract_type === 'MENSUAL' && (
                          <button type="button" className={btn} onClick={() => void run(() => renewMonthly(c), `Se creó el contrato del mes siguiente para ${c.worker_name}.`)}>Repetir el próximo mes</button>
                        )}
                        {confirmDelete === c.id ? (
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="bb-body text-xs text-ink">¿Quitar el contrato? Sus pagos se quedan como egresos.</span>
                            <button type="button" className="px-2 py-1 bg-rust text-paper rounded-card bb-body text-xs"
                              onClick={() => { setConfirmDelete(null); void run(() => deleteLaborContract(c), `Se quitó ${c.code}.`); }}>Sí, quitar</button>
                            <button type="button" className={btn} onClick={() => setConfirmDelete(null)}>No</button>
                          </span>
                        ) : (
                          <button type="button" className={`${btn} text-rust`} onClick={() => setConfirmDelete(c.id)}>Quitar</button>
                        )}
                      </div>

                      {payFor === c.id && (
                        <LaborPayForm row={r} lastMethod={r.payments.at(-1)?.method ?? null} onCancel={() => setPayFor(null)}
                          onSave={(p) => run(async () => { await registerLaborPayment(c, p); setPayFor(null); },
                            p.settled ? `Pago registrado a ${c.worker_name}: ya cuenta en caja.` : `Anotado como deuda con ${c.worker_name}.`)} />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            {report.workers.length > 0 && (
              <Card>
                <h2 className="bb-display font-semibold text-ink text-base mb-2">Por colaborador</h2>
                <div className="overflow-x-auto">
                  <table className="w-full bb-body text-sm" data-testid="labor-workers">
                    <thead>
                      <tr className="text-left bb-label-xs text-ink-soft">
                        <th className="py-1.5 pr-2 font-normal">Colaborador</th>
                        <th className="py-1.5 px-2 font-normal text-right">Acordado</th>
                        <th className="py-1.5 px-2 font-normal text-right">Pagado</th>
                        <th className="py-1.5 pl-2 font-normal text-right">Falta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.workers.map((w) => (
                        <tr key={w.name} className="border-t border-line">
                          <td className="py-1.5 pr-2 text-ink">{w.name}</td>
                          <td className="py-1.5 px-2 bb-mono text-right whitespace-nowrap">{formatPen(w.agreed)}</td>
                          <td className="py-1.5 px-2 bb-mono text-right whitespace-nowrap text-belt-en_revision">{formatPen(w.paid)}</td>
                          <td className={`py-1.5 pl-2 bb-mono text-right whitespace-nowrap ${w.pending > 0 ? 'text-rust font-semibold' : ''}`}>{formatPen(w.pending)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-ink font-semibold">
                        <td className="py-1.5 pr-2">Total</td>
                        <td className="py-1.5 px-2 bb-mono text-right whitespace-nowrap">{formatPen(report.totals.agreed)}</td>
                        <td className="py-1.5 px-2 bb-mono text-right whitespace-nowrap">{formatPen(report.totals.paid)}</td>
                        <td className="py-1.5 pl-2 bb-mono text-right whitespace-nowrap" data-testid="labor-total-pending">{formatPen(report.totals.pending)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {modal && (
        <LaborContractModal editing={modal.editing} known={contracts} specialists={specialists} units={units} projects={projects}
          onClose={() => setModal(null)}
          onSubmit={async (input) => {
            if (modal.editing) await updateLaborContract(modal.editing.id, input);
            else await createLaborContract(input);
            await refetch();
            setMsg(modal.editing ? 'Contrato actualizado.' : 'Contrato creado. Cuando le pagues, usa «Pagar».');
          }} />
      )}
      {trace && <TraceModal title={trace.title} ids={trace.ids} movements={movements} onClose={() => setTrace(null)} />}
    </div>
  );
}

/** Pago a un colaborador: viene con lo que falta, la fecha de hoy y su medio de pago de la última vez. */
function LaborPayForm({ row, lastMethod, onSave, onCancel }: {
  row: LaborRow; lastMethod: string | null; onCancel: () => void;
  onSave: (p: { date: string; amount: number; paymentMethod: string | null; settled: boolean }) => Promise<void>;
}) {
  const [date, setDate] = useState(todayIso());
  const [amount, setAmount] = useState(String(row.pending));
  const [method, setMethod] = useState<string | null>(lastMethod);
  const [settled, setSettled] = useState(true);
  const n = Number(amount.replace(',', '.') || 0);
  const left = Math.round((row.pending - n) * 100) / 100;

  async function submit(e: FormEvent) {
    e.preventDefault();
    await onSave({ date, amount: n, paymentMethod: method, settled });
  }

  return (
    <form onSubmit={submit} className="mt-3 p-3 bg-canvas rounded-card space-y-3" data-testid="labor-pay-form">
      <div className="grid grid-cols-2 gap-2">
        <div><label className="bb-label" htmlFor={`lp-amount-${row.contract.id}`}>Monto (S/)</label>
          <input id={`lp-amount-${row.contract.id}`} className="bb-input bb-mono" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div><label className="bb-label" htmlFor={`lp-date-${row.contract.id}`}>Fecha</label>
          <input id={`lp-date-${row.contract.id}`} type="date" className="bb-input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      <p className={`bb-body text-xs ${left < 0 ? 'text-rust' : 'text-ink-soft'}`} data-testid="labor-pay-note">
        {n > 0 ? (left < 0 ? `Es más de lo que falta (${formatPen(row.pending)}).` : left === 0 ? 'Con este pago queda todo pagado.' : `Después de este pago faltarán ${formatPen(left)}.`) : 'Escribe el monto.'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" aria-pressed={settled} onClick={() => setSettled(true)}
          className={`px-2.5 py-1.5 rounded-card border bb-body text-xs ${settled ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink'}`}>Ya le pagué</button>
        <button type="button" aria-pressed={!settled} onClick={() => setSettled(false)}
          className={`px-2.5 py-1.5 rounded-card border bb-body text-xs ${!settled ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink'}`}>Aún lo debo</button>
      </div>
      {settled && (
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(method === m ? null : m)}
              className={`px-2.5 py-1.5 rounded-card border bb-body text-xs ${method === m ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink'}`}>{m}</button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 bg-gold text-ink rounded-card bb-body text-sm font-semibold">Guardar pago</button>
        <button type="button" className={btn} onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
