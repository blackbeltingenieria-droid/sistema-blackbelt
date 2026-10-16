// features/auth/services/seed-data.ts — roles y usuarios de ejemplo (solo modo local sin Supabase).
// `userStore` es el estado en memoria: lo comparten el login y la gestión de usuarios.

import { ROLE_CODE } from '../../../types/database';
import type { DbRole, DbUser } from '../../../types/database';
import { demoUsers } from '../../demo/demo-data';
import { EXCEL_DB_USERS } from '../../excel-data/excel-local';

export const SEED_ROLES: DbRole[] = [
  { id: 1, code: ROLE_CODE.ADMIN, name: 'Administrador' },
  { id: 2, code: ROLE_CODE.COLABORADOR, name: 'Colaborador' },
];

// Sin Supabase: Henry Torres Rivera (Gerente General), primer usuario del sistema.
export const SEED_USERS: DbUser[] = demoUsers ?? EXCEL_DB_USERS;

export const userStore = { users: SEED_USERS.map((u) => ({ ...u })) };
