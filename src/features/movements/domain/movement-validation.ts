// features/movements/domain/movement-validation.ts
// Validación de formulario de movimiento (campos obligatorios de la hoja 06_MOVIMIENTOS).
// Las coherencias de clasificación (CORP/unidad/clase) NO bloquean el guardado: las marca el
// control automático (REVISAR …), igual que en el Excel, y el movimiento no alimenta reportes.

import type { MovementFormValues } from '../types';

export type MovementFormErrors = Partial<Record<keyof MovementFormValues, string>>;

export function validateMovementForm(v: MovementFormValues): MovementFormErrors {
  const e: MovementFormErrors = {};
  if (!v.movement_date) e.movement_date = 'La fecha es obligatoria.';
  if (!Number.isFinite(v.amount) || v.amount <= 0) e.amount = 'El importe debe ser mayor que 0.';
  if (!v.business_unit_id) e.business_unit_id = 'Elige la unidad beneficiaria (CORP si es común).';
  if (!v.area_id) e.area_id = 'Elige el área gestora.';
  if (!v.cost_category_id) e.cost_category_id = 'Elige la categoría.';
  return e;
}
