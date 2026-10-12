// features/finance-giros/components/BusinessUnitSummaryView.tsx
// Dashboard parametrizado por giro de negocio con gráficos belt-stripe, filtros y trazabilidad.

import { useMemo, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { KpiCard } from '../../../components/ui/KpiCard';
import { CategoryCodeChip } from './CategoryCodeChip';
import { ScopeChip } from './ScopeChip';
import { useTransactionRows } from '../hooks/useTransactionRows';
import { useTools } from '../hooks/useTools';
import { useBusinessUnitSummaries } from '../hooks/useBusinessUnitSummaries';
import { SEED_BUSINESS_UNITS } from '../../clients-projects/services/seed-data';
import { SEED_COST_CATEGORIES } from '../services/seed-data';
import type { CostCategoryCode, TransactionRow } from '../types';

interface Props {
  onEditTransaction?: (row: TransactionRow) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(n);

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

// ─── Paleta Belt-Stripe oficial para clasificaciones (Modelo C: 17 categorías) ──
const CATEGORY_COLORS: Record<string, { color: string; label: string }> = {
  MO:   { color: '#15130F', label: 'Mano de obra y especialistas' },
  PUB:  { color: '#E67E22', label: 'Publicidad y captación' },
  SOFT: { color: '#1677FF', label: 'Software y herramientas digitales' },
  SERV: { color: '#007080', label: 'Servicios y telecomunicaciones' },
  MAT:  { color: '#8C7355', label: 'Materiales e insumos' },
  MAQ:  { color: '#C9742E', label: 'Maquinaria y equipos' },
  MOV:  { color: '#D8B13A', label: 'Transporte y viáticos' },
  TERC: { color: '#6C3FC5', label: 'Servicios tercerizados' },
  ADM:  { color: '#55504A', label: 'Administración y trámites' },
  CAP:  { color: '#159957', label: 'Capacitación' },
  BAN:  { color: '#9E6728', label: 'Comisiones bancarias' },
  MANT: { color: '#4A6984', label: 'Mantenimiento' },
  ACT:  { color: '#2E7D32', label: 'Adquisición de activos' },
  CXC:  { color: '#1B5E20', label: 'Cobros de clientes' },
  CXP:  { color: '#C0392B', label: 'Pagos a proveedores' },
  SOC:  { color: '#8E44AD', label: 'Aportes y retiros de socios' },
  OTR:  { color: '#7F8C8D', label: 'Otros' },
  // Fallbacks de compatibilidad
  mano_de_obra:   { color: '#15130F', label: 'Mano de obra' },
  maquinaria:     { color: '#C9742E', label: 'Maquinaria / Tecnología' },
  metodo:         { color: '#D8B13A', label: 'Método' },
  medicion:       { color: '#6E8B55', label: 'Medición' },
  medio_ambiente: { color: '#55504A', label: 'Medio ambiente' },
  materiales:     { color: '#E4DFD3', label: 'Materiales' },
};

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'same' | null }) {
  if (trend === null) return <span className="text-ink-soft bb-mono text-xs">—</span>;
  if (trend === 'up')   return <span className="text-rust bb-mono text-xs font-bold" title="Subió">↑</span>;
  if (trend === 'down') return <span className="text-[#6E8B55] bb-mono text-xs font-bold" title="Bajó">↓</span>;
  return <span className="text-ink-soft bb-mono text-xs" title="Sin cambio">→</span>;
}

function VariationBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <span className="bb-mono text-xs text-ink-soft bg-canvas border border-line px-2 py-0.5 rounded-full">
        Sin datos previos
      </span>
    );
  }
  const isUp = pct > 0;
  return (
    <span
      className={`bb-mono text-xs px-2 py-0.5 rounded-full font-semibold ${
        isUp ? 'bg-rust/10 text-rust' : 'bg-[#6E8B55]/10 text-[#6E8B55]'
      }`}
    >
      {isUp ? '↑' : '↓'} {Math.abs(pct).toFixed(1)}% vs. período ant.
    </span>
  );
}

// ─── Gráfico 1: Donut SVG de distribución por clasificación ─────────────────
interface CategorySlice {
  code: CostCategoryCode;
  name: string;
  total: number;
  pct: number;
}

function DistributionDonutChart({ slices, total }: { slices: CategorySlice[]; total: number }) {
  const radius = 64;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  if (total === 0 || slices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 bg-canvas/40 border border-line rounded-card">
        <p className="bb-body text-ink-soft text-sm">Sin gastos para graficar en este período</p>
      </div>
    );
  }

  let accumulatedPct = 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      {/* Donut SVG */}
      <div className="md:col-span-5 flex justify-center">
        <div className="relative w-44 h-44">
          <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
            {/* Background ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#E4DFD3"
              strokeWidth={strokeWidth}
            />
            {/* Colored slices */}
            {slices.map((slice) => {
              const dashLength = (slice.pct / 100) * circumference;
              const dashOffset = -((accumulatedPct / 100) * circumference);
              accumulatedPct += slice.pct;
              const color = CATEGORY_COLORS[slice.code]?.color ?? '#15130F';

              return (
                <circle
                  key={slice.code}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLength} ${circumference}`}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          {/* Centro del donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="bb-label-xs text-ink-soft text-[9px]">Total Asignado</span>
            <span className="bb-mono text-sm font-bold text-ink leading-tight mt-0.5">
              {fmt(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Leyenda con colores belt-stripe */}
      <div className="md:col-span-7 space-y-2">
        {slices.map((slice) => {
          const color = CATEGORY_COLORS[slice.code]?.color ?? '#15130F';
          return (
            <div key={slice.code} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                  style={{ backgroundColor: color }}
                />
                <span className="bb-body text-ink truncate font-medium">{slice.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="bb-mono text-ink-soft">{slice.pct.toFixed(1)}%</span>
                <span className="bb-mono font-medium text-ink w-24 text-right">
                  {fmt(slice.total)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Gráfico 2: Evolución temporal SVG ───────────────────────────────────────
interface PeriodBar {
  key: string;
  label: string;
  total: number;
}

function EvolutionTimelineChart({ data }: { data: PeriodBar[] }) {
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const chartHeight = 140;

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 bg-canvas/40 border border-line rounded-card">
        <p className="bb-body text-ink-soft text-sm">Sin historial de períodos para este giro</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="h-44 flex items-end gap-6 pt-6 pb-2 px-4 border-b border-line bg-paper rounded-card">
        {data.map((bar) => {
          const barHeight = Math.max(12, (bar.total / maxVal) * chartHeight);
          return (
            <div key={bar.key} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
              <span className="bb-mono text-[10px] font-semibold text-ink group-hover:text-gold transition-colors">
                {fmt(bar.total)}
              </span>
              <div className="w-full max-w-[56px] h-full flex items-end">
                <div
                  className="w-full bg-gold rounded-t hover:bg-gold/80 transition-all duration-300"
                  style={{ height: `${barHeight}px` }}
                  title={`${bar.label}: ${fmt(bar.total)}`}
                />
              </div>
              <span className="bb-mono text-[11px] text-ink-soft whitespace-nowrap mt-1">
                {bar.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="bb-body text-[11px] text-ink-soft text-right">
        * Montos prorrateados asignados al giro por período
      </p>
    </div>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────
export function BusinessUnitSummaryView({ onEditTransaction }: Props) {
  const { rows: allTxRows, loading: txLoading } = useTransactionRows();
  const { tools }                               = useTools();
  const { summaries, loading: sumLoading }      = useBusinessUnitSummaries();

  // Giro seleccionado actualmente (1 a 5)
  const [selectedBuId, setSelectedBuId]         = useState<number>(SEED_BUSINESS_UNITS[0]?.id ?? 1);
  const [viewMode, setViewMode]                 = useState<'dashboard' | 'comparativa'>('dashboard');

  // Filtros internos del giro
  const [dateFrom, setDateFrom]                 = useState('');
  const [dateTo, setDateTo]                     = useState('');
  const [catFilter, setCatFilter]               = useState<number | ''>('');
  const [toolFilter, setToolFilter]             = useState<number | ''>('');

  const activeGiro = useMemo(
    () => SEED_BUSINESS_UNITS.find((b) => b.id === selectedBuId) ?? SEED_BUSINESS_UNITS[0],
    [selectedBuId],
  );

  const activeSummary = useMemo(
    () => summaries.find((s) => s.businessUnitId === selectedBuId),
    [summaries, selectedBuId],
  );

  const hasActiveFilters = Boolean(dateFrom || dateTo || catFilter !== '' || toolFilter !== '');

  function handleClearFilters() {
    setDateFrom('');
    setDateTo('');
    setCatFilter('');
    setToolFilter('');
  }

  // Filtrado reactivo de transacciones que aportan costo a este giro
  const giroTransactions = useMemo(() => {
    return allTxRows
      .filter((tx) => tx.allocations.some((a) => a.businessUnitId === selectedBuId))
      .filter((tx) => {
        if (dateFrom && tx.transactionDate < dateFrom) return false;
        if (dateTo && tx.transactionDate > dateTo) return false;
        if (catFilter !== '' && tx.costCategoryId !== catFilter) return false;
        if (toolFilter !== '' && tx.toolId !== toolFilter) return false;
        return true;
      });
  }, [allTxRows, selectedBuId, dateFrom, dateTo, catFilter, toolFilter]);

  // Cálculos reactivos de KPIs y distribución
  const {
    giroGrandTotal,
    laborTotal,
    toolsTotal,
    categorySlices,
    timelineData,
    impactingToolsList,
  } = useMemo(() => {
    let grandTotal = 0;
    let labor = 0;
    let tech = 0;

    const catSums = new Map<number, number>();
    const monthSums = new Map<string, number>();
    const toolAmountsMap = new Map<number, number[]>();

    for (const tx of giroTransactions) {
      const alloc = tx.allocations.find((a) => a.businessUnitId === selectedBuId);
      if (!alloc) continue;

      const share = alloc.allocatedAmount;
      grandTotal += share;

      if ((tx.costCategoryCode as string) === 'MO' || (tx.costCategoryCode as string) === 'mano_de_obra') labor += share;
      if ((tx.costCategoryCode as string) === 'SOFT' || (tx.costCategoryCode as string) === 'MAQ' || (tx.costCategoryCode as string) === 'maquinaria') tech += share;

      // Acumulador por categoría
      catSums.set(tx.costCategoryId, (catSums.get(tx.costCategoryId) ?? 0) + share);

      // Acumulador por mes
      const [year, month] = tx.transactionDate.split('-');
      const monthKey = `${year}-${month}`;
      monthSums.set(monthKey, (monthSums.get(monthKey) ?? 0) + share);

      // Acumulador por herramienta
      if (tx.toolId) {
        if (!toolAmountsMap.has(tx.toolId)) toolAmountsMap.set(tx.toolId, []);
        toolAmountsMap.get(tx.toolId)!.push(share);
      }
    }

    // Rebanadas de categoría con porcentaje
    const slices: CategorySlice[] = SEED_COST_CATEGORIES
      .map((c) => {
        const total = catSums.get(c.id) ?? 0;
        const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
        return {
          code: c.code,
          name: c.name,
          total,
          pct,
        };
      })
      .filter((s) => s.total > 0)
      .sort((a, b) => b.total - a.total);

    // Datos de evolución cronológica
    const MONTH_NAMES: Record<string, string> = {
      '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
      '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
      '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
    };

    const timeline: PeriodBar[] = Array.from(monthSums.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => {
        const [year, month] = key.split('-');
        const label = `${MONTH_NAMES[month] ?? month} ${year}`;
        return { key, label, total };
      });

    // Herramientas impactantes
    const toolMap = new Map(tools.map((t) => [t.id, t]));
    const impacting = Array.from(toolAmountsMap.entries()).map(([tId, amounts]) => {
      const tool = toolMap.get(tId);
      const totalAllocated = amounts.reduce((s, a) => s + a, 0);
      let trend: 'up' | 'down' | 'same' | null = null;
      if (amounts.length >= 2) {
        const last = amounts[amounts.length - 1];
        const prev = amounts[amounts.length - 2];
        trend = last > prev ? 'up' : last < prev ? 'down' : 'same';
      }
      return {
        toolId: tId,
        toolName: tool?.name ?? '—',
        scope: tool?.scope ?? 'general',
        totalAllocated,
        trend,
      };
    }).sort((a, b) => b.totalAllocated - a.totalAllocated);

    return {
      giroGrandTotal: grandTotal,
      laborTotal: labor,
      toolsTotal: tech,
      categorySlices: slices,
      timelineData: timeline,
      impactingToolsList: impacting,
    };
  }, [giroTransactions, selectedBuId, tools]);

  const loading = txLoading || sumLoading;

  return (
    <div className="space-y-6">
      {/* ── Selector de Modo y Giros ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h2 className="bb-display font-semibold text-ink text-xl">
            Costos por giro de negocio
          </h2>
          <p className="bb-body text-xs text-ink-soft mt-0.5">
            Dashboard analítico por giro con distribución y evolución temporal
          </p>
        </div>

        {/* Alternador entre Dashboard y Comparativa */}
        <div className="flex items-center gap-1 bg-paper border border-line rounded-card p-1">
          <button
            onClick={() => setViewMode('dashboard')}
            className={`px-3 py-1.5 rounded text-xs bb-body font-medium transition-colors ${
              viewMode === 'dashboard'
                ? 'bg-ink text-paper font-semibold'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            📊 Dashboard del giro
          </button>
          <button
            onClick={() => setViewMode('comparativa')}
            className={`px-3 py-1.5 rounded text-xs bb-body font-medium transition-colors ${
              viewMode === 'comparativa'
                ? 'bg-ink text-paper font-semibold'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            📑 Comparativa de los 5
          </button>
        </div>
      </div>

      {/* ── Selector de Giros (Pills horizontales) ── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SEED_BUSINESS_UNITS.map((bu) => {
          const isSelected = bu.id === selectedBuId;
          return (
            <button
              key={bu.id}
              onClick={() => {
                setSelectedBuId(bu.id);
                if (viewMode === 'comparativa') setViewMode('dashboard');
              }}
              className={`px-3.5 py-2 rounded-card text-xs bb-body font-medium whitespace-nowrap transition-all border flex items-center gap-2 ${
                isSelected
                  ? 'bg-ink text-paper border-ink shadow-sm'
                  : 'bg-paper text-ink-soft border-line hover:border-ink hover:text-ink'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: bu.color }}
              />
              <span>{bu.code} · {bu.name}</span>
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="py-20 text-center">
          <span className="bb-body text-ink-soft text-sm">Cargando métricas del giro…</span>
        </div>
      )}

      {/* ── MODO 1: DASHBOARD DETALLADO DEL GIRO ── */}
      {!loading && viewMode === 'dashboard' && (
        <div className="space-y-6">
          {/* Header del Giro Activo */}
          <Card>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span
                    className="bb-mono text-xs font-bold px-2.5 py-0.5 rounded-full text-white shadow-sm"
                    style={{ backgroundColor: activeGiro.color }}
                  >
                    {activeGiro.code}
                  </span>
                  <h3 className="bb-display font-bold text-ink text-lg">
                    {activeGiro.name}
                  </h3>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <VariationBadge pct={activeSummary?.variationPct ?? null} />
                  <span className="bb-mono text-xs text-ink-soft">
                    · {giroTransactions.length} movimiento{giroTransactions.length !== 1 ? 's' : ''} asignado{giroTransactions.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="bb-label-xs text-ink-soft">Gasto Asignado al Giro</p>
                <p className={`bb-mono text-2xl font-bold ${giroGrandTotal > 0 ? 'text-rust' : 'text-ink-soft'}`}>
                  {fmt(giroGrandTotal)}
                </p>
              </div>
            </div>

            {/* ── Barra de Filtros Internos del Giro ── */}
            <div className="mt-5 pt-4 border-t border-line">
              <div className="flex flex-wrap items-center gap-3">
                {/* Rango de fechas */}
                <div className="flex items-center gap-1.5">
                  <span className="bb-label-xs text-ink-soft">Desde:</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bb-body text-xs text-ink bg-canvas border border-line rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="bb-label-xs text-ink-soft">Hasta:</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bb-body text-xs text-ink bg-canvas border border-line rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                </div>

                {/* Filtro de Clasificación */}
                <select
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value === '' ? '' : Number(e.target.value))}
                  className="bb-body text-xs text-ink bg-canvas border border-line rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gold"
                >
                  <option value="">Todas las clasificaciones</option>
                  {SEED_COST_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                {/* Filtro de Herramienta */}
                <select
                  value={toolFilter}
                  onChange={(e) => setToolFilter(e.target.value === '' ? '' : Number(e.target.value))}
                  className="bb-body text-xs text-ink bg-canvas border border-line rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gold"
                >
                  <option value="">Todas las herramientas</option>
                  {tools.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="bb-body text-xs text-rust hover:underline ml-auto font-medium"
                  >
                    × Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          </Card>

          {/* ── KPIs del Giro (Reactivos a los Filtros) ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              label="Gasto total del filtro"
              value={fmt(giroGrandTotal)}
              valueColor={giroGrandTotal > 0 ? 'text-rust' : 'text-ink-soft'}
              subtext={`En ${giroTransactions.length} movimiento(s)`}
            />
            <KpiCard
              label="👷 Mano de obra"
              value={laborTotal > 0 ? fmt(laborTotal) : '—'}
              valueColor={laborTotal > 0 ? 'text-ink' : 'text-ink-soft'}
              subtext={
                giroGrandTotal > 0 && laborTotal > 0
                  ? `${((laborTotal / giroGrandTotal) * 100).toFixed(0)}% del total del giro`
                  : undefined
              }
            />
            <KpiCard
              label="⚙️ Herramientas / Tech"
              value={toolsTotal > 0 ? fmt(toolsTotal) : '—'}
              valueColor={toolsTotal > 0 ? 'text-ink' : 'text-ink-soft'}
              subtext={
                giroGrandTotal > 0 && toolsTotal > 0
                  ? `${((toolsTotal / giroGrandTotal) * 100).toFixed(0)}% del total del giro`
                  : undefined
              }
            />
          </div>

          {/* ── Visualizaciones (2 Gráficos en Paralelo) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Gráfico 1: Distribución por Clasificación */}
            <Card className="lg:col-span-7">
              <div className="mb-4">
                <h4 className="bb-display font-semibold text-ink text-base">
                  Distribución del gasto por clasificación
                </h4>
                <p className="bb-body text-xs text-ink-soft mt-0.5">
                  Proporción asignada según tipo de gasto (paleta belt-stripe)
                </p>
              </div>

              <DistributionDonutChart slices={categorySlices} total={giroGrandTotal} />
            </Card>

            {/* Gráfico 2: Evolución Temporal */}
            <Card className="lg:col-span-5">
              <div className="mb-4">
                <h4 className="bb-display font-semibold text-ink text-base">
                  Evolución del gasto en el tiempo
                </h4>
                <p className="bb-body text-xs text-ink-soft mt-0.5">
                  Monto mensual asignado al giro
                </p>
              </div>

              <EvolutionTimelineChart data={timelineData} />
            </Card>
          </div>

          {/* ── Herramientas con impacto en este giro ── */}
          {impactingToolsList.length > 0 && (
            <Card>
              <div className="mb-3">
                <h4 className="bb-display font-semibold text-ink text-base">
                  Herramientas con impacto en {activeGiro.name}
                </h4>
                <p className="bb-body text-xs text-ink-soft mt-0.5">
                  Herramientas tecnológicas prorrateadas y su tendencia de costo
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {impactingToolsList.map((tool) => (
                  <div
                    key={tool.toolId}
                    className="p-3 bg-canvas/40 border border-line rounded-card flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <TrendIcon trend={tool.trend} />
                        <p className="bb-body text-xs font-semibold text-ink truncate">
                          {tool.toolName}
                        </p>
                      </div>
                      <div className="mt-1">
                        <ScopeChip scope={tool.scope} />
                      </div>
                    </div>
                    <span className="bb-mono text-xs font-bold text-ink shrink-0">
                      {fmt(tool.totalAllocated)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── Detalle de Movimientos del Giro ── */}
          <Card padding="p-0">
            <div className="p-4 border-b border-line flex items-center justify-between">
              <div>
                <h4 className="bb-display font-semibold text-ink text-base">
                  Movimientos que aportan costo a este giro
                </h4>
                <p className="bb-body text-xs text-ink-soft mt-0.5">
                  Gastos registrados con su porcentaje prorrateado correspondiente
                </p>
              </div>
              <span className="bb-mono text-xs text-ink-soft">
                {giroTransactions.length} registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line bg-canvas/30 text-ink-soft bb-label-xs">
                    <th className="py-2.5 px-4">Fecha</th>
                    <th className="py-2.5 px-4">Descripción</th>
                    <th className="py-2.5 px-4">Clasificación</th>
                    <th className="py-2.5 px-4 text-right">Monto Original</th>
                    <th className="py-2.5 px-4 text-right">% Giro</th>
                    <th className="py-2.5 px-4 text-right">Monto Asignado</th>
                    {onEditTransaction && <th className="py-2.5 px-4 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-xs">
                  {giroTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-ink-soft bb-body">
                        No hay movimientos para este giro con los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    giroTransactions.map((tx) => {
                      const alloc = tx.allocations.find((a) => a.businessUnitId === selectedBuId);
                      const assigned = alloc?.allocatedAmount ?? 0;
                      const pct = alloc?.pct ?? 0;

                      return (
                        <tr key={tx.id} className="hover:bg-canvas/30 transition-colors">
                          <td className="py-2.5 px-4 bb-mono text-ink-soft whitespace-nowrap">
                            {fmtDate(tx.transactionDate)}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="bb-body font-medium text-ink">{tx.description}</span>
                            {tx.toolName && (
                              <span className="block bb-body text-[11px] text-ink-soft">
                                🔧 {tx.toolName}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <CategoryCodeChip code={tx.costCategoryCode} name={tx.costCategoryName} />
                          </td>
                          <td className="py-2.5 px-4 bb-mono text-right text-ink-soft">
                            {fmt(tx.amount)}
                          </td>
                          <td className="py-2.5 px-4 bb-mono text-right font-medium text-ink">
                            {pct}%
                          </td>
                          <td className="py-2.5 px-4 bb-mono text-right font-bold text-rust whitespace-nowrap">
                            {fmt(assigned)}
                          </td>
                          {onEditTransaction && (
                            <td className="py-2.5 px-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => onEditTransaction(tx)}
                                className="px-2 py-0.5 border border-line rounded bg-paper text-ink hover:border-gold text-xs transition-colors"
                              >
                                ✏️ Editar
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── MODO 2: COMPARATIVA DE LOS 5 GIROS ── */}
      {!loading && viewMode === 'comparativa' && (
        <div className="space-y-4">
          <p className="bb-body text-xs text-ink-soft">
            Haz clic en cualquier tarjeta para abrir su dashboard detallado con gráficos y filtros.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summaries.map((bu) => (
              <Card
                key={bu.businessUnitId}
                className="cursor-pointer hover:border-gold transition-colors"
              >
                <div
                  onClick={() => {
                    setSelectedBuId(bu.businessUnitId);
                    setViewMode('dashboard');
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="bb-display font-bold text-ink text-sm">
                        {bu.businessUnitName}
                      </p>
                      <div className="mt-1">
                        <VariationBadge pct={bu.variationPct} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="bb-label-xs text-ink-soft">Total prorrateado</p>
                      <p className={`bb-mono text-xl font-bold ${bu.grandTotal > 0 ? 'text-rust' : 'text-ink-soft'}`}>
                        {fmt(bu.grandTotal)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="p-2 bg-canvas/40 border border-line rounded text-xs">
                      <p className="bb-label-xs text-ink-soft text-[10px]">Mano de obra</p>
                      <p className="bb-mono font-semibold text-ink mt-0.5">
                        {bu.laborTotal > 0 ? fmt(bu.laborTotal) : '—'}
                      </p>
                    </div>
                    <div className="p-2 bg-canvas/40 border border-line rounded text-xs">
                      <p className="bb-label-xs text-ink-soft text-[10px]">Herramientas</p>
                      <p className="bb-mono font-semibold text-ink mt-0.5">
                        {bu.toolsTotal > 0 ? fmt(bu.toolsTotal) : '—'}
                      </p>
                    </div>
                  </div>

                  {bu.byCategory.length > 0 && (
                    <div className="flex h-2 rounded-full overflow-hidden bg-line mb-3">
                      {bu.byCategory.map((cat) => {
                        const pct = bu.grandTotal > 0 ? (cat.total / bu.grandTotal) * 100 : 0;
                        const col = CATEGORY_COLORS[cat.costCategoryCode]?.color ?? '#15130F';
                        return (
                          <div
                            key={cat.costCategoryId}
                            style={{ width: `${pct}%`, backgroundColor: col }}
                            title={`${cat.costCategoryName}: ${pct.toFixed(0)}%`}
                          />
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs pt-1 border-t border-line text-ink-soft">
                    <span>{bu.impactingTools.length} herramienta(s) con impacto</span>
                    <span className="text-gold font-medium hover:underline">Ver dashboard →</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
