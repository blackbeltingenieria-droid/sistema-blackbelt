// features/users/services/user-service.ts
// Gestión de usuarios: listar, vincular con un especialista y crear. Sin Supabase: memoria.
// (El rol ordena la interfaz; no es seguridad de datos mientras RLS siga abierto.)

import { isSupabaseConfigured, supabase } from '../../../lib/supabase';
import { ROLE_CODE, type DbRole, type DbUser, type RoleCode } from '../../../types/database';
import { SEED_ROLES, userStore } from '../../auth/services/seed-data';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- patrón del proyecto
const sb = () => supabase as any;

export interface UserRow {
  id: number;
  email: string;
  fullName: string;
  role: RoleCode;
  roleName: string;
  specialistId: number | null;
  active: boolean;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  role: RoleCode;
  specialistId: number | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateNewUser(p: CreateUserPayload, existingEmails: string[]): string | null {
  if (!p.fullName.trim()) return 'Escribe el nombre.';
  if (!EMAIL_RE.test(p.email.trim())) return 'Escribe un correo válido.';
  if (existingEmails.some((e) => e.toLowerCase() === p.email.trim().toLowerCase())) return 'Ya existe un usuario con ese correo.';
  return null;
}

function toRow(u: DbUser, roles: DbRole[]): UserRow | null {
  const role = roles.find((r) => r.id === u.role_id);
  if (!role) return null;
  return { id: u.id, email: u.email, fullName: u.full_name, role: role.code, roleName: role.name, specialistId: u.specialist_id, active: u.active };
}

async function fetchRoles(): Promise<DbRole[]> {
  if (!isSupabaseConfigured()) return SEED_ROLES;
  const { data, error } = await sb().from('roles').select('*');
  if (error) throw new Error(`getUsers/roles: ${error.message}`);
  return (data ?? []) as DbRole[];
}

export async function getUserRows(): Promise<UserRow[]> {
  const roles = await fetchRoles();
  if (!isSupabaseConfigured()) {
    return userStore.users.map((u) => toRow(u, roles)).filter((u): u is UserRow => u !== null);
  }
  const { data, error } = await sb().from('users').select('*').order('id');
  if (error) throw new Error(`No se pudieron leer los usuarios (¿aplicaste la migración?): ${error.message}`);
  return ((data ?? []) as DbUser[]).map((u) => toRow(u, roles)).filter((u): u is UserRow => u !== null);
}

/** Vincula (o desvincula con null) un usuario con un especialista. */
export async function linkSpecialist(userId: number, specialistId: number | null): Promise<void> {
  if (!isSupabaseConfigured()) {
    const u = userStore.users.find((x) => x.id === userId);
    if (!u) throw new Error('Usuario no encontrado.');
    u.specialist_id = specialistId;
    return;
  }
  const { error } = await sb().from('users').update({ specialist_id: specialistId }).eq('id', userId);
  if (error) throw new Error(`linkSpecialist: ${error.message}`);
}

export async function createUser(payload: CreateUserPayload): Promise<UserRow> {
  const roles = await fetchRoles();
  const existing = (await getUserRows().catch(() => [])).map((u) => u.email);
  const problem = validateNewUser(payload, existing);
  if (problem) throw new Error(problem);
  const role = roles.find((r) => r.code === payload.role) ?? roles.find((r) => r.code === ROLE_CODE.COLABORADOR);
  if (!role) throw new Error('No existe el rol elegido.');
  const base = { email: payload.email.trim(), full_name: payload.fullName.trim(), role_id: role.id, specialist_id: payload.specialistId, active: true };

  if (!isSupabaseConfigured()) {
    const id = userStore.users.reduce((m, u) => Math.max(m, u.id), 0) + 1;
    const row: DbUser = { id, ...base };
    userStore.users.push(row);
    return toRow(row, roles) as UserRow;
  }
  const { data, error } = await sb().from('users').insert(base).select('*').single();
  if (error) throw new Error(`createUser: ${error.message}`);
  return toRow(data as DbUser, roles) as UserRow;
}
