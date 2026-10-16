// features/auth/components/ChangePasswordModal.tsx — cada persona cambia su propia contraseña.
import { type FormEvent, useState } from 'react';
import { ModalShell } from '../../../components/ui/ModalShell';
import { MIN_PASSWORD, changeOwnPassword, validatePassword } from '../services/login-service';

const FORM_ID = 'change-password-form';

export function ChangePasswordModal({ email, onClose }: { email: string; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = !current ? 'Escribe tu contraseña actual.' : validatePassword(next) ?? (next !== repeat ? 'Las dos contraseñas nuevas no son iguales.' : null);
    if (problem) { setError(problem); return; }
    setBusy(true); setError(null);
    try {
      await changeOwnPassword(email, current, next);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setBusy(false);
    }
  }

  const field = (id: string, label: string, value: string, set: (v: string) => void, auto: string) => (
    <div>
      <label className="bb-label" htmlFor={id}>{label}</label>
      <input id={id} type="password" autoComplete={auto} className="bb-input" value={value} onChange={(e) => set(e.target.value)} />
    </div>
  );

  return (
    <ModalShell title="Mi contraseña" subtitle={email} onClose={onClose}
      footer={done ? (
        <button type="button" onClick={onClose} className="flex-1 min-h-[44px] sm:min-h-0 py-2.5 bg-gold text-ink rounded-card bb-body text-sm font-semibold">Listo</button>
      ) : (
        <>
          <button type="button" onClick={onClose} className="flex-1 min-h-[44px] sm:min-h-0 py-2.5 border border-line rounded-card bb-body text-sm text-ink-soft">Cancelar</button>
          <button type="submit" form={FORM_ID} disabled={busy} className="flex-1 min-h-[44px] sm:min-h-0 py-2.5 bg-gold text-ink rounded-card bb-body text-sm font-semibold disabled:opacity-50">
            {busy ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </>
      )}>
      {done ? (
        <p role="status" className="bb-body text-sm text-ink" data-testid="password-changed">✓ Listo. La próxima vez entra con tu nueva contraseña.</p>
      ) : (
        <form id={FORM_ID} onSubmit={submit} className="space-y-4" noValidate>
          {field('pw-current', 'Contraseña actual', current, setCurrent, 'current-password')}
          {field('pw-new', `Nueva contraseña (mínimo ${MIN_PASSWORD} caracteres)`, next, setNext, 'new-password')}
          {field('pw-repeat', 'Repite la nueva contraseña', repeat, setRepeat, 'new-password')}
          {error && <p role="alert" className="bb-body text-sm text-rust">{error}</p>}
        </form>
      )}
    </ModalShell>
  );
}
