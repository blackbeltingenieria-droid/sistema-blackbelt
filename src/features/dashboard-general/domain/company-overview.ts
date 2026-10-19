// features/dashboard-general/domain/company-overview.ts
// "La empresa desde el inicio": ventas por cliente (proyecto) para el Dashboard. Funciones puras
// sobre los MISMOS movimientos que Resultados (solo VALIDADO + OK).

import { RECORD_TYPE } from '../../../types/database';
import { isEligible } from '../../movements/domain/movement-rules';
import type { EnrichedMovement } from '../../movements/types';

export interface SalesBar { key: string; name: string; amount: number; ids: number[] }

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Ventas reconocidas agrupadas por cliente (del proyecto; si no hay proyecto, por quién pagó). */
export function salesByClient(
  movements: EnrichedMovement[],
  clientOfProject: Map<number, string>,
  max = 6,
): SalesBar[] {
  const groups = new Map<string, SalesBar>();
  for (const m of movements) {
    if (!isEligible(m) || m.record_type !== RECORD_TYPE.INGRESO_RECONOCIDO) continue;
    const name = (m.project_id ? clientOfProject.get(m.project_id) : undefined) ?? m.counterparty ?? 'Otras ventas';
    const key = name.trim().toUpperCase();
    const g = groups.get(key) ?? { key, name, amount: 0, ids: [] };
    g.amount = r2(g.amount + m.amount);
    g.ids.push(m.id);
    groups.set(key, g);
  }
  const bars = [...groups.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  if (bars.length <= max) return bars;
  const tail = bars.slice(max - 1);
  return [...bars.slice(0, max - 1), { key: 'OTROS', name: 'Otros clientes', amount: r2(tail.reduce((a, b) => a + b.amount, 0)), ids: tail.flatMap((b) => b.ids) }];
}
