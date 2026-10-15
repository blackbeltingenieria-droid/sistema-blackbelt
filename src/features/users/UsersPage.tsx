// features/users/UsersPage.tsx
// Gestión simple de usuarios (solo Admin): vincular cada usuario con un especialista y agregar usuarios.
// El vínculo hace que «Mi panel», Kanban y Horas muestren lo de esa persona.

import { type FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { PageHeader } from '../../components/ui/PageHeader';
import { ROLE_CODE, type RoleCode } from '../../types/database';
import { BOOTSTRAP_ADMIN } from '../auth/services/auth-service';
import { useAuth } from '../auth/hooks/useAuth';
import { useUsers } from './hooks/useUsers';
import { createUser, linkSpecialist } from './services/user-service';

export function UsersPage() {
  const { user: me, refresh } = useAuth();
  const { users, specialists, loading, error, refetch } = useUsers();
  const [params] = useSearchParams();
  const [msg, setMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(params.get('nuevo') === '1');
  const [form, setForm] = useState<{ fullName: string; email: string; role: RoleCode; specialistId: number }>({
    fullName: '', email: '', role: ROLE_CODE.ADMIN, specialistId: 0,
  });
  const isBootstrap = me?.id === BOOTSTRAP_ADMIN.id;
  const taken = new Set(users.filter((u) => u.specialistId).map((u) => u.specialistId));

  async function onLink(userId: number, value: string) {
    setActionError(null); setMsg(null);
    try {
      await linkSpecialist(userId, value ? Number(value) : null);
      await refetch();
      await refresh(); // «Mi panel» del usuario activo se actualiza
      setMsg('Vínculo guardado.');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo guardar el vínculo.');
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setActionError(null); setMsg(null);
    try {
      const created = await createUser({ ...form, specialistId: form.specialistId || null });
      await refetch();
      // Desde el acceso inicial, pasa a usar el usuario recién creado (ya vinculado).
      await refresh(isBootstrap ? created.id : undefined);
      setForm({ fullName: '', email: '', role: ROLE_CODE.COLABORADOR, specialistId: 0 });
      setShowForm(false);
      setMsg(`Usuario «${created.fullName}» creado.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo crear el usuario.');
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
        <PageHeader
          title="Usuarios"
          subtitle="Vincula a cada persona con su especialista para que vea sus tareas y horas."
          actions={
            <button type="button" onClick={() => setShowForm((v) => !v)}
              className="flex items-center justify-center bg-gold text-ink px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-card bb-body text-sm font-semibold hover:bg-gold/90">
              {showForm ? 'Cerrar' : '+ Agregar usuario'}
            </button>
          }
        />

        {error && <ErrorBanner message={error} onRetry={() => void refetch()} />}
        {actionError && <ErrorBanner message={actionError} onClose={() => setActionError(null)} />}
        {msg && <p role="status" className="bb-body text-sm text-ink bg-paper border border-line rounded-card px-4 py-2 mb-3" data-testid="users-msg">{msg}</p>}

        {isBootstrap && (
          <p className="bb-body text-sm text-ink bg-paper border border-gold rounded-card px-4 py-3 mb-4" data-testid="bootstrap-note">
            Estás con el acceso inicial. Crea tu propio usuario (puedes vincularlo a un especialista) y la app entrará con él.
          </p>
        )}

        {showForm && (
          <Card className="mb-4">
            <form onSubmit={onCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3" noValidate>
              <div><label className="bb-label" htmlFor="u-name">Nombre</label>
                <input id="u-name" className="bb-input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
              <div><label className="bb-label" htmlFor="u-email">Correo</label>
                <input id="u-email" className="bb-input" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="bb-label" htmlFor="u-role">Rol</label>
                <select id="u-role" className="bb-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as RoleCode })}>
                  <option value={ROLE_CODE.ADMIN}>Administrador</option>
                  <option value={ROLE_CODE.COLABORADOR}>Colaborador</option>
                </select></div>
              <div><label className="bb-label" htmlFor="u-spec">Especialista vinculado</label>
                <select id="u-spec" className="bb-input" value={form.specialistId} onChange={(e) => setForm({ ...form, specialistId: Number(e.target.value) })}>
                  <option value={0}>Sin vincular</option>
                  {specialists.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select></div>
              <div className="sm:col-span-2">
                <button type="submit" className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-5 py-2.5 bg-gold text-ink rounded-card bb-body text-sm font-semibold hover:bg-gold/90">Crear usuario</button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <p className="bb-body text-ink-soft text-center py-12 text-sm">Cargando…</p>
        ) : users.length === 0 ? (
          <Card><p className="bb-body text-sm text-ink-soft text-center py-6">Aún no hay usuarios. Agrega el primero con «+ Agregar usuario».</p></Card>
        ) : (
          <ul className="space-y-3" data-testid="users-list">
            {users.map((u) => (
              <li key={u.id}>
                <Card padding="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="bb-body text-sm font-medium text-ink truncate">{u.fullName}{me?.id === u.id && <span className="bb-mono text-[10px] text-ink-soft ml-2">(tú)</span>}</p>
                      <p className="bb-mono text-[11px] text-ink-soft truncate">{u.email}</p>
                      <span className={`inline-block mt-1 bb-mono text-[10px] px-2 py-0.5 rounded-full ${u.role === ROLE_CODE.ADMIN ? 'bg-ink text-paper' : 'bg-belt-backlog text-ink'}`}>{u.roleName}</span>
                    </div>
                    <div className="sm:w-72">
                      <label className="bb-label" htmlFor={`link-${u.id}`}>Especialista vinculado</label>
                      <select id={`link-${u.id}`} className="bb-input" value={u.specialistId ?? ''} onChange={(e) => void onLink(u.id, e.target.value)}>
                        <option value="">Sin vincular</option>
                        {specialists.map((s) => (
                          <option key={s.id} value={s.id} disabled={taken.has(s.id) && u.specialistId !== s.id}>
                            {s.full_name}{taken.has(s.id) && u.specialistId !== s.id ? ' (ya vinculado)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
