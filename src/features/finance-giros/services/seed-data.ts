// ─── Seed data — Finance / Giros module (Modelo C) ───────────────────────────
// Fallback data when Supabase is not configured.
// Reusa los catálogos oficiales de features/catalogs/services/seed-data.

import type {
  DbTool,
  DbToolBusinessUnit,
  DbTransaction,
  DbTransactionAllocation,
} from '../../../types/database';
import { SEED_COST_CATEGORIES } from '../../catalogs/services/seed-data';

export { SEED_COST_CATEGORIES };

// ─── tools (herramientas de ejemplo) ──────────────────────────────────────────
export const SEED_TOOLS: DbTool[] = [
  {
    id: 1,
    name: 'Google Workspace',
    scope: 'general',
    exclusive_business_unit_id: null,
    monthly_reference_cost: 450,
    notes: 'Plataforma institucional corporativa — beneficio común',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Asana',
    scope: 'shared',
    exclusive_business_unit_id: null,
    monthly_reference_cost: 280,
    notes: 'Gestión de proyectos colaborativos',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'AutoCAD LT',
    scope: 'exclusive',
    exclusive_business_unit_id: 4, // UN04 Ingeniería Especializada
    monthly_reference_cost: 320,
    notes: 'Licencia especializada para levantamiento y cálculo',
    created_at: '2024-01-01T00:00:00Z',
  },
];

export const SEED_TOOL_BUSINESS_UNITS: DbToolBusinessUnit[] = [
  // Asana → UN01 60%, UN02 40%
  { id: 1, tool_id: 2, business_unit_id: 1, default_pct: 60 },
  { id: 2, tool_id: 2, business_unit_id: 2, default_pct: 40 },
];

// ─── transactions (clasificadas según las 17 categorías del Modelo C) ─────────
export const SEED_TRANSACTIONS: DbTransaction[] = [
  // 1: Dirección Estratégica S/701.50 → MO (Mano de obra, id=1)
  {
    id: 1,
    description: 'Dirección Estratégica — honorarios mensuales',
    amount: 701.50,
    transaction_date: '2024-09-30',
    payment_method: 'transferencia',
    cost_category_id: 1, // MO: Mano de obra y especialistas
    tool_id: null,
    project_id: null,
    created_at: '2024-09-30T00:00:00Z',
  },
  // 2: Marketing S/630.06 → PUB (Publicidad y captación, id=2)
  {
    id: 2,
    description: 'Marketing digital — campaña mensual',
    amount: 630.06,
    transaction_date: '2024-09-30',
    payment_method: 'tarjeta',
    cost_category_id: 2, // PUB: Publicidad y captación
    tool_id: null,
    project_id: null,
    created_at: '2024-09-30T00:00:00Z',
  },
  // 3: Investigación y Desarrollo S/563.90 → MO (id=1)
  {
    id: 3,
    description: 'Investigación y Desarrollo — investigador externo',
    amount: 563.90,
    transaction_date: '2024-09-30',
    payment_method: 'transferencia',
    cost_category_id: 1, // MO: Mano de obra y especialistas
    tool_id: null,
    project_id: null,
    created_at: '2024-09-30T00:00:00Z',
  },
  // 4: Google Workspace → SOFT (id=3)
  {
    id: 4,
    description: 'Google Workspace — renovación mensual octubre',
    amount: 450.00,
    transaction_date: '2024-10-01',
    payment_method: 'tarjeta',
    cost_category_id: 3, // SOFT: Software y herramientas digitales
    tool_id: 1,
    project_id: null,
    created_at: '2024-10-01T00:00:00Z',
  },
  // 5: Asana → SOFT (id=3)
  {
    id: 5,
    description: 'Asana — renovación mensual octubre',
    amount: 280.00,
    transaction_date: '2024-10-01',
    payment_method: 'tarjeta',
    cost_category_id: 3, // SOFT: Software y herramientas digitales
    tool_id: 2,
    project_id: null,
    created_at: '2024-10-01T00:00:00Z',
  },
  // 6: AutoCAD → SOFT (id=3)
  {
    id: 6,
    description: 'AutoCAD LT — renovación mensual octubre',
    amount: 320.00,
    transaction_date: '2024-10-01',
    payment_method: 'tarjeta',
    cost_category_id: 3, // SOFT: Software y herramientas digitales
    tool_id: 3,
    project_id: null,
    created_at: '2024-10-01T00:00:00Z',
  },
  // 7: Taller Lean Six Sigma → CAP (id=10)
  {
    id: 7,
    description: 'Taller Lean Six Sigma — capacitación equipo',
    amount: 850.00,
    transaction_date: '2024-10-05',
    payment_method: 'transferencia',
    cost_category_id: 10, // CAP: Capacitación
    tool_id: null,
    project_id: null,
    created_at: '2024-10-05T00:00:00Z',
  },
  // 8: Renta de oficina → SERV (id=4)
  {
    id: 8,
    description: 'Renta de oficina — octubre',
    amount: 1200.00,
    transaction_date: '2024-10-01',
    payment_method: 'transferencia',
    cost_category_id: 4, // SERV: Servicios y telecomunicaciones
    tool_id: null,
    project_id: null,
    created_at: '2024-10-01T00:00:00Z',
  },
];

// ─── transaction_allocations ─────────────────────────────────────────────────
export const SEED_ALLOCATIONS: DbTransactionAllocation[] = [
  // Tx 1 — Dirección Estratégica S/701.50 → 20% a UN01..UN05
  { id: 1,  transaction_id: 1, business_unit_id: 1, pct: 20 },
  { id: 2,  transaction_id: 1, business_unit_id: 2, pct: 20 },
  { id: 3,  transaction_id: 1, business_unit_id: 3, pct: 20 },
  { id: 4,  transaction_id: 1, business_unit_id: 4, pct: 20 },
  { id: 5,  transaction_id: 1, business_unit_id: 5, pct: 20 },

  // Tx 2 — Marketing S/630.06 → 20% a UN01..UN05
  { id: 6,  transaction_id: 2, business_unit_id: 1, pct: 20 },
  { id: 7,  transaction_id: 2, business_unit_id: 2, pct: 20 },
  { id: 8,  transaction_id: 2, business_unit_id: 3, pct: 20 },
  { id: 9,  transaction_id: 2, business_unit_id: 4, pct: 20 },
  { id: 10, transaction_id: 2, business_unit_id: 5, pct: 20 },

  // Tx 3 — Investigación y Desarrollo S/563.90 → 100% a UN03 (id=3)
  { id: 11, transaction_id: 3, business_unit_id: 3, pct: 100 },

  // Tx 4 — Google Workspace S/450 → 20% a UN01..UN05
  { id: 12, transaction_id: 4, business_unit_id: 1, pct: 20 },
  { id: 13, transaction_id: 4, business_unit_id: 2, pct: 20 },
  { id: 14, transaction_id: 4, business_unit_id: 3, pct: 20 },
  { id: 15, transaction_id: 4, business_unit_id: 4, pct: 20 },
  { id: 16, transaction_id: 4, business_unit_id: 5, pct: 20 },

  // Tx 5 — Asana S/280 → UN01 60%, UN02 40%
  { id: 17, transaction_id: 5, business_unit_id: 1, pct: 60 },
  { id: 18, transaction_id: 5, business_unit_id: 2, pct: 40 },

  // Tx 6 — AutoCAD S/320 → UN04 100%
  { id: 19, transaction_id: 6, business_unit_id: 4, pct: 100 },

  // Tx 7 — Capacitación Lean Six Sigma S/850 → 20% a UN01..UN05
  { id: 20, transaction_id: 7, business_unit_id: 1, pct: 20 },
  { id: 21, transaction_id: 7, business_unit_id: 2, pct: 20 },
  { id: 22, transaction_id: 7, business_unit_id: 3, pct: 20 },
  { id: 23, transaction_id: 7, business_unit_id: 4, pct: 20 },
  { id: 24, transaction_id: 7, business_unit_id: 5, pct: 20 },

  // Tx 8 — Renta de oficina S/1200 → 20% a UN01..UN05
  { id: 25, transaction_id: 8, business_unit_id: 1, pct: 20 },
  { id: 26, transaction_id: 8, business_unit_id: 2, pct: 20 },
  { id: 27, transaction_id: 8, business_unit_id: 3, pct: 20 },
  { id: 28, transaction_id: 8, business_unit_id: 4, pct: 20 },
  { id: 29, transaction_id: 8, business_unit_id: 5, pct: 20 },
];
