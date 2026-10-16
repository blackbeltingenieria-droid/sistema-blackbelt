// features/excel-data/excel-local.ts
// Los datos reales del Excel como filas de la base, con los ids del catálogo local.
// Son los datos de `npm run dev` sin Supabase (la nube se carga con supabase/seed/excel-02-cargar-datos.sql).

import type {
  DbClient, DbInvestment, DbLaborContract, DbMovement, DbProject, DbProjectPayment, DbSpecialist, DbUser,
} from '../../types/database';
import { EMPTY_MODE } from '../../lib/demo-mode';
import { SEED_AREAS, SEED_BUSINESS_UNITS, SEED_COST_CATEGORIES } from '../catalogs/services/seed-data';
import { XLS_CLIENTS, XLS_INVESTMENTS, XLS_LABOR_CONTRACTS, XLS_MOVEMENTS, XLS_PAYMENTS, XLS_PROJECTS, XLS_SPECIALISTS } from './excel-dataset';

/** Id local de un código de catálogo (UN03, U03-MET, MO…). Con `npm run dev:vacio` los datos del Excel quedan vacíos. */
const idOf = <T extends { id: number; code: string }>(list: T[], code: string): number => {
  const found = list.find((x) => x.code === code);
  if (!found) throw new Error(`Código de catálogo desconocido: ${code}`);
  return found.id;
};
const unitId = (c: string) => idOf(SEED_BUSINESS_UNITS, c);
const areaId = (c: string) => idOf(SEED_AREAS, c);
const catId = (c: string) => idOf(SEED_COST_CATEGORIES, c);

export const EXCEL_DB_CLIENTS: DbClient[] = EMPTY_MODE ? [] : XLS_CLIENTS.map((c) => ({
  id: c.id, name: c.name, client_type: 'Persona', doc_number: c.doc, phone: c.phone, email: null,
  location: null, notes: c.institution, created_at: '2026-09-01T00:00:00Z',
}));

export const EXCEL_DB_PROJECTS: DbProject[] = EMPTY_MODE ? [] : XLS_PROJECTS.map((p) => ({
  id: p.id, code: p.code, client_id: p.clientId, business_unit_id: unitId(p.unitCode), area_id: areaId(p.areaCode),
  name: p.name, service: p.service, manager: p.manager, start_date: p.start, end_date: p.end,
  contracted_amount: p.contracted, status: p.status, notes: p.notes, contract_url: null,
}));

export const EXCEL_DB_PAYMENTS: DbProjectPayment[] = EMPTY_MODE ? [] : XLS_PAYMENTS.map((p) => ({
  id: p.id, project_id: p.projectId, amount: p.amount, payment_date: p.date, payment_method: p.method,
}));

export const EXCEL_DB_SPECIALISTS: DbSpecialist[] = XLS_SPECIALISTS.map((s) => ({
  id: s.id, full_name: s.name, specialty: s.specialty, email: null, active: true,
}));

export const EXCEL_DB_MOVEMENTS: DbMovement[] = EMPTY_MODE ? [] : XLS_MOVEMENTS.map((m) => ({
  id: m.id, movement_code: m.code, movement_date: m.date, record_type: m.type, amount: m.amount,
  business_unit_id: unitId(m.unitCode), area_id: areaId(m.areaCode), responsible: m.responsible,
  cost_category_id: catId(m.categoryCode), expense_class: m.cls, project_id: m.projectId,
  counterparty: m.counterparty, detail: m.detail, payment_method: m.method, voucher_number: null,
  status: 'VALIDADO', notes: m.notes,
}));

export const EXCEL_DB_INVESTMENTS: DbInvestment[] = EMPTY_MODE ? [] : XLS_INVESTMENTS.map((i) => ({
  id: i.id, code: i.code, kind: i.kind, investor_name: i.name, investor_doc: i.doc, amount: i.amount,
  investment_date: i.date, payment_method: i.method, description: i.description, interest_rate: 0, term_months: null,
}));

export const EXCEL_DB_LABOR_CONTRACTS: DbLaborContract[] = EMPTY_MODE ? [] : XLS_LABOR_CONTRACTS.map((c) => ({
  id: c.id, code: c.code, specialist_id: c.specialistId, worker_name: c.name, worker_doc: c.doc,
  business_unit_id: unitId(c.unitCode), area_id: areaId(c.areaCode), project_id: c.projectId, client_label: c.clientLabel,
  service: c.service, description: c.description, contract_type: c.type, start_date: c.start, end_date: c.end,
  agreed_amount: c.agreed, active: true, notes: `Excel TABLA_M.O fila ${c.row}`,
}));

/** Henry Torres Rivera (Gerente General) es el primer usuario: Administrador y su propio especialista. */
export const EXCEL_DB_USERS: DbUser[] = [
  { id: 1, email: 'henry@demo.local', full_name: 'Henry Torres Rivera', role_id: 1, specialist_id: 1, active: true },
];

/** El Excel calcula la caja sin saldo inicial: fondo = ingresos + inversión − egresos. */
export const EXCEL_OPENING_CASH = 0;
