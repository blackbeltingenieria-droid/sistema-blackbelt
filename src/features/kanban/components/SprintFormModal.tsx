// features/kanban/components/SprintFormModal.tsx
// Alta de sprint de un proyecto.

import { type FormEvent, useState } from 'react';
import { ModalShell } from '../../../components/ui/ModalShell';
import { SPRINT_STATUS } from '../../../types/database';
import { addDays, todayIso } from '../../../lib/autofill';
import { nextSprintDefaults } from '../kanban-defaults';
import type { CreateSprintPayload, Sprint } from '../types';

interface SprintFormModalProps {
  projectId: number;
  /** Sprints existentes: para proponer nombre y fechas del siguiente. */
  sprints?: Sprint[];
  onSubmit: (payload: CreateSprintPayload) => Promise<Sprint>;
  onClose: () => void;
}

const FORM_ID = 'sprint-form';

export function SprintFormModal({ projectId, sprints = [], onSubmit, onClose }: SprintFormModalProps) {
  const next = nextSprintDefaults(sprints, todayIso());
  const [name, setName]           = useState(next.name);
  const [goal, setGoal]           = useState('');
  const [startDate, setStartDate] = useState(next.start);
  const [endDate, setEndDate]     = useState(next.end);
  const [endTouched, setEndTouched] = useState(false);
  const [status, setStatus]       = useState<Sprint['status']>(SPRINT_STATUS.ACTIVO);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ projectId, name, goal, startDate: startDate || null, endDate: endDate || null, status });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el sprint.');
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      title="Nuevo sprint"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting}
            className="flex-1 min-h-[44px] sm:min-h-0 py-2.5 border border-line rounded-card bb-body text-sm text-ink-soft hover:text-ink transition-colors">
            Cancelar
          </button>
          <button type="submit" form={FORM_ID} disabled={submitting}
            className="flex-1 min-h-[44px] sm:min-h-0 py-2.5 bg-gold text-ink rounded-card bb-body text-sm font-semibold hover:bg-gold/90 disabled:opacity-50 transition-colors">
            {submitting ? 'Guardando…' : 'Crear sprint'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="bb-label" htmlFor="sprint-name">Nombre</label>
          <input id="sprint-name" className="bb-input" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Sprint 3 — Entrega parcial" required autoFocus />
        </div>
        <div>
          <label className="bb-label" htmlFor="sprint-goal">Objetivo — opcional</label>
          <textarea id="sprint-goal" className="bb-input" rows={2} value={goal} onChange={(e) => setGoal(e.target.value)}
            placeholder="¿Qué debe quedar listo al cerrar el sprint?" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
          <div>
            <label className="bb-label" htmlFor="sprint-start">Inicio</label>
            <input id="sprint-start" type="date" className="bb-input" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (!endTouched && e.target.value) setEndDate(addDays(e.target.value, 13)); }} />
          </div>
          <div>
            <label className="bb-label" htmlFor="sprint-end">Fin</label>
            <input id="sprint-end" type="date" className="bb-input" value={endDate} onChange={(e) => { setEndDate(e.target.value); setEndTouched(true); }} />
          </div>
        </div>
        <div>
          <label className="bb-label" htmlFor="sprint-status">Estado</label>
          <select id="sprint-status" className="bb-input" value={status} onChange={(e) => setStatus(e.target.value as Sprint['status'])}>
            <option value={SPRINT_STATUS.PLANIFICADO}>Planificado</option>
            <option value={SPRINT_STATUS.ACTIVO}>Activo</option>
            <option value={SPRINT_STATUS.CERRADO}>Cerrado</option>
          </select>
        </div>
        {error && (
          <div className="p-3 bg-rust/10 border border-rust/30 rounded-card" role="alert">
            <p className="bb-body text-rust text-sm">{error}</p>
          </div>
        )}
      </form>
    </ModalShell>
  );
}
