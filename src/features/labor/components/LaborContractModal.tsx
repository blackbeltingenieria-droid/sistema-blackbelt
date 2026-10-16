// features/labor/components/LaborContractModal.tsx
// Nuevo (o editar) contrato de mano de obra, como una fila de TABLA_M.O: quién, qué hará, para quién,
// cuánto se le pagará y hasta cuándo. Un colaborador conocido rellena sus datos de la última vez.

import { type FormEvent, useState } from 'react';
import { ModalShell } from '../../../components/ui/ModalShell';
import { addMonths, todayIso } from '../../../lib/autofill';
import type { DbLaborContract, DbSpecialist, LaborContractType } from '../../../types/database';
import type { BusinessUnit } from '../../catalogs/types';
import type { ProjectRow } from '../../clients-projects/types';
import { CORP_CODE } from '../../movements/domain/movement-rules';
import { validateLaborContract, type LaborContractInput } from '../services/labor-service';

interface Props {
  editing?: DbLaborContract;
  known: DbLaborContract[];
  specialists: DbSpecialist[];
  units: BusinessUnit[];
  projects: ProjectRow[];
  onSubmit: (input: LaborContractInput) => Promise<void>;
  onClose: () => void;
}

const FORM_ID = 'labor-contract-form';
const chip = (active: boolean) =>
  `px-3 py-2 min-h-[40px] rounded-card border bb-body text-sm text-left ${active ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink hover:border-ink-soft'}`;
const num = (s: string) => Number(s.replace(',', '.') || 0);
const same = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase();

export function LaborContractModal({ editing, known, specialists, units, projects, onSubmit, onClose }: Props) {
  const corp = units.find((u) => u.code === CORP_CODE);
  const start = todayIso();
  const [v, setV] = useState<LaborContractInput>(() => editing ? {
    workerName: editing.worker_name, workerDoc: editing.worker_doc, specialistId: editing.specialist_id,
    businessUnitId: editing.business_unit_id, projectId: editing.project_id, clientLabel: editing.client_label,
    service: editing.service, description: editing.description, contractType: editing.contract_type,
    startDate: editing.start_date, endDate: editing.end_date, agreedAmount: editing.agreed_amount,
  } : {
    workerName: '', workerDoc: null, specialistId: null, businessUnitId: corp?.id ?? 0, projectId: null, clientLabel: null,
    service: '', description: null, contractType: 'POR_PROYECTO', startDate: start, endDate: addMonths(start, 1), agreedAmount: 0,
  });
  const [amountText, setAmountText] = useState(editing ? String(editing.agreed_amount) : '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filled, setFilled] = useState<string | null>(null);
  const patch = (c: Partial<LaborContractInput>) => setV((p) => ({ ...p, ...c }));

  const names = [...new Set([...specialists.map((s) => s.full_name.toUpperCase()), ...known.map((k) => k.worker_name)])].sort();

  function onWorker(text: string) {
    const spec = specialists.find((s) => same(s.full_name, text));
    const last = [...known].reverse().find((k) => same(k.worker_name, text));
    if (editing || !last) {
      patch({ workerName: text, specialistId: spec?.id ?? null, ...(spec?.specialty && !v.service ? { service: spec.specialty.toUpperCase() } : {}) });
      setFilled(null);
      return;
    }
    // Colaborador conocido: mismo trabajo, monto y para quién de la última vez (solo lo que aún esté vacío).
    patch({
      workerName: text, specialistId: spec?.id ?? last.specialist_id,
      workerDoc: v.workerDoc || last.worker_doc,
      service: v.service || last.service,
      contractType: last.contract_type,
      ...(v.projectId === null ? { projectId: last.project_id, businessUnitId: last.business_unit_id, clientLabel: last.client_label } : {}),
      ...(v.agreedAmount > 0 ? {} : { agreedAmount: last.agreed_amount }),
    });
    if (!(v.agreedAmount > 0)) setAmountText(String(last.agreed_amount));
    setFilled(`Rellené con su último contrato (${last.code}). Revisa y guarda.`);
  }

  function onProject(id: number | null) {
    const p = id ? projects.find((x) => x.id === id) : undefined;
    patch({ projectId: id, businessUnitId: p ? p.businessUnitId : v.businessUnitId, clientLabel: p ? p.clientName : v.clientLabel });
  }

  function onType(t: LaborContractType) {
    patch({ contractType: t, ...(t === 'MENSUAL' ? { endDate: addMonths(v.startDate, 1) } : {}) });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validateLaborContract(v);
    if (problem) { setError(problem); return; }
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

  const activeProjects = projects.filter((p) => p.status !== 'cancelado' || p.id === v.projectId);

  return (
    <ModalShell
      title={editing ? `Editar ${editing.code}` : 'Nuevo contrato de mano de obra'}
      subtitle="Quién trabaja, cuánto se le pagará y hasta cuándo"
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
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="bb-label" htmlFor="lc-worker">Colaborador</label>
            <input id="lc-worker" className="bb-input" list="lc-workers" autoComplete="off" value={v.workerName} onChange={(e) => onWorker(e.target.value)} />
            <datalist id="lc-workers">{names.map((n) => <option key={n} value={n} />)}</datalist>
          </div>
          <div>
            <label className="bb-label" htmlFor="lc-doc">DNI / RUC <span className="text-ink-soft font-normal">— opcional</span></label>
            <input id="lc-doc" className="bb-input bb-mono" inputMode="numeric" value={v.workerDoc ?? ''} onChange={(e) => patch({ workerDoc: e.target.value || null })} />
          </div>
        </div>
        {filled && <p className="bb-body text-xs text-belt-en_revision -mt-3" data-testid="lc-filled">✓ {filled}</p>}

        <div>
          <label className="bb-label" htmlFor="lc-service">¿Qué trabajo hará?</label>
          <input id="lc-service" className="bb-input" placeholder="Ej.: Asesoramiento de tesis" value={v.service} onChange={(e) => patch({ service: e.target.value })} />
        </div>

        <div>
          <label className="bb-label" htmlFor="lc-project">¿Para qué proyecto? <span className="text-ink-soft font-normal">— opcional</span></label>
          <select id="lc-project" className="bb-input" value={v.projectId ?? ''} onChange={(e) => onProject(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Ninguno (trabajo para la empresa)</option>
            {activeProjects.map((p) => <option key={p.id} value={p.id}>{p.code ?? `#${p.id}`} · {p.projectName} ({p.clientName})</option>)}
          </select>
        </div>

        {!v.projectId && (
          <div>
            <p className="bb-label">¿Para quién trabaja?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {units.map((u) => (
                <button key={u.id} type="button" aria-pressed={v.businessUnitId === u.id} onClick={() => patch({ businessUnitId: u.id })} className={chip(v.businessUnitId === u.id)}>
                  {u.code === CORP_CODE ? 'Toda la empresa' : `Solo ${u.name}`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="bb-label">Tipo de contrato</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={v.contractType === 'POR_PROYECTO'} onClick={() => onType('POR_PROYECTO')} className={chip(v.contractType === 'POR_PROYECTO')}>Por proyecto</button>
            <button type="button" aria-pressed={v.contractType === 'MENSUAL'} onClick={() => onType('MENSUAL')} className={chip(v.contractType === 'MENSUAL')}>Mensual</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="bb-label" htmlFor="lc-amount">Monto acordado (S/)</label>
            <input id="lc-amount" className="bb-input bb-mono text-lg" inputMode="decimal" placeholder="0.00" value={amountText}
              onChange={(e) => { setAmountText(e.target.value); patch({ agreedAmount: num(e.target.value) }); }} />
          </div>
          <div>
            <label className="bb-label" htmlFor="lc-start">Desde</label>
            <input id="lc-start" type="date" className="bb-input" value={v.startDate}
              onChange={(e) => patch({ startDate: e.target.value, ...(v.contractType === 'MENSUAL' && e.target.value ? { endDate: addMonths(e.target.value, 1) } : {}) })} />
          </div>
          <div>
            <label className="bb-label" htmlFor="lc-end">Hasta (pagar antes de)</label>
            <input id="lc-end" type="date" className="bb-input" value={v.endDate ?? ''} onChange={(e) => patch({ endDate: e.target.value || null })} />
          </div>
        </div>

        <div>
          <label className="bb-label" htmlFor="lc-desc">Detalle <span className="text-ink-soft font-normal">— opcional</span></label>
          <input id="lc-desc" className="bb-input" placeholder="Ej.: Asesorar la investigación de Wilmer" value={v.description ?? ''} onChange={(e) => patch({ description: e.target.value || null })} />
        </div>

        {error && <p role="alert" className="bb-body text-sm text-rust">{error}</p>}
      </form>
    </ModalShell>
  );
}
