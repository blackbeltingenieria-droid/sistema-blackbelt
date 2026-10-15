// features/users/UsersPage.tsx
// Equipo (solo Admin):
//  - Especialistas = las personas que trabajan (reciben tareas y registran horas). Se agregan aquí.
//  - Usuarios = cuentas para entrar al sistema. Vincular cuenta ↔ especialista le dice al sistema
//    "esta cuenta es esta persona": así «Mi panel», Kanban y Horas muestran lo suyo.
// Al agregar un especialista se puede crear su usuario en el mismo paso (queda vinculado solo).

import { type FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { PageHeader } from '../../components/ui/PageHeader';
import { ROLE_CODE, type RoleCode } from '../../types/database';
import { BOOTSTRAP_ADMIN } from '../auth/services/auth-service';
import { useAuth } from '../auth/hooks/useAuth';
import { createSpecialist, setSpecialistActive, updateSpecialist } from '../kanban/services/kanban-service';
import type { Specialist } from '../kanban/types';
import { useUsers } from './hooks/useUsers';
import { createUser, linkSpecialist, type UserRow } from './services/user-service';

const btn = 'px-3 py-1.5 min-h-[36px] border border-line rounded-card bb-body text-xs hover:bg-canvas whitespace-nowrap';
const primary = 'min-h-[44px] sm:min-h-0 px-5 py-2.5 bg-gold text-ink rounded-card bb-body text-sm font-semibold hover:bg-gold/90';

interface SpecialistForm { id?: number; fullName: string; specialty: string; email: string; giveAccess: boolean; role: RoleCode }
/** Primer usuario del sistema (Gerente General). */
const FIRST_USER_NAME = 'Henry Torres Rivera';

const EMPTY_SPEC: SpecialistForm = { fullName: '', specialty: '', email: '', giveAccess: true, role: ROLE_CODE.COLABORADOR };

export function UsersPage() {
  const { user: me, refresh } = useAuth();
  const { users, specialists, loading, error, refetch } = useUsers();
  const [params] = useSearchParams();
  const [msg, setMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [specForm, setSpecForm] = useState<SpecialistForm | null>(null);
  const [access, setAccess] = useState<{ specialist: Specialist; email: string; role: RoleCode } | null>(null);
  const isBootstrap = me?.id === BOOTSTRAP_ADMIN.id;
  const [showUserForm, setShowUserForm] = useState(params.get('nuevo') === '1' || isBootstrap);
  // Primer acceso: el primer usuario es el Gerente General, Henry Torres Rivera (Administrador, vinculado a su especialista).
  const [userForm, setUserForm] = useState<{ fullName: string; email: string; role: RoleCode; specialistId: number }>({
    fullName: isBootstrap ? FIRST_USER_NAME : '', email: '', role: ROLE_CODE.ADMIN, specialistId: 0,
  });
  const firstUserSpecialist = specialists.find((s) => s.full_name.trim().toLowerCase() === FIRST_USER_NAME.toLowerCase());
  const formSpecialistId = isBootstrap && !userForm.specialistId && firstUserSpecialist ? firstUserSpecialist.id : userForm.specialistId;
  const taken = new Set(users.filter((u) => u.specialistId).map((u) => u.specialistId));
  const userOf = (specialistId: number): UserRow | undefined => users.find((u) => u.specialistId === specialistId);
  const active = specialists.filter((s) => s.active);
  const inactive = specialists.filter((s) => !s.active);

  async function run(action: () => Promise<string | void>) {
    setActionError(null); setMsg(null);
    try {
      const text = await action();
      await refetch();
      await refresh();
      if (text) setMsg(text);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo completar la acción.');
    }
  }

  const onLink = (userId: number, value: string) =>
    run(async () => { await linkSpecialist(userId, value ? Number(value) : null); return 'Vínculo guardado.'; });

  async function onSaveSpecialist(e: FormEvent) {
    e.preventDefault();
    if (!specForm) return;
    const f = specForm;
    if (!f.id && f.giveAccess && !f.email.trim()) { setActionError('Para que entre al sistema, escribe su correo.'); return; }
    await run(async () => {
      const payload = { full_name: f.fullName, specialty: f.specialty || null, email: f.email || null };
      if (f.id) {
        await updateSpecialist(f.id, payload);
        setSpecForm(null);
        return `Datos de «${f.fullName.trim()}» guardados.`;
      }
      const created = await createSpecialist(payload);
      if (f.giveAccess) {
        await createUser({ fullName: created.full_name, email: f.email, role: f.role, specialistId: created.id });
      }
      setSpecForm(null);
      return f.giveAccess
        ? `«${created.full_name}» agregado. Ya puede entrar al sistema y verá sus tareas y horas.`
        : `«${created.full_name}» agregado. Ya aparece para asignarle tareas y horas.`;
    });
  }

  async function onGiveAccess(e: FormEvent) {
    e.preventDefault();
    if (!access) return;
    const a = access;
    await run(async () => {
      await createUser({ fullName: a.specialist.full_name, email: a.email, role: a.role, specialistId: a.specialist.id });
      setAccess(null);
      return `«${a.specialist.full_name}» ya puede entrar al sistema.`;
    });
  }

  async function onCreateUser(e: FormEvent) {
    e.preventDefault();
    setActionError(null); setMsg(null);
    try {
      const created = await createUser({ ...userForm, specialistId: formSpecialistId || null });
      await refetch();
      // Desde el acceso inicial, pasa a usar el usuario recién creado (ya vinculado).
      await refresh(isBootstrap ? created.id : undefined);
      setUserForm({ fullName: '', email: '', role: ROLE_CODE.COLABORADOR, specialistId: 0 });
      setShowUserForm(false);
      setMsg(`Usuario «${created.fullName}» creado.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo crear el usuario.');
    }
  }

  const specCard = (s: Specialist) => {
    const u = userOf(s.id);
    return (
      <li key={s.id}>
        <Card padding="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3" data-testid={`specialist-${s.id}`}>
            <div className="min-w-0 flex-1">
              <p className="bb-body text-sm font-medium text-ink">{s.full_name}</p>
              <p className="bb-body text-xs text-ink-soft">{[s.specialty, s.email].filter(Boolean).join(' · ') || 'Sin especialidad'}</p>
              <p className="bb-body text-xs mt-1">
                {u
                  ? <span className="text-belt-en_revision">✓ Entra al sistema como {u.roleName} ({u.email})</span>
                  : <span className="text-ink-soft">No entra al sistema (solo se le asignan tareas y horas)</span>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {s.active && !u && (
                <button type="button" className={btn} onClick={() => setAccess({ specialist: s, email: s.email ?? '', role: ROLE_CODE.COLABORADOR })}>
                  Dar acceso
                </button>
              )}
              <button type="button" className={btn}
                onClick={() => setSpecForm({ id: s.id, fullName: s.full_name, specialty: s.specialty ?? '', email: s.email ?? '', giveAccess: false, role: ROLE_CODE.COLABORADOR })}>
                Editar
              </button>
              <button type="button" className={`${btn} ${s.active ? 'text-rust' : ''}`}
                onClick={() => void run(async () => {
                  await setSpecialistActive(s.id, !s.active);
                  return s.active ? `«${s.full_name}» desactivado. Sus horas y tareas pasadas se conservan.` : `«${s.full_name}» activado de nuevo.`;
                })}>
                {s.active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
          {access?.specialist.id === s.id && (
            <form onSubmit={onGiveAccess} className="grid grid-cols-1 sm:grid-cols-[1fr_12rem_auto] gap-3 items-end mt-3 pt-3 border-t border-line" noValidate>
              <div><label className="bb-label" htmlFor="acc-email">Correo para entrar</label>
                <input id="acc-email" className="bb-input" inputMode="email" value={access.email} onChange={(e) => setAccess({ ...access, email: e.target.value })} /></div>
              <div><label className="bb-label" htmlFor="acc-role">Puede ver</label>
                <select id="acc-role" className="bb-input" value={access.role} onChange={(e) => setAccess({ ...access, role: e.target.value as RoleCode })}>
                  <option value={ROLE_CODE.COLABORADOR}>Solo lo suyo (Colaborador)</option>
                  <option value={ROLE_CODE.ADMIN}>Todo (Administrador)</option>
                </select></div>
              <div className="flex gap-2">
                <button type="submit" className={primary}>Dar acceso</button>
                <button type="button" className={btn} onClick={() => setAccess(null)}>Cancelar</button>
              </div>
            </form>
          )}
        </Card>
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
        <PageHeader
          title="Equipo"
          subtitle="Las personas que trabajan (especialistas) y quién puede entrar al sistema (usuarios)."
          actions={
            <button type="button" data-testid="add-specialist" onClick={() => setSpecForm(specForm ? null : { ...EMPTY_SPEC })}
              className="flex items-center justify-center bg-gold text-ink px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-card bb-body text-sm font-semibold hover:bg-gold/90">
              {specForm && !specForm.id ? 'Cerrar' : '+ Agregar especialista'}
            </button>
          }
        />

        {error && <ErrorBanner message={error} onRetry={() => void refetch()} />}
        {actionError && <ErrorBanner message={actionError} onClose={() => setActionError(null)} />}
        {msg && <p role="status" className="bb-body text-sm text-ink bg-paper border border-line rounded-card px-4 py-2 mb-3" data-testid="users-msg">{msg}</p>}

        {isBootstrap && (
          <p className="bb-body text-sm text-ink bg-paper border border-gold rounded-card px-4 py-3 mb-4" data-testid="bootstrap-note">
            Primer acceso: crea el usuario del Gerente General, <strong>{FIRST_USER_NAME}</strong> (abajo, en «Usuarios»: ya está casi lleno, solo falta su correo). Al crearlo, la app entra con él.
          </p>
        )}

        <button type="button" onClick={() => setShowHelp((v) => !v)} aria-expanded={showHelp}
          className="bb-body text-sm text-ink underline underline-offset-4 mb-3">
          ¿Qué es un especialista, qué es un usuario y por qué se vinculan?
        </button>
        {showHelp && (
          <Card className="mb-4">
            <ul className="bb-body text-sm text-ink space-y-1.5" data-testid="team-help">
              <li>• <strong>Especialista:</strong> una persona que trabaja en los proyectos. Se le asignan tareas en el Kanban y se le registran horas.</li>
              <li>• <strong>Usuario:</strong> una cuenta para entrar al sistema (con un correo). Puede ser Administrador (ve todo) o Colaborador (ve solo lo suyo).</li>
              <li>• <strong>Por qué se vinculan:</strong> el vínculo le dice al sistema «esta cuenta es esta persona». Así, cuando un colaborador entra, ve solo sus tareas y registra sus propias horas. Sin vínculo, el sistema no sabe qué mostrarle.</li>
              <li>• Si un especialista no va a entrar al sistema (por ejemplo, un externo), no necesita usuario: igual se le pueden asignar tareas y horas.</li>
              <li>• Al agregar un especialista con «Va a entrar al sistema», el usuario se crea y se vincula solo.</li>
            </ul>
          </Card>
        )}

        {specForm && (
          <Card className="mb-4">
            <h2 className="bb-display font-semibold text-ink text-base mb-3">{specForm.id ? 'Editar especialista' : 'Nuevo especialista'}</h2>
            <form onSubmit={onSaveSpecialist} className="grid grid-cols-1 sm:grid-cols-2 gap-3" noValidate>
              <div><label className="bb-label" htmlFor="sp-name">Nombre completo</label>
                <input id="sp-name" className="bb-input" value={specForm.fullName} onChange={(e) => setSpecForm({ ...specForm, fullName: e.target.value })} /></div>
              <div><label className="bb-label" htmlFor="sp-spec">Especialidad <span className="text-ink-soft font-normal">— opcional</span></label>
                <input id="sp-spec" className="bb-input" placeholder="Ej.: Geofísica, Desarrollo web" value={specForm.specialty} onChange={(e) => setSpecForm({ ...specForm, specialty: e.target.value })} /></div>
              <div><label className="bb-label" htmlFor="sp-email">Correo {specForm.id || !specForm.giveAccess ? <span className="text-ink-soft font-normal">— opcional</span> : null}</label>
                <input id="sp-email" className="bb-input" inputMode="email" value={specForm.email} onChange={(e) => setSpecForm({ ...specForm, email: e.target.value })} /></div>
              {!specForm.id && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 bb-body text-sm text-ink min-h-[44px] sm:min-h-0 sm:mt-6">
                    <input type="checkbox" className="w-4 h-4 accent-ink" checked={specForm.giveAccess}
                      onChange={(e) => setSpecForm({ ...specForm, giveAccess: e.target.checked })} />
                    Va a entrar al sistema
                  </label>
                  {specForm.giveAccess && (
                    <select aria-label="Qué puede ver" className="bb-input" value={specForm.role} onChange={(e) => setSpecForm({ ...specForm, role: e.target.value as RoleCode })}>
                      <option value={ROLE_CODE.COLABORADOR}>Solo lo suyo (Colaborador)</option>
                      <option value={ROLE_CODE.ADMIN}>Todo (Administrador)</option>
                    </select>
                  )}
                </div>
              )}
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <button type="submit" className={primary}>{specForm.id ? 'Guardar cambios' : 'Agregar especialista'}</button>
                <button type="button" className={btn} onClick={() => setSpecForm(null)}>Cancelar</button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <p className="bb-body text-ink-soft text-center py-12 text-sm">Cargando…</p>
        ) : (
          <>
            <h2 className="bb-display font-semibold text-ink text-base mb-2">Especialistas ({active.length})</h2>
            {active.length === 0 ? (
              <Card className="mb-4"><p className="bb-body text-sm text-ink-soft text-center py-4">Aún no hay especialistas. Agrega el primero con «+ Agregar especialista».</p></Card>
            ) : (
              <ul className="space-y-3 mb-3" data-testid="specialists-list">{active.map(specCard)}</ul>
            )}
            {inactive.length > 0 && (
              <div className="mb-6">
                <button type="button" className="bb-body text-xs text-ink-soft underline" onClick={() => setShowInactive((v) => !v)}>
                  {showInactive ? 'Ocultar inactivos' : `Ver inactivos (${inactive.length})`}
                </button>
                {showInactive && <ul className="space-y-3 mt-3">{inactive.map(specCard)}</ul>}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 mt-6 mb-2">
              <h2 className="bb-display font-semibold text-ink text-base">Usuarios: cuentas para entrar ({users.length})</h2>
              <button type="button" className={btn} onClick={() => setShowUserForm((v) => !v)}>{showUserForm ? 'Cerrar' : '+ Agregar usuario'}</button>
            </div>

            {showUserForm && (
              <Card className="mb-4">
                <form onSubmit={onCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3" noValidate>
                  <div><label className="bb-label" htmlFor="u-name">Nombre</label>
                    <input id="u-name" className="bb-input" value={userForm.fullName} onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })} /></div>
                  <div><label className="bb-label" htmlFor="u-email">Correo</label>
                    <input id="u-email" className="bb-input" inputMode="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></div>
                  <div><label className="bb-label" htmlFor="u-role">Rol</label>
                    <select id="u-role" className="bb-input" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as RoleCode })}>
                      <option value={ROLE_CODE.ADMIN}>Administrador</option>
                      <option value={ROLE_CODE.COLABORADOR}>Colaborador</option>
                    </select></div>
                  <div><label className="bb-label" htmlFor="u-spec">Es el especialista</label>
                    <select id="u-spec" className="bb-input" value={formSpecialistId} onChange={(e) => setUserForm({ ...userForm, specialistId: Number(e.target.value) })}>
                      <option value={0}>Ninguno (no tiene tareas ni horas)</option>
                      {active.map((s) => <option key={s.id} value={s.id} disabled={taken.has(s.id)}>{s.full_name}{taken.has(s.id) ? ' (ya tiene usuario)' : ''}</option>)}
                    </select></div>
                  <div className="sm:col-span-2">
                    <button type="submit" className={`w-full sm:w-auto ${primary}`}>Crear usuario</button>
                  </div>
                </form>
              </Card>
            )}

            {users.length === 0 ? (
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
                          <label className="bb-label" htmlFor={`link-${u.id}`}>Es el especialista</label>
                          <select id={`link-${u.id}`} className="bb-input" value={u.specialistId ?? ''} onChange={(e) => void onLink(u.id, e.target.value)}>
                            <option value="">Ninguno</option>
                            {specialists.filter((s) => s.active || s.id === u.specialistId).map((s) => (
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
          </>
        )}
      </div>
    </div>
  );
}
