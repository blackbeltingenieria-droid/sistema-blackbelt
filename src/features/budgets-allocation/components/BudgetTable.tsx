// features/budgets-allocation/components/BudgetTable.tsx
// Meta vs. real por combinación (07_PRESUPUESTOS). El real sale solo de movimientos VALIDADO + OK.

import { Card } from '../../../components/ui/Card';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { formatPen } from '../../../lib/format';
import { UnitBadge } from '../../catalogs/components/UnitBadge';
import type { Area, BusinessUnit, CostCategory } from '../../catalogs/types';
import { TraceFigure } from '../../movements/components/TraceFigure';
import type { BudgetComparison } from '../domain/budget-comparison';

interface BudgetTableProps {
  rows: BudgetComparison[];
  units: BusinessUnit[];
  areas: Area[];
  categories: CostCategory[];
  onTrace: (title: string, ids: number[]) => void;
  onEdit: (row: BudgetComparison) => void;
  onDelete: (row: BudgetComparison) => void;
}

export function BudgetTable({ rows, units, areas, categories, onTrace, onEdit, onDelete }: BudgetTableProps) {
  const unit = (id: number) => units.find((u) => u.id === id);
  const label = (r: BudgetComparison) =>
    `${areas.find((a) => a.id === r.budget.area_id)?.code ?? '—'} · ${categories.find((c) => c.id === r.budget.cost_category_id)?.code ?? '—'}`;

  const columns: Column<BudgetComparison>[] = [
    {
      key: 'combo', header: 'Unidad · Área · Categoría', mobile: 'title',
      render: (r) => (
        <div className="flex flex-wrap items-center gap-2">
          <UnitBadge code={unit(r.budget.business_unit_id)?.code ?? '—'} color={unit(r.budget.business_unit_id)?.color} showName={false} size="xs" />
          <span className="bb-mono text-xs text-ink">{label(r)}</span>
        </div>
      ),
    },
    { key: 'ci', header: 'Ingreso meta', mobile: 'key', render: (r) => <span className="bb-mono text-sm text-ink">{formatPen(r.budget.income_target)}</span> },
    { key: 'ri', header: 'Ingreso real', mobile: 'key', render: (r) => <TraceFigure amount={r.actualIncome} ids={r.movementIds} label={`Ingreso real ${label(r)}`} onOpen={onTrace} /> },
    { key: 'cc', header: 'Costo meta', mobile: 'key', render: (r) => <span className="bb-mono text-sm text-ink">{formatPen(r.budget.cost_target)}</span> },
    { key: 'rc', header: 'Costo real', mobile: 'key', render: (r) => <TraceFigure amount={r.actualCost} ids={r.movementIds} label={`Costo real ${label(r)}`} onOpen={onTrace} /> },
    {
      key: 'dev', header: 'Desviación gasto', mobile: 'highlight', className: 'text-right',
      render: (r) => <span className={`bb-mono text-sm font-medium ${r.costDeviation < 0 ? 'text-rust' : 'text-ink'}`}>{formatPen(r.costDeviation)}</span>,
    },
    { key: 'note', header: 'Comentario', mobile: 'detail', render: (r) => <span className="bb-body text-xs text-ink-soft">{r.budget.comment ?? '—'}</span> },
    {
      key: 'act', header: 'Acciones', mobile: 'action',
      render: (r) => (
        <div className="flex gap-2">
          <button type="button" onClick={() => onEdit(r)} className="px-3 py-1.5 border border-line rounded-card bb-body text-xs hover:bg-canvas">Editar</button>
          <button type="button" onClick={() => onDelete(r)} className="px-3 py-1.5 border border-line rounded-card bb-body text-xs text-rust hover:bg-canvas">Eliminar</button>
        </div>
      ),
    },
  ];

  return (
    <Card padding="p-0" plainBelow="xl">
      <DataTable columns={columns} rows={rows} getRowKey={(r) => r.budget.id} cardsBelow="xl"
        emptyMessage="No hay metas para este mes. Crea una con «+ Nueva meta»." />
    </Card>
  );
}
