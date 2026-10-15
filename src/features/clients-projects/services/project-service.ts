// ─── clients-projects service layer ─────────────────────────────────────────
// All Supabase calls go here. Components never call supabase.from() directly.
// Calculated values (pendingBalance, paidAmount) are computed here, never stored.

import { calcBalances } from '../domain/balance';
import { supabase } from '../../../lib/supabase';
import type { DbClient, DbProject, DbProjectPayment } from '../../../types/database';
import type {
  BusinessUnit,
  Client,
  CreateProjectPayload,
  ProjectDetail,
  ProjectRow,
} from '../types';
import {
  SEED_BUSINESS_UNITS,
  SEED_CLIENTS,
  SEED_PAYMENTS,
  SEED_PROJECTS,
} from './seed-data';

// ─── Helper: detect whether Supabase is actually configured ─────────────────
function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return Boolean(url && !url.includes('placeholder') && url.startsWith('https://'));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any;

// ─── Helper: compute pendingBalance in the service, never as DB column ───────

// ─── getBusinessUnits ────────────────────────────────────────────────────────
export async function getBusinessUnits(): Promise<BusinessUnit[]> {
  if (!isSupabaseConfigured()) return SEED_BUSINESS_UNITS;

  const { data, error } = await sb()
    .from('business_units')
    .select('*')
    .order('id');

  if (error) throw new Error(`getBusinessUnits: ${error.message}`);
  return (data ?? []) as BusinessUnit[];
}

// ─── getClients ──────────────────────────────────────────────────────────────
export async function getClients(): Promise<Client[]> {
  if (!isSupabaseConfigured()) return SEED_CLIENTS;

  const { data, error } = await sb()
    .from('clients')
    .select('*')
    .order('name');

  if (error) throw new Error(`getClients: ${error.message}`);
  return (data ?? []) as Client[];
}

// ─── getProjectRows — for the listing table ───────────────────────────────────
export async function getProjectRows(): Promise<ProjectRow[]> {
  if (!isSupabaseConfigured()) {
    return buildProjectRows(SEED_PROJECTS, SEED_CLIENTS, SEED_BUSINESS_UNITS, SEED_PAYMENTS);
  }

  const [projectsRes, clientsRes, busUnitsRes, paymentsRes] = await Promise.all([
    sb().from('projects').select('*').order('id'),
    sb().from('clients').select('*'),
    sb().from('business_units').select('*'),
    sb().from('project_payments').select('*'),
  ]);

  if (projectsRes.error) throw new Error(`getProjectRows/projects: ${projectsRes.error.message}`);
  if (clientsRes.error)  throw new Error(`getProjectRows/clients: ${clientsRes.error.message}`);
  if (busUnitsRes.error) throw new Error(`getProjectRows/business_units: ${busUnitsRes.error.message}`);
  if (paymentsRes.error) throw new Error(`getProjectRows/payments: ${paymentsRes.error.message}`);

  return buildProjectRows(
    (projectsRes.data ?? []) as DbProject[],
    (clientsRes.data ?? []) as Client[],
    (busUnitsRes.data ?? []) as BusinessUnit[],
    (paymentsRes.data ?? []) as DbProjectPayment[],
  );
}

function buildProjectRows(
  projects: DbProject[],
  clients: Client[],
  busUnits: BusinessUnit[],
  payments: DbProjectPayment[],
): ProjectRow[] {
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const buMap     = new Map(busUnits.map((b) => [b.id, b]));

  return projects.map((p) => {
    const client = clientMap.get(p.client_id);
    const bu     = buMap.get(p.business_unit_id);
    const { paidAmount, pendingBalance } = calcBalances(p, payments);
    return {
      id:                p.id,
      code:              p.code ?? null,
      clientId:          p.client_id,
      clientName:        client?.name ?? '—',
      projectName:       p.name,
      businessUnitId:    p.business_unit_id,
      businessUnitCode:  bu?.code ?? '—',
      businessUnitName:  bu?.name ?? '—',
      businessUnitColor: bu?.color ?? '#15130F',
      status:            p.status,
      contractedAmount:  Number(p.contracted_amount),
      paidAmount,
      pendingBalance,
    };
  });
}

// ─── getProjectDetail — for the detail panel ─────────────────────────────────
export async function getProjectDetail(projectId: number): Promise<ProjectDetail | null> {
  if (!isSupabaseConfigured()) {
    const project = SEED_PROJECTS.find((p) => p.id === projectId);
    if (!project) return null;
    const client  = SEED_CLIENTS.find((c) => c.id === project.client_id) ?? null;
    const bu      = SEED_BUSINESS_UNITS.find((b) => b.id === project.business_unit_id) ?? null;
    const { paidAmount, pendingBalance, payments } = calcBalances(project, SEED_PAYMENTS);
    return buildProjectDetail(project, client, bu, paidAmount, pendingBalance, payments);
  }

  const [projectRes, paymentsRes] = await Promise.all([
    sb().from('projects').select('*, clients(*), business_units(*)').eq('id', projectId).single(),
    sb().from('project_payments').select('*').eq('project_id', projectId).order('payment_date'),
  ]);

  if (projectRes.error) throw new Error(`getProjectDetail: ${projectRes.error.message}`);
  if (!projectRes.data)  return null;
  if (paymentsRes.error) throw new Error(`getProjectDetail/payments: ${paymentsRes.error.message}`);

  const row      = projectRes.data as DbProject & { clients: Client; business_units: BusinessUnit };
  const payments = (paymentsRes.data ?? []) as DbProjectPayment[];
  const { paidAmount, pendingBalance } = calcBalances(row, payments);

  return buildProjectDetail(row, row.clients, row.business_units, paidAmount, pendingBalance, payments);
}

function buildProjectDetail(
  project: DbProject,
  client: Client | null,
  bu: BusinessUnit | null,
  paidAmount: number,
  pendingBalance: number,
  payments: DbProjectPayment[],
): ProjectDetail {
  return {
    id:                project.id,
    code:              project.code ?? null,
    clientId:          project.client_id,
    clientName:        client?.name ?? '—',
    clientDocNumber:   client?.doc_number ?? null,
    clientType:        client?.client_type ?? null,
    clientPhone:       client?.phone ?? null,
    clientEmail:       client?.email ?? null,
    businessUnitId:    project.business_unit_id,
    businessUnitCode:  bu?.code ?? '—',
    businessUnitName:  bu?.name ?? '—',
    businessUnitColor: bu?.color ?? '#15130F',
    name:              project.name,
    service:           project.service,
    manager:           project.manager ?? null,
    startDate:         project.start_date,
    endDate:           project.end_date,
    contractedAmount:  Number(project.contracted_amount),
    paidAmount,
    pendingBalance,
    status:            project.status,
    notes:             project.notes ?? null,
    contractUrl:       project.contract_url ?? null,
    payments,
  };
}

// ─── createProject ────────────────────────────────────────────────────────────
export async function createProject(payload: CreateProjectPayload): Promise<number> {
  let clientId: number;

  if (payload.clientId === 'new') {
    if (!isSupabaseConfigured()) {
      const nextClientId = SEED_CLIENTS.reduce((max, c) => Math.max(max, c.id), 0) + 1;
      const newClient: DbClient = {
        id: nextClientId,
        name: payload.newClientName ?? '',
        doc_number: payload.newClientDocNumber ?? null,
        client_type: payload.newClientType ?? 'Persona',
        phone: payload.newClientPhone ?? null,
        email: payload.newClientEmail ?? null,
        location: null,
        notes: null,
        created_at: new Date().toISOString(),
      };
      SEED_CLIENTS.unshift(newClient);
      clientId = nextClientId;
    } else {
      const { data: newClient, error: clientErr } = await sb()
        .from('clients')
        .insert({
          name: payload.newClientName ?? '',
          doc_number: payload.newClientDocNumber ?? null,
          client_type: payload.newClientType ?? 'Persona',
          phone: payload.newClientPhone ?? null,
          email: payload.newClientEmail ?? null,
        })
        .select()
        .single();

      if (clientErr) throw new Error(`createProject/client: ${clientErr.message}`);
      clientId = (newClient as { id: number }).id;
    }
  } else {
    clientId = payload.clientId;
  }

  if (!isSupabaseConfigured()) {
    const nextProjectId = SEED_PROJECTS.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    const newProject: DbProject = {
      id: nextProjectId,
      code: payload.code ?? `PRY-2026-${String(nextProjectId).padStart(3, '0')}`,
      client_id: clientId,
      business_unit_id: payload.businessUnitId,
      area_id: payload.areaId ?? null,
      name: payload.name,
      service: payload.service,
      manager: payload.manager ?? null,
      contracted_amount: payload.contractedAmount,
      start_date: payload.startDate,
      end_date: payload.endDate,
      status: payload.status,
      notes: payload.notes ?? null,
      contract_url: payload.contractUrl ?? null,
    };
    SEED_PROJECTS.unshift(newProject);
    return nextProjectId;
  }

  const { data, error } = await sb()
    .from('projects')
    .insert({
      code:              payload.code ?? null,
      client_id:         clientId,
      business_unit_id:  payload.businessUnitId,
      area_id:           payload.areaId ?? null,
      name:              payload.name,
      service:           payload.service,
      manager:           payload.manager ?? null,
      contracted_amount: payload.contractedAmount,
      start_date:        payload.startDate,
      end_date:          payload.endDate,
      status:            payload.status,
      notes:             payload.notes ?? null,
      contract_url:      payload.contractUrl ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`createProject: ${error.message}`);
  return (data as { id: number }).id;
}
