// features/clients-projects/ClientsProjectsPage.tsx
// Main page: 2-column layout — listing table (left) + detail panel (right).
// Manages selected project state; delegates data to hooks, rendering to components.

import { useState } from 'react';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { StatusChip } from '../../components/ui/StatusChip';
import { KpiCard } from '../../components/ui/KpiCard';
import { Card } from '../../components/ui/Card';
import { useProjectRows } from './hooks/useProjectRows';
import { ProjectDetailPanel } from './components/ProjectDetailPanel';
import { NewProjectModal } from './components/NewProjectModal';
import { UnitBadge } from '../catalogs/components/UnitBadge';
import type { ProjectRow } from './types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 0,
  }).format(amount);
}

const COLUMNS: Column<ProjectRow>[] = [
  {
    key: 'client',
    header: 'Cliente',
    mobile: 'key',
    render: (row) => (
      <div>
        <p className="bb-body text-sm font-medium text-ink">{row.clientName}</p>
      </div>
    ),
  },
  {
    key: 'project',
    header: 'Proyecto',
    mobile: 'title',
    render: (row) => (
      <div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {row.code && (
            <span className="bb-mono text-[10px] font-bold text-ink-soft bg-canvas border border-line px-1.5 py-0.2 rounded">
              {row.code}
            </span>
          )}
          <p className="bb-body text-sm font-medium text-ink">{row.projectName}</p>
        </div>
        <div className="mt-1">
          <UnitBadge
            code={row.businessUnitCode}
            name={row.businessUnitName}
            color={row.businessUnitColor}
            size="xs"
          />
        </div>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Estado',
    mobile: 'key',
    render: (row) => <StatusChip status={row.status} />,
    className: 'whitespace-nowrap',
  },
  {
    key: 'contracted',
    header: 'Contratado',
    mobile: 'key',
    render: (row) => (
      <span className="bb-mono text-sm text-ink">{formatCurrency(row.contractedAmount)}</span>
    ),
    className: 'text-right',
  },
  {
    key: 'pending',
    header: 'Saldo pendiente',
    mobile: 'highlight',
    render: (row) => (
      <span
        className={`bb-mono text-sm font-medium ${
          row.pendingBalance > 0 ? 'text-rust' : 'text-ink-soft'
        }`}
      >
        {row.pendingBalance <= 0 ? '—' : formatCurrency(row.pendingBalance)}
      </span>
    ),
    className: 'text-right',
  },
];

export function ClientsProjectsPage() {
  const { rows, loading, error, refetch } = useProjectRows();
  const [selectedId, setSelectedId]       = useState<number | null>(null);
  const [showModal, setShowModal]         = useState(false);
  const [search, setSearch]               = useState('');

  // Filter by search
  const filtered = rows.filter(
    (r) =>
      r.clientName.toLowerCase().includes(search.toLowerCase()) ||
      r.projectName.toLowerCase().includes(search.toLowerCase()),
  );

  // KPI summary
  const totalContracted = rows.reduce((s, r) => s + r.contractedAmount, 0);
  const totalPending    = rows.reduce((s, r) => s + Math.max(0, r.pendingBalance), 0);
  const activeCount     = rows.filter((r) => r.status === 'activo').length;

  return (
    <div className="bg-canvas">
      {/* Desktop (lg): lista + panel de detalle en 2 columnas. Mobile: lista en 1 columna,
          el detalle se abre como vista a pantalla completa (ver ProjectDetailPanel). */}
      <div className="lg:flex lg:h-screen lg:overflow-hidden">
        {/* Main content */}
        <main className="min-w-0 lg:flex-1 lg:overflow-y-auto">
          <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-8">
              <div>
                <h1 className="bb-display font-bold text-ink text-2xl">Clientes y Proyectos</h1>
                <p className="bb-body text-ink-soft text-sm mt-1">
                  {rows.length} proyecto{rows.length !== 1 ? 's' : ''} registrado
                  {rows.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center justify-center gap-2 bg-gold text-ink px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-card bb-body text-sm font-semibold hover:bg-gold/90 transition-colors"
              >
                <span className="text-base leading-none">+</span>
                Nuevo proyecto
              </button>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-8">
              <KpiCard
                label="Total contratado"
                value={formatCurrency(totalContracted)}
              />
              <KpiCard
                label="Saldo pendiente total"
                value={formatCurrency(totalPending)}
                valueColor={totalPending > 0 ? 'text-rust' : 'text-ink'}
              />
              <KpiCard
                label="Proyectos activos"
                value={String(activeCount)}
                subtext={`de ${rows.length} en total`}
              />
            </div>

            {/* Search bar */}
            <div className="mb-4">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cliente o proyecto…"
                className={
                  'w-full max-w-md bb-body text-base sm:text-sm text-ink bg-paper border border-line rounded-card ' +
                  'px-4 py-2.5 min-h-[44px] sm:min-h-0 focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-ink-soft'
                }
              />
            </div>

            {/* Error state */}
            {error && (
              <div className="mb-4 p-3 bg-rust/10 border border-rust/30 rounded-card">
                <p className="bb-body text-rust text-sm">{error}</p>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <span className="bb-body text-ink-soft text-sm">Cargando proyectos…</span>
              </div>
            )}

            {/* Table */}
            {!loading && (
              <Card padding="p-0" plainBelow="md" className="overflow-hidden max-md:overflow-visible">
                <DataTable<ProjectRow>
                  columns={COLUMNS}
                  rows={filtered}
                  getRowKey={(r) => r.id}
                  onRowClick={(r) => setSelectedId((prev) => (prev === r.id ? null : r.id))}
                  emptyMessage={
                    search
                      ? `Sin resultados para "${search}"`
                      : 'Aún no hay proyectos registrados'
                  }
                />
              </Card>
            )}
          </div>
        </main>

        {/* Detail panel */}
        <ProjectDetailPanel
          projectId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      </div>

      {/* New project modal */}
      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={() => { refetch(); setShowModal(false); }}
        />
      )}
    </div>
  );
}
