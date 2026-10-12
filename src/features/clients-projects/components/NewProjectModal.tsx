// features/clients-projects/components/NewProjectModal.tsx
// Modal with form to create a new project according to Modelo C schema.
// Talks to createProject() in the service layer, never to Supabase directly.

import { type FormEvent, useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { createProject, getBusinessUnits, getClients } from '../services/project-service';
import type { BusinessUnit, Client, CreateProjectPayload } from '../types';
import { PROJECT_STATUS } from '../../../types/database';

interface NewProjectModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function NewProjectModal({ onClose, onCreated }: NewProjectModalProps) {
  const [clients, setClients]         = useState<Client[]>([]);
  const [busUnits, setBusUnits]       = useState<BusinessUnit[]>([]);
  const [isNewClient, setIsNewClient] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);

  const [form, setForm] = useState<{
    code: string;
    clientId: string;
    newClientName: string;
    newClientDocNumber: string;
    newClientType: string;
    newClientPhone: string;
    newClientEmail: string;
    businessUnitId: string;
    name: string;
    service: string;
    manager: string;
    contractedAmount: string;
    startDate: string;
    endDate: string;
    status: string;
    notes: string;
  }>({
    code: '',
    clientId: '',
    newClientName: '',
    newClientDocNumber: '',
    newClientType: 'Persona',
    newClientPhone: '',
    newClientEmail: '',
    businessUnitId: '',
    name: '',
    service: '',
    manager: '',
    contractedAmount: '',
    startDate: '',
    endDate: '',
    status: PROJECT_STATUS.ACTIVO,
    notes: '',
  });

  useEffect(() => {
    Promise.all([getClients(), getBusinessUnits()])
      .then(([c, b]) => {
        setClients(c);
        setBusUnits(b);
        if (b.length > 0) {
          setForm((prev) => ({ ...prev, businessUnitId: String(b[0].id) }));
        }
      })
      .catch(() => {/* silent — seed already loaded */});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload: CreateProjectPayload = {
      code:               form.code.trim() || undefined,
      clientId:           isNewClient ? 'new' : Number(form.clientId),
      newClientName:      form.newClientName || undefined,
      newClientDocNumber: form.newClientDocNumber || undefined,
      newClientType:      form.newClientType || undefined,
      newClientPhone:     form.newClientPhone || undefined,
      newClientEmail:     form.newClientEmail || undefined,
      businessUnitId:     Number(form.businessUnitId),
      name:               form.name,
      service:            form.service,
      manager:            form.manager.trim() || undefined,
      contractedAmount:   parseFloat(form.contractedAmount),
      startDate:          form.startDate,
      endDate:            form.endDate,
      status:             form.status as CreateProjectPayload['status'],
      notes:              form.notes.trim() || undefined,
    };

    try {
      await createProject(payload);
      setSuccess(true);
      setTimeout(() => { onCreated(); onClose(); }, 1200);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al crear el proyecto. Verifica la conexión a Supabase.',
      );
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
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="bb-display font-semibold text-ink text-base">Nuevo proyecto</h2>
          <button
            onClick={onClose}
            className="text-ink-soft hover:text-ink text-xl leading-none transition-colors"
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Client selector / toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>Cliente</label>
              <button
                type="button"
                onClick={() => setIsNewClient(!isNewClient)}
                className="bb-body text-xs text-gold hover:text-gold/80 transition-colors"
              >
                {isNewClient ? '← Seleccionar existente' : '+ Nuevo cliente'}
              </button>
            </div>

            {isNewClient ? (
              <div className="space-y-2.5 p-3 bg-canvas border border-line rounded-card">
                <div>
                  <label className="bb-label-xs text-ink-soft text-[10px] mb-0.5 block">
                    Nombre o Razón Social
                  </label>
                  <input
                    name="newClientName"
                    value={form.newClientName}
                    onChange={handleChange}
                    placeholder="Ej. Empresa Minera Los Andes S.A."
                    className={inputCls}
                    required={isNewClient}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="bb-label-xs text-ink-soft text-[10px] mb-0.5 block">
                      Tipo de cliente
                    </label>
                    <select
                      name="newClientType"
                      value={form.newClientType}
                      onChange={handleChange}
                      className={inputCls}
                    >
                      <option value="Persona">Persona</option>
                      <option value="Empresa">Empresa</option>
                    </select>
                  </div>
                  <div>
                    <label className="bb-label-xs text-ink-soft text-[10px] mb-0.5 block">
                      DNI / RUC
                    </label>
                    <input
                      name="newClientDocNumber"
                      value={form.newClientDocNumber}
                      onChange={handleChange}
                      placeholder="Ej. 20601234567"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="bb-label-xs text-ink-soft text-[10px] mb-0.5 block">
                      WhatsApp / Teléfono
                    </label>
                    <input
                      name="newClientPhone"
                      value={form.newClientPhone}
                      onChange={handleChange}
                      placeholder="Ej. 99999999"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="bb-label-xs text-ink-soft text-[10px] mb-0.5 block">
                      Correo electrónico
                    </label>
                    <input
                      name="newClientEmail"
                      value={form.newClientEmail}
                      onChange={handleChange}
                      placeholder="cliente@ejemplo.com"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <select
                name="clientId"
                value={form.clientId}
                onChange={handleChange}
                className={inputCls}
                required={!isNewClient}
              >
                <option value="">Seleccionar cliente…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.doc_number ? `(${c.doc_number})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Business unit (Modelo C) */}
          <div>
            <label className={labelCls}>Unidad de negocio</label>
            <select
              name="businessUnitId"
              value={form.businessUnitId}
              onChange={handleChange}
              className={inputCls}
              required
            >
              <option value="">Seleccionar unidad…</option>
              {busUnits.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} · {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Code + Project name */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>Código (opcional)</label>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="PRY-2026-001"
                className={inputCls}
              />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Nombre del proyecto</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ej. Optimización de planta Norte"
                className={inputCls}
                required
              />
            </div>
          </div>

          {/* Service & Responsable */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Servicio</label>
              <input
                name="service"
                value={form.service}
                onChange={handleChange}
                placeholder="Ej. DESARROLLO DE TESIS"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Responsable (opcional)</label>
              <input
                name="manager"
                value={form.manager}
                onChange={handleChange}
                placeholder="Ej. HENRY TORRES RIVERA"
                className={inputCls}
              />
            </div>
          </div>

          {/* Contracted amount */}
          <div>
            <label className={labelCls}>Monto contratado (S/.)</label>
            <input
              type="number"
              name="contractedAmount"
              value={form.contractedAmount}
              onChange={handleChange}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={inputCls}
              required
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Fecha de inicio</label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Fecha de fin prevista</label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                className={inputCls}
                required
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className={labelCls}>Estado inicial</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className={inputCls}
            >
              <option value={PROJECT_STATUS.ACTIVO}>Activo</option>
              <option value={PROJECT_STATUS.FINALIZADO}>Finalizado</option>
              <option value={PROJECT_STATUS.CANCELADO}>Cancelado</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Observación / alcance (opcional)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Detalle o alcance del contrato…"
              rows={2}
              className={inputCls}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-rust/10 border border-rust/30 rounded-card">
              <p className="bb-body text-rust text-xs">{error}</p>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="p-3 bg-belt-activo/10 border border-belt-activo/30 rounded-card">
              <p className="bb-body text-belt-activo text-xs font-medium">
                ✓ Proyecto creado exitosamente
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2.5 border border-line rounded-card bb-body text-sm text-ink-soft hover:text-ink hover:bg-canvas transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || success}
              className="flex-1 py-2.5 bg-gold text-ink rounded-card bb-body text-sm font-semibold hover:bg-gold/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {submitting ? 'Guardando…' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
