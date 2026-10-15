// features/movements/domain/movement-form-defaults.ts
// Valores iniciales y ajustes automáticos del formulario de movimiento (captura rápida).

import { EXPENSE_CLASS, MOVEMENT_STATUS, RECORD_TYPE } from '../../../types/database';
import type { ExpenseClass, MovementFormValues, RecordType } from '../types';
import { CORP_CODE } from './movement-rules';

export function emptyMovementForm(corpUnitId: number, today: string): MovementFormValues {
  return {
    movement_date: today,
    record_type: RECORD_TYPE.COSTO_RECONOCIDO,
    amount: 0,
    business_unit_id: corpUnitId,            // CORP por defecto (regla 1)
    area_id: 0,
    responsible: null,
    cost_category_id: 0,
    expense_class: EXPENSE_CLASS.COMPARTIDO, // coherente con CORP
    project_id: null,
    counterparty: null,
    detail: null,
    payment_method: null,
    voucher_number: null,
    status: MOVEMENT_STATUS.BORRADOR,
    notes: null,
  };
}

/** Solo COSTO_RECONOCIDO usa DIRECTO/ATRIBUIBLE/COMPARTIDO; el resto es NO_APLICA. */
export function suggestClass(
  recordType: RecordType,
  unitCode: string,
  hasProject: boolean,
  current: ExpenseClass,
): ExpenseClass {
  if (recordType !== RECORD_TYPE.COSTO_RECONOCIDO) return EXPENSE_CLASS.NO_APLICA;
  if (current !== EXPENSE_CLASS.NO_APLICA && current !== undefined) {
    // si ya hay una clase de costo válida, solo la ajustamos cuando contradice la unidad
    if (unitCode === CORP_CODE && current !== EXPENSE_CLASS.COMPARTIDO) return EXPENSE_CLASS.COMPARTIDO;
    if (unitCode !== CORP_CODE && current === EXPENSE_CLASS.COMPARTIDO) {
      return hasProject ? EXPENSE_CLASS.DIRECTO : EXPENSE_CLASS.ATRIBUIBLE;
    }
    return current;
  }
  if (unitCode === CORP_CODE) return EXPENSE_CLASS.COMPARTIDO;
  return hasProject ? EXPENSE_CLASS.DIRECTO : EXPENSE_CLASS.ATRIBUIBLE;
}
