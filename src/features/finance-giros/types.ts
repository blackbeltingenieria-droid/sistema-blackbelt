// ─── Feature-local types for finance-giros ───────────────────────────────────
// View-models enriquecidos derivados de las tablas DB + campos calculados.
// El monto prorrateado NUNCA se almacena — siempre se calcula en el servicio.

import type {
  CostCategoryCode,
  DbCostCategory,
  DbTool,
  DbToolBusinessUnit,
  ToolScope,
} from '../../types/database';

export type { CostCategoryCode, ToolScope };

// ─── Catálogos ────────────────────────────────────────────────────────────────

export interface CostCategory extends DbCostCategory {}

/** Herramienta con sus giros asociados ya resueltos */
export interface Tool extends DbTool {
  sharedUnits: DbToolBusinessUnit[];
  exclusiveUnitName?: string;
}

// ─── Transacciones ────────────────────────────────────────────────────────────

export interface AllocationRow {
  businessUnitId: number;
  businessUnitName: string;
  pct: number;
  allocatedAmount: number; // calculado en service, nunca almacenado
}

export interface TransactionDetail {
  id: number;
  description: string;
  amount: number;
  transactionDate: string;
  paymentMethod: string | null;
  costCategoryId: number;
  costCategoryName: string;
  costCategoryCode: CostCategoryCode;
  toolId: number | null;
  toolName: string | null;
  projectId: number | null;
  allocations: AllocationRow[];
  updatedAt?: string | null;
}

export interface TransactionRow extends TransactionDetail {}

export type UpdateTransactionPayload = CreateTransactionPayload;

// ─── Vista por giro de negocio ────────────────────────────────────────────────

export interface CategoryTotal {
  costCategoryId: number;
  costCategoryName: string;
  costCategoryCode: CostCategoryCode;
  total: number;
}

/** Resumen extendido de un giro — incluye KPIs desagregados */
export interface BusinessUnitCostSummary {
  businessUnitId: number;
  businessUnitCode?: string;
  businessUnitColor?: string;
  businessUnitName: string;
  grandTotal: number;
  byCategory: CategoryTotal[];
  /** Monto prorrateado de categoría mano_de_obra / MO en este giro */
  laborTotal: number;
  /** Monto prorrateado de categoría maquinaria / SOFT / MAQ en este giro */
  toolsTotal: number;
  /** % de variación vs. período anterior (null = sin datos previos) */
  variationPct: number | null;
  /** Herramientas que impactan este giro con gasto prorrateado y tendencia */
  impactingTools: ToolImpact[];
}

/** Herramienta que aparece en las allocations de este giro */
export interface ToolImpact {
  toolId: number;
  toolName: string;
  scope: ToolScope;
  totalAllocated: number;
  /** 'up' | 'down' | 'same' — comparando el último gasto con el anterior */
  trend: 'up' | 'down' | 'same' | null;
}

// ─── Dashboard general ────────────────────────────────────────────────────────

/** Ranking de giros por gasto total — para comparativo del dashboard */
export interface BusinessUnitComparison {
  businessUnitId: number;
  businessUnitCode?: string;
  businessUnitColor?: string;
  businessUnitName: string;
  currentPeriodTotal: number;
  previousPeriodTotal: number;
  variationPct: number | null;
  rank: number;
}

/** Herramienta ordenada por gasto acumulado — para ranking del dashboard */
export interface ToolSpendRank {
  toolId: number;
  toolName: string;
  scope: ToolScope;
  totalSpend: number;
  impactedUnitNames: string[];
  transactionCount: number;
}

/** Mano de obra prorrateada por giro */
export interface LaborCostByUnit {
  businessUnitId: number;
  businessUnitName: string;
  laborCost: number;
  pctOfTotalLabor: number; // calculado, nunca almacenado
}

// ─── Historial de herramienta ─────────────────────────────────────────────────

export interface ToolHistoryRow {
  transactionId: number;
  description: string;
  amount: number;
  transactionDate: string;
  paymentMethod: string | null;
  allocations: AllocationRow[];
}

// ─── Payloads de escritura ────────────────────────────────────────────────────

export interface CreateToolPayload {
  name: string;
  scope: ToolScope;
  exclusiveBusinessUnitId: number | null;
  monthlyReferenceCost: number | null;
  notes: string | null;
  sharedUnits?: { businessUnitId: number; pct: number }[];
}

export interface AllocationInput {
  businessUnitId: number;
  pct: number;
}

export interface CreateTransactionPayload {
  description: string;
  amount: number;
  transactionDate: string;
  paymentMethod: string | null;
  costCategoryId: number;
  toolId: number | null;
  projectId: number | null;
  allocations: AllocationInput[];
}
