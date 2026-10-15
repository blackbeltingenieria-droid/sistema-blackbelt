// features/dashboard-general/domain/tool-ranking.ts
// Ranking de herramientas: no es una tabla propia (regla 13). Se deriva de los movimientos
// categoría SOFT (costo reconocido, validado + OK) agrupados por tercero/proveedor.

import { COST_CATEGORY_CODE, RECORD_TYPE } from '../../../types/database';
import { isEligible } from '../../movements/domain/movement-rules';
import type { EnrichedMovement } from '../../movements/types';

export interface ToolRank {
  name: string;          // proveedor (o detalle si no hay proveedor)
  total: number;
  sharePct: number;      // % sobre el total SOFT
  ids: number[];         // movement_id que componen el total
  units: string[];       // unidades beneficiarias distintas (CORP = compartido)
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function rankSoftwareTools(
  movements: EnrichedMovement[],
  softCategoryId: number,
  mes?: string,
): ToolRank[] {
  const soft = movements.filter(
    (m) =>
      isEligible(m) &&
      m.record_type === RECORD_TYPE.COSTO_RECONOCIDO &&
      m.cost_category_id === softCategoryId &&
      (!mes || m.mes === mes),
  );

  const groups = new Map<string, { label: string; rows: EnrichedMovement[] }>();
  for (const m of soft) {
    const label = (m.counterparty ?? '').trim() || (m.detail ?? '').trim() || 'Sin proveedor';
    const key = label.toUpperCase();
    const g = groups.get(key) ?? { label, rows: [] };
    g.rows.push(m);
    groups.set(key, g);
  }

  const grand = soft.reduce((a, m) => a + m.amount, 0);
  return [...groups.values()]
    .map((g) => {
      const total = round2(g.rows.reduce((a, m) => a + m.amount, 0));
      return {
        name: g.label,
        total,
        sharePct: grand ? (total / grand) * 100 : 0,
        ids: g.rows.map((m) => m.id),
        units: [...new Set(g.rows.map((m) => m.unitCode))],
      };
    })
    .sort((a, b) => b.total - a.total);
}

export { COST_CATEGORY_CODE };
