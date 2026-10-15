// features/budgets-allocation/BudgetsAllocationPage.tsx
// Presupuestos (meta vs. real) y reparto mensual de CORP a UN01–UN05.

import { useMemo, useState } from 'react';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { MonthSelect } from '../../components/ui/MonthSelect';
import { PageHeader } from '../../components/ui/PageHeader';
import { currentMonth, monthRange } from '../../lib/format';
import { useMovementCatalogs } from '../movements/hooks/useMovementCatalogs';
import { TraceModal } from '../movements/components/TraceModal';
import { AllocationPanel } from './components/AllocationPanel';
import { BudgetFormModal } from './components/BudgetFormModal';
import { BudgetTable } from './components/BudgetTable';
import type { BudgetComparison } from './domain/budget-comparison';
import { useBudgetsAllocation } from './hooks/useBudgetsAllocation';
import { deleteBudget, saveAllocation, saveBudget } from './services/budget-service';
import type { BudgetFormValues } from './types';

type Tab = 'budgets' | 'allocation';

export function BudgetsAllocationPage() {
  const [month, setMonth] = useState(currentMonth());
  const [tab, setTab] = useState<Tab>('budgets');
  const data = useBudgetsAllocation(month);
  const { units, areas, categories } = useMovementCatalogs();
  const [trace, setTrace] = useState<{ title: string; ids: number[] } | null>(null);
  const [form, setForm] = useState<{ initial: BudgetFormValues; id?: number } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const months = useMemo(() => {
    const set = new Set(monthRange('2026-01', currentMonth()));
    set.add(month);
    return [...set].sort().reverse();
  }, [month]);

  const blank: BudgetFormValues = { month, business_unit_id: 0, area_id: 0, cost_category_id: 0, income_target: 0, cost_target: 0, comment: null };

  async function remove(row: BudgetComparison) {
    setActionError(null);
    try {
      await deleteBudget(row.budget.id);
      await data.refetch();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo eliminar.');
    }
  }

  const tabBtn = (id: Tab, label: string) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
      className={`flex-1 sm:flex-none min-h-[44px] sm:min-h-0 px-4 py-2 bb-body text-sm border-b-2 ${tab === id ? 'border-ink text-ink font-semibold' : 'border-transparent text-ink-soft hover:text-ink'}`}>
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
        <PageHeader
          title="Presupuestos y reparto"
          subtitle="Metas por mes, unidad, área y categoría frente a lo real validado, y reparto mensual del gasto corporativo."
          actions={tab === 'budgets' && (
            <button type="button" onClick={() => setForm({ initial: blank })}
              className="flex items-center justify-center bg-gold text-ink px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-card bb-body text-sm font-semibold hover:bg-gold/90">
              + Nueva meta
            </button>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <MonthSelect id="bd-month" value={month} months={months} onChange={setMonth} />
        </div>

        <div role="tablist" aria-label="Secciones" className="flex border-b border-line mb-4">
          {tabBtn('budgets', 'Presupuestos')}
          {tabBtn('allocation', 'Reparto CORP')}
        </div>

        {data.error && <ErrorBanner message={data.error} onRetry={() => void data.refetch()} />}
        {actionError && <ErrorBanner message={actionError} onClose={() => setActionError(null)} />}
        {data.loading && <p className="bb-body text-ink-soft text-center py-12 text-sm">Cargando…</p>}

        {!data.loading && tab === 'budgets' && (
          <BudgetTable
            rows={data.comparisons}
            units={units}
            areas={areas}
            categories={categories}
            onTrace={(title, ids) => setTrace({ title, ids })}
            onEdit={(r) => setForm({ initial: { ...r.budget }, id: r.budget.id })}
            onDelete={(r) => void remove(r)}
          />
        )}

        {!data.loading && tab === 'allocation' && data.summary && (
          <AllocationPanel
            key={month}
            month={month}
            initial={data.allocation}
            summary={data.summary}
            onTrace={(title, ids) => setTrace({ title, ids })}
            onSave={async (pcts, note) => { await saveAllocation(month, pcts, note); await data.refetch(); }}
          />
        )}
      </div>

      {form && (
        <BudgetFormModal
          initial={form.initial}
          isEditing={form.id !== undefined}
          units={units}
          areas={areas}
          categories={categories}
          onSubmit={async (values) => { await saveBudget(values, form.id); await data.refetch(); }}
          onClose={() => setForm(null)}
        />
      )}
      {trace && <TraceModal title={trace.title} ids={trace.ids} movements={data.movements} onClose={() => setTrace(null)} />}
    </div>
  );
}
