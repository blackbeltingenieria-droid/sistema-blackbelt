// features/movements/types.ts
// Tipos del libro único de movimientos (Modelo C, hoja 06_MOVIMIENTOS).

import type {
  DbMovement,
  ExpenseClass,
  MovementStatus,
  RecordType,
} from '../../types/database';

export type { ExpenseClass, MovementStatus, RecordType };
export type Movement = DbMovement;

/** Resultado del control de calidad (columna "Control" automática del Excel). */
export const CONTROL_STATUS = {
  OK:               'OK',
  INCOMPLETO:       'INCOMPLETO',
  REVISAR_CORP:     'REVISAR CORP',
  REVISAR_UNIDAD:   'REVISAR UNIDAD',
  REVISAR_INGRESO:  'REVISAR INGRESO',
  REVISAR_CLASE:    'REVISAR CLASE',
  USAR_NO_APLICA:   'USAR NO_APLICA',
} as const;

export type ControlStatus = (typeof CONTROL_STATUS)[keyof typeof CONTROL_STATUS];

/**
 * Movimiento con sus campos CALCULADOS (nunca guardados): mes y control.
 * Es la única forma que consumen presupuestos, resultados, caja y dashboard.
 */
export interface EnrichedMovement extends DbMovement {
  unitCode: string;     // UN01…UN05 | CORP (de business_unit_id)
  mes: string;          // 'AAAA-MM' (calculado)
  control: ControlStatus; // calculado
}

/** Fila para listados: movimiento enriquecido + nombres de catálogo. */
export interface MovementRow extends EnrichedMovement {
  unitName: string;
  unitColor: string;
  areaCode: string;
  categoryCode: string;
  projectCode: string | null;
}

export interface MovementFormValues {
  movement_date: string;
  record_type: RecordType;
  amount: number;
  business_unit_id: number;
  area_id: number;
  responsible: string | null;
  cost_category_id: number;
  expense_class: ExpenseClass;
  project_id: number | null;
  counterparty: string | null;
  detail: string | null;
  payment_method: string | null;
  voucher_number: string | null;
  status: MovementStatus;
  notes: string | null;
}
