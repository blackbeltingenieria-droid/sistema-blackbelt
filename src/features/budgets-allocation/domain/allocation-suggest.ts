// features/budgets-allocation/domain/allocation-suggest.ts
// Sugerencias de reparto del gasto común (siempre las confirma la persona; nunca se aplican solas).

import { COMMERCIAL_UNIT_CODES, type AllocationPcts, type CommercialUnitCode } from '../../results-cash/domain/calculations';

/** % por unidad proporcional a sus ventas del mes, en enteros que suman 100 (resto mayor). */
export function allocationByIncome(incomeByUnit: Partial<Record<CommercialUnitCode, number>>): AllocationPcts | null {
  const total = COMMERCIAL_UNIT_CODES.reduce((a, c) => a + Math.max(0, incomeByUnit[c] ?? 0), 0);
  if (total <= 0) return null;
  const raw = COMMERCIAL_UNIT_CODES.map((c) => ({ c, v: (Math.max(0, incomeByUnit[c] ?? 0) / total) * 100 }));
  const floors = raw.map((r) => ({ ...r, f: Math.floor(r.v) }));
  let left = 100 - floors.reduce((a, r) => a + r.f, 0);
  for (const r of [...floors].sort((a, b) => (b.v - b.f) - (a.v - a.f))) {
    if (left <= 0) break;
    r.f += 1;
    left -= 1;
  }
  return Object.fromEntries(floors.map((r) => [r.c, r.f])) as AllocationPcts;
}
