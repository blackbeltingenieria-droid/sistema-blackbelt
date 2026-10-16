// features/movements/components/QuickMovementModal.tsx
// Registro rápido: Ingreso o Egreso, monto, qué fue y si ya se pagó. Todo lo demás es opcional
// y se completa solo (unidad, área, categoría, clase). Traducción a Modelo C en domain/quick-entry.ts.

import { type FormEvent, useMemo, useState } from 'react';
import { ModalShell } from '../../../components/ui/ModalShell';
import { formatPen } from '../../../lib/format';
import type { ProjectRow } from '../../clients-projects/types';
import {
  CATEGORY_SHORT, EXPENSE_CATEGORY_CODES, findConcept, type ConceptMemory, PAYMENT_METHODS, projectIncomeFill, projectPaymentNote, resolveUnit, suggestCategoryCode, validateQuick,
  type QuickCatalogs, type QuickEntryInput, type QuickKind,
} from '../domain/quick-entry';
import { CORP_CODE } from '../domain/movement-rules';
import { laborCodeIn, withLaborTag } from '../../labor/domain/labor';

/** Contrato de mano de obra con saldo (para "¿Es pago a un colaborador?"). */
export interface LaborOption {
  code: string;
  worker: string;
  service: string;
  pending: number;
  unitId: number | null;      // null = toda la empresa
  projectId: number | null;
}

interface QuickMovementModalProps {
  catalogs: QuickCatalogs;
  initial?: QuickEntryInput;
  editingCode?: string;
  onSubmit: (input: QuickEntryInput) => Promise<void>;
  onClose: () => void;
  onAdvanced?: () => void;
  /** Solo al editar: elimina el registro (y su cobro/pago). */
  onDelete?: () => Promise<void>;
  /** Registros anteriores por concepto: escribir uno conocido rellena el resto. */
  memory?: Map<string, ConceptMemory>;
  /** Medio de pago usado la última vez (se propone por defecto). */
  defaultPaymentMethod?: string | null;
  /** Contratos de mano de obra: elegir uno rellena el pago con lo que falta. */
  laborOptions?: LaborOption[];
}

const FORM_ID = 'quick-movement-form';
const today = () => new Date().toISOString().slice(0, 10);

const chip = (active: boolean) =>
  `px-3 py-2 min-h-[40px] rounded-card border bb-body text-sm text-left transition-colors ${
    active ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink hover:border-ink-soft'
  }`;

export function QuickMovementModal({ catalogs, initial, editingCode, onSubmit, onClose, onAdvanced, onDelete, memory, defaultPaymentMethod = null, laborOptions = [] }: QuickMovementModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [v, setV] = useState<QuickEntryInput>(
    () => initial ?? {
      kind: 'EGRESO', date: today(), amount: 0, concept: '', settled: true, paymentMethod: defaultPaymentMethod,
      counterparty: null, unitId: null, projectId: null, categoryId: null,
    },
  );
  const [amountText, setAmountText] = useState(initial ? String(initial.amount) : '');
  const [showMore, setShowMore] = useState(Boolean(initial && (initial.unitId || initial.projectId || initial.counterparty)));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const isIncome = v.kind === 'INGRESO';
  const errors = validateQuick(v, catalogs);
  const commercialUnits = catalogs.units.filter((u) => u.code !== CORP_CODE);
  const expenseCategories = catalogs.categories.filter((c) => EXPENSE_CATEGORY_CODES.includes(c.code));
  const project: ProjectRow | undefined = v.projectId ? catalogs.projects.find((p) => p.id === v.projectId) : undefined;
  const unit = resolveUnit(v, catalogs);

  // Lo que falta pagar de un proyecto. Al editar un cobro ya guardado, se le suma ese mismo cobro.
  const pendingFor = (p: ProjectRow) =>
    p.pendingBalance + (editingCode && initial?.kind === 'INGRESO' && initial.settled && initial.projectId === p.id ? initial.amount : 0);
  const incomeProjects = [...catalogs.projects]
    .filter((p) => p.status !== 'cancelado' || p.id === v.projectId)
    .sort((a, b) => Number(pendingFor(b) > 0) - Number(pendingFor(a) > 0) || pendingFor(b) - pendingFor(a));
  const paymentNote = isIncome && project && v.settled ? projectPaymentNote(pendingFor(project), v.amount) : null;
  // Editando un cobro ya guardado de este proyecto: sus cifras ya lo cuentan como pagado.
  const includesThis = Boolean(project && editingCode && initial?.kind === 'INGRESO' && initial.settled && initial.projectId === project.id);
  function fillFromProject(p: ProjectRow) {
    const f = projectIncomeFill(p, pendingFor(p));
    setAmountText(String(f.amount));
    setV((prev) => ({
      ...prev, projectId: p.id, unitId: f.unitId, amount: f.amount, settled: true,
      concept: prev.concept.trim() ? prev.concept : f.concept,
      counterparty: prev.counterparty ?? f.counterparty,
    }));
  }

  // Egreso: ¿pago a un colaborador? (Mano de obra). Al editar uno ya enlazado, su monto vuelve a contar como "falta".
  const laborCode = laborCodeIn(v.notes);
  const initialLabor = laborCodeIn(initial?.notes);
  const laborPending = (o: LaborOption) => o.pending + (editingCode && initialLabor === o.code && initial ? initial.amount : 0);
  const laborList = laborOptions.filter((o) => laborPending(o) > 0 || o.code === laborCode);
  const labor = laborCode ? laborOptions.find((o) => o.code === laborCode) : undefined;
  const moId = catalogs.categories.find((c) => c.code === 'MO')?.id ?? null;
  function chooseLabor(code: string) {
    const o = laborOptions.find((x) => x.code === code);
    if (!o) { patch({ notes: withLaborTag(v.notes, null) }); return; }
    const amount = v.amount > 0 ? v.amount : Math.round(laborPending(o) * 100) / 100;
    setAmountText(String(amount));
    setV((prev) => ({
      ...prev, amount, notes: withLaborTag(prev.notes, o.code), categoryId: moId, unitId: o.unitId, projectId: o.projectId,
      counterparty: o.worker, concept: prev.concept.trim() ? prev.concept : `Pago a ${o.worker} – ${o.service}`,
    }));
  }
  const laborLeft = labor ? Math.round((laborPending(labor) - v.amount) * 100) / 100 : null;

  const suggested = useMemo(() => suggestCategoryCode(v.concept), [v.concept]);
  const chosenCategory = v.categoryId ? catalogs.categories.find((c) => c.id === v.categoryId) : undefined;
  const categoryCode = chosenCategory?.code ?? suggested ?? 'OTR';

  const patch = (changes: Partial<QuickEntryInput>) => setV((prev) => ({ ...prev, ...changes }));

  // Repetir un registro conocido: al escribir un concepto ya usado, se rellena con lo de la última vez.
  const [filledFrom, setFilledFrom] = useState<string | null>(null);
  const conceptOptions = memory
    ? [...memory.values()].filter((m) => m.kind === v.kind).map((m) => m.concept).slice(0, 40)
    : [];
  // Solo se rellena lo que la persona aún no eligió: nunca se pisa un proyecto, unidad, categoría,
  // monto o medio de pago que ya puso a mano.
  const [methodTouched, setMethodTouched] = useState(Boolean(initial));
  function onConcept(text: string) {
    const m = !editingCode && memory ? findConcept(memory, text) : undefined;
    if (!m || m.kind !== v.kind) { patch({ concept: text }); setFilledFrom(null); return; }
    const destinationChosen = v.projectId !== null || v.unitId !== null;
    const projectRow = !destinationChosen && m.projectId ? catalogs.projects.find((p) => p.id === m.projectId) : undefined;
    const useAmount = !(v.amount > 0) && !(m.kind === 'INGRESO' && projectRow);
    const useCategory = v.categoryId === null && m.categoryId !== null;
    const useMethod = !methodTouched && m.paymentMethod !== null;
    if (useAmount) setAmountText(String(m.amount));
    setV((prev) => ({
      ...prev, concept: text,
      amount: useAmount ? m.amount : prev.amount,
      ...(destinationChosen ? {} : { unitId: m.unitId, projectId: m.projectId }),
      categoryId: useCategory ? m.categoryId : prev.categoryId,
      paymentMethod: useMethod ? m.paymentMethod : prev.paymentMethod,
      counterparty: prev.counterparty ?? m.counterparty,
    }));
    if (m.kind === 'INGRESO' && projectRow && pendingFor(projectRow) > 0 && !(v.amount > 0)) fillFromProject(projectRow);
    const cat = useCategory ? catalogs.categories.find((c) => c.id === m.categoryId) : undefined;
    const parts = [
      useAmount ? formatPen(m.amount) : null,
      m.kind === 'EGRESO' && cat ? (CATEGORY_SHORT[cat.code] ?? cat.name) : null,
      destinationChosen ? null : (m.unitId ? catalogs.units.find((u) => u.id === m.unitId)?.name : 'toda la empresa'),
      useMethod ? m.paymentMethod : null,
    ].filter(Boolean);
    setFilledFrom(parts.length ? `Rellené con lo de la última vez: ${parts.join(' · ')}. Revisa y guarda.` : null);
  }
  const setKind = (kind: QuickKind) => patch({ kind, categoryId: null });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    const first = Object.values(errors)[0];
    if (first) { setError(first); if (errors.unit) setShowMore(true); return; }
    setSubmitting(true);
    try {
      await onSubmit(v);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setSubmitting(false);
    }
  }

  const who = isIncome
    ? (unit && unit.code !== CORP_CODE ? unit.name : 'falta elegir la unidad')
    : (unit && unit.code !== CORP_CODE ? unit.name : 'toda la empresa');
  const summary = `${isIncome ? 'Ingreso' : 'Egreso'} de ${v.amount > 0 ? formatPen(v.amount) : 'S/ —'} · ${who}${
    isIncome ? '' : ` · ${CATEGORY_SHORT[categoryCode] ?? 'Otros'}`
  }${project ? ` · ${project.code ?? project.projectName}` : ''} · ${
    v.settled ? (isIncome ? 'ya cobrado' : 'ya pagado') : (isIncome ? 'por cobrar' : 'por pagar')
  }`;

  return (
    <ModalShell
      title={editingCode ? 'Editar registro' : 'Registrar'}
      subtitle={editingCode ?? '¿Entró o salió dinero?'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting}
            className="flex-1 min-h-[44px] sm:min-h-0 py-2.5 border border-line rounded-card bb-body text-sm text-ink-soft hover:text-ink">
            Cancelar
          </button>
          <button type="submit" form={FORM_ID} disabled={submitting}
            className="flex-1 min-h-[44px] sm:min-h-0 py-2.5 bg-gold text-ink rounded-card bb-body text-sm font-semibold hover:bg-gold/90 disabled:opacity-50">
            {submitting ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* 1. Tipo */}
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de registro">
          {(['INGRESO', 'EGRESO'] as const).map((k) => {
            const active = v.kind === k;
            const color = k === 'INGRESO' ? 'border-belt-en_revision bg-belt-en_revision' : 'border-rust bg-rust';
            return (
              <button key={k} type="button" aria-pressed={active} data-testid={`quick-kind-${k.toLowerCase()}`}
                onClick={() => setKind(k)}
                className={`min-h-[56px] rounded-card border-2 px-3 py-2 text-left transition-colors ${active ? `${color} text-paper` : 'border-line bg-paper text-ink'}`}>
                <span className="block bb-display text-base font-semibold">{k === 'INGRESO' ? '↑ Ingreso' : '↓ Egreso'}</span>
                <span className={`block bb-body text-xs ${active ? 'text-paper' : 'text-ink-soft'}`}>
                  {k === 'INGRESO' ? 'Entró dinero / vendí' : 'Salió dinero / gasté'}
                </span>
              </button>
            );
          })}
        </div>

        {/* 1b. Ingreso: ¿pago de un proyecto? (rellena solo lo que falta) */}
        {isIncome && (
          <div className="bg-canvas rounded-card p-3 space-y-2">
            <label className="bb-label" htmlFor="q-income-project">¿Es el pago de un proyecto?</label>
            <select id="q-income-project" className="bb-input !bg-paper" value={v.projectId ?? ''}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                const p = id ? catalogs.projects.find((x) => x.id === id) : undefined;
                if (p && pendingFor(p) > 0 && !(v.amount > 0)) fillFromProject(p);
                else patch({ projectId: id, unitId: p ? p.businessUnitId : v.unitId });
              }}>
              <option value="">No, es otra venta</option>
              {incomeProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ?? `#${p.id}`} · {p.projectName} ({p.clientName}) — {p.pendingBalance > 0 ? `falta ${formatPen(p.pendingBalance)}` : 'pagado'}
                </option>
              ))}
            </select>
            {project && (
              <div className="bg-paper border border-line rounded-card p-3" data-testid="project-balance">
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 sm:text-center">
                  {/* Lo que dice el proyecto HOY (si se está editando un cobro, ya lo incluye). */}
                  {([
                    ['Contrato', project.contractedAmount, 'text-ink'],
                    ['Ya pagó', project.contractedAmount - project.pendingBalance, 'text-belt-en_revision'],
                    ['Falta', project.pendingBalance, project.pendingBalance > 0 ? 'text-rust font-semibold' : 'text-ink font-semibold'],
                  ] as const).map(([label, value, color]) => (
                    <div key={label} className="flex sm:block justify-between items-baseline gap-2">
                      <dt className="bb-label-xs text-ink-soft">{label}</dt>
                      <dd className={`bb-mono text-sm whitespace-nowrap ${color}`}>{formatPen(value)}</dd>
                    </div>
                  ))}
                </dl>
                {includesThis && (
                  <p className="bb-body text-xs text-ink-soft mt-2" data-testid="project-includes-this">Ya incluye este cobro de {formatPen(initial?.amount ?? 0)}.</p>
                )}
                {!includesThis && pendingFor(project) > 0 && v.amount !== pendingFor(project) && (
                  <button type="button" data-testid="fill-pending" onClick={() => fillFromProject(project)}
                    className="w-full mt-3 min-h-[44px] sm:min-h-[38px] bg-gold text-ink rounded-card bb-body text-sm font-semibold">
                    Cobrar lo que falta: {formatPen(pendingFor(project))}
                  </button>
                )}
                {paymentNote && (
                  <p className={`bb-body text-xs mt-2 ${paymentNote.tone === 'warn' ? 'text-rust' : 'text-ink-soft'}`} data-testid="project-payment-note">{paymentNote.text}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 1c. Egreso: ¿pago a un colaborador? (rellena con lo que falta pagarle) */}
        {!isIncome && laborList.length > 0 && (
          <div className="bg-canvas rounded-card p-3 space-y-1">
            <label className="bb-label" htmlFor="q-labor">¿Es pago a un colaborador? <span className="text-ink-soft font-normal">— opcional</span></label>
            <select id="q-labor" className="bb-input !bg-paper" value={laborCode ?? ''} onChange={(e) => chooseLabor(e.target.value)}>
              <option value="">No</option>
              {laborList.map((o) => (
                <option key={o.code} value={o.code}>{o.worker} · {o.service} — {o.pending > 0 ? `falta ${formatPen(o.pending)}` : 'pagado'}</option>
              ))}
            </select>
            {labor && laborLeft !== null && (
              <p className={`bb-body text-xs ${laborLeft < 0 ? 'text-rust' : 'text-ink-soft'}`} data-testid="labor-note">
                {laborLeft < 0 ? `Es más de lo que falta pagarle (${formatPen(laborPending(labor))}).`
                  : laborLeft === 0 ? 'Con este pago queda todo pagado.' : `Después de este pago faltarán ${formatPen(laborLeft)}.`}
              </p>
            )}
          </div>
        )}

        {/* 3. Qué fue */}
        <div>
          <label className="bb-label" htmlFor="q-concept">¿Qué fue?</label>
          <input id="q-concept" className="bb-input" value={v.concept}
            placeholder={isIncome ? 'Ej.: Cuota del cliente por la tesis' : 'Ej.: Bitel, Canva, pago a especialista'}
            list="q-concepts" autoComplete="off"
            onChange={(e) => onConcept(e.target.value)} />
          <datalist id="q-concepts">
            {conceptOptions.map((c) => <option key={c} value={c} />)}
          </datalist>
          {filledFrom && (
            <p className="bb-body text-xs text-belt-en_revision mt-1" data-testid="quick-memory">✓ {filledFrom}</p>
          )}
          {touched && errors.concept && <p className="bb-body text-xs text-rust mt-1">{errors.concept}</p>}
          {!isIncome && v.concept.trim() && !v.categoryId && (
            <p className="bb-body text-xs text-ink-soft mt-1" data-testid="quick-suggestion">
              Se guardará en: <strong className="text-ink">{CATEGORY_SHORT[categoryCode]}</strong>
              {suggested ? '' : ' (puedes elegir otra abajo)'}
            </p>
          )}
        </div>

        {/* 2. Monto y fecha */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="bb-label" htmlFor="q-amount">Monto (S/)</label>
            <input id="q-amount" className="bb-input bb-mono text-lg" inputMode="decimal" placeholder="0.00" autoFocus
              value={amountText}
              onChange={(e) => { setAmountText(e.target.value); patch({ amount: Number(e.target.value.replace(',', '.')) }); }} />
            {touched && errors.amount && <p className="bb-body text-xs text-rust mt-1">{errors.amount}</p>}
          </div>
          <div>
            <label className="bb-label" htmlFor="q-date">Fecha</label>
            <input id="q-date" type="date" className="bb-input" value={v.date} onChange={(e) => patch({ date: e.target.value })} />
          </div>
        </div>

        {/* 4. Unidad (obligatoria solo para ingresos) */}
        {isIncome && !v.projectId && (
          <div>
            <p className="bb-label">¿Qué unidad vendió?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {commercialUnits.map((u) => (
                <button key={u.id} type="button" aria-pressed={unit?.id === u.id && !v.projectId}
                  onClick={() => patch({ unitId: u.id, projectId: null })} className={chip(unit?.id === u.id)}>
                  <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ backgroundColor: u.color }} />
                  {u.name}
                </button>
              ))}
            </div>
            {touched && errors.unit && <p className="bb-body text-xs text-rust mt-1">{errors.unit}</p>}
          </div>
        )}

        {/* 5. ¿Ya se pagó? */}
        <div>
          <p className="bb-label">{isIncome ? '¿Ya te pagaron?' : '¿Ya lo pagaste?'}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={v.settled} onClick={() => patch({ settled: true })} className={chip(v.settled)}>
              Sí, {isIncome ? 'ya entró el dinero' : 'ya salió el dinero'}
            </button>
            <button type="button" aria-pressed={!v.settled} onClick={() => patch({ settled: false })} className={chip(!v.settled)}>
              No, {isIncome ? 'me deben' : 'lo debo'}
            </button>
          </div>
        </div>

        {/* 6. Medio de pago (opcional) */}
        {v.settled && (
          <div>
            <p className="bb-label">Medio de pago <span className="text-ink-soft font-normal">— opcional</span></p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button key={m} type="button" aria-pressed={v.paymentMethod === m}
                  onClick={() => { setMethodTouched(true); patch({ paymentMethod: v.paymentMethod === m ? null : m }); }} className={chip(v.paymentMethod === m)}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 7. Clasificar (opcional) */}
        <div className="border-t border-line pt-4">
          <button type="button" onClick={() => setShowMore((s) => !s)} aria-expanded={showMore}
            className="bb-body text-sm font-semibold text-ink underline underline-offset-4" data-testid="quick-more">
            {showMore ? '− Ocultar detalles' : '+ Más detalles (opcional)'}
          </button>
          {showMore && (
            <div className="space-y-4 mt-4">
              {!isIncome && (
                <div>
                  <p className="bb-label">¿Para quién es el gasto?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button type="button" aria-pressed={!v.unitId && !v.projectId} onClick={() => patch({ unitId: null, projectId: null })}
                      className={chip(!v.unitId && !v.projectId)}>
                      Toda la empresa
                    </button>
                    {commercialUnits.map((u) => (
                      <button key={u.id} type="button" aria-pressed={v.unitId === u.id && !v.projectId}
                        onClick={() => patch({ unitId: u.id, projectId: null })} className={chip(v.unitId === u.id && !v.projectId)}>
                        <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ backgroundColor: u.color }} />
                        Solo {u.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isIncome && <div>
                <label className="bb-label" htmlFor="q-project">Proyecto <span className="text-ink-soft font-normal">— opcional</span></label>
                <select id="q-project" className="bb-input" value={v.projectId ?? ''}
                  onChange={(e) => patch({ projectId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">Ninguno</option>
                  {catalogs.projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.code ?? `#${p.id}`} · {p.projectName} ({p.clientName})</option>
                  ))}
                </select>
                {project && <p className="bb-body text-xs text-ink-soft mt-1">Se asigna a {project.businessUnitName}.</p>}
              </div>}

              {!isIncome && (
                <div>
                  <p className="bb-label">¿En qué se gastó?</p>
                  <div className="flex flex-wrap gap-2">
                    {expenseCategories.map((c) => {
                      const active = categoryCode === c.code;
                      return (
                        <button key={c.id} type="button" aria-pressed={active}
                          onClick={() => patch({ categoryId: c.id })} className={chip(active)}>
                          {CATEGORY_SHORT[c.code] ?? c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="bb-label" htmlFor="q-cp">{isIncome ? '¿Quién pagó? (cliente)' : '¿A quién se pagó? (proveedor)'} <span className="text-ink-soft font-normal">— opcional</span></label>
                <input id="q-cp" className="bb-input" value={v.counterparty ?? ''} onChange={(e) => patch({ counterparty: e.target.value || null })} />
              </div>
            </div>
          )}
        </div>

        <p className="bb-body text-xs text-ink-soft bg-canvas rounded-card px-3 py-2" data-testid="quick-summary">{summary}</p>

        {onAdvanced && !editingCode && (
          <p className="bb-body text-xs text-ink-soft">
            ¿Aporte o retiro de socio, o compra de un equipo?{' '}
            <button type="button" onClick={onAdvanced} className="underline text-ink">Usa el formulario completo</button>
          </p>
        )}

        {onDelete && (
          <div className="border-t border-line pt-3">
            {confirmDelete ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="bb-body text-sm text-ink">¿Eliminar este registro? Se quitará de todos los reportes.</span>
                <button type="button" className="px-3 py-1.5 bg-rust text-paper rounded-card bb-body text-xs font-semibold"
                  onClick={async () => {
                    try { await onDelete(); onClose(); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo eliminar.'); }
                  }}>
                  Sí, eliminar
                </button>
                <button type="button" className="px-3 py-1.5 border border-line rounded-card bb-body text-xs" onClick={() => setConfirmDelete(false)}>No</button>
              </div>
            ) : (
              <button type="button" className="bb-body text-xs text-rust underline" onClick={() => setConfirmDelete(true)}>Eliminar registro</button>
            )}
          </div>
        )}

        {error && <p role="alert" className="bb-body text-sm text-rust">{error}</p>}
      </form>
    </ModalShell>
  );
}
