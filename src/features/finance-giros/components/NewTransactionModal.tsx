// features/finance-giros/components/NewTransactionModal.tsx
// Formulario de registro y edición de gasto con reparto automático/manual por giro.
// La validación de que el reparto suma 100% se hace aquí (UI) y en el servicio.

import { type FormEvent, useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import {
  getCostCategories,
  getTools,
  createTransactionWithAllocations,
  updateTransactionWithAllocations,
  resolveAllocationsForTool,
} from '../services/finance-service';
import { SEED_BUSINESS_UNITS } from '../../clients-projects/services/seed-data';
import type { AllocationInput, CostCategory, Tool, TransactionRow } from '../types';

interface Props {
  onClose: () => void;
  onSaved?: () => void;
  onCreated?: () => void; // compatibilidad
  transactionToEdit?: TransactionRow | null;
}

export function NewTransactionModal({ onClose, onSaved, onCreated, transactionToEdit }: Props) {
  const isEditing = Boolean(transactionToEdit);

  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [tools, setTools]           = useState<Tool[]>([]);
  const [allocations, setAllocations] = useState<AllocationInput[]>(
    transactionToEdit
      ? transactionToEdit.allocations.map((a) => ({ businessUnitId: a.businessUnitId, pct: a.pct }))
      : [],
  );
  const [autoAllocated, setAutoAllocated] = useState(false);

  const [description, setDescription]     = useState(transactionToEdit?.description ?? '');
  const [amount, setAmount]               = useState(transactionToEdit ? String(transactionToEdit.amount) : '');
  const [date, setDate]                   = useState(
    transactionToEdit?.transactionDate ?? new Date().toISOString().slice(0, 10),
  );
  const [paymentMethod, setPaymentMethod] = useState(transactionToEdit?.paymentMethod ?? 'transferencia');
  const [categoryId, setCategoryId]       = useState<number | ''>(transactionToEdit?.costCategoryId ?? '');
  const [toolId, setToolId]               = useState<number | ''>(
    transactionToEdit?.toolId !== null && transactionToEdit?.toolId !== undefined ? transactionToEdit.toolId : '',
  );
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  // Cargar catálogos
  useEffect(() => {
    Promise.all([getCostCategories(), getTools()]).then(([cats, ts]) => {
      setCategories(cats);
      setTools(ts);
      if (!isEditing && cats.length > 0 && categoryId === '') {
        setCategoryId(cats[0].id);
      }
    }).catch(() => {});
  }, [isEditing, categoryId]);

  // Al seleccionar herramienta → autocompletar reparto según scope
  function handleToolChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (!val) {
      setToolId('');
      if (!isEditing) {
        setAllocations([]);
      }
      setAutoAllocated(false);
      return;
    }
    const tid = Number(val);
    setToolId(tid);
    const tool = tools.find((t) => t.id === tid);
    if (tool) {
      const resolved = resolveAllocationsForTool(tool, SEED_BUSINESS_UNITS.map((b) => b.id));
      setAllocations(resolved);
      setAutoAllocated(tool.scope !== 'shared'); // shared: editable por usuario
    }
  }

  function updateAlloc(idx: number, pct: number) {
    setAllocations((prev) => prev.map((a, i) => i === idx ? { ...a, pct } : a));
  }

  function addManualAlloc() {
    const usedIds = new Set(allocations.map((a) => a.businessUnitId));
    const next = SEED_BUSINESS_UNITS.find((b) => !usedIds.has(b.id));
    if (next) setAllocations((prev) => [...prev, { businessUnitId: next.id, pct: 0 }]);
  }

  function removeAlloc(idx: number) {
    setAllocations((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateAllocBu(idx: number, buId: number) {
    setAllocations((prev) => prev.map((a, i) => i === idx ? { ...a, businessUnitId: buId } : a));
  }

  const totalPct = allocations.reduce((s, a) => s + a.pct, 0);
  const pctOk    = Math.abs(totalPct - 100) < 0.01;

  // Tooltip de clasificación
  const selectedCat = categories.find((c) => c.id === Number(categoryId));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!pctOk) {
      setError(`El reparto debe sumar 100%. Actualmente suma ${totalPct.toFixed(1)}%.`);
      return;
    }
    if (allocations.length === 0) {
      setError('Asigna al menos un giro de negocio al gasto.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        description,
        amount:          parseFloat(amount),
        transactionDate: date,
        paymentMethod:   paymentMethod || null,
        costCategoryId:  Number(categoryId),
        toolId:          toolId !== '' ? Number(toolId) : null,
        projectId:       null,
        allocations,
      };

      if (isEditing && transactionToEdit) {
        await updateTransactionWithAllocations(transactionToEdit.id, payload);
      } else {
        await createTransactionWithAllocations(payload);
      }

      if (onSaved) onSaved();
      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el gasto');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    'w-full bb-body text-sm text-ink bg-canvas border border-line rounded-card px-3 py-2 ' +
    'focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-ink-soft';
  const labelCls = 'block bb-label-xs text-ink-soft mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto" padding="p-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div>
            <h2 className="bb-display font-semibold text-ink text-base">
              {isEditing ? 'Editar gasto' : 'Registrar gasto'}
            </h2>
            {isEditing && transactionToEdit?.updatedAt && (
              <p className="bb-mono text-[10px] text-ink-soft mt-0.5">
                Última modificación registrada
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-ink-soft hover:text-ink text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Descripción */}
          <div>
            <label className={labelCls}>Descripción</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Renovación licencia Figma, honorario consultor…"
              className={inputCls}
              required
            />
          </div>

          {/* Monto + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Monto (S/.)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
                required
              />
            </div>
          </div>

          {/* Medio de pago */}
          <div>
            <label className={labelCls}>Medio de pago</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputCls}>
              <option value="transferencia">Transferencia bancaria</option>
              <option value="tarjeta">Tarjeta de crédito/débito</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          {/* Clasificación del gasto con ayuda/tooltip */}
          <div>
            <label className={labelCls}>Clasificación del gasto</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className={inputCls}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {selectedCat && (
              <p className="bb-body text-xs text-ink-soft mt-1.5 bg-canvas border border-line rounded-card px-3 py-2">
                💡 <strong>{selectedCat.name}:</strong> {selectedCat.description}
              </p>
            )}
          </div>

          {/* Herramienta (opcional) */}
          <div>
            <label className={labelCls}>Herramienta — opcional</label>
            <select value={toolId} onChange={handleToolChange} className={inputCls}>
              <option value="">Sin herramienta asociada</option>
              {tools.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.scope})</option>
              ))}
            </select>
            {toolId !== '' && (
              <p className="bb-body text-xs text-ink-soft mt-1">
                {autoAllocated
                  ? '✓ Reparto asignado automáticamente según el alcance de la herramienta.'
                  : '⚙️ Herramienta compartida: ajusta los porcentajes si es necesario.'}
              </p>
            )}
          </div>

          {/* Reparto por giro */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>Reparto por giro de negocio</label>
              <span className={`bb-mono text-xs font-semibold ${pctOk ? 'text-[#6E8B55]' : 'text-rust'}`}>
                {totalPct.toFixed(0)}% / 100%
              </span>
            </div>

            {allocations.length === 0 && (
              <p className="bb-body text-xs text-ink-soft italic">
                Selecciona una herramienta para autocompletar, o agrega giros manualmente.
              </p>
            )}

            <div className="space-y-2">
              {allocations.map((a, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    value={a.businessUnitId}
                    onChange={(e) => updateAllocBu(idx, Number(e.target.value))}
                    disabled={autoAllocated}
                    className={`${inputCls} flex-1 ${autoAllocated ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {SEED_BUSINESS_UNITS.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={a.pct}
                    onChange={(e) => updateAlloc(idx, Number(e.target.value))}
                    disabled={autoAllocated}
                    className={`${inputCls} w-20 text-right ${autoAllocated ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                  <span className="bb-body text-ink-soft text-sm">%</span>
                  {!autoAllocated && (
                    <button
                      type="button"
                      onClick={() => removeAlloc(idx)}
                      className="text-ink-soft hover:text-rust text-lg leading-none flex-shrink-0"
                    >×</button>
                  )}
                </div>
              ))}
            </div>

            {!autoAllocated && allocations.length < 5 && (
              <button
                type="button"
                onClick={addManualAlloc}
                className="mt-2 bb-body text-xs text-gold hover:text-gold/80"
              >
                + Agregar giro
              </button>
            )}

            {/* Preview de montos prorrateados */}
            {allocations.length > 0 && amount && !isNaN(parseFloat(amount)) && (
              <div className="mt-3 bg-canvas border border-line rounded-card p-3">
                <p className="bb-label-xs text-ink-soft mb-2">Vista previa del reparto</p>
                <ul className="space-y-1">
                  {allocations.map((a, idx) => {
                    const buName = SEED_BUSINESS_UNITS.find((b) => b.id === a.businessUnitId)?.name ?? '—';
                    const allocated = ((parseFloat(amount) * a.pct) / 100).toFixed(2);
                    return (
                      <li key={idx} className="flex justify-between">
                        <span className="bb-body text-xs text-ink-soft">{buName}</span>
                        <span className="bb-mono text-xs text-ink">
                          S/ {allocated} ({a.pct}%)
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rust/10 border border-rust/30 rounded-card">
              <p className="bb-body text-rust text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-line rounded-card bb-body text-sm text-ink-soft hover:text-ink transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !pctOk}
              className="flex-1 py-2.5 bg-gold text-ink rounded-card bb-body text-sm font-semibold hover:bg-gold/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Registrar gasto'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
