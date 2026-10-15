// features/auth/components/LoginPage.tsx — "¿Quién eres?": elige un usuario para entrar.
import { useAuth } from '../hooks/useAuth';
import { ROLE_CODE } from '../../../types/database';

export function LoginPage() {
  const { users, signIn, loading, error } = useAuth();

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
                  {u.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
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
      </div>
    </main>
  );
}
