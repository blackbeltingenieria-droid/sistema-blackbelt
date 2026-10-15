// features/auth/access.ts
// Qué rutas ve cada rol. Admin: acceso total. Colaborador: solo su panel, su Kanban y sus horas.

import { ROLE_CODE } from '../../types/database';
import type { RoleCode } from './types';

export const ROUTE_ACCESS: Record<string, RoleCode[]> = {
  '/dashboard':        [ROLE_CODE.ADMIN],
  '/clients-projects': [ROLE_CODE.ADMIN],
  '/movements':        [ROLE_CODE.ADMIN],
  '/budgets':          [ROLE_CODE.ADMIN],
  '/results-cash':     [ROLE_CODE.ADMIN],
  '/users':            [ROLE_CODE.ADMIN],
  '/my':               [ROLE_CODE.ADMIN, ROLE_CODE.COLABORADOR],
  '/kanban':           [ROLE_CODE.ADMIN, ROLE_CODE.COLABORADOR],
  '/work-hours':       [ROLE_CODE.ADMIN, ROLE_CODE.COLABORADOR],
};

export function canAccess(role: RoleCode | null | undefined, path: string): boolean {
  if (!role) return false;
  const key = Object.keys(ROUTE_ACCESS).find((p) => path === p || path.startsWith(`${p}/`));
  return key ? ROUTE_ACCESS[key].includes(role) : false;
}

/** Página de inicio de cada rol. */
export function homeFor(role: RoleCode): string {
  return role === ROLE_CODE.ADMIN ? '/dashboard' : '/my';
}
