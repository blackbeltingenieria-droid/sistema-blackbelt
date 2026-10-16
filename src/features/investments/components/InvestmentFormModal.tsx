// features/investments/components/InvestmentFormModal.tsx
// Registrar una inversión en pocos pasos: ¿aporte de socio o préstamo?, quién, cuánto y cuándo.
// Si es préstamo: tasa y plazo (muestra la cuota aproximada). Un socio conocido rellena su DNI.

import { type FormEvent, useState } from 'react';
import { ModalShell } from '../../../components/ui/ModalShell';
import { todayIso } from '../../../lib/autofill';
import { formatPen } from '../../../lib/format';
import type { DbInvestment, InvestmentKind } from '../../../types/database';
import { PAYMENT_METHODS } from '../../movements/domain/quick-entry';
import { monthlyInstallment } from '../domain/performance';
import { validateInvestment, type InvestmentInput } from '../services/investment-service';

interface Props {
  known: DbInvestment[];
  onSubmit: (input: InvestmentInput) => Promise<void>;
  onClose: () => void;
}

const FORM_ID = 'investment-form';
const chip = (active: boolean) =>
  `px-3 py-2 min-h-[40px] rounded-card border bb-body text-sm text-left ${active ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink hover:border-ink-soft'}`;
const num = (s: string) => Number(s.replace(',', '.') || 0);

export function InvestmentFormModal({ known, onSubmit, onClose }: Props) {
  const [kind, setKind] = useState<InvestmentKind>('patrimonio');
  const [name, setName] = useState('');
  const [doc, setDoc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [method, setMethod] = useState<string | null>(known.at(-1)?.payment_method ?? null);
  const [description, setDescription] = useState('');
  const [rate, setRate] = useState('');
  const [term, setTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filled, setFilled] = useState<string | null>(null);

  const names = [...new Set(known.filter((k) => k.kind === kind).map((k) => k.investor_name))];
  function onName(v: string) {
    setName(v);
    const match = known.find((k) => k.investor_name.toUpperCase() === v.trim().toUpperCase());
    if (match) {
      if (!doc) setDoc(match.investor_doc ?? '');
      if (!method) setMethod(match.payment_method);
      if (match.kind === 'deuda' && !rate) setRate(String(match.interest_rate));
      setFilled(`Rellené con los datos de ${match.investor_name}.`);
    } else setFilled(null);
  }

  const input: InvestmentInput = {
    kind, investorName: name, investorDoc: doc || null, amount: num(amount), date, paymentMethod: method,
    description: description || null, interestRate: num(rate), termMonths: term ? Math.round(num(term)) : null,
  };
  const installment = kind === 'deuda' && input.termMonths ? monthlyInstallment(input.amount, input.interestRate, input.termMonths) : 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validateInvestment(input);
    if (problem) { setError(problem); return; }
    setSubmitting(true);
    try {
      await onSubmit(input);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      title="Registrar inversión"
      subtitle="El dinero entra a caja automáticamente"
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
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de inversión">
          {([
            ['patrimonio', 'Aporte de socio', 'Patrimonio: pasa a ser dueño de una parte'],
            ['deuda', 'Préstamo', 'Deuda: se devuelve con intereses'],
          ] as const).map(([k, label, hint]) => (
            <button key={k} type="button" aria-pressed={kind === k} data-testid={`inv-kind-${k}`} onClick={() => { setKind(k); setFilled(null); }}
              className={`min-h-[56px] rounded-card border-2 px-3 py-2 text-left ${kind === k ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink'}`}>
              <span className="block bb-display text-base font-semibold">{label}</span>
              <span className={`block bb-body text-xs ${kind === k ? 'text-paper' : 'text-ink-soft'}`}>{hint}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="bb-label" htmlFor="inv-name">{kind === 'deuda' ? '¿Quién presta?' : '¿Quién aporta?'}</label>
            <input id="inv-name" className="bb-input" list="inv-names" autoComplete="off" value={name} onChange={(e) => onName(e.target.value)} />
            <datalist id="inv-names">{names.map((n) => <option key={n} value={n} />)}</datalist>
          </div>
          <div>
            <label className="bb-label" htmlFor="inv-doc">DNI / RUC <span className="text-ink-soft font-normal">— opcional</span></label>
            <input id="inv-doc" className="bb-input bb-mono" inputMode="numeric" value={doc} onChange={(e) => setDoc(e.target.value)} />
          </div>
        </div>
        {filled && <p className="bb-body text-xs text-belt-en_revision -mt-3" data-testid="inv-filled">✓ {filled}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="bb-label" htmlFor="inv-amount">Monto (S/)</label>
            <input id="inv-amount" className="bb-input bb-mono text-lg" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="bb-label" htmlFor="inv-date">Fecha</label>
            <input id="inv-date" type="date" className="bb-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {kind === 'deuda' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="bb-label" htmlFor="inv-rate">Interés al año (%)</label>
              <input id="inv-rate" className="bb-input bb-mono" inputMode="decimal" placeholder="Ej.: 12" value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
            <div>
              <label className="bb-label" htmlFor="inv-term">Plazo (meses) <span className="text-ink-soft font-normal">— opcional</span></label>
              <input id="inv-term" className="bb-input bb-mono" inputMode="numeric" placeholder="Ej.: 12" value={term} onChange={(e) => setTerm(e.target.value)} />
            </div>
            {installment > 0 && (
              <p className="col-span-2 bb-body text-xs text-ink-soft bg-canvas rounded-card px-3 py-2" data-testid="inv-installment">
                Cuota aproximada: <strong className="text-ink">{formatPen(installment)}</strong> al mes durante {input.termMonths} meses.
              </p>
            )}
          </div>
        )}

        <div>
          <p className="bb-label">Medio <span className="text-ink-soft font-normal">— opcional</span></p>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(method === m ? null : m)} className={chip(method === m)}>{m}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="bb-label" htmlFor="inv-desc">Nota <span className="text-ink-soft font-normal">— opcional</span></label>
          <input id="inv-desc" className="bb-input" placeholder={kind === 'deuda' ? 'Ej.: Préstamo para equipos' : 'Ej.: Inversión como socio'} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {error && <p role="alert" className="bb-body text-sm text-rust">{error}</p>}
      </form>
    </ModalShell>
  );
}
