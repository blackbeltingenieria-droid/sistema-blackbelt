// features/finance-giros/components/ToolCatalogPanel.tsx
// Panel derecho: listado de herramientas + historial al seleccionar una.

import { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { KpiCard } from '../../../components/ui/KpiCard';
import { ScopeChip } from './ScopeChip';
import { useTools } from '../hooks/useTools';
import { getToolHistory } from '../services/finance-service';
import type { Tool, ToolHistoryRow } from '../types';

interface Props {
  onNewTool: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(n);

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const TOOL_COLS: Column<Tool>[] = [
  {
    key: 'name',
    header: 'Herramienta',
    mobile: 'title',
    render: (t) => (
      <div>
        <p className="bb-body text-sm font-medium text-ink">{t.name}</p>
        {t.notes && <p className="bb-body text-xs text-ink-soft mt-0.5 truncate max-w-[220px] max-md:max-w-none max-md:whitespace-normal">{t.notes}</p>}
      </div>
    ),
  },
  {
    key: 'scope',
    header: 'Alcance',
    mobile: 'key',
    render: (t) => <ScopeChip scope={t.scope} />,
  },
  {
    key: 'cost',
    header: 'Costo ref./mes',
    mobile: 'highlight',
    className: 'text-right',
    render: (t) => (
      <span className="bb-mono text-sm text-ink">
        {t.monthly_reference_cost != null ? fmt(t.monthly_reference_cost) : '—'}
      </span>
    ),
  },
];

export function ToolCatalogPanel({ onNewTool }: Props) {
  const { tools, loading, error } = useTools();
  const [selected, setSelected]   = useState<Tool | null>(null);
  const [history, setHistory]     = useState<ToolHistoryRow[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  async function handleSelect(tool: Tool) {
    if (selected?.id === tool.id) { setSelected(null); setHistory([]); return; }
    setSelected(tool);
    setHistLoading(true);
    try {
      const h = await getToolHistory(tool.id);
      setHistory(h);
    } catch { setHistory([]); }
    finally { setHistLoading(false); }
  }

  const histTotal = history.reduce((s, h) => s + h.amount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="bb-display font-semibold text-ink text-lg">Catálogo de herramientas</h2>
        <button
          onClick={onNewTool}
          className="flex items-center justify-center gap-1.5 bg-gold text-ink px-3 py-2 min-h-[44px] sm:min-h-0 rounded-card bb-body text-sm font-semibold hover:bg-gold/90 transition-colors"
        >
          <span>+</span> Nueva herramienta
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rust/10 border border-rust/30 rounded-card">
          <p className="bb-body text-rust text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="bb-body text-ink-soft text-sm py-8 text-center">Cargando herramientas…</p>
      ) : (
        <Card padding="p-0" plainBelow="md">
          <DataTable<Tool>
            columns={TOOL_COLS}
            rows={tools}
            getRowKey={(t) => t.id}
            onRowClick={handleSelect}
            emptyMessage="Sin herramientas registradas"
          />
        </Card>
      )}

      {/* Historial de herramienta seleccionada */}
      {selected && (
        <Card className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="bb-display font-semibold text-ink text-sm">
              Historial — {selected.name}
            </h3>
            <button
              onClick={() => { setSelected(null); setHistory([]); }}
              aria-label="Cerrar historial"
              className="w-11 h-11 sm:w-auto sm:h-auto -mr-3 sm:mr-0 flex items-center justify-center text-ink-soft hover:text-ink text-2xl sm:text-lg leading-none"
            >×</button>
          </div>

          {histLoading && (
            <p className="bb-body text-ink-soft text-sm text-center py-6">Cargando historial…</p>
          )}

          {!histLoading && history.length === 0 && (
            <p className="bb-body text-ink-soft text-sm text-center py-6">
              Sin gastos registrados para esta herramienta
            </p>
          )}

          {!histLoading && history.length > 0 && (
            <>
              <KpiCard
                label="Costo histórico acumulado"
                value={fmt(histTotal)}
                className="mb-4"
              />
              <ul className="space-y-2">
                {history.map((h) => (
                  <li key={h.transactionId} className="border border-line rounded-card p-3">
                    <div className="flex justify-between items-start gap-3 mb-1">
                      <div className="min-w-0">
                        <p className="bb-body text-sm font-medium text-ink">{h.description}</p>
                        <p className="bb-mono text-xs text-ink-soft">{fmtDate(h.transactionDate)}</p>
                      </div>
                      <span className="bb-mono text-sm font-semibold text-ink">{fmt(h.amount)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {h.allocations.map((a) => (
                        <span key={a.businessUnitId} className="bb-mono text-[10px] bg-canvas px-1.5 py-0.5 rounded border border-line text-ink-soft">
                          {a.businessUnitName} {a.pct}% · {fmt(a.allocatedAmount)}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
