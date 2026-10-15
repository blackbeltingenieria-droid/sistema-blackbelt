// features/movements/MovementsPage.tsx
// Libro único de movimientos: listado con filtros, alta/edición, validación y control automático.

import { useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { KpiCard } from '../../components/ui/KpiCard';
import { MonthSelect } from '../../components/ui/MonthSelect';
import { PageHeader } from '../../components/ui/PageHeader';
import { currentMonth, formatDateShort, formatPen } from '../../lib/format';
import { MOVEMENT_STATUS, RECORD_TYPE } from '../../types/database';
import { UnitBadge } from '../catalogs/components/UnitBadge';
import { MovementFormModal } from './components/MovementFormModal';
import { ControlBadge, StatusBadge } from './components/MovementBadges';
import { useMovementCatalogs } from './hooks/useMovementCatalogs';
import { useMovements } from './hooks/useMovements';
import { createMovement, deleteMovement, setMovementStatus, updateMovement } from './services/movement-service';
import type { MovementFormValues, MovementRow } from './types';

const ALL = '';

export function MovementsPage() {
  const { rows, loading, error, refetch } = useMovements();
  const catalogs = useMovementCatalogs();
  const [month, setMonth] = useState(currentMonth());
  const [recordType, setRecordType] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [unit, setUnit] = useState(ALL);
  const [onlyPending, setOnlyPending] = useState(false);
  const [editing, setEditing] = useState<MovementRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const months = useMemo(() => {
    const set = new Set(rows.map((r) => r.mes).filter(Boolean));
    set.add(currentMonth());
    return [...set].sort().reverse();
  }, [rows]);

  const filtered = rows.filter(
    (r) =>
      (month === ALL || r.mes === month) &&
      (recordType === ALL || r.record_type === recordType) &&
      (status === ALL || r.status === status) &&
      (unit === ALL || r.unitCode === unit) &&
      (!onlyPending || r.control !== 'OK' || r.status !== MOVEMENT_STATUS.VALIDADO),
  );
  const feeding = filtered.filter((r) => r.status === MOVEMENT_STATUS.VALIDADO && r.control === 'OK').length;
  const needsReview = filtered.filter((r) => r.control !== 'OK').length;

  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      await refetch();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo completar la acción.');
    }
  }

  const columns: Column<MovementRow>[] = [
    {
      key: 'code', header: 'Movimiento', mobile: 'title',
      render: (r) => (
        <div>
          <p className="bb-mono text-xs font-medium text-ink">{r.movement_code}</p>
          <p className="bb-mono text-[11px] text-ink-soft">{formatDateShort(r.movement_date)}</p>
        </div>
      ),
    },
    { key: 'type', header: 'Tipo', mobile: 'key', render: (r) => <span className="bb-mono text-[11px] text-ink">{r.record_type}</span> },
    { key: 'unit', header: 'Unidad', mobile: 'key', render: (r) => <UnitBadge code={r.unitCode} name={r.unitName} color={r.unitColor} showName={false} size="xs" /> },
    { key: 'dims', header: 'Área · Categoría', mobile: 'key', render: (r) => <span className="bb-mono text-xs text-ink">{r.areaCode} · {r.categoryCode}</span> },
    { key: 'class', header: 'Clase', mobile: 'detail', render: (r) => <span className="bb-mono text-xs text-ink">{r.expense_class}</span> },
    {
      key: 'detail', header: 'Detalle', mobile: 'detail',
      render: (r) => <span className="bb-body text-xs text-ink-soft">{[r.counterparty, r.detail, r.projectCode].filter(Boolean).join(' · ') || '—'}</span>,
    },
    { key: 'amount', header: 'Importe', mobile: 'highlight', className: 'text-right', render: (r) => <span className="bb-mono text-sm font-medium text-ink">{formatPen(r.amount)}</span> },
    {
      key: 'state', header: 'Estado / Control', mobile: 'key', mobileFull: true,
      render: (r) => (
        <div className="flex flex-wrap gap-1.5"><StatusBadge status={r.status} /><ControlBadge control={r.control} /></div>
      ),
    },
    {
      key: 'actions', header: 'Acciones', mobile: 'action',
      render: (r) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button type="button"
            onClick={() => void run(() => setMovementStatus(r.id, r.status === 'VALIDADO' ? 'BORRADOR' : 'VALIDADO'))}
            className="px-3 py-1.5 border border-line rounded-card bb-body text-xs hover:bg-canvas whitespace-nowrap">
            {r.status === 'VALIDADO' ? 'A borrador' : 'Validar'}
          </button>
          <button type="button" onClick={() => { setEditing(r); setShowForm(true); }}
            className="px-3 py-1.5 border border-line rounded-card bb-body text-xs hover:bg-canvas">
            Editar
          </button>
          {r.status === 'BORRADOR' && (
            <button type="button" onClick={() => void run(() => deleteMovement(r.id))}
              className="px-3 py-1.5 border border-line rounded-card bb-body text-xs text-rust hover:bg-canvas" aria-label={`Eliminar ${r.movement_code}`}>
              Eliminar
            </button>
          )}
        </div>
      ),
    },
  ];

  async function submit(values: MovementFormValues) {
    if (editing) await updateMovement(editing.id, values);
    else await createMovement(values);
    await refetch();
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
        <PageHeader
          title="Movimientos"
          subtitle="Libro único: una fila por evento. Solo VALIDADO con control OK alimenta presupuestos, resultados y caja."
          actions={
            <button type="button" onClick={() => { setEditing(null); setShowForm(true); }}
              className="flex items-center justify-center bg-gold text-ink px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-card bb-body text-sm font-semibold hover:bg-gold/90">
              + Registrar movimiento
            </button>
          }
        />

        {(error || catalogs.error) && <ErrorBanner message={(error ?? catalogs.error) as string} onRetry={() => void refetch()} />}
        {actionError && <ErrorBanner message={actionError} onClose={() => setActionError(null)} />}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <KpiCard label="Movimientos listados" value={String(filtered.length)} />
          <KpiCard label="Alimentan reportes" value={String(feeding)} subtext="VALIDADO + control OK" valueColor="text-belt-en_revision" />
          <KpiCard label="Con control ≠ OK" value={String(needsReview)} subtext="No alimentan reportes" valueColor={needsReview ? 'text-rust' : 'text-ink'} />
        </div>

        <Card className="mb-4" padding="p-3 sm:p-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <MonthSelect id="f-month" value={month} months={months} onChange={setMonth} includeAll />
            <div>
              <label className="bb-label" htmlFor="f-type">Tipo</label>
              <select id="f-type" className="bb-input !bg-paper" value={recordType} onChange={(e) => setRecordType(e.target.value)}>
                <option value={ALL}>Todos</option>
                {Object.values(RECORD_TYPE).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="bb-label" htmlFor="f-status">Estado</label>
              <select id="f-status" className="bb-input !bg-paper" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value={ALL}>Todos</option>
                <option value="BORRADOR">BORRADOR</option>
                <option value="VALIDADO">VALIDADO</option>
              </select>
            </div>
            <div>
              <label className="bb-label" htmlFor="f-unit">Unidad</label>
              <select id="f-unit" className="bb-input !bg-paper" value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value={ALL}>Todas</option>
                {catalogs.units.map((u) => <option key={u.id} value={u.code}>{u.code}</option>)}
              </select>
            </div>
            <label className="col-span-2 lg:col-span-1 flex items-center gap-2 bb-body text-sm text-ink min-h-[44px] sm:min-h-0 pb-1">
              <input type="checkbox" className="w-4 h-4 accent-ink" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
              Solo pendientes de revisión
            </label>
          </div>
        </Card>

        <Card padding="p-0" plainBelow="xl">
          {loading ? (
            <p className="bb-body text-ink-soft text-center py-12 text-sm">Cargando movimientos…</p>
          ) : (
            <DataTable
              columns={columns}
              rows={filtered}
              getRowKey={(r) => r.id}
              onRowClick={(r) => { setEditing(r); setShowForm(true); }}
              emptyMessage="No hay movimientos con estos filtros. Registra el primero con «+ Registrar movimiento»."
              cardsBelow="xl"
            />
          )}
        </Card>
      </div>

      {showForm && !catalogs.loading && (
        <MovementFormModal
          movement={editing}
          units={catalogs.units}
          areas={catalogs.areas}
          categories={catalogs.categories}
          projects={catalogs.projects}
          onSubmit={submit}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
