// features/movements/services/movement-service.ts
// Capa de datos del libro único de movimientos. Los componentes nunca llaman a supabase.from().
// Sin Supabase configurado (desarrollo local) opera sobre datos de ejemplo en memoria.
// `mes` y `control` se calculan aquí (dominio) y nunca se guardan.

import { isSupabaseConfigured, supabase } from '../../../lib/supabase';
import { MOVEMENT_STATUS } from '../../../types/database';
import type { DbMovement, MovementStatus } from '../../../types/database';
import { getAreas, getBusinessUnits, getCostCategories } from '../../catalogs/services/catalog-service';
import { getProjectRows } from '../../clients-projects/services/project-service';
import { enrichMovement, nextMovementCode } from '../domain/movement-rules';
import { validateMovementForm } from '../domain/movement-validation';
import type { EnrichedMovement, MovementFormValues, MovementRow } from '../types';
import { SEED_MOVEMENTS } from './seed-data';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- patrón del proyecto: filas tipadas en types/database.ts
const sb = () => supabase as any;

const mem: { rows: DbMovement[] } = { rows: SEED_MOVEMENTS.map((r) => ({ ...r })) };

function toRow(r: DbMovement): DbMovement {
  return { ...r, amount: Number(r.amount) };
}

async function fetchRaw(): Promise<DbMovement[]> {
  if (!isSupabaseConfigured()) return mem.rows.map((r) => ({ ...r }));
  const { data, error } = await sb().from('movements').select('*').order('movement_date', { ascending: false }).order('id', { ascending: false });
  if (error) throw new Error(`getMovements: ${error.message}`);
  return ((data ?? []) as DbMovement[]).map(toRow);
}

/** Movimientos con mes/control calculados. Base de presupuestos, resultados, caja y dashboard. */
export async function getMovements(): Promise<EnrichedMovement[]> {
  const [raw, units] = await Promise.all([fetchRaw(), getBusinessUnits()]);
  const codeById = new Map(units.map((u) => [u.id, u.code]));
  return raw.map((r) => enrichMovement(r, codeById.get(r.business_unit_id) ?? '—'));
}

/** Filas para el listado: movimientos enriquecidos + nombres de catálogo. */
export async function getMovementRows(): Promise<MovementRow[]> {
  const [movs, units, areas, cats, projects] = await Promise.all([
    getMovements(), getBusinessUnits(), getAreas(), getCostCategories(), getProjectRows(),
  ]);
  const u = new Map(units.map((x) => [x.id, x]));
  const a = new Map(areas.map((x) => [x.id, x]));
  const c = new Map(cats.map((x) => [x.id, x]));
  const p = new Map(projects.map((x) => [x.id, x]));
  return movs.map((r) => ({
    ...r,
    unitName: u.get(r.business_unit_id)?.name ?? '—',
    unitColor: u.get(r.business_unit_id)?.color ?? '',
    areaCode: a.get(r.area_id)?.code ?? '—',
    categoryCode: c.get(r.cost_category_id)?.code ?? '—',
    projectCode: r.project_id ? (p.get(r.project_id)?.code ?? null) : null,
  }));
}

function assertValid(values: MovementFormValues): void {
  const errors = validateMovementForm(values);
  const first = Object.values(errors)[0];
  if (first) throw new Error(first);
}

export async function createMovement(values: MovementFormValues): Promise<DbMovement> {
  assertValid(values);
  const existing = await fetchRaw();
  const code = nextMovementCode(existing.map((r) => r.movement_code), values.movement_date);

  if (!isSupabaseConfigured()) {
    const nextId = mem.rows.reduce((mx, r) => Math.max(mx, r.id), 0) + 1;
    const row: DbMovement = { id: nextId, movement_code: code, ...values, created_at: new Date().toISOString() };
    mem.rows.push(row);
    return { ...row };
  }

  const { data, error } = await sb().from('movements').insert({ movement_code: code, ...values }).select().single();
  if (error) throw new Error(`createMovement: ${error.message}`);
  return toRow(data as DbMovement);
}

export async function updateMovement(id: number, values: MovementFormValues): Promise<DbMovement> {
  assertValid(values);
  if (!isSupabaseConfigured()) {
    const i = mem.rows.findIndex((r) => r.id === id);
    if (i < 0) throw new Error('Movimiento no encontrado.');
    mem.rows[i] = { ...mem.rows[i], ...values, updated_at: new Date().toISOString() };
    return { ...mem.rows[i] };
  }
  const { data, error } = await sb().from('movements')
    .update({ ...values, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw new Error(`updateMovement: ${error.message}`);
  return toRow(data as DbMovement);
}

export async function setMovementStatus(id: number, status: MovementStatus): Promise<void> {
  if (!isSupabaseConfigured()) {
    const i = mem.rows.findIndex((r) => r.id === id);
    if (i < 0) throw new Error('Movimiento no encontrado.');
    mem.rows[i] = { ...mem.rows[i], status, updated_at: new Date().toISOString() };
    return;
  }
  const { error } = await sb().from('movements')
    .update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`setMovementStatus: ${error.message}`);
}

/** Solo se pueden eliminar borradores; un movimiento VALIDADO debe pasarse a BORRADOR antes. */
export async function deleteMovement(id: number): Promise<void> {
  const current = (await fetchRaw()).find((r) => r.id === id);
  if (!current) throw new Error('Movimiento no encontrado.');
  if (current.status === MOVEMENT_STATUS.VALIDADO) {
    throw new Error('No se puede eliminar un movimiento VALIDADO: vuelve a BORRADOR primero.');
  }
  if (!isSupabaseConfigured()) {
    mem.rows = mem.rows.filter((r) => r.id !== id);
    return;
  }
  const { error } = await sb().from('movements').delete().eq('id', id);
  if (error) throw new Error(`deleteMovement: ${error.message}`);
}
