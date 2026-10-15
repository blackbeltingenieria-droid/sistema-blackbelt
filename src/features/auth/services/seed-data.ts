// features/auth/services/seed-data.ts — roles y usuarios de ejemplo (solo modo local sin Supabase).
// `userStore` es el estado en memoria: lo comparten el login y la gestión de usuarios.

import { ROLE_CODE } from '../../../types/database';
import type { DbRole, DbUser } from '../../../types/database';
import { demoUsers } from '../../demo/demo-data';

export const SEED_ROLES: DbRole[] = [
  { id: 1, code: ROLE_CODE.ADMIN, name: 'Administrador' },
  { id: 2, code: ROLE_CODE.COLABORADOR, name: 'Colaborador' },
];

// specialist_id referencia a los especialistas del Kanban.
// Henry Torres Rivera (Gerente General) es el primer usuario del sistema: Administrador y su propio especialista.
const BASE_SEED_USERS: DbUser[] = [
  { id: 1, email: 'henry@demo.local',  full_name: 'Henry Torres Rivera',      role_id: 1, specialist_id: 1,    active: true },
  { id: 2, email: 'marco@demo.local',  full_name: 'Marco Guzmán',             role_id: 2, specialist_id: 3,    active: true },
  { id: 3, email: 'sofia@demo.local',  full_name: 'Sofía Castro',             role_id: 2, specialist_id: 4,    active: true },
];

export const SEED_USERS: DbUser[] = demoUsers ?? BASE_SEED_USERS;

export const userStore = { users: SEED_USERS.map((u) => ({ ...u })) };
