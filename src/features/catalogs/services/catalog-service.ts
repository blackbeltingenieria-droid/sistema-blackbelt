// ─── features/catalogs/services/catalog-service.ts ────────────────────────────
// Servicio centralizado de catálogos fijos del Modelo C.
// Todos los módulos consumen los catálogos desde aquí (01-arquitectura.md regla 50).

import { supabase } from '../../../lib/supabase';
import type { BusinessUnit, Area, CostCategory } from '../types';
import {
  SEED_BUSINESS_UNITS,
  SEED_AREAS,
  SEED_COST_CATEGORIES,
} from './seed-data';

function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return Boolean(url && !url.includes('placeholder') && url.startsWith('https://'));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any;

/**
 * Obtiene las unidades de negocio (UN01-UN05 + CORP).
 */
export async function getBusinessUnits(): Promise<BusinessUnit[]> {
  if (!isSupabaseConfigured()) return SEED_BUSINESS_UNITS;

  const { data, error } = await sb()
    .from('business_units')
    .select('*')
    .order('id');

  if (error) throw new Error(`getBusinessUnits: ${error.message}`);
  return (data ?? []) as BusinessUnit[];
}

/**
 * Obtiene las áreas funcionales (6 generales + 15 específicas).
 */
export async function getAreas(): Promise<Area[]> {
  if (!isSupabaseConfigured()) return SEED_AREAS;

  const { data, error } = await sb()
    .from('areas')
    .select('*')
    .order('id');

  if (error) throw new Error(`getAreas: ${error.message}`);
  return (data ?? []) as Area[];
}

/**
 * Obtiene las áreas filtradas por unidad de negocio o generales.
 */
export async function getAreasByBusinessUnit(buId: number | null): Promise<Area[]> {
  const areas = await getAreas();
  if (buId === null) {
    return areas.filter((a) => a.type === 'General');
  }
  return areas.filter((a) => a.business_unit_id === buId);
}

/**
 * Obtiene las 17 categorías de costo oficiales del Modelo C.
 */
export async function getCostCategories(): Promise<CostCategory[]> {
  if (!isSupabaseConfigured()) return SEED_COST_CATEGORIES;

  const { data, error } = await sb()
    .from('cost_categories')
    .select('*')
    .order('id');

  if (error) throw new Error(`getCostCategories: ${error.message}`);
  return (data ?? []) as CostCategory[];
}
