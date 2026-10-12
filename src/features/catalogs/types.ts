// ─── features/catalogs/types.ts ──────────────────────────────────────────────
// Tipos de catálogo alineados a las hojas del Modelo C (Excel oficial).

import type {
  AreaType,
  BusinessUnitCode,
  CostCategoryCode,
  DbArea,
  DbBusinessUnit,
  DbCostCategory,
} from '../../types/database';

export type { BusinessUnitCode, AreaType, CostCategoryCode };

export interface BusinessUnit extends DbBusinessUnit {}
export interface Area extends DbArea {}
export interface CostCategory extends DbCostCategory {}
