// features/budgets-allocation/components/SimpleBudgetModal.tsx
// Poner una meta en 3 pasos: ¿para quién?, ¿cuánto planeas vender?, ¿cuánto quieres gastar como máximo?
// La categoría es opcional (General = "Otros"). El área se completa sola.

import { type FormEvent, useState } from 'react';
import { ModalShell } from '../../../components/ui/ModalShell';
import type { Area, BusinessUnit, CostCategory } from '../../catalogs/types';
import { CATEGORY_SHORT, EXPENSE_CATEGORY_CODES, defaultAreaId } from '../../movements/domain/quick-entry';
import type { BudgetFormValues } from '../types';

interface Props {
  month: string;
  initial?: BudgetFormValues;
  units: BusinessUnit[];
  areas: Area[];
  categories: CostCategory[];
  onSubmit: (values: BudgetFormValues) => Promise<void>;
  onClose: () => void;
}

const FORM_ID = 'simple-budget-form';
const chip = (active: boolean) =>
  `px-3 py-2 min-h-[40px] rounded-card border bb-body text-sm text-left ${active ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink hover:border-ink-soft'}`;
const num = (s: string) => Number(s.replace(',', '.') || 0);

export function SimpleBudgetModal({ month, initial, units, areas, categories, onSubmit, onClose }: Props) {
  const corp = units.find((u) => u.code === 'CORP');
  const otr = categories.find((c) => c.code === 'OTR');
  const [unitId, setUnitId] = useState<number>(initial?.business_unit_id ?? 0);
  const [categoryId, setCategoryId] = useState<number>(initial?.cost_category_id ?? otr?.id ?? 0);
  const [sell, setSell] = useState(initial?.income_target ? String(initial.income_target) : '');
  const [spend, setSpend] = useState(initial?.cost_target ? String(initial.cost_target) : '');
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const unit = units.find((u) => u.id === unitId);
  const isCorp = unit?.code === 'CORP';
  const expenseCats = categories.filter((c) => EXPENSE_CATEGORY_CODES.includes(c.code) && c.code !== 'OTR');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!unit) { setError('Elige para quién es la meta.'); return; }
    const income = isCorp ? 0 : num(sell);
    const cost = num(spend);
    if (!(income > 0) && !(cost > 0)) { setError('Escribe cuánto planeas vender o gastar.'); return; }
    const category = categories.find((c) => c.id === categoryId);
    const keepArea = initial && initial.business_unit_id === unitId && initial.cost_category_id === categoryId;
    setSubmitting(true);
    try {
      await onSubmit({
        month,
        business_unit_id: unitId,
        area_id: keepArea ? initial.area_id : defaultAreaId(areas, unit, category?.code ?? 'OTR'),
        cost_category_id: categoryId,
        income_target: income,
        cost_target: cost,
        comment: comment.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      title={initial ? 'Editar meta' : 'Poner meta'}
      subtitle="Tu plan para el mes: cuánto vender y cuánto gastar"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting}
            className="flex-1 min-h-[44px] sm:min-h-0 py-2.5 border border-line rounded-card bb-body text-sm text-ink-soft hover:text-ink">Cancelar</button>
          <button type="submit" form={FORM_ID} disabled={submitting}
            className="flex-1 min-h-[44px] sm:min-h-0 py-2.5 bg-gold text-ink rounded-card bb-body text-sm font-semibold hover:bg-gold/90 disabled:opacity-50">
            {submitting ? 'Guardando…' : 'Guardar meta'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <p className="bb-label">1. ¿Para quién es la meta?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {corp && (
              <button type="button" aria-pressed={unitId === corp.id} onClick={() => setUnitId(corp.id)} className={chip(unitId === corp.id)}>
                Toda la empresa <span className="block text-[11px] opacity-80">Gastos comunes: oficina, internet, apps</span>
              </button>
            )}
            {units.filter((u) => u.code !== 'CORP').map((u) => (
              <button key={u.id} type="button" aria-pressed={unitId === u.id} onClick={() => setUnitId(u.id)} className={chip(unitId === u.id)}>
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ backgroundColor: u.color }} />
                {u.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!isCorp && (
            <div>
              <label className="bb-label" htmlFor="sb-sell">2. ¿Cuánto planeas vender? (S/)</label>
              <input id="sb-sell" className="bb-input bb-mono" inputMode="decimal" placeholder="0.00" value={sell} onChange={(e) => setSell(e.target.value)} />
            </div>
          )}
          <div>
            <label className="bb-label" htmlFor="sb-spend">{isCorp ? '2.' : '3.'} ¿Cuánto quieres gastar como máximo? (S/)</label>
            <input id="sb-spend" className="bb-input bb-mono" inputMode="decimal" placeholder="0.00" value={spend} onChange={(e) => setSpend(e.target.value)} />
          </div>
        </div>

        <div>
          <p className="bb-label">¿Solo para un tipo de gasto? <span className="text-ink-soft font-normal">— opcional</span></p>
          <div className="flex flex-wrap gap-2">
            {otr && (
              <button type="button" aria-pressed={categoryId === otr.id} onClick={() => setCategoryId(otr.id)} className={chip(categoryId === otr.id)}>
                General (todo)
              </button>
            )}
            {expenseCats.map((c) => (
              <button key={c.id} type="button" aria-pressed={categoryId === c.id} onClick={() => setCategoryId(c.id)} className={chip(categoryId === c.id)}>
                {CATEGORY_SHORT[c.code] ?? c.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="bb-label" htmlFor="sb-note">Nota <span className="text-ink-soft font-normal">— opcional</span></label>
          <input id="sb-note" className="bb-input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ej.: campaña de fin de año" />
        </div>

        {error && <p role="alert" className="bb-body text-sm text-rust">{error}</p>}
      </form>
    </ModalShell>
  );
}
