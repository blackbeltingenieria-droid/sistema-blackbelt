// features/dashboard-general/DashboardPage.tsx
// Dashboard general: comparativo de giros + ranking de herramientas + mano de obra.
// Reutiliza servicios existentes de finance-giros. No duplica lógica.

import { Card } from '../../components/ui/Card';
import { KpiCard } from '../../components/ui/KpiCard';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { ScopeChip } from '../finance-giros/components/ScopeChip';
import { UnitBadge } from '../catalogs/components/UnitBadge';
import { useDashboardData } from './hooks/useDashboardData';
import type { LaborCostByUnit, ToolSpendRank } from '../finance-giros/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(n);

// ─── Barra horizontal proporcional ───────────────────────────────────────────
// Construida con tokens del design system, sin librería de gráficos externa.
const BELT_COLORS = ['#15130F', '#C9742E', '#D8B13A', '#6E8B55', '#55504A'];

function HorizontalBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 bg-line rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color || '#15130F' }}
        />
      </div>
      <span className="bb-mono text-xs text-ink w-24 text-right shrink-0">{fmt(value)}</span>
    </div>
  );
}

// ─── Columnas para la DataTable de herramientas ───────────────────────────────
const TOOL_COLS: Column<ToolSpendRank>[] = [
  {
    key: 'rank',
    header: '#',
    render: (_r, idx) => (
      <span className="bb-mono text-xs text-ink-soft font-bold">{(idx ?? 0) + 1}</span>
    ),
    className: 'w-8',
  },
  {
    key: 'name',
    header: 'Herramienta',
    render: (r) => (
      <div>
        <p className="bb-body text-sm font-medium text-ink">{r.toolName}</p>
        <p className="bb-body text-xs text-ink-soft mt-0.5">
          {r.impactedUnitNames.map((n) => n.split(' ')[0]).join(' · ')}
        </p>
      </div>
    ),
  },
  {
    key: 'scope',
    header: 'Alcance',
    render: (r) => <ScopeChip scope={r.scope} />,
    className: 'whitespace-nowrap',
  },
  {
    key: 'count',
    header: 'Movimientos',
    className: 'text-right',
    render: (r) => (
      <span className="bb-mono text-sm text-ink-soft">{r.transactionCount}</span>
    ),
  },
  {
    key: 'total',
    header: 'Gasto acumulado',
    className: 'text-right',
    render: (r) => <span className="bb-mono text-sm font-semibold text-rust">{fmt(r.totalSpend)}</span>,
  },
];

// ─── Columnas para la DataTable de mano de obra ───────────────────────────────
const LABOR_COLS: Column<LaborCostByUnit>[] = [
  {
    key: 'unit',
    header: 'Giro de negocio',
    render: (r) => <span className="bb-body text-sm text-ink">{r.businessUnitName}</span>,
  },
  {
    key: 'pct',
    header: '% del total',
    className: 'w-48',
    render: (r) => (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-line rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${r.pctOfTotalLabor}%`, backgroundColor: '#15130F' }}
          />
        </div>
        <span className="bb-mono text-xs text-ink-soft w-10 text-right">
          {r.pctOfTotalLabor.toFixed(0)}%
        </span>
      </div>
    ),
  },
  {
    key: 'cost',
    header: 'Mano de obra prorrateada',
    className: 'text-right',
    render: (r) => (
      <span className={`bb-mono text-sm font-medium ${r.laborCost > 0 ? 'text-rust' : 'text-ink-soft'}`}>
        {r.laborCost > 0 ? fmt(r.laborCost) : '—'}
      </span>
    ),
  },
];

// ─── Página ───────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { comparison, toolsRanking, laborByUnit, loading, error } = useDashboardData();

  const totalSpend       = comparison.reduce((s, r) => s + r.currentPeriodTotal, 0);
  const totalTools       = toolsRanking.reduce((s, r) => s + r.totalSpend, 0);
  const totalLabor       = laborByUnit.reduce((s, r) => s + r.laborCost, 0);
  const maxUnitTotal     = Math.max(...comparison.map((r) => r.currentPeriodTotal), 1);

  return (
    <div className="min-h-screen bg-canvas" style={{ paddingLeft: '240px' }}>
      <div className="px-10 py-9">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="bb-display font-bold text-ink text-2xl">Dashboard general</h1>
          <p className="bb-body text-ink-soft text-sm mt-1">
            Comparativo de los 5 giros de negocio · Período completo
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rust/10 border border-rust/30 rounded-card">
            <p className="bb-body text-rust text-sm">{error}</p>
          </div>
        )}

        {loading && (
          <p className="bb-body text-ink-soft text-sm text-center py-20">Cargando dashboard…</p>
        )}

        {!loading && (
          <div className="space-y-8">

            {/* ── KPI strip ── */}
            <div className="grid grid-cols-3 gap-4">
              <KpiCard
                label="Gasto total registrado"
                value={fmt(totalSpend)}
                valueColor="text-rust"
              />
              <KpiCard
                label="Gasto en herramientas"
                value={fmt(totalTools)}
                subtext={totalSpend > 0 ? `${((totalTools / totalSpend) * 100).toFixed(0)}% del total` : undefined}
              />
              <KpiCard
                label="Mano de obra total"
                value={fmt(totalLabor)}
                subtext={totalSpend > 0 ? `${((totalLabor / totalSpend) * 100).toFixed(0)}% del total` : undefined}
              />
            </div>

            {/* ── Comparativo de giros — ranking con barras ── */}
            <Card>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="bb-display font-semibold text-ink text-base">
                    Comparativo por giro de negocio
                  </h2>
                  <p className="bb-body text-xs text-ink-soft mt-0.5">
                    Gasto total prorrateado · ordenado de mayor a menor
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {comparison.map((bu, idx) => (
                  <div key={bu.businessUnitId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {bu.businessUnitCode ? (
                          <UnitBadge
                            code={bu.businessUnitCode}
                            color={bu.businessUnitColor}
                            showName={false}
                            size="xs"
                          />
                        ) : (
                          <span
                            className="bb-mono text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center text-paper"
                            style={{ backgroundColor: bu.businessUnitColor || BELT_COLORS[idx % BELT_COLORS.length] }}
                          >
                            {bu.rank}
                          </span>
                        )}
                        <span className="bb-body text-sm text-ink font-medium">
                          {bu.businessUnitName}
                        </span>
                      </div>
                      {bu.variationPct !== null && (
                        <span className={`bb-mono text-xs px-2 py-0.5 rounded-full ${
                          bu.variationPct > 0
                            ? 'bg-rust/10 text-rust'
                            : 'bg-[#6E8B55]/10 text-[#6E8B55]'
                        }`}>
                          {bu.variationPct > 0 ? '↑' : '↓'} {Math.abs(bu.variationPct).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <HorizontalBar
                      value={bu.currentPeriodTotal}
                      max={maxUnitTotal}
                      color={bu.businessUnitColor || BELT_COLORS[idx % BELT_COLORS.length]}
                    />
                  </div>
                ))}
              </div>

              {comparison.length === 0 && (
                <p className="bb-body text-ink-soft text-sm text-center py-8">Sin datos</p>
              )}
            </Card>

            {/* ── Ranking de herramientas ── */}
            <div>
              <h2 className="bb-display font-semibold text-ink text-base mb-4">
                Ranking de herramientas por gasto acumulado
              </h2>
              <Card padding="p-0">
                <DataTable<ToolSpendRank>
                  columns={TOOL_COLS}
                  rows={toolsRanking}
                  getRowKey={(r) => r.toolId}
                  emptyMessage="Sin herramientas con gastos registrados"
                />
              </Card>
            </div>

            {/* ── Mano de obra por giro ── */}
            <div>
              <h2 className="bb-display font-semibold text-ink text-base mb-4">
                Mano de obra prorrateada por giro
              </h2>
              <Card padding="p-0">
                <DataTable<LaborCostByUnit>
                  columns={LABOR_COLS}
                  rows={laborByUnit}
                  getRowKey={(r) => r.businessUnitId}
                  emptyMessage="Sin datos de mano de obra"
                />
              </Card>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
