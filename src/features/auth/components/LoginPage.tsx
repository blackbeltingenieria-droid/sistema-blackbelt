// features/auth/components/LoginPage.tsx — Entrar al sistema.
// Web: correo y contraseña. Local sin Supabase: "¿Quién eres?" (elige un usuario).
import { type FormEvent, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ROLE_CODE } from '../../../types/database';

export function LoginPage() {
  const { users, signIn, signInWithPassword, passwordLogin, loading, error } = useAuth();

  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex flex-col gap-0.5 w-2" aria-hidden="true">
            <span className="block h-1 rounded-sm bg-belt-backlog" />
            <span className="block h-1 rounded-sm bg-belt-por_hacer" />
            <span className="block h-1 rounded-sm bg-belt-en_curso" />
            <span className="block h-1 rounded-sm bg-belt-en_revision" />
            <span className="block h-1 rounded-sm bg-belt-hecho" />
          </div>
          <div>
            <h1 className="bb-display font-bold text-ink text-xl leading-none">BLACKBELT</h1>
            <p className="bb-body text-[10px] text-ink-soft tracking-widest uppercase mt-1">Group · Sistema interno</p>
          </div>
        </div>

        {passwordLogin ? <PasswordForm onSubmit={signInWithPassword} /> : (<>
        <h2 className="bb-display font-semibold text-ink text-lg mb-1">¿Quién eres?</h2>
        <p className="bb-body text-sm text-ink-soft mb-4">Elige tu usuario para entrar. Cada rol ve solo lo que le corresponde.</p>

        {loading && <p className="bb-body text-sm text-ink-soft">Cargando usuarios…</p>}
        {error && <p role="alert" className="bb-body text-sm text-rust">{error}</p>}

        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => signIn(u.id)}
                className="w-full flex items-center gap-3 text-left bg-paper border border-line rounded-card px-4 py-3 min-h-[56px] hover:border-ink transition-colors"
              >
                <span className="w-9 h-9 rounded-full bg-ink text-paper bb-display font-bold text-xs flex items-center justify-center shrink-0">
                  {u.fullName.replace(/^DEMO - /, '').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block bb-body text-sm font-medium text-ink truncate">{u.fullName}</span>
                  <span className="block bb-mono text-[11px] text-ink-soft truncate">{u.email}</span>
                </span>
                <span className={`bb-mono text-[10px] px-2 py-0.5 rounded-full ${u.role === ROLE_CODE.ADMIN ? 'bg-ink text-paper' : 'bg-belt-backlog text-ink'}`}>
                  {u.role === ROLE_CODE.ADMIN ? 'Admin' : 'Colaborador'}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="bb-body text-[11px] text-ink-soft mt-4">Modo local de prueba: sin contraseña. En la web se entra con correo y contraseña.</p>
        </>)}
      </div>
    </main>
  );
}

function PasswordForm({ onSubmit }: { onSubmit: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Escribe tu correo y tu contraseña.'); return; }
    setBusy(true); setError(null);
    try {
      await onSubmit(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-paper border border-line rounded-card p-5 space-y-4" noValidate data-testid="login-form">
      <div>
        <h2 className="bb-display font-semibold text-ink text-lg">Entrar</h2>
        <p className="bb-body text-sm text-ink-soft">Con el correo y la contraseña que te dio el administrador.</p>
      </div>
      <div>
        <label className="bb-label" htmlFor="login-email">Correo</label>
        <input id="login-email" type="email" autoComplete="username" inputMode="email" className="bb-input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="bb-label" htmlFor="login-password">Contraseña</label>
        <div className="flex gap-2">
          <input id="login-password" type={show ? 'text' : 'password'} autoComplete="current-password" className="bb-input flex-1" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" className="px-3 min-h-[44px] sm:min-h-0 border border-line rounded-card bb-body text-xs" aria-pressed={show} onClick={() => setShow((v) => !v)}>
            {show ? 'Ocultar' : 'Ver'}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="bb-body text-sm text-rust" data-testid="login-error">{error}</p>}
      <button type="submit" disabled={busy} className="w-full min-h-[44px] bg-gold text-ink rounded-card bb-body text-sm font-semibold hover:bg-gold/90 disabled:opacity-50">
        {busy ? 'Entrando…' : 'Entrar'}
      </button>
      <p className="bb-body text-xs text-ink-soft">¿Olvidaste tu contraseña? Pídele al administrador que te ponga una nueva en <strong>Equipo</strong>.</p>
    </form>
  );
}
