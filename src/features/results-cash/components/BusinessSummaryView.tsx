// features/results-cash/components/BusinessSummaryView.tsx
// Vista simple de "Resultados y caja": ¿gano o pierdo?, por qué, a dónde se fue el dinero y
// cómo vengo los últimos meses. Sin términos contables ni librerías de gráficos (barras en CSS).

import { Link } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { formatPen, monthLabel, monthShort } from '../../../lib/format';
import type { BusinessSummary } from '../domain/summary';

interface Props {
  mes: string;               // último mes del periodo
  /** Nombre del periodo ("octubre 2026", "agosto 2026 – octubre 2026", "desde el inicio (…)"). */
  label?: string;
  isMonth?: boolean;
  summary: BusinessSummary;
  pendingReview: number;
  onTrace: (title: string, ids: number[]) => void;
  /** Aviso del presupuesto del mes (frase de "¿Cómo voy?"). */
  budget?: { tone: 'good' | 'warn' | 'bad' | 'none'; verdict: string };
}

export function BusinessSummaryView({ mes, label, isMonth = true, summary: s, pendingReview, onTrace, budget }: Props) {
  const periodText = (label ?? monthLabel(mes)).toLowerCase();
  const winning = s.verdict === 'gana';
  const heroColor = s.verdict === 'sin-datos' ? 'text-ink' : winning ? 'text-belt-en_revision' : 'text-rust';
  const maxExpense = Math.max(1, ...s.topExpenses.map((e) => e.amount));
  const maxTrend = Math.max(1, ...s.trend.map((p) => Math.abs(p.result)));
  const manyYears = new Set(s.trend.map((p) => p.mes.slice(0, 4))).size > 1;

  return (
    <div className="space-y-4" data-testid="business-summary">
      {/* 1. ¿Gano o pierdo? */}
      <Card>
        <p className="bb-body text-sm text-ink-soft" data-testid="summary-period">{periodText.startsWith('desde') || periodText.startsWith('el año') ? periodText.charAt(0).toUpperCase() + periodText.slice(1) : `En ${periodText}`}</p>
        <p className={`bb-display font-semibold text-2xl sm:text-3xl ${heroColor}`} data-testid="summary-verdict">
          {s.verdict === 'sin-datos' ? 'Aún no hay registros que cuenten' : winning ? `Estás ganando ${formatPen(s.result)}` : `Estás perdiendo ${formatPen(Math.abs(s.result))}`}
        </p>
        {s.reasons.length > 0 && (
          <div className="mt-3">
            <p className="bb-label-xs text-ink-soft mb-1">¿Por qué?</p>
            <ul className="space-y-1" data-testid="summary-reasons">
              {s.reasons.map((r) => <li key={r} className="bb-body text-sm text-ink">• {r}</li>)}
            </ul>
          </div>
        )}
        {pendingReview > 0 && (
          <p className="bb-body text-xs text-ink-soft mt-3">
            {pendingReview} registro{pendingReview === 1 ? '' : 's'} todavía no cuenta{pendingReview === 1 ? '' : 'n'}.{' '}
            <Link to="/movements" className="underline text-ink">Revisarlos</Link>
          </p>
        )}
      </Card>

      {budget && (
        <Card className={`border-l-4 ${budget.tone === 'bad' ? 'border-rust' : budget.tone === 'warn' ? 'border-belt-por_hacer' : budget.tone === 'good' ? 'border-belt-en_revision' : 'border-line'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2" data-testid="summary-budget">
            <p className="bb-body text-sm text-ink"><span className="bb-label-xs text-ink-soft mr-2">Presupuesto</span>{budget.verdict}</p>
            <Link to="/budgets" className="bb-body text-xs text-ink underline">{budget.tone === 'none' ? 'Poner metas' : 'Ver detalle'}</Link>
          </div>
        </Card>
      )}

      {/* 2. Tres números */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <p className="bb-label-xs text-ink-soft">Vendiste</p>
          <p className="bb-mono text-xl font-semibold text-belt-en_revision" data-testid="summary-income">{formatPen(s.income)}</p>
        </Card>
        <Card>
          <p className="bb-label-xs text-ink-soft">Gastaste</p>
          <p className="bb-mono text-xl font-semibold text-rust" data-testid="summary-spent">{formatPen(s.spent)}</p>
        </Card>
        <Card>
          <p className="bb-label-xs text-ink-soft">Dinero en caja{!isMonth && <span className="normal-case"> (al cierre)</span>}</p>
          <p className={`bb-mono text-xl font-semibold ${s.cash < 0 ? 'text-rust' : 'text-ink'}`} data-testid="summary-cash">{formatPen(s.cash)}</p>
          <p className="bb-body text-[11px] text-ink-soft mt-1">Te deben {formatPen(s.receivable)} · Debes {formatPen(s.payable)}</p>
        </Card>
      </div>

      <p className="bb-body text-xs text-ink-soft bg-paper border border-line rounded-card px-4 py-2" data-testid="summary-since-start">
        Desde el inicio hasta {monthLabel(mes).toLowerCase()}: vendiste <strong className="text-ink">{formatPen(s.sinceStart.income)}</strong>,
        gastaste <strong className="text-ink">{formatPen(s.sinceStart.spent)}</strong> y {s.sinceStart.result >= 0 ? 'ganaste' : 'perdiste'}{' '}
        <strong className={s.sinceStart.result >= 0 ? 'text-belt-en_revision' : 'text-rust'}>{formatPen(Math.abs(s.sinceStart.result))}</strong>.
        {s.projected && (s.projected.receivable > 0 || s.projected.laborPending > 0) && (
          <span className="block mt-1" data-testid="summary-projected">
            Si cobras lo que te deben ({formatPen(s.projected.receivable)}) y pagas lo que debes al equipo ({formatPen(s.projected.laborPending)}),{' '}
            {s.projected.result >= 0 ? 'ganarías' : 'perderías'} <strong className={s.projected.result >= 0 ? 'text-belt-en_revision' : 'text-rust'}>{formatPen(Math.abs(s.projected.result))}</strong>.
          </span>
        )}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* 3. ¿En qué se fue el dinero? */}
        <Card>
          <h2 className="bb-display font-semibold text-ink text-base mb-3">¿En qué gastaste?</h2>
          {s.topExpenses.length === 0 ? (
            <p className="bb-body text-sm text-ink-soft">No hay gastos {isMonth ? 'este mes' : 'en este periodo'}.</p>
          ) : (
            <ul className="space-y-2.5" data-testid="summary-expenses">
              {s.topExpenses.map((e) => (
                <li key={e.categoryId}>
                  <button type="button" className="w-full text-left group" onClick={() => onTrace(`Gastos: ${e.name}`, e.ids)}>
                    <div className="flex justify-between gap-2 bb-body text-sm">
                      <span className="text-ink group-hover:underline truncate">{e.name}</span>
                      <span className="bb-mono text-ink whitespace-nowrap">{formatPen(e.amount)}</span>
                    </div>
                    <div className="h-2 bg-canvas rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-rust rounded-full" style={{ width: `${(e.amount / maxExpense) * 100}%` }} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="bb-body text-[11px] text-ink-soft mt-3">Toca una barra para ver los registros.</p>
        </Card>

        {/* 4. Últimos meses */}
        <Card>
          <h2 className="bb-display font-semibold text-ink text-base mb-3">{isMonth ? '¿Cómo vienes los últimos meses?' : '¿Cómo te fue mes a mes?'}</h2>
          <ul className="space-y-2" data-testid="summary-trend">
            {s.trend.map((p) => {
              const pos = p.result >= 0;
              return (
                <li key={p.mes} className="grid grid-cols-[3.5rem_1fr_6.5rem] items-center gap-2">
                  <span className="bb-body text-xs text-ink-soft">{monthShort(p.mes, manyYears)}</span>
                  <div className="h-3 bg-canvas rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${pos ? 'bg-belt-en_revision' : 'bg-rust'}`} style={{ width: `${(Math.abs(p.result) / maxTrend) * 100}%` }} />
                  </div>
                  <span className={`bb-mono text-xs text-right ${pos ? 'text-belt-en_revision' : 'text-rust'}`}>
                    {pos ? '+' : '−'} {formatPen(Math.abs(p.result))}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="bb-body text-[11px] text-ink-soft mt-3">Verde: ganaste. Rojo: perdiste.</p>
        </Card>
      </div>
    </div>
  );
}
