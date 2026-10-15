// Fábricas de datos para pruebas unitarias.
import type { DbMovement } from '../types/database';
import { enrichMovement } from '../features/movements/domain/movement-rules';
import type { EnrichedMovement } from '../features/movements/types';

export const UNIT_ID: Record<string, number> = { UN01: 1, UN02: 2, UN03: 3, UN04: 4, UN05: 5, CORP: 6 };
// ids de área / categoría arbitrarios pero consistentes con el catálogo semilla
export const AREA_ID = { DIR: 1, MKT: 2, ADM: 3, FIN: 4, 'U03-MET': 13, 'U03-TEC': 14, 'U04-CAM': 16, 'U05-INN': 18, 'U05-MER': 21 } as const;
export const CAT_ID = { MO: 1, PUB: 2, SOFT: 3, SERV: 4, MAT: 5, ACT: 13, CXC: 14, SOC: 16, OTR: 17 } as const;

let seq = 0;

export function mov(over: Partial<DbMovement> & { unit?: string } = {}): EnrichedMovement {
  seq += 1;
  const unit = over.unit ?? 'CORP';
  const base: DbMovement = {
    id: seq,
    movement_code: `MOV-2026-${String(seq).padStart(4, '0')}`,
    movement_date: '2026-10-12',
    record_type: 'COSTO_RECONOCIDO',
    amount: 100,
    business_unit_id: UNIT_ID[unit],
    area_id: AREA_ID.ADM,
    responsible: 'TEST',
    cost_category_id: CAT_ID.SERV,
    expense_class: 'COMPARTIDO',
    project_id: null,
    counterparty: null,
    detail: null,
    payment_method: null,
    voucher_number: null,
    status: 'VALIDADO',
    notes: null,
    ...over,
  };
  return enrichMovement(base, unit);
}
