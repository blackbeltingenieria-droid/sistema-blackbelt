// features/dashboard-general/components/ToolRankingCard.tsx
// Ranking de herramientas digitales: movimientos SOFT agrupados por proveedor.

import { Card } from '../../../components/ui/Card';
import { formatPct } from '../../../lib/format';
import { TraceFigure } from '../../movements/components/TraceFigure';
import type { ToolRank } from '../domain/tool-ranking';

interface ToolRankingCardProps {
  ranking: ToolRank[];
  onTrace: (title: string, ids: number[]) => void;
}

export function ToolRankingCard({ ranking, onTrace }: ToolRankingCardProps) {
  return (
    <Card>
      <h2 className="bb-display font-semibold text-ink text-base">Ranking de herramientas</h2>
      <p className="bb-body text-xs text-ink-soft mb-3">Movimientos SOFT agrupados por proveedor.</p>
      {ranking.length === 0 ? (
        <p className="bb-body text-sm text-ink-soft py-4 text-center">No hay gasto en herramientas validado este mes.</p>
      ) : (
        <ol className="space-y-3">
          {ranking.map((r, i) => (
            <li key={r.name} data-testid="tool-rank-row">
              <div className="flex items-center justify-between gap-3">
                <p className="bb-body text-sm text-ink min-w-0 truncate"><span className="bb-mono text-ink-soft mr-2">#{i + 1}</span>{r.name}</p>
                <TraceFigure amount={r.total} ids={r.ids} label={`Herramienta ${r.name}`} onOpen={onTrace} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-line rounded-sm overflow-hidden"><div className="h-full bg-ink" style={{ width: `${r.sharePct}%` }} /></div>
                <span className="bb-mono text-[11px] text-ink-soft w-14 text-right">{formatPct(r.sharePct)}</span>
              </div>
              <p className="bb-mono text-[10px] text-ink-soft mt-0.5">{r.units.join(' · ')}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
