// features/movements/MovementsPage.tsx
// Ingresos y egresos. Vista simple por defecto: una fila por evento (el pago/cobro enlazado va
// dentro), registro rápido y explicaciones en palabras simples. La "Vista contable" muestra
// todas las filas del libro único del Modelo C, como antes.

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { QuickMovementModal } from './components/QuickMovementModal';
import { isEligible } from './domain/movement-rules';
import {
  CONTROL_HELP, SIMPLE_TYPE, buildConceptMemory, groupEvents, lastPaymentMethod, isQuickEditable, projectIncomeFill, quickInputFromMovement,
  type EventGroup, type QuickCatalogs, type QuickEntryInput,
} from './domain/quick-entry';
import { useMovementCatalogs } from './hooks/useMovementCatalogs';
import { useMovements } from './hooks/useMovements';
import {
  createMovement, createQuickMovement, deleteMovement, deleteQuickEvent, setEventStatus, setMovementStatus,
  updateMovement, updateQuickMovement,
} from './services/movement-service';
import type { MovementFormValues, MovementRow } from './types';

const ALL = '';
type Event = EventGroup<MovementRow>;
type Modal =
  | { kind: 'none' }
  | { kind: 'quick'; event: Event | null; prefill?: QuickEntryInput }
  | { kind: 'full'; movement: MovementRow | null };

const btn = 'px-3 py-1.5 min-h-[36px] border border-line rounded-card bb-body text-xs hover:bg-canvas whitespace-nowrap';

export function MovementsPage() {
  const { rows, loading, error, refetch } = useMovements();
  const catalogs = useMovementCatalogs();
  const [month, setMonth] = useState(currentMonth());
  const [view, setView] = useState<'simple' | 'contable'>('simple');
  const [kindFilter, setKindFilter] = useState<'' | 'in' | 'out'>(ALL);
  const [onlyPending, setOnlyPending] = useState(false);
  const [modal, setModal] = useState<Modal>({ kind: 'none' });
  const [actionError, setActionError] = useState<string | null>(null);
  // filtros de la vista contable
  const [recordType, setRecordType] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [unit, setUnit] = useState(ALL);

  // "Registrar pago" desde Clientes y Proyectos: abre el formulario ya lleno con lo que falta pagar.
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const id = Number(params.get('cobrar'));
    if (!id || catalogs.loading) return;
    const p = catalogs.projects.find((x) => x.id === id);
    if (p) {
      const f = projectIncomeFill(p, p.pendingBalance);
      setModal({
        kind: 'quick', event: null,
        prefill: {
          kind: 'INGRESO', date: new Date().toISOString().slice(0, 10), amount: f.amount, concept: f.concept, settled: true,
          paymentMethod: null, counterparty: f.counterparty, unitId: f.unitId, projectId: p.id, categoryId: null,
        },
      });
    }
    setParams({}, { replace: true });
  }, [params, catalogs.loading, catalogs.projects, setParams]);

  const quickCatalogs: QuickCatalogs = {
    units: catalogs.units, areas: catalogs.areas, categories: catalogs.categories, projects: catalogs.projects,
  };

  const months = useMemo(() => {
    const set = new Set(rows.map((r) => r.mes).filter(Boolean));
    set.add(currentMonth());
    return [...set].sort().reverse();
  }, [rows]);

  const corpId = catalogs.units.find((u) => u.code === 'CORP')?.id;
  const memory = useMemo(() => buildConceptMemory(rows, corpId), [rows, corpId]);
  const defaultPayment = useMemo(() => lastPaymentMethod(rows), [rows]);

  const monthRows = rows.filter((r) => month === ALL || r.mes === month);
  const events = useMemo(() => groupEvents(monthRows), [monthRows]);
  const counts = (e: Event) => isEligible(e.main);
  const visibleEvents = events.filter(
    (e) =>
      (kindFilter === ALL || (kindFilter === 'in' ? SIMPLE_TYPE[e.main.record_type].sign > 0 : SIMPLE_TYPE[e.main.record_type].sign < 0)) &&
      (!onlyPending || !counts(e)),
  );
  const entered = events.filter((e) => counts(e) && e.main.record_type === RECORD_TYPE.INGRESO_RECONOCIDO).reduce((a, e) => a + e.main.amount, 0);
  const spent = events.filter((e) => counts(e) && e.main.record_type === RECORD_TYPE.COSTO_RECONOCIDO).reduce((a, e) => a + e.main.amount, 0);
  const notCounting = events.filter((e) => !counts(e)).length;

  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      await refetch();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo completar la acción.');
    }
  }

  const idsOf = (e: Event) => [e.main.id, ...(e.pair ? [e.pair.id] : [])];
  const openEvent = (e: Event) =>
    setModal(isQuickEditable(e.main.record_type) ? { kind: 'quick', event: e } : { kind: 'full', movement: e.main });

  const simpleColumns: Column<Event>[] = [
    {
      key: 'what', header: 'Qué fue', mobile: 'title',
      render: (e) => (
        <div>
          <p className="bb-body text-sm font-medium text-ink">{e.main.detail || e.main.counterparty || SIMPLE_TYPE[e.main.record_type].label}</p>
          <p className="bb-mono text-[11px] text-ink-soft">{formatDateShort(e.main.movement_date)} · {e.main.movement_code}</p>
        </div>
      ),
    },
    {
      key: 'kind', header: 'Tipo', mobile: 'key',
      render: (e) => {
        const t = SIMPLE_TYPE[e.main.record_type];
        return <span className={`bb-body text-xs font-semibold whitespace-nowrap ${t.sign > 0 ? 'text-belt-en_revision' : 'text-rust'}`}>{t.sign > 0 ? '↑' : '↓'} {t.label}</span>;
      },
    },
    {
      key: 'for', header: 'Para', mobile: 'key',
      render: (e) => e.main.unitCode === 'CORP'
        ? <span className="bb-body text-xs text-ink">Toda la empresa</span>
        : (
          <span className="bb-body text-xs text-ink">
            <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" style={{ backgroundColor: e.main.unitColor }} />
            {e.main.unitName}
          </span>
        ),
    },
    {
      key: 'amount', header: 'Monto', mobile: 'highlight', className: 'text-right',
      render: (e) => {
        const sign = SIMPLE_TYPE[e.main.record_type].sign;
        return <span className={`bb-mono text-sm font-semibold whitespace-nowrap ${sign > 0 ? 'text-belt-en_revision' : 'text-rust'}`}>{sign > 0 ? '+' : '−'} {formatPen(e.main.amount)}</span>;
      },
    },
    {
      key: 'state', header: 'Estado', mobile: 'key', mobileFull: true,
      render: (e) => <EventState event={e} />,
    },
    {
      key: 'actions', header: '', mobile: 'action',
      render: (e) => (
        <div className="flex flex-wrap gap-2" onClick={(ev) => ev.stopPropagation()}>
          <button type="button" className={btn} onClick={() => openEvent(e)}>Editar</button>
          {e.main.status === MOVEMENT_STATUS.BORRADOR && e.main.control === 'OK' && (
            <button type="button" className={btn} onClick={() => void run(() => setEventStatus(idsOf(e), MOVEMENT_STATUS.VALIDADO))}>Validar</button>
          )}
        </div>
      ),
    },
  ];

  const accountingColumns: Column<MovementRow>[] = [
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
      render: (r) => <div className="flex flex-wrap gap-1.5"><StatusBadge status={r.status} /><ControlBadge control={r.control} /></div>,
    },
    {
      key: 'actions', header: 'Acciones', mobile: 'action',
      render: (r) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button type="button" className={btn}
            onClick={() => void run(() => setMovementStatus(r.id, r.status === 'VALIDADO' ? 'BORRADOR' : 'VALIDADO'))}>
            {r.status === 'VALIDADO' ? 'A borrador' : 'Validar'}
          </button>
          <button type="button" className={btn} onClick={() => setModal({ kind: 'full', movement: r })}>Editar</button>
          {r.status === 'BORRADOR' && (
            <button type="button" className={`${btn} text-rust`} aria-label={`Eliminar ${r.movement_code}`}
              onClick={() => void run(() => deleteMovement(r.id))}>
              Eliminar
            </button>
          )}
        </div>
      ),
    },
  ];
  const accountingRows = monthRows.filter(
    (r) => (recordType === ALL || r.record_type === recordType) && (status === ALL || r.status === status) && (unit === ALL || r.unitCode === unit),
  );

  async function submitQuick(input: QuickEntryInput) {
    if (modal.kind === 'quick' && modal.event) await updateQuickMovement(modal.event.main, modal.event.pair, input, quickCatalogs);
    else await createQuickMovement(input, quickCatalogs);
    await refetch();
    catalogs.refetch();
  }
  async function submitFull(values: MovementFormValues) {
    if (modal.kind === 'full' && modal.movement) await updateMovement(modal.movement.id, values);
    else await createMovement(values);
    await refetch();
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
        <PageHeader
          title="Ingresos y egresos"
          subtitle="Registra lo que entró y salió. Lo demás se completa solo."
          actions={
            <button type="button" onClick={() => setModal({ kind: 'quick', event: null })} data-testid="quick-open"
              className="flex items-center justify-center bg-gold text-ink px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-card bb-body text-sm font-semibold hover:bg-gold/90">
              + Registrar
            </button>
          }
        />

        {(error || catalogs.error) && <ErrorBanner message={(error ?? catalogs.error) as string} onRetry={() => void refetch()} />}
        {actionError && <ErrorBanner message={actionError} onClose={() => setActionError(null)} />}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
          <KpiCard label="Ingresos del mes" value={formatPen(entered)} valueColor="text-belt-en_revision" subtext="Lo que vendiste" />
          <KpiCard label="Egresos del mes" value={formatPen(spent)} valueColor="text-rust" subtext="Lo que gastaste" />
          <KpiCard label="No cuentan todavía" value={String(notCounting)} valueColor={notCounting ? 'text-rust' : 'text-ink'}
            subtext={notCounting ? 'Revísalos: falta validar o corregir' : 'Todo está contando'} />
        </div>

        <Card className="mb-4" padding="p-3 sm:p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <MonthSelect id="f-month" value={month} months={months} onChange={setMonth} includeAll />
            {view === 'simple' ? (
              <>
                <div>
                  <label className="bb-label" htmlFor="f-kind">Mostrar</label>
                  <select id="f-kind" className="bb-input !bg-paper" value={kindFilter} onChange={(e) => setKindFilter(e.target.value as '' | 'in' | 'out')}>
                    <option value={ALL}>Todo</option>
                    <option value="in">Solo ingresos</option>
                    <option value="out">Solo egresos</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 bb-body text-sm text-ink min-h-[44px] sm:min-h-0 pb-1">
                  <input type="checkbox" className="w-4 h-4 accent-ink" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
                  Solo los que no cuentan
                </label>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" className="bb-body text-xs text-ink-soft underline" data-testid="toggle-view"
              onClick={() => setView(view === 'simple' ? 'contable' : 'simple')}>
              {view === 'simple' ? 'Ver vista contable (todas las filas)' : 'Volver a la vista simple'}
            </button>
          </div>
        </Card>

        <Card padding="p-0" plainBelow="xl">
          {loading ? (
            <p className="bb-body text-ink-soft text-center py-12 text-sm">Cargando…</p>
          ) : view === 'simple' ? (
            <DataTable
              columns={simpleColumns}
              rows={visibleEvents}
              getRowKey={(e) => e.main.id}
              onRowClick={openEvent}
              emptyMessage="No hay registros este mes. Pulsa «+ Registrar» para agregar el primero."
              cardsBelow="xl"
            />
          ) : (
            <DataTable
              columns={accountingColumns}
              rows={accountingRows}
              getRowKey={(r) => r.id}
              onRowClick={(r) => setModal({ kind: 'full', movement: r })}
              emptyMessage="No hay movimientos con estos filtros."
              cardsBelow="xl"
            />
          )}
        </Card>
      </div>

      {modal.kind === 'quick' && !catalogs.loading && (
        <QuickMovementModal
          catalogs={quickCatalogs}
          initial={modal.event ? quickInputFromMovement(modal.event.main, Boolean(modal.event.pair), quickCatalogs) : modal.prefill}
          editingCode={modal.event?.main.movement_code}
          memory={memory}
          defaultPaymentMethod={defaultPayment}
          onSubmit={submitQuick}
          onClose={() => setModal({ kind: 'none' })}
          onAdvanced={() => setModal({ kind: 'full', movement: null })}
          onDelete={modal.event ? async () => {
            const ev = modal.event as Event;
            await deleteQuickEvent(ev.main, ev.pair);
            await refetch();
            catalogs.refetch();
          } : undefined}
        />
      )}
      {modal.kind === 'full' && !catalogs.loading && (
        <MovementFormModal
          movement={modal.movement}
          units={catalogs.units}
          areas={catalogs.areas}
          categories={catalogs.categories}
          projects={catalogs.projects}
          onSubmit={submitFull}
          onClose={() => setModal({ kind: 'none' })}
        />
      )}
    </div>
  );
}

/** Estado en palabras: si cuenta, si ya se pagó y, si no cuenta, por qué. */
function EventState({ event: e }: { event: Event }) {
  const counts = isEligible(e.main);
  const isIncome = e.main.record_type === RECORD_TYPE.INGRESO_RECONOCIDO;
  const settledLabel = e.pair ? (isIncome ? 'Cobrado' : 'Pagado') : null;
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5">
        <span className={`inline-flex rounded-full px-2 py-0.5 bb-body text-[11px] font-medium ${counts ? 'bg-belt-en_revision text-paper' : 'bg-belt-por_hacer text-ink'}`}>
          {counts ? '✓ Cuenta' : e.main.control === 'OK' ? 'Borrador' : 'Revisar'}
        </span>
        {settledLabel && (
          <span className="inline-flex rounded-full px-2 py-0.5 bb-body text-[11px] font-medium bg-canvas text-ink border border-line">{settledLabel}</span>
        )}
      </div>
      {!counts && (
        <p className="bb-body text-[11px] text-ink-soft max-w-[260px]">
          {e.main.control === 'OK' ? 'Pulsa «Validar» para que cuente.' : CONTROL_HELP[e.main.control]}
        </p>
      )}
    </div>
  );
}
