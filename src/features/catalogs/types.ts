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

export type BusinessUnit = DbBusinessUnit;
export type Area = DbArea;
export type CostCategory = DbCostCategory;
