// ─── Feature-local types for clients-projects ───────────────────────────────
// View-models enriquecidos derivados de las tablas DB + campos calculados.
// Saldo pendiente calculado en el servicio, nunca como columna en la BD.

import type {
  DbBusinessUnit,
  DbClient,
  DbProjectPayment,
  ProjectStatus,
} from '../../types/database';

export type { ProjectStatus };

/** Client as returned by getClients() */
export interface Client extends DbClient {}

/** Business unit (catalog Modelo C) */
export interface BusinessUnit extends DbBusinessUnit {}

/** Project enriched with related data and calculated saldo pendiente */
export interface ProjectDetail {
  id: number;
  code?: string | null;
  clientId: number;
  clientName: string;
  clientDocNumber: string | null;
  clientType?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  businessUnitId: number;
  businessUnitCode: string;
  businessUnitName: string;
  businessUnitColor: string;
  name: string;
  service: string | null;
  manager?: string | null;
  startDate: string | null;
  endDate: string | null;
  contractedAmount: number;
  paidAmount: number;        // suma de project_payments.amount — calculado en servicio
  pendingBalance: number;    // contractedAmount - paidAmount — calculado en servicio
  status: ProjectStatus;
  notes?: string | null;
  contractUrl?: string | null;
  payments: DbProjectPayment[];
}

/** Minimal row for the listing table */
export interface ProjectRow {
  id: number;
  code?: string | null;
  clientId: number;
  clientName: string;
  projectName: string;
  businessUnitId: number;
  businessUnitCode: string;
  businessUnitName: string;
  businessUnitColor: string;
  status: ProjectStatus;
  contractedAmount: number;
  paidAmount: number;
  pendingBalance: number;
}

/** Payload for createProject form */
export interface CreateProjectPayload {
  code?: string;
  clientId: number | 'new';
  newClientName?: string;
  newClientDocNumber?: string;
  newClientType?: string;
  newClientPhone?: string;
  newClientEmail?: string;
  businessUnitId: number;
  areaId?: number | null;
  name: string;
  service: string;
  manager?: string;
  contractedAmount: number;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  notes?: string;
  contractUrl?: string;
}
