// features/dashboard-general/components/UnitComparison.tsx
// Comparativa de unidades de negocio: ingresos y resultado final con el color oficial de cada unidad.
// Cada cifra abre su trazabilidad hasta los movement_id.

import { Card } from '../../../components/ui/Card';
import { formatPen } from '../../../lib/format';
import { UnitBadge } from '../../catalogs/components/UnitBadge';
import type { BusinessUnit } from '../../catalogs/types';
import { TraceFigure } from '../../movements/components/TraceFigure';
import type { UnitResult } from '../../results-cash/domain/calculations';

interface UnitComparisonProps {
  units: UnitResult[];
  catalog: BusinessUnit[];
  onTrace: (title: string, ids: number[]) => void;
}

export function UnitComparison({ units, catalog, onTrace }: UnitComparisonProps) {
  const max = Math.max(1, ...units.map((u) => Math.max(u.income.amount, Math.abs(u.finalResult))));
  return (
    <Card>
      <h2 className="bb-display font-semibold text-ink text-base mb-3">Comparativa por unidad</h2>
      <ul className="space-y-4">
        {units.map((u) => {
          const meta = catalog.find((c) => c.code === u.unit);
          const incomePct = (u.income.amount / max) * 100;
          const resultPct = (Math.abs(u.finalResult) / max) * 100;
          return (
            <li key={u.unit} data-testid={`unit-row-${u.unit}`}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <UnitBadge code={u.unit} name={meta?.name} color={meta?.color} showName={false} size="xs" />
                <span className="bb-body text-xs text-ink-soft truncate">{meta?.name}</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="bb-label-xs text-ink-soft w-16 shrink-0 text-[10px]">Ingresos</span>
                  <div className="flex-1 h-2 bg-line rounded-sm overflow-hidden"><div className="h-full" style={{ width: `${incomePct}%`, backgroundColor: meta?.color }} /></div>
                  <TraceFigure amount={u.income.amount} ids={u.income.ids} label={`Ingresos ${u.unit}`} onOpen={onTrace} className="w-28 text-right" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="bb-label-xs text-ink-soft w-16 shrink-0 text-[10px]">Resultado</span>
                  <div className="flex-1 h-2 bg-line rounded-sm overflow-hidden"><div className={`h-full ${u.finalResult < 0 ? 'bg-rust' : ''}`} style={u.finalResult < 0 ? { width: `${resultPct}%` } : { width: `${resultPct}%`, backgroundColor: meta?.color }} /></div>
                  <span className={`bb-mono text-sm w-28 text-right ${u.finalResult < 0 ? 'text-rust' : 'text-ink'}`}>{formatPen(u.finalResult)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
