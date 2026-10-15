// features/movements/components/MovementFormModal.tsx
// Alta y edición de un movimiento (ModalShell: hoja a pantalla completa en mobile).
// Las 4 dimensiones van separadas: unidad beneficiaria, área gestora, categoría y clase.

import { type FormEvent, useMemo, useState } from 'react';
import { ModalShell } from '../../../components/ui/ModalShell';
import { EXPENSE_CLASS, RECORD_TYPE } from '../../../types/database';
import type { Area, BusinessUnit, CostCategory } from '../../catalogs/types';
import type { ProjectRow } from '../../clients-projects/types';
import { emptyMovementForm, suggestClass } from '../domain/movement-form-defaults';
import { computeControl, computeMes } from '../domain/movement-rules';
import { validateMovementForm } from '../domain/movement-validation';
import type { ExpenseClass, MovementFormValues, MovementRow, RecordType } from '../types';
import { ControlBadge } from './MovementBadges';

interface MovementFormModalProps {
  movement?: MovementRow | null;
  units: BusinessUnit[];
  areas: Area[];
  categories: CostCategory[];
  projects: ProjectRow[];
  onSubmit: (values: MovementFormValues) => Promise<void>;
  onClose: () => void;
}

const FORM_ID = 'movement-form';
const RECORD_LABEL: Record<RecordType, string> = {
  INGRESO_RECONOCIDO: 'Ingreso reconocido (devengado)',
  COSTO_RECONOCIDO: 'Costo reconocido (devengado)',
  COBRO: 'Cobro (entra dinero)',
  PAGO: 'Pago (sale dinero)',
  APORTE_SOCIO: 'Aporte de socio',
  RETIRO_SOCIO: 'Retiro de socio',
  COMPRA_ACTIVO: 'Compra de activo',
};
const CLASS_OPTIONS: ExpenseClass[] = [EXPENSE_CLASS.DIRECTO, EXPENSE_CLASS.ATRIBUIBLE, EXPENSE_CLASS.COMPARTIDO];

function toValues(m: MovementRow): MovementFormValues {
  return {
    movement_date: m.movement_date, record_type: m.record_type, amount: m.amount,
    business_unit_id: m.business_unit_id, area_id: m.area_id, responsible: m.responsible,
    cost_category_id: m.cost_category_id, expense_class: m.expense_class, project_id: m.project_id,
    counterparty: m.counterparty, detail: m.detail, payment_method: m.payment_method,
    voucher_number: m.voucher_number, status: m.status, notes: m.notes,
  };
}

export function MovementFormModal({ movement, units, areas, categories, projects, onSubmit, onClose }: MovementFormModalProps) {
  const corpId = units.find((u) => u.code === 'CORP')?.id ?? 0;
  const [v, setV] = useState<MovementFormValues>(
    () => (movement ? toValues(movement) : emptyMovementForm(corpId, new Date().toISOString().slice(0, 10))),
  );
  const [amountText, setAmountText] = useState(movement ? String(movement.amount) : '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unitCode = units.find((u) => u.id === v.business_unit_id)?.code ?? '';
  const isCost = v.record_type === RECORD_TYPE.COSTO_RECONOCIDO;
  const errors = validateMovementForm(v);

  const control = useMemo(
    () => computeControl({ movement_code: movement?.movement_code ?? 'NUEVO', ...v }, unitCode),
    [v, unitCode, movement],
  );

  function patch(changes: Partial<MovementFormValues>) {
    setV((prev) => {
      const next = { ...prev, ...changes };
      const code = units.find((u) => u.id === next.business_unit_id)?.code ?? '';
      next.expense_class = suggestClass(next.record_type, code, next.project_id !== null, next.expense_class);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (Object.keys(errors).length) { setError(Object.values(errors)[0] ?? null); return; }
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

  const generalAreas = areas.filter((a) => a.type === 'General');
  const specificAreas = areas.filter((a) => a.type !== 'General');
  const text = (key: 'responsible' | 'counterparty' | 'detail' | 'payment_method' | 'voucher_number' | 'notes') => ({
    value: v[key] ?? '',
    onChange: (e: { target: { value: string } }) => patch({ [key]: e.target.value || null }),
  });

  return (
    <ModalShell
      title={movement ? 'Editar movimiento' : 'Registrar movimiento'}
      subtitle={movement ? movement.movement_code : 'Nace en CORP y como BORRADOR'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting}
            className="flex-1 min-h-[44px] sm:min-h-0 py-2.5 border border-line rounded-card bb-body text-sm text-ink-soft hover:text-ink">
            Cancelar
          </button>
          <button type="submit" form={FORM_ID} disabled={submitting}
            className="flex-1 min-h-[44px] sm:min-h-0 py-2.5 bg-gold text-ink rounded-card bb-body text-sm font-semibold hover:bg-gold/90 disabled:opacity-50">
            {submitting ? 'Guardando…' : movement ? 'Guardar cambios' : 'Registrar'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="bb-label" htmlFor="mv-date">Fecha</label>
            <input id="mv-date" type="date" className="bb-input" value={v.movement_date} onChange={(e) => patch({ movement_date: e.target.value })} required />
            <p className="bb-mono text-[10px] text-ink-soft mt-1">Mes: {computeMes(v.movement_date) || '—'}</p>
          </div>
          <div>
            <label className="bb-label" htmlFor="mv-amount">Importe (S/)</label>
            <input id="mv-amount" className="bb-input bb-mono" inputMode="decimal" placeholder="0.00" value={amountText}
              onChange={(e) => { setAmountText(e.target.value); patch({ amount: Number(e.target.value.replace(',', '.')) }); }} required />
          </div>
        </div>

        <div>
          <label className="bb-label" htmlFor="mv-type">Tipo de registro</label>
          <select id="mv-type" className="bb-input" value={v.record_type} onChange={(e) => patch({ record_type: e.target.value as RecordType })}>
            {Object.values(RECORD_TYPE).map((t) => <option key={t} value={t}>{RECORD_LABEL[t]}</option>)}
          </select>
        </div>

        <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-line rounded-card p-3">
          <legend className="bb-label-xs text-ink-soft px-1">Clasificación (4 dimensiones)</legend>
          <div>
            <label className="bb-label" htmlFor="mv-unit">Unidad beneficiaria</label>
            <select id="mv-unit" className="bb-input" value={v.business_unit_id} onChange={(e) => patch({ business_unit_id: Number(e.target.value) })}>
              {units.map((u) => <option key={u.id} value={u.id}>{u.code} · {u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="bb-label" htmlFor="mv-area">Área gestora</label>
            <select id="mv-area" className="bb-input" value={v.area_id} onChange={(e) => patch({ area_id: Number(e.target.value) })}>
              <option value={0}>Elige…</option>
              <optgroup label="Generales">{generalAreas.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</optgroup>
              <optgroup label="Específicas">{specificAreas.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</optgroup>
            </select>
          </div>
          <div>
            <label className="bb-label" htmlFor="mv-cat">Categoría</label>
            <select id="mv-cat" className="bb-input" value={v.cost_category_id} onChange={(e) => patch({ cost_category_id: Number(e.target.value) })}>
              <option value={0}>Elige…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="bb-label" htmlFor="mv-class">Clase del gasto</label>
            <select id="mv-class" className="bb-input" value={v.expense_class} disabled={!isCost}
              onChange={(e) => patch({ expense_class: e.target.value as ExpenseClass })}>
              {isCost ? CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>) : <option value={EXPENSE_CLASS.NO_APLICA}>NO_APLICA</option>}
            </select>
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <span className="bb-label-xs text-ink-soft">Control automático</span>
            <ControlBadge control={control} />
          </div>
        </fieldset>

        <div>
          <label className="bb-label" htmlFor="mv-project">Proyecto — opcional</label>
          <select id="mv-project" className="bb-input" value={v.project_id ?? ''} onChange={(e) => patch({ project_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Sin proyecto</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.code ?? `#${p.id}`} · {p.projectName}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="bb-label" htmlFor="mv-cp">Tercero / proveedor</label><input id="mv-cp" className="bb-input" {...text('counterparty')} /></div>
          <div><label className="bb-label" htmlFor="mv-resp">Responsable</label><input id="mv-resp" className="bb-input" {...text('responsible')} /></div>
          <div><label className="bb-label" htmlFor="mv-pay">Medio de pago</label><input id="mv-pay" className="bb-input" {...text('payment_method')} /></div>
          <div><label className="bb-label" htmlFor="mv-vch">N.º comprobante</label><input id="mv-vch" className="bb-input" {...text('voucher_number')} /></div>
        </div>
        <div><label className="bb-label" htmlFor="mv-detail">Detalle / concepto</label><input id="mv-detail" className="bb-input" {...text('detail')} /></div>
        <div><label className="bb-label" htmlFor="mv-notes">Notas — opcional</label><textarea id="mv-notes" rows={2} className="bb-input" {...text('notes')} /></div>

        {error && <p role="alert" className="bb-body text-sm text-rust">{error}</p>}
      </form>
    </ModalShell>
  );
}
