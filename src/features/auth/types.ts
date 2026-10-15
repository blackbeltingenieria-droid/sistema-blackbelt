// features/auth/types.ts
import type { DbRole, DbUser, RoleCode } from '../../types/database';

export type { RoleCode };

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: RoleCode;
  specialistId: number | null;
}

export type Role = DbRole;
export type UserRecord = DbUser;
