// features/finance-giros/FinanceGirosPage.tsx
// Página principal del módulo de costos por giro de negocio.
// Pestañas: Gastos | Herramientas | Por giro

import { useState } from 'react';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Card } from '../../components/ui/Card';
import { KpiCard } from '../../components/ui/KpiCard';
import { CategoryCodeChip } from './components/CategoryCodeChip';
import { ToolCatalogPanel } from './components/ToolCatalogPanel';
import { BusinessUnitSummaryView } from './components/BusinessUnitSummaryView';
import { NewTransactionModal } from './components/NewTransactionModal';
import { NewToolModal } from './components/NewToolModal';
import { useTransactionRows } from './hooks/useTransactionRows';
import { useTools } from './hooks/useTools';
import { SEED_BUSINESS_UNITS } from '../clients-projects/services/seed-data';
import { SEED_COST_CATEGORIES } from './services/seed-data';
import type { TransactionRow } from './types';

type Tab = 'gastos' | 'herramientas' | 'por-giro';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(n);

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

export function FinanceGirosPage() {
  const [tab, setTab]                       = useState<Tab>('gastos');
  const [showTxModal, setShowTxModal]       = useState(false);
  const [showToolModal, setShowToolModal]   = useState(false);
  const [filterBuId, setFilterBuId]         = useState<number | ''>('');
  const [filterCatId, setFilterCatId]       = useState<number | ''>('');
  const [editingTx, setEditingTx]           = useState<TransactionRow | null>(null);

  const { rows, loading, error, refetch } = useTransactionRows({
    businessUnitId: filterBuId !== '' ? filterBuId : undefined,
    costCategoryId: filterCatId !== '' ? filterCatId : undefined,
  });
  const { refetch: refetchTools } = useTools();

  const totalGasto   = rows.reduce((s, r) => s + r.amount, 0);
  const uniqueTools  = new Set(rows.filter((r) => r.toolId).map((r) => r.toolId)).size;

  function handleOpenCreate() {
    setEditingTx(null);
    setShowTxModal(true);
  }

  function handleOpenEdit(row: TransactionRow) {
    setEditingTx(row);
    setShowTxModal(true);
  }

  const TX_COLUMNS: Column<TransactionRow>[] = [
    {
      key: 'date',
      header: 'Fecha',
      render: (r) => (
        <div>
          <span className="bb-mono text-xs text-ink-soft">{fmtDate(r.transactionDate)}</span>
          {r.updatedAt && (
            <span className="block bb-mono text-[9px] text-ink-soft/70" title="Editado">
              editado
            </span>
          )}
        </div>
      ),
      className: 'whitespace-nowrap',
    },
    {
      key: 'description',
      header: 'Descripción',
      render: (r) => (
        <div>
          <p className="bb-body text-sm font-medium text-ink">{r.description}</p>
          {r.toolName && (
            <p className="bb-body text-xs text-ink-soft mt-0.5">🔧 {r.toolName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Clasificación',
      render: (r) => <CategoryCodeChip code={r.costCategoryCode} name={r.costCategoryName} />,
      className: 'whitespace-nowrap',
    },
    {
      key: 'amount',
      header: 'Monto',
      className: 'text-right',
      render: (r) => <span className="bb-mono text-sm font-semibold text-rust">{fmt(r.amount)}</span>,
    },
    {
      key: 'allocations',
      header: 'Giros',
      render: (r) => (
        <div className="flex flex-wrap gap-1 max-w-[260px]">
          {r.allocations.map((a) => (
            <span
              key={a.businessUnitId}
              className="bb-mono text-[10px] bg-canvas border border-line px-1.5 py-0.5 rounded text-ink-soft whitespace-nowrap"
            >
              {a.businessUnitName.split(' ')[0]} {a.pct}%
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      className: 'text-right',
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenEdit(r);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-card border border-line bg-paper text-ink text-xs hover:border-gold hover:text-ink transition-colors font-medium"
          title="Editar este gasto"
        >
          <span>✏️</span>
          <span>Editar</span>
        </button>
      ),
    },
  ];

  const TABS: { key: Tab; label: string; emoji: string }[] = [
    { key: 'gastos',       label: 'Gastos',               emoji: '💸' },
    { key: 'herramientas', label: 'Herramientas',          emoji: '🔧' },
    { key: 'por-giro',     label: 'Por giro de negocio',   emoji: '📊' },
  ];

  return (
    <div className="min-h-screen bg-canvas" style={{ paddingLeft: '240px' }}>
      <div className="px-10 py-9">

        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="bb-display font-bold text-ink text-2xl">Movimientos financieros</h1>
            <p className="bb-body text-ink-soft text-sm mt-1">
              Costos por giro de negocio · Clasificación y distribución
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setTab('herramientas'); setShowToolModal(true); }}
              className="flex items-center gap-1.5 border border-line bg-paper text-ink px-3 py-2 rounded-card bb-body text-sm font-medium hover:bg-canvas transition-colors"
            >
              🔧 Nueva herramienta
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 bg-gold text-ink px-4 py-2 rounded-card bb-body text-sm font-semibold hover:bg-gold/90 transition-colors"
            >
              + Registrar gasto
            </button>
          </div>
        </div>

        {/* KPI strip (visible en tab gastos) */}
        {tab === 'gastos' && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <KpiCard
              label="Total gastos (filtro actual)"
              value={fmt(totalGasto)}
              valueColor="text-rust"
            />
            <KpiCard
              label="Movimientos"
              value={String(rows.length)}
              subtext={loading ? 'Cargando…' : undefined}
            />
            <KpiCard
              label="Herramientas involucradas"
              value={String(uniqueTools)}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-line mb-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                'px-5 py-2.5 bb-body text-sm transition-colors border-b-2 -mb-px',
                tab === t.key
                  ? 'border-gold text-ink font-semibold'
                  : 'border-transparent text-ink-soft hover:text-ink',
              ].join(' ')}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Gastos ── */}
        {tab === 'gastos' && (
          <>
            {/* Filtros */}
            <div className="flex gap-3 mb-4 flex-wrap">
              <select
                value={filterBuId}
                onChange={(e) => setFilterBuId(e.target.value === '' ? '' : Number(e.target.value))}
                className="bb-body text-sm text-ink bg-paper border border-line rounded-card px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold"
              >
                <option value="">Todos los giros</option>
                {SEED_BUSINESS_UNITS.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <select
                value={filterCatId}
                onChange={(e) => setFilterCatId(e.target.value === '' ? '' : Number(e.target.value))}
                className="bb-body text-sm text-ink bg-paper border border-line rounded-card px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold"
              >
                <option value="">Todas las clasificaciones</option>
                {SEED_COST_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {(filterBuId !== '' || filterCatId !== '') && (
                <button
                  onClick={() => { setFilterBuId(''); setFilterCatId(''); }}
                  className="bb-body text-xs text-ink-soft hover:text-rust transition-colors"
                >
                  × Limpiar filtros
                </button>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rust/10 border border-rust/30 rounded-card">
                <p className="bb-body text-rust text-sm">{error}</p>
              </div>
            )}

            {loading ? (
              <p className="bb-body text-ink-soft text-sm text-center py-16">Cargando gastos…</p>
            ) : (
              <Card padding="p-0">
                <DataTable<TransactionRow>
                  columns={TX_COLUMNS}
                  rows={rows}
                  getRowKey={(r) => r.id}
                  emptyMessage={
                    filterBuId !== '' || filterCatId !== ''
                      ? 'Sin gastos para los filtros seleccionados'
                      : 'Aún no hay gastos registrados'
                  }
                />
              </Card>
            )}
          </>
        )}

        {/* ── Tab: Herramientas ── */}
        {tab === 'herramientas' && (
          <ToolCatalogPanel onNewTool={() => setShowToolModal(true)} />
        )}

        {/* ── Tab: Por giro ── */}
        {tab === 'por-giro' && (
          <BusinessUnitSummaryView onEditTransaction={(row) => handleOpenEdit(row)} />
        )}
      </div>

      {/* Modales */}
      {showTxModal && (
        <NewTransactionModal
          transactionToEdit={editingTx}
          onClose={() => {
            setShowTxModal(false);
            setEditingTx(null);
          }}
          onSaved={() => {
            refetch();
            setShowTxModal(false);
            setEditingTx(null);
          }}
          onCreated={() => {
            refetch();
            setShowTxModal(false);
            setEditingTx(null);
          }}
        />
      )}
      {showToolModal && (
        <NewToolModal
          onClose={() => setShowToolModal(false)}
          onCreated={() => { refetchTools(); setShowToolModal(false); }}
        />
      )}
    </div>
  );
}
