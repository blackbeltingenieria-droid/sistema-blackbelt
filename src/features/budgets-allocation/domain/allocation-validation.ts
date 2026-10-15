// features/budgets-allocation/domain/allocation-validation.ts
// Validación del formulario de reparto: el reparto de un mes suma 100 % o queda "sin repartir".
// Nunca se rellena con partes iguales por defecto.

import { COMMERCIAL_UNIT_CODES, sumAllocation, type AllocationPcts } from '../../results-cash/domain/calculations';

export function validateAllocationForm(pcts: AllocationPcts, note: string): string | null {
  for (const code of COMMERCIAL_UNIT_CODES) {
    const v = pcts[code] ?? 0;
    if (!Number.isFinite(v) || v < 0 || v > 100) return `${code}: el porcentaje debe estar entre 0 y 100.`;
  }
  const sum = sumAllocation(pcts);
  if (sum === 0) return null; // vacío = sin repartir
  if (Math.abs(sum - 100) > 0.0001) {
    return `El reparto debe sumar 100 % (hoy suma ${sum.toFixed(2)} %) o dejarse en 0 % (sin repartir).`;
  }
  if (!note.trim()) return 'Documenta el criterio del reparto (ej. horas de soporte por unidad).';
  return null;
}
