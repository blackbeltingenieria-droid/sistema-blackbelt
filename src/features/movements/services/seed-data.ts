// features/movements/services/seed-data.ts
// Sin Supabase: movimientos REALES del Excel «CUADRO DE COSTOS» (ingresos, egresos e inversiones),
// ya traducidos al Modelo C (ver features/excel-data). Con `npm run dev:demo`: datos de demostración.

import type { DbMovement } from '../../../types/database';
import { demoData } from '../../demo/demo-data';
import { EXCEL_DB_MOVEMENTS } from '../../excel-data/excel-local';

export const SEED_MOVEMENTS: DbMovement[] = demoData ? demoData.movements : EXCEL_DB_MOVEMENTS.map((m) => ({ ...m }));
