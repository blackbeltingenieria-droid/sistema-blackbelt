// features/budgets-allocation/BudgetsAllocationPage.tsx
// Presupuesto: tu plan del mes (cuánto vender y cuánto gastar como máximo) y si vas bien.
// Pestañas: ¿Cómo voy? (por defecto) · Mis metas · Reparto de gastos comunes (CORP → unidades).
// Misma tabla de metas del Modelo C; la comparación exacta tipo Excel sigue en "Mis metas → detalle".

import { useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { MonthSelect } from '../../components/ui/MonthSelect';
import { PageHeader } from '../../components/ui/PageHeader';
import { currentMonth, formatPen, monthLabel, monthRange } from '../../lib/format';
import { useMovementCatalogs } from '../movements/hooks/useMovementCatalogs';
import { TraceModal } from '../movements/components/TraceModal';
import { CATEGORY_SHORT } from '../movements/domain/quick-entry';
import { AllocationPanel } from './components/AllocationPanel';
import { BudgetStatusView } from './components/BudgetStatusView';
import { BudgetTable } from './components/BudgetTable';
import { SimpleBudgetModal } from './components/SimpleBudgetModal';
import type { BudgetComparison } from './domain/budget-comparison';
import { buildBudgetStatus } from './domain/budget-status';
import { useBudgetsAllocation } from './hooks/useBudgetsAllocation';
import { copyBudgetsFromPreviousMonth, deleteBudget, saveAllocation, saveSimpleBudget } from './services/budget-service';
import type { BudgetFormValues } from './types';

type Tab = 'status' | 'goals' | 'allocation';
const btn = 'px-3 py-1.5 min-h-[36px] border border-line rounded-card bb-body text-xs hover:bg-canvas whitespace-nowrap';

export function BudgetsAllocationPage() {
  const [month, setMonth] = useState(currentMonth());
  const [tab, setTab] = useState<Tab>('status');
  const [showDetail, setShowDetail] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const data = useBudgetsAllocation(month);
  const { units, areas, categories } = useMovementCatalogs();
  const [trace, setTrace] = useState<{ title: string; ids: number[] } | null>(null);
  const [form, setForm] = useState<{ initial?: BudgetFormValues; id?: number } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const months = useMemo(() => {
    const set = new Set(monthRange('2026-01', currentMonth()));
    set.add(month);
    return [...set].sort().reverse();
  }, [month]);

  const budgets = data.comparisons.map((c) => c.budget);
  const status = useMemo(
    () => buildBudgetStatus({
      mes: month, today: new Date().toISOString().slice(0, 10), budgets, movements: data.movements, units, categories,
      categoryName: (c, id) => (c ? CATEGORY_SHORT[c.code] ?? c.name : `Categoría ${id}`),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- budgets se deriva de comparisons
    [month, data.comparisons, data.movements, units, categories],
  );

  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    setNotice(null);
    try {
      await action();
      await data.refetch();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo completar la acción.');
    }
  }
  const copyPrevious = () => run(async () => {
    const n = await copyBudgetsFromPreviousMonth(month);
    setNotice(n ? `Se copiaron ${n} meta${n === 1 ? '' : 's'} del mes anterior.` : 'No había metas nuevas para copiar del mes anterior.');
  });

  const unitName = (id: number) => {
    const u = units.find((x) => x.id === id);
    return u?.code === 'CORP' ? 'Toda la empresa' : (u?.name ?? '—');
  };
  const catName = (id: number) => {
    const c = categories.find((x) => x.id === id);
    return !c || c.code === 'OTR' ? 'General' : (CATEGORY_SHORT[c.code] ?? c.name);
  };

  const goalColumns: Column<BudgetComparison>[] = [
    { key: 'for', header: 'Para', mobile: 'title', render: (r) => <span className="bb-body text-sm font-medium text-ink">{unitName(r.budget.business_unit_id)}</span> },
    { key: 'what', header: 'Tipo de gasto', mobile: 'key', render: (r) => <span className="bb-body text-xs text-ink">{catName(r.budget.cost_category_id)}</span> },
    { key: 'sell', header: 'Vender', mobile: 'key', className: 'text-right', render: (r) => <span className="bb-mono text-sm text-belt-en_revision">{r.budget.income_target ? formatPen(r.budget.income_target) : '—'}</span> },
    { key: 'spend', header: 'Gastar como máximo', mobile: 'key', className: 'text-right', render: (r) => <span className="bb-mono text-sm text-rust">{r.budget.cost_target ? formatPen(r.budget.cost_target) : '—'}</span> },
    { key: 'note', header: 'Nota', mobile: 'detail', render: (r) => <span className="bb-body text-xs text-ink-soft">{r.budget.comment ?? '—'}</span> },
    {
      key: 'act', header: '', mobile: 'action',
      render: (r) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button type="button" className={btn} onClick={() => setForm({ initial: { ...r.budget }, id: r.budget.id })}>Editar</button>
          <button type="button" className={`${btn} text-rust`} aria-label={`Eliminar meta ${unitName(r.budget.business_unit_id)}`}
            onClick={() => void run(() => deleteBudget(r.budget.id))}>Eliminar</button>
        </div>
      ),
    },
  ];

  const tabBtn = (id: Tab, label: string) => (
    <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
      className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 bb-body text-sm -mb-px border-b-2 ${tab === id ? 'border-gold text-ink font-semibold' : 'border-transparent text-ink-soft hover:text-ink'}`}>
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
        <PageHeader
          title="Presupuesto"
          subtitle="Planea cuánto vender y cuánto gastar cada mes, y mira si vas bien."
          actions={tab !== 'allocation' && (
            <button type="button" onClick={() => setForm({})} data-testid="budget-add"
              className="flex items-center justify-center bg-gold text-ink px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-card bb-body text-sm font-semibold hover:bg-gold/90">
              + Poner meta
            </button>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 items-end">
          <MonthSelect id="bd-month" value={month} months={months} onChange={setMonth} />
          <button type="button" onClick={() => setShowHelp((v) => !v)} aria-expanded={showHelp}
            className="sm:col-span-2 text-left bb-body text-sm text-ink underline underline-offset-4 pb-2">
            ¿Qué es el presupuesto y cómo se lee?
          </button>
        </div>
        {showHelp && (
          <Card className="mb-4" data-testid="budget-help">
            <ul className="bb-body text-sm text-ink space-y-1.5">
              <li>• <strong>El presupuesto es tu plan del mes:</strong> cuánto esperas vender y cuánto quieres gastar como máximo.</li>
              <li>• <strong>Lo real</strong> sale solo de lo que registras en Ingresos y egresos (lo que ya cuenta).</li>
              <li>• <strong>Ventas:</strong> vas bien si llegas a la meta. En el mes en curso se compara con lo esperado a la fecha.</li>
              <li>• <strong>Gastos:</strong> vas bien si no pasas el máximo. Amarillo = estás cerca (90 %). Rojo = te pasaste.</li>
              <li>• Puedes poner una meta para toda una unidad o solo para un tipo de gasto (por ejemplo, Publicidad).</li>
            </ul>
          </Card>
        )}

        <div role="tablist" aria-label="Secciones" className="flex border-b border-line mb-4">
          {tabBtn('status', '¿Cómo voy?')}
          {tabBtn('goals', 'Mis metas')}
          {tabBtn('allocation', 'Reparto de gastos comunes')}
        </div>

        {data.error && <ErrorBanner message={data.error} onRetry={() => void data.refetch()} />}
        {actionError && <ErrorBanner message={actionError} onClose={() => setActionError(null)} />}
        {notice && <p className="bb-body text-sm text-ink mb-3" role="status">{notice}</p>}
        {data.loading && <p className="bb-body text-ink-soft text-center py-12 text-sm">Cargando…</p>}

        {!data.loading && tab === 'status' && (
          <BudgetStatusView status={status} onTrace={(title, ids) => setTrace({ title, ids })} onAdd={() => setForm({})} onCopy={() => void copyPrevious()} />
        )}

        {!data.loading && tab === 'goals' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="bb-body text-sm text-ink-soft">Metas de {monthLabel(month).toLowerCase()}</p>
              <button type="button" className={btn} onClick={() => void copyPrevious()}>Copiar metas del mes anterior</button>
            </div>
            <Card padding="p-0" plainBelow="xl">
              <DataTable columns={goalColumns} rows={data.comparisons} getRowKey={(r) => r.budget.id} cardsBelow="xl"
                onRowClick={(r) => setForm({ initial: { ...r.budget }, id: r.budget.id })}
                emptyMessage="No hay metas para este mes. Pulsa «+ Poner meta» o copia las del mes anterior." />
            </Card>
            <div className="mt-3">
              <button type="button" className="bb-body text-xs text-ink-soft underline" onClick={() => setShowDetail((v) => !v)}>
                {showDetail ? 'Ocultar detalle por área' : 'Ver detalle por área (como el Excel)'}
              </button>
              {showDetail && (
                <div className="mt-3">
                  <BudgetTable rows={data.comparisons} units={units} areas={areas} categories={categories}
                    onTrace={(title, ids) => setTrace({ title, ids })}
                    onEdit={(r) => setForm({ initial: { ...r.budget }, id: r.budget.id })}
                    onDelete={(r) => void run(() => deleteBudget(r.budget.id))} />
                </div>
              )}
            </div>
          </>
        )}

        {!data.loading && tab === 'allocation' && data.summary && (
          <>
            <p className="bb-body text-sm text-ink-soft mb-3">
              Los gastos de toda la empresa (oficina, internet, apps) se reparten entre las unidades con un porcentaje,
              para saber cuánto gana de verdad cada una. Si no lo defines, el gasto queda en la empresa y no se reparte.
            </p>
            <AllocationPanel
              key={month}
              month={month}
              initial={data.allocation}
              summary={data.summary}
              onTrace={(title, ids) => setTrace({ title, ids })}
              onSave={async (pcts, note) => { await saveAllocation(month, pcts, note); await data.refetch(); }}
            />
          </>
        )}
      </div>

      {form && (
        <SimpleBudgetModal
          month={month}
          initial={form.initial}
          units={units}
          areas={areas}
          categories={categories}
          onSubmit={async (values) => { await saveSimpleBudget(values, form.id); await data.refetch(); }}
          onClose={() => setForm(null)}
        />
      )}
      {trace && <TraceModal title={trace.title} ids={trace.ids} movements={data.movements} onClose={() => setTrace(null)} />}
    </div>
  );
}
