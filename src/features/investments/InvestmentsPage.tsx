// features/investments/InvestmentsPage.tsx
// Inversiones (solo Admin): aportes de socios (patrimonio) y préstamos (deuda), con su rendimiento
// explicado en palabras simples. Registrar una inversión mete el dinero a caja automáticamente.

import { type FormEvent, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { KpiCard } from '../../components/ui/KpiCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { todayIso } from '../../lib/autofill';
import { formatDateShort, formatPen } from '../../lib/format';
import type { DbInvestment } from '../../types/database';
import { TraceModal } from '../movements/components/TraceModal';
import { PAYMENT_METHODS } from '../movements/domain/quick-entry';
import { InvestmentFormModal } from './components/InvestmentFormModal';
import { buildInvestmentsReport, type DebtSummary } from './domain/performance';
import { useInvestments } from './hooks/useInvestments';
import { createInvestment, deleteInvestment, registerLoanPayment } from './services/investment-service';

const btn = 'px-3 py-1.5 min-h-[36px] border border-line rounded-card bb-body text-xs hover:bg-canvas whitespace-nowrap';

export function InvestmentsPage() {
  const { investments, movements, loading, error, refetch } = useInvestments();
  const [showForm, setShowForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [payFor, setPayFor] = useState<DebtSummary | null>(null);
  const [trace, setTrace] = useState<{ title: string; ids: number[] } | null>(null);

  const today = todayIso();
  const report = useMemo(() => buildInvestmentsReport(investments, movements, today), [investments, movements, today]);

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

  const deleteButton = (inv: DbInvestment) => confirmDelete === inv.id ? (
    <span className="flex flex-wrap items-center gap-2">
      <span className="bb-body text-xs text-ink">¿Eliminar? También sale de caja.</span>
      <button type="button" className="px-2 py-1 bg-rust text-paper rounded-card bb-body text-xs"
        onClick={() => { setConfirmDelete(null); void run(() => deleteInvestment(inv), `Se eliminó ${inv.code}.`); }}>Sí, eliminar</button>
      <button type="button" className={btn} onClick={() => setConfirmDelete(null)}>No</button>
    </span>
  ) : (
    <button type="button" className={`${btn} text-rust`} aria-label={`Eliminar ${inv.code}`} onClick={() => setConfirmDelete(inv.id)}>Eliminar</button>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
        <PageHeader
          title="Inversiones"
          subtitle="El dinero que pusieron los socios (patrimonio) o que prestaron (deuda), y cuánto rinde."
          actions={
            <button type="button" data-testid="inv-open" onClick={() => setShowForm(true)}
              className="flex items-center justify-center bg-gold text-ink px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-card bb-body text-sm font-semibold hover:bg-gold/90">
              + Registrar inversión
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
              <p className="bb-label-xs text-ink-soft">¿Cómo rinde lo invertido?</p>
              <p className={`bb-display font-semibold text-xl sm:text-2xl mt-1 ${report.accumulatedProfit < 0 ? 'text-rust' : 'text-belt-en_revision'}`} data-testid="inv-headline">
                {report.perSol !== null
                  ? `Por cada S/ 1 que pusieron los socios, la empresa ${report.accumulatedProfit >= 0 ? 'ganó' : 'perdió'} S/ ${Math.abs(report.perSol).toFixed(2)}`
                  : 'Aún no hay aportes de socios'}
              </p>
              <ul className="mt-3 space-y-1" data-testid="inv-phrases">
                {report.phrases.map((p) => <li key={p} className="bb-body text-sm text-ink">• {p}</li>)}
              </ul>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="inv-kpis">
              <KpiCard label="Capital de socios" value={formatPen(report.equityCapital)} subtext="Aportes − retiros" />
              <KpiCard label="Utilidad acumulada" value={formatPen(report.accumulatedProfit)} valueColor={report.accumulatedProfit < 0 ? 'text-rust' : 'text-belt-en_revision'} subtext="Ingresos − gastos, desde el inicio" />
              <KpiCard label="Rendimiento" value={report.returnPct !== null ? `${report.returnPct} %` : '—'} subtext={`En ${report.monthsActive} ${report.monthsActive === 1 ? 'mes' : 'meses'}`} />
              <KpiCard label="Deuda por devolver" value={formatPen(report.debtOutstanding)} valueColor={report.debtOutstanding > 0 ? 'text-rust' : 'text-ink'} subtext="Préstamos" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <Card>
                <h2 className="bb-display font-semibold text-ink text-base mb-1">Socios (patrimonio)</h2>
                <p className="bb-body text-xs text-ink-soft mb-3">Cada socio es dueño de una parte según lo que aportó. La utilidad se reparte en esa proporción.</p>
                {report.investors.length === 0 ? (
                  <p className="bb-body text-sm text-ink-soft">Sin aportes registrados.</p>
                ) : (
                  <ul className="space-y-4" data-testid="inv-investors">
                    {report.investors.map((s) => (
                      <li key={s.name} className="border-t border-line pt-3 first:border-0 first:pt-0">
                        <div className="flex flex-wrap justify-between gap-2">
                          <p className="bb-body text-sm font-semibold text-ink">{s.name}{s.doc && <span className="bb-mono text-[11px] text-ink-soft ml-2">{s.doc}</span>}</p>
                          <p className="bb-mono text-xs text-ink-soft">{s.sharePct} % de la empresa</p>
                        </div>
                        <dl className="grid grid-cols-3 gap-2 mt-2">
                          <div><dt className="bb-label-xs text-ink-soft">Aportó</dt><dd className="bb-mono text-sm text-ink">{formatPen(s.contributed)}</dd></div>
                          <div><dt className="bb-label-xs text-ink-soft">Le toca</dt><dd className={`bb-mono text-sm ${s.profitShare < 0 ? 'text-rust' : 'text-belt-en_revision'}`}>{formatPen(s.profitShare)}</dd></div>
                          <div><dt className="bb-label-xs text-ink-soft">Vale hoy</dt><dd className="bb-mono text-sm font-semibold text-ink" data-testid="inv-value-today">{formatPen(s.valueToday)}</dd></div>
                        </dl>
                        <ul className="mt-2 space-y-1">
                          {s.investments.map((i) => (
                            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 bb-body text-xs text-ink-soft">
                              <span>{formatDateShort(i.investment_date)} · <span className="bb-mono">{formatPen(i.amount)}</span>{i.payment_method ? ` · ${i.payment_method}` : ''} · {i.code}</span>
                              {deleteButton(i)}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card>
                <h2 className="bb-display font-semibold text-ink text-base mb-1">Préstamos (deuda)</h2>
                <p className="bb-body text-xs text-ink-soft mb-3">El capital que se devuelve sale de caja; los intereses son gasto de la empresa.</p>
                {report.debts.length === 0 ? (
                  <p className="bb-body text-sm text-ink-soft" data-testid="inv-no-debts">Sin préstamos registrados.</p>
                ) : (
                  <ul className="space-y-4" data-testid="inv-debts">
                    {report.debts.map((d) => {
                      const inv = d.investment;
                      const pct = inv.amount ? Math.min(100, (d.capitalPaid / inv.amount) * 100) : 0;
                      return (
                        <li key={inv.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                          <div className="flex flex-wrap justify-between gap-2">
                            <p className="bb-body text-sm font-semibold text-ink">{inv.investor_name}</p>
                            <p className="bb-mono text-xs text-ink-soft">{inv.interest_rate} % al año{inv.term_months ? ` · ${inv.term_months} meses` : ''}</p>
                          </div>
                          <dl className="grid grid-cols-3 gap-2 mt-2">
                            <div><dt className="bb-label-xs text-ink-soft">Prestó</dt><dd className="bb-mono text-sm text-ink">{formatPen(inv.amount)}</dd></div>
                            <div><dt className="bb-label-xs text-ink-soft">Devuelto</dt><dd className="bb-mono text-sm text-belt-en_revision">{formatPen(d.capitalPaid)}</dd></div>
                            <div><dt className="bb-label-xs text-ink-soft">Falta</dt><dd className="bb-mono text-sm font-semibold text-rust" data-testid="inv-outstanding">{formatPen(d.outstanding)}</dd></div>
                          </dl>
                          <div className="h-2 bg-canvas rounded-full mt-2 overflow-hidden"><div className="h-full bg-belt-en_revision rounded-full" style={{ width: `${pct}%` }} /></div>
                          <p className="bb-body text-xs text-ink-soft mt-1">
                            Intereses pagados: {d.paymentIds.length ? <button type="button" className="underline" onClick={() => setTrace({ title: `Pagos de ${inv.code}`, ids: d.paymentIds })}>{formatPen(d.interestPaid)}</button> : formatPen(d.interestPaid)}
                            {d.installment > 0 && <> · Cuota aprox. {formatPen(d.installment)}/mes</>}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {d.outstanding > 0 && <button type="button" className={btn} onClick={() => setPayFor(d)}>Registrar pago</button>}
                            {deleteButton(inv)}
                          </div>
                          {payFor?.investment.id === inv.id && (
                            <LoanPaymentForm debt={d} onCancel={() => setPayFor(null)}
                              onSave={(p) => run(async () => { await registerLoanPayment(inv, p); setPayFor(null); }, 'Pago del préstamo registrado.')} />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <InvestmentFormModal known={investments} onClose={() => setShowForm(false)}
          onSubmit={async (input) => { await createInvestment(input); await refetch(); setMsg(input.kind === 'deuda' ? 'Préstamo registrado: el dinero ya está en caja.' : 'Aporte registrado: el dinero ya está en caja.'); }} />
      )}
      {trace && <TraceModal title={trace.title} ids={trace.ids} movements={movements} onClose={() => setTrace(null)} />}
    </div>
  );
}

/** Pago de un préstamo: se rellena solo con el interés del mes y el resto de la cuota como capital. */
function LoanPaymentForm({ debt, onSave, onCancel }: {
  debt: DebtSummary; onCancel: () => void;
  onSave: (p: { date: string; capital: number; interest: number; paymentMethod: string | null }) => Promise<void>;
}) {
  const monthlyInterest = Math.round(debt.outstanding * (debt.investment.interest_rate / 100 / 12) * 100) / 100;
  const suggestedCapital = debt.installment > 0 ? Math.min(debt.outstanding, Math.max(0, Math.round((debt.installment - monthlyInterest) * 100) / 100)) : 0;
  const [date, setDate] = useState(todayIso());
  const [capital, setCapital] = useState(suggestedCapital ? String(suggestedCapital) : '');
  const [interest, setInterest] = useState(monthlyInterest ? String(monthlyInterest) : '');
  const [method, setMethod] = useState<string | null>(debt.investment.payment_method);
  const num = (s: string) => Number(s.replace(',', '.') || 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await onSave({ date, capital: num(capital), interest: num(interest), paymentMethod: method });
  }

  return (
    <form onSubmit={submit} className="mt-3 p-3 bg-canvas rounded-card space-y-3" data-testid="loan-payment-form">
      <p className="bb-body text-xs text-ink-soft">Relleno con la cuota del mes: interés {formatPen(monthlyInterest)}{suggestedCapital ? ` + capital ${formatPen(suggestedCapital)}` : ''}. Cámbialo si pagaste otro monto.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div><label className="bb-label" htmlFor="lp-date">Fecha</label><input id="lp-date" type="date" className="bb-input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label className="bb-label" htmlFor="lp-capital">Capital (S/)</label><input id="lp-capital" className="bb-input bb-mono" inputMode="decimal" value={capital} onChange={(e) => setCapital(e.target.value)} /></div>
        <div><label className="bb-label" htmlFor="lp-interest">Intereses (S/)</label><input id="lp-interest" className="bb-input bb-mono" inputMode="decimal" value={interest} onChange={(e) => setInterest(e.target.value)} /></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {PAYMENT_METHODS.map((m) => (
          <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(method === m ? null : m)}
            className={`px-2.5 py-1.5 rounded-card border bb-body text-xs ${method === m ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink'}`}>{m}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 bg-gold text-ink rounded-card bb-body text-sm font-semibold">Guardar pago</button>
        <button type="button" className={btn} onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
