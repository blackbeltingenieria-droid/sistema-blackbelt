// ─── Datos locales — Clientes y Proyectos ────────────────────────────────────
// Sin Supabase: datos REALES del Excel «CUADRO DE COSTOS» (TABLA_CLIENTES + TABLA_INGRESOS).
// Con `npm run dev:demo`: datos de demostración.

import type { DbClient, DbProject, DbProjectPayment } from '../../../types/database';
import { SEED_BUSINESS_UNITS } from '../../catalogs/services/seed-data';
import { demoData } from '../../demo/demo-data';
import { EXCEL_DB_CLIENTS, EXCEL_DB_PAYMENTS, EXCEL_DB_PROJECTS } from '../../excel-data/excel-local';

export { SEED_BUSINESS_UNITS };

export const SEED_CLIENTS: DbClient[] = demoData ? demoData.clients : EXCEL_DB_CLIENTS.map((c) => ({ ...c }));

export const SEED_PROJECTS: DbProject[] = demoData ? demoData.projects : EXCEL_DB_PROJECTS.map((p) => ({ ...p }));

export const SEED_PAYMENTS: DbProjectPayment[] = demoData ? demoData.payments : EXCEL_DB_PAYMENTS.map((p) => ({ ...p }));
