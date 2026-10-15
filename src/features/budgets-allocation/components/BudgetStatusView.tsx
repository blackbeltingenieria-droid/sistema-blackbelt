// features/budgets-allocation/components/BudgetStatusView.tsx
// "¿Cómo voy?": una frase (vas bien / cuidado), dos barras (ventas y gastos), cómo va cada unidad
// y en qué te pasaste. Barras en CSS, colores del sistema.

import { Card } from '../../../components/ui/Card';
import { formatPen } from '../../../lib/format';
import type { BudgetStatus, Progress, SalesState, SpendState } from '../domain/budget-status';

interface Props {
  status: BudgetStatus;
  onTrace: (title: string, ids: number[]) => void;
  onAdd: () => void;
  onCopy: () => void;
}

const TONE: Record<BudgetStatus['tone'], string> = {
  good: 'border-belt-en_revision text-belt-en_revision',
  warn: 'border-belt-por_hacer text-ink',
  bad: 'border-rust text-rust',
  none: 'border-line text-ink',
};

const SALES_TEXT: Record<SalesState, string> = {
  'sin-meta': 'Sin meta de ventas', cumplida: 'Meta cumplida', 'en-camino': 'Vas en camino', baja: 'Por debajo de la meta',
};
const SPEND_TEXT: Record<SpendState, string> = {
  'sin-meta': 'Sin límite de gastos', dentro: 'Dentro del presupuesto', cerca: 'Cerca del límite', pasado: 'Te pasaste',
};
const SALES_COLOR: Record<SalesState, string> = { 'sin-meta': 'bg-line', cumplida: 'bg-belt-en_revision', 'en-camino': 'bg-belt-en_revision', baja: 'bg-belt-por_hacer' };
const SPEND_COLOR: Record<SpendState, string> = { 'sin-meta': 'bg-line', dentro: 'bg-belt-en_revision', cerca: 'bg-belt-por_hacer', pasado: 'bg-rust' };

function Bar({ p, color, testId }: { p: Progress; color: string; testId?: string }) {
  const width = p.target > 0 ? Math.min(100, (p.actual / p.target) * 100) : 0;
  return (
    <div className="h-3 bg-canvas rounded-full overflow-hidden" data-testid={testId} role="progressbar"
      aria-valuenow={Math.round(p.pct ?? 0)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function BudgetStatusView({ status: s, onTrace, onAdd, onCopy }: Props) {
  if (!s.hasBudgets) {
    return (
      <Card>
        <p className="bb-display font-semibold text-ink text-lg" data-testid="budget-verdict">{s.verdict}</p>
        <p className="bb-body text-sm text-ink-soft mt-2">
          Pon cuánto planeas vender y cuánto quieres gastar como máximo. El sistema lo comparará solo con lo que registres.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <button type="button" onClick={onAdd} className="px-4 py-2.5 min-h-[44px] bg-gold text-ink rounded-card bb-body text-sm font-semibold">+ Poner meta</button>
          <button type="button" onClick={onCopy} className="px-4 py-2.5 min-h-[44px] border border-line rounded-card bb-body text-sm text-ink">Copiar metas del mes anterior</button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="budget-status">
      <Card className={`border-l-4 ${TONE[s.tone]}`}>
        <p className={`bb-display font-semibold text-lg sm:text-xl ${TONE[s.tone].split(' ')[1]}`} data-testid="budget-verdict">{s.verdict}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          <div>
            <div className="flex justify-between items-baseline gap-2 mb-1">
              <p className="bb-label-xs text-ink-soft">Ventas</p>
              <p className="bb-body text-xs font-semibold text-ink">{SALES_TEXT[s.sales.state]}</p>
            </div>
            <Bar p={s.sales} color={SALES_COLOR[s.sales.state]} testId="budget-sales-bar" />
            <p className="bb-body text-sm text-ink mt-1.5" data-testid="budget-sales-text">
              Vendiste <button type="button" className="font-semibold underline decoration-dotted" onClick={() => onTrace('Ventas del mes', s.sales.ids)}>{formatPen(s.sales.actual)}</button>
              {' '}de {formatPen(s.sales.target)} planeado{s.sales.pct !== null ? ` (${Math.round(s.sales.pct)} %)` : ''}.
            </p>
          </div>
          <div>
            <div className="flex justify-between items-baseline gap-2 mb-1">
              <p className="bb-label-xs text-ink-soft">Gastos</p>
              <p className={`bb-body text-xs font-semibold ${s.spend.state === 'pasado' ? 'text-rust' : 'text-ink'}`}>{SPEND_TEXT[s.spend.state]}</p>
            </div>
            <Bar p={s.spend} color={SPEND_COLOR[s.spend.state]} testId="budget-spend-bar" />
            <p className="bb-body text-sm text-ink mt-1.5" data-testid="budget-spend-text">
              Gastaste <button type="button" className="font-semibold underline decoration-dotted" onClick={() => onTrace('Gastos del mes', s.spend.ids)}>{formatPen(s.spend.actual)}</button>
              {' '}de {formatPen(s.spend.target)} permitido
              {s.spend.state === 'pasado' ? <> · <span className="text-rust font-semibold">te pasaste {formatPen(s.spend.diff)}</span></> : s.spend.target > 0 ? ` · te quedan ${formatPen(-s.spend.diff)}` : ''}.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card>
          <h2 className="bb-display font-semibold text-ink text-base mb-3">¿Cómo va cada unidad?</h2>
          <ul className="space-y-4" data-testid="budget-units">
            {s.byUnit.map((u) => (
              <li key={u.unitId}>
                <p className="bb-body text-sm font-semibold text-ink mb-1.5">
                  {u.code !== 'CORP' && <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ backgroundColor: u.color }} />}
                  {u.name}
                </p>
                {u.sales.target > 0 && (
                  <div className="mb-1.5">
                    <Bar p={u.sales} color={SALES_COLOR[u.sales.state]} />
                    <p className="bb-body text-xs text-ink-soft mt-0.5">Ventas: {formatPen(u.sales.actual)} de {formatPen(u.sales.target)} · {SALES_TEXT[u.sales.state]}</p>
                  </div>
                )}
                {u.spend.target > 0 && (
                  <div>
                    <Bar p={u.spend} color={SPEND_COLOR[u.spend.state]} />
                    <p className={`bb-body text-xs mt-0.5 ${u.spend.state === 'pasado' ? 'text-rust' : 'text-ink-soft'}`}>
                      Gastos: {formatPen(u.spend.actual)} de {formatPen(u.spend.target)} · {u.spend.state === 'pasado' ? `te pasaste ${formatPen(u.spend.diff)}` : SPEND_TEXT[u.spend.state]}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="bb-display font-semibold text-ink text-base mb-3">¿En qué te pasaste?</h2>
          {s.overspent.length === 0 ? (
            <p className="bb-body text-sm text-ink-soft" data-testid="budget-no-overspend">En ninguna categoría te pasaste del límite. ✓</p>
          ) : (
            <ul className="space-y-2" data-testid="budget-overspent">
              {s.overspent.map((c) => (
                <li key={c.name}>
                  <button type="button" className="w-full text-left flex justify-between gap-3 bb-body text-sm hover:underline"
                    onClick={() => onTrace(`Gastos en ${c.name}`, c.ids)}>
                    <span className="text-ink">{c.name}</span>
                    <span className="text-rust font-semibold whitespace-nowrap">+ {formatPen(c.over)}</span>
                  </button>
                  <p className="bb-body text-xs text-ink-soft">Gastaste {formatPen(c.actual)} de {formatPen(c.target)} permitido.</p>
                </li>
              ))}
            </ul>
          )}
          <p className="bb-body text-[11px] text-ink-soft mt-3">Toca una cifra para ver los registros.</p>
        </Card>
      </div>
    </div>
  );
}
