// features/budgets-allocation/components/BudgetFormModal.tsx
// Alta/edición de una meta: una fila por combinación mes + unidad + área + categoría.

import { type FormEvent, useState } from 'react';
import { ModalShell } from '../../../components/ui/ModalShell';
import type { Area, BusinessUnit, CostCategory } from '../../catalogs/types';
import type { BudgetFormValues } from '../types';

interface BudgetFormModalProps {
  initial: BudgetFormValues;
  isEditing: boolean;
  units: BusinessUnit[];
  areas: Area[];
  categories: CostCategory[];
  onSubmit: (values: BudgetFormValues) => Promise<void>;
  onClose: () => void;
}

const FORM_ID = 'budget-form';

export function BudgetFormModal({ initial, isEditing, units, areas, categories, onSubmit, onClose }: BudgetFormModalProps) {
  const [v, setV] = useState<BudgetFormValues>(initial);
  const [income, setIncome] = useState(String(initial.income_target || ''));
  const [cost, setCost] = useState(String(initial.cost_target || ''));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const num = (s: string) => Number(s.replace(',', '.') || 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ ...v, income_target: num(income), cost_target: num(cost) });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      title={isEditing ? 'Editar meta' : 'Nueva meta de presupuesto'}
      subtitle="Una fila por mes + unidad + área + categoría"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting}
            className="flex-1 min-h-[44px] sm:min-h-0 py-2.5 border border-line rounded-card bb-body text-sm text-ink-soft hover:text-ink">Cancelar</button>
          <button type="submit" form={FORM_ID} disabled={submitting}
            className="flex-1 min-h-[44px] sm:min-h-0 py-2.5 bg-gold text-ink rounded-card bb-body text-sm font-semibold hover:bg-gold/90 disabled:opacity-50">
            {submitting ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="bb-label" htmlFor="bg-month">Mes</label>
          <input id="bg-month" type="month" className="bb-input" value={v.month} onChange={(e) => setV({ ...v, month: e.target.value })} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="bb-label" htmlFor="bg-unit">Unidad</label>
            <select id="bg-unit" className="bb-input" value={v.business_unit_id} onChange={(e) => setV({ ...v, business_unit_id: Number(e.target.value) })}>
              <option value={0}>Elige…</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.code} · {u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="bb-label" htmlFor="bg-area">Área</label>
            <select id="bg-area" className="bb-input" value={v.area_id} onChange={(e) => setV({ ...v, area_id: Number(e.target.value) })}>
              <option value={0}>Elige…</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="bb-label" htmlFor="bg-cat">Categoría</label>
          <select id="bg-cat" className="bb-input" value={v.cost_category_id} onChange={(e) => setV({ ...v, cost_category_id: Number(e.target.value) })}>
            <option value={0}>Elige…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="bb-label" htmlFor="bg-inc">Ingreso meta (S/)</label><input id="bg-inc" className="bb-input bb-mono" inputMode="decimal" placeholder="0.00" value={income} onChange={(e) => setIncome(e.target.value)} /></div>
          <div><label className="bb-label" htmlFor="bg-cost">Costo meta (S/)</label><input id="bg-cost" className="bb-input bb-mono" inputMode="decimal" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
        </div>
        <div>
          <label className="bb-label" htmlFor="bg-note">Comentario — opcional</label>
          <input id="bg-note" className="bb-input" value={v.comment ?? ''} onChange={(e) => setV({ ...v, comment: e.target.value || null })} />
        </div>
        {error && <p role="alert" className="bb-body text-sm text-rust">{error}</p>}
      </form>
    </ModalShell>
  );
}
