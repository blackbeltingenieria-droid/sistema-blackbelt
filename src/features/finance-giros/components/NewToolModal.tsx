// features/finance-giros/components/NewToolModal.tsx
// Modal para crear una herramienta nueva con su scope y giros asociados.

import { type FormEvent, useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { createTool } from '../services/finance-service';
import { TOOL_SCOPE } from '../../../types/database';
import type { CreateToolPayload, ToolScope } from '../types';
import { SEED_BUSINESS_UNITS } from '../../clients-projects/services/seed-data';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

interface SharedUnit { businessUnitId: number; pct: number }

export function NewToolModal({ onClose, onCreated }: Props) {
  const [name, setName]       = useState('');
  const [scope, setScope]     = useState<ToolScope>(TOOL_SCOPE.GENERAL);
  const [exclusiveBuId, setExclusiveBuId] = useState<number>(SEED_BUSINESS_UNITS[0]?.id ?? 1);
  const [monthlyCost, setMonthlyCost]     = useState('');
  const [notes, setNotes]     = useState('');
  const [sharedUnits, setSharedUnits]     = useState<SharedUnit[]>([]);
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Al cambiar a 'shared', inicializar con los primeros 2 giros al 50/50
  useEffect(() => {
    if (scope === TOOL_SCOPE.SHARED && sharedUnits.length === 0) {
      setSharedUnits([
        { businessUnitId: SEED_BUSINESS_UNITS[0]?.id ?? 1, pct: 50 },
        { businessUnitId: SEED_BUSINESS_UNITS[1]?.id ?? 2, pct: 50 },
      ]);
    }
  }, [scope, sharedUnits.length]);

  function updateSharedUnit(idx: number, field: keyof SharedUnit, value: number) {
    setSharedUnits((prev) => prev.map((u, i) => i === idx ? { ...u, [field]: value } : u));
  }

  function addSharedUnit() {
    const usedIds = new Set(sharedUnits.map((u) => u.businessUnitId));
    const next = SEED_BUSINESS_UNITS.find((b) => !usedIds.has(b.id));
    if (next) setSharedUnits((prev) => [...prev, { businessUnitId: next.id, pct: 0 }]);
  }

  function removeSharedUnit(idx: number) {
    setSharedUnits((prev) => prev.filter((_, i) => i !== idx));
  }

  const sharedTotal = sharedUnits.reduce((s, u) => s + u.pct, 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (scope === TOOL_SCOPE.SHARED) {
      if (Math.abs(sharedTotal - 100) > 0.01) {
        setError(`Los porcentajes deben sumar 100%. Actualmente suman ${sharedTotal}%.`);
        return;
      }
    }

    const payload: CreateToolPayload = {
      name,
      scope,
      exclusiveBusinessUnitId: scope === TOOL_SCOPE.EXCLUSIVE ? exclusiveBuId : null,
      monthlyReferenceCost:    monthlyCost ? parseFloat(monthlyCost) : null,
      notes:                   notes || null,
      sharedUnits:             scope === TOOL_SCOPE.SHARED ? sharedUnits : undefined,
    };

    setSubmitting(true);
    try {
      await createTool(payload);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear herramienta');
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
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto" padding="p-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="bb-display font-semibold text-ink text-base">Nueva herramienta</h2>
          <button onClick={onClose} className="text-ink-soft hover:text-ink text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Nombre */}
          <div>
            <label className={labelCls}>Nombre</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Figma, AutoCAD, Google Workspace…"
              className={inputCls} required
            />
          </div>

          {/* Alcance */}
          <div>
            <label className={labelCls}>Alcance de reparto</label>
            <div className="grid grid-cols-3 gap-2">
              {([TOOL_SCOPE.GENERAL, TOOL_SCOPE.SHARED, TOOL_SCOPE.EXCLUSIVE] as ToolScope[]).map((s) => (
                <button
                  key={s} type="button"
                  onClick={() => setScope(s)}
                  className={`py-2 text-xs rounded-card border transition-colors ${
                    scope === s
                      ? 'bg-ink text-paper border-ink font-semibold'
                      : 'bg-paper text-ink-soft border-line hover:border-ink'
                  }`}
                >
                  {s === TOOL_SCOPE.GENERAL ? '🌐 General' :
                   s === TOOL_SCOPE.SHARED   ? '🔗 Compartida' : '🎯 Exclusiva'}
                </button>
              ))}
            </div>
            <p className="bb-body text-xs text-ink-soft mt-1.5">
              {scope === TOOL_SCOPE.GENERAL   && 'Se repartirá automáticamente 20% a cada uno de los 5 giros.'}
              {scope === TOOL_SCOPE.SHARED    && 'Define qué giros participan y su porcentaje (deben sumar 100%).'}
              {scope === TOOL_SCOPE.EXCLUSIVE && 'Se asignará al 100% al giro seleccionado.'}
            </p>
          </div>

          {/* Exclusiva: selector de giro */}
          {scope === TOOL_SCOPE.EXCLUSIVE && (
            <div>
              <label className={labelCls}>Giro de negocio</label>
              <select
                value={exclusiveBuId}
                onChange={(e) => setExclusiveBuId(Number(e.target.value))}
                className={inputCls}
              >
                {SEED_BUSINESS_UNITS.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Shared: tabla de giros + porcentajes */}
          {scope === TOOL_SCOPE.SHARED && (
            <div>
              <label className={labelCls}>
                Giros y porcentajes
                <span className={`ml-2 ${Math.abs(sharedTotal - 100) < 0.01 ? 'text-[#6E8B55]' : 'text-rust'}`}>
                  (total: {sharedTotal}%)
                </span>
              </label>
              <div className="space-y-2">
                {sharedUnits.map((u, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={u.businessUnitId}
                      onChange={(e) => updateSharedUnit(idx, 'businessUnitId', Number(e.target.value))}
                      className={`${inputCls} flex-1`}
                    >
                      {SEED_BUSINESS_UNITS.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <input
                      type="number" min={0} max={100} step={1}
                      value={u.pct}
                      onChange={(e) => updateSharedUnit(idx, 'pct', Number(e.target.value))}
                      className={`${inputCls} w-20 text-right`}
                    />
                    <span className="bb-body text-ink-soft text-sm">%</span>
                    {sharedUnits.length > 2 && (
                      <button type="button" onClick={() => removeSharedUnit(idx)}
                        className="text-ink-soft hover:text-rust text-lg leading-none">×</button>
                    )}
                  </div>
                ))}
              </div>
              {sharedUnits.length < 5 && (
                <button type="button" onClick={addSharedUnit}
                  className="mt-2 bb-body text-xs text-gold hover:text-gold/80">
                  + Agregar giro
                </button>
              )}
            </div>
          )}

          {/* Costo mensual referencial */}
          <div>
            <label className={labelCls}>Costo mensual referencial (S/.) — opcional</label>
            <input
              type="number" min={0} step={0.01}
              value={monthlyCost} onChange={(e) => setMonthlyCost(e.target.value)}
              placeholder="0.00" className={inputCls}
            />
          </div>

          {/* Notas */}
          <div>
            <label className={labelCls}>Notas — opcional</label>
            <input
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Uso, licencias, contexto…"
              className={inputCls}
            />
          </div>

          {error && (
            <div className="p-3 bg-rust/10 border border-rust/30 rounded-card">
              <p className="bb-body text-rust text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-line rounded-card bb-body text-sm text-ink-soft hover:text-ink transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 bg-gold text-ink rounded-card bb-body text-sm font-semibold hover:bg-gold/90 disabled:opacity-50 transition-colors">
              {submitting ? 'Guardando…' : 'Crear herramienta'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
