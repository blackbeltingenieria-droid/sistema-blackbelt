// features/results-cash/components/ResultsByUnit.tsx
// Resultados Modelo C por unidad (09_RESULTADOS): contribución, reparto recibido y resultado final.

import { Card } from '../../../components/ui/Card';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { formatPct, formatPen } from '../../../lib/format';
import { UnitBadge } from '../../catalogs/components/UnitBadge';
import type { BusinessUnit } from '../../catalogs/types';
import { TraceFigure } from '../../movements/components/TraceFigure';
import type { UnitResult } from '../domain/calculations';

interface ResultsByUnitProps {
  units: UnitResult[];
  catalog: BusinessUnit[];
  onTrace: (title: string, ids: number[]) => void;
}

export function ResultsByUnit({ units, catalog, onTrace }: ResultsByUnitProps) {
  const meta = (code: string) => catalog.find((u) => u.code === code);
  const columns: Column<UnitResult>[] = [
    {
      key: 'unit', header: 'Unidad', mobile: 'title',
      render: (r) => <UnitBadge code={r.unit} name={meta(r.unit)?.name} color={meta(r.unit)?.color} showName={false} />,
    },
    { key: 'income', header: 'Ingresos', mobile: 'key', render: (r) => <TraceFigure amount={r.income.amount} ids={r.income.ids} label={`Ingresos ${r.unit}`} onOpen={onTrace} /> },
    { key: 'direct', header: 'Costos directos', mobile: 'key', render: (r) => <TraceFigure amount={r.directCosts.amount} ids={r.directCosts.ids} label={`Costos directos ${r.unit}`} onOpen={onTrace} /> },
    { key: 'attr', header: 'Gastos atribuibles', mobile: 'key', render: (r) => <TraceFigure amount={r.attributableExpenses.amount} ids={r.attributableExpenses.ids} label={`Gastos atribuibles ${r.unit}`} onOpen={onTrace} /> },
    { key: 'contrib', header: 'Contribución', mobile: 'key', render: (r) => <span className="bb-mono text-sm text-ink">{formatPen(r.contribution)}</span> },
    { key: 'pct', header: 'Reparto %', mobile: 'detail', render: (r) => <span className="bb-mono text-sm text-ink">{formatPct(r.allocationPct)}</span> },
    { key: 'common', header: 'Gasto común asignado', mobile: 'detail', render: (r) => <span className="bb-mono text-sm text-ink">{formatPen(r.allocatedCommonExpense)}</span> },
    { key: 'margin', header: 'Margen', mobile: 'detail', render: (r) => <span className="bb-mono text-sm text-ink">{formatPct(r.marginPct)}</span> },
    {
      key: 'final', header: 'Resultado final', mobile: 'highlight', className: 'text-right',
      render: (r) => <span className={`bb-mono text-sm font-medium ${r.finalResult < 0 ? 'text-rust' : 'text-ink'}`}>{formatPen(r.finalResult)}</span>,
    },
  ];

  return (
    <Card padding="p-0" plainBelow="xl">
      <DataTable columns={columns} rows={units} getRowKey={(r) => r.unit} cardsBelow="xl" emptyMessage="Sin datos para este mes." />
    </Card>
  );
}
