// features/auth/services/auth-service.ts
// Sesión y usuarios. IMPORTANTE: mientras la base use políticas abiertas (anon_all_*) y no
// exista Supabase Auth, el rol ordena la interfaz y protege las rutas, pero NO es una barrera
// de seguridad de datos. La integración con Supabase Auth queda como pendiente.

import { isSupabaseConfigured, supabase } from '../../../lib/supabase';
import { ROLE_CODE } from '../../../types/database';
import type { DbRole, DbUser } from '../../../types/database';
import type { AuthUser } from '../types';
import { SEED_ROLES, userStore } from './seed-data';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- patrón del proyecto
const sb = () => supabase as any;

const SESSION_KEY = 'bb.session.userId';

/** Si la tabla `users` aún está vacía (migración recién aplicada) nadie queda bloqueado. */
export const BOOTSTRAP_ADMIN: AuthUser = {
  id: 0,
  email: 'admin@blackbelt.local',
  fullName: 'Administrador (acceso inicial)',
  role: ROLE_CODE.ADMIN,
  specialistId: null,
};

function toAuthUser(u: DbUser, roles: DbRole[]): AuthUser | null {
  const role = roles.find((r) => r.id === u.role_id);
  if (!role) return null;
  return { id: u.id, email: u.email, fullName: u.full_name, role: role.code, specialistId: u.specialist_id };
}

/** Usuarios activos con los que se puede entrar. */
export async function getLoginUsers(): Promise<AuthUser[]> {
  if (!isSupabaseConfigured()) {
    return userStore.users.filter((u) => u.active).map((u) => toAuthUser(u, SEED_ROLES)).filter((u): u is AuthUser => u !== null);
  }
  const [usersRes, rolesRes] = await Promise.all([
    sb().from('users').select('*').eq('active', true).order('id'),
    sb().from('roles').select('*'),
  ]);
  // Tablas aún sin migrar → acceso inicial de administrador (no bloquea al equipo).
  if (usersRes.error || rolesRes.error) return [BOOTSTRAP_ADMIN];
  const list = ((usersRes.data ?? []) as DbUser[])
    .map((u) => toAuthUser(u, (rolesRes.data ?? []) as DbRole[]))
    .filter((u): u is AuthUser => u !== null);
  return list.length ? list : [BOOTSTRAP_ADMIN];
}

export function readStoredUserId(): number | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    const n = raw === null ? NaN : Number(raw);
    return Number.isInteger(n) ? n : null;
  } catch {
    return null;
  }
}

export function storeUserId(id: number | null): void {
  try {
    if (id === null) window.localStorage.removeItem(SESSION_KEY);
    else window.localStorage.setItem(SESSION_KEY, String(id));
  } catch {
    /* almacenamiento no disponible: la sesión vive solo en memoria */
  }
}
