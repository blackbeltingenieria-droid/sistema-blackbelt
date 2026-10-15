// features/movements/domain/movement-rules.ts
// Reglas del Modelo C sobre un movimiento: mes y control (calculados, nunca guardados)
// y filtro de elegibilidad (VALIDADO + OK). Réplica exacta de las fórmulas del Excel
// 06_MOVIMIENTOS (columnas P "Mes" y Q "Control"). No cambiar sin aprobación de FIN/Gerencia.

import { EXPENSE_CLASS, MOVEMENT_STATUS, RECORD_TYPE } from '../../../types/database';
import type { DbMovement } from '../../../types/database';
import { CONTROL_STATUS, type ControlStatus, type EnrichedMovement } from '../types';

export const CORP_CODE = 'CORP';

/** Columna "Mes (automático)": 'AAAA-MM' a partir de la fecha ISO, '' si no hay fecha. */
export function computeMes(movementDate: string | null | undefined): string {
  if (!movementDate) return '';
  const m = /^(\d{4})-(\d{2})/.exec(movementDate);
  return m ? `${m[1]}-${m[2]}` : '';
}

type ControlInput = Pick<
  DbMovement,
  | 'movement_code' | 'movement_date' | 'record_type' | 'amount'
  | 'business_unit_id' | 'area_id' | 'cost_category_id' | 'expense_class'
>;

/**
 * Columna "Control (automático)". Orden de evaluación idéntico al Excel:
 * INCOMPLETO → REVISAR CORP → REVISAR UNIDAD → REVISAR INGRESO → REVISAR CLASE → USAR NO_APLICA → OK.
 */
export function computeControl(m: ControlInput, unitCode: string): ControlStatus {
  const incomplete =
    !m.movement_code ||
    !m.movement_date ||
    typeof m.amount !== 'number' ||
    Number.isNaN(m.amount) ||
    m.amount <= 0 ||
    !m.business_unit_id ||
    !m.area_id ||
    !m.cost_category_id ||
    !m.expense_class;
  if (incomplete) return CONTROL_STATUS.INCOMPLETO;

  const isCost = m.record_type === RECORD_TYPE.COSTO_RECONOCIDO;
  const cls = m.expense_class;

  if (isCost && cls === EXPENSE_CLASS.COMPARTIDO && unitCode !== CORP_CODE) {
    return CONTROL_STATUS.REVISAR_CORP;
  }
  if (isCost && (cls === EXPENSE_CLASS.DIRECTO || cls === EXPENSE_CLASS.ATRIBUIBLE) && unitCode === CORP_CODE) {
    return CONTROL_STATUS.REVISAR_UNIDAD;
  }
  if (m.record_type === RECORD_TYPE.INGRESO_RECONOCIDO && unitCode === CORP_CODE) {
    return CONTROL_STATUS.REVISAR_INGRESO;
  }
  if (
    isCost &&
    cls !== EXPENSE_CLASS.DIRECTO &&
    cls !== EXPENSE_CLASS.ATRIBUIBLE &&
    cls !== EXPENSE_CLASS.COMPARTIDO
  ) {
    return CONTROL_STATUS.REVISAR_CLASE;
  }
  if (!isCost && cls !== EXPENSE_CLASS.NO_APLICA) return CONTROL_STATUS.USAR_NO_APLICA;
  return CONTROL_STATUS.OK;
}

/** Agrega los campos calculados (unitCode, mes, control) a un movimiento de BD. */
export function enrichMovement(m: DbMovement, unitCode: string): EnrichedMovement {
  return { ...m, unitCode, mes: computeMes(m.movement_date), control: computeControl(m, unitCode) };
}

/**
 * Filtro único que alimenta presupuestos, resultados y caja:
 * solo estado VALIDADO y control OK. Vive aquí (dominio) y nunca en un componente.
 */
export function isEligible(m: Pick<EnrichedMovement, 'status' | 'control'>): boolean {
  return m.status === MOVEMENT_STATUS.VALIDADO && m.control === CONTROL_STATUS.OK;
}

export function eligibleOnly(movements: EnrichedMovement[]): EnrichedMovement[] {
  return movements.filter(isEligible);
}

/** Valores por defecto de un movimiento nuevo: nace en CORP, BORRADOR (regla 1 y 6). */
export function defaultMovementState(corpUnitId: number): Pick<DbMovement, 'business_unit_id' | 'status'> {
  return { business_unit_id: corpUnitId, status: MOVEMENT_STATUS.BORRADOR };
}

/** Siguiente código visible MOV-AAAA-NNNN para el año de la fecha dada. */
export function nextMovementCode(existingCodes: string[], movementDate: string): string {
  const year = computeMes(movementDate).slice(0, 4) || String(new Date().getFullYear());
  const prefix = `MOV-${year}-`;
  const max = existingCodes.reduce((acc, code) => {
    if (!code.startsWith(prefix)) return acc;
    const n = Number(code.slice(prefix.length));
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}
