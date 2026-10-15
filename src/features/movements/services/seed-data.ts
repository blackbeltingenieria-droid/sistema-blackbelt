// features/movements/services/seed-data.ts
// Datos de ejemplo (solo modo local sin Supabase): casos de la hoja 11_EJEMPLOS del Excel Modelo C,
// más un par de casos mal clasificados para ver el control en acción.
// Ids de catálogo: unidades UN01–UN05=1–5, CORP=6; áreas y categorías según catalogs/seed-data.

import type { DbMovement } from '../../../types/database';

type SeedInput = Omit<DbMovement, 'id' | 'movement_code'> & { n: number };

const m = (n: number, v: Omit<SeedInput, 'n'>): DbMovement => ({
  id: n,
  movement_code: `MOV-2026-${String(n).padStart(4, '0')}`,
  ...v,
});

const base = {
  responsible: null, project_id: null, counterparty: null, detail: null,
  payment_method: null, voucher_number: null, notes: null,
} as const;

// Áreas: ADM=3 MKT=2 FIN=4 U03-MET=13 U03-TEC=14 U04-CAM=16 U05-INN=18 U05-MER=21
// Categorías: MO=1 PUB=2 SOFT=3 SERV=4 MAT=5 ACT=13 CXC=14 SOC=16 OTR=17
export const SEED_MOVEMENTS: DbMovement[] = [
  m(1,  { ...base, movement_date: '2026-10-02', record_type: 'COSTO_RECONOCIDO', amount: 180,  business_unit_id: 6, area_id: 3,  responsible: 'ADMINISTRACIÓN', cost_category_id: 4,  expense_class: 'COMPARTIDO', counterparty: 'BITEL', detail: 'Plan WhatsApp / llamadas de Blackbelt', status: 'VALIDADO' }),
  m(2,  { ...base, movement_date: '2026-10-03', record_type: 'COSTO_RECONOCIDO', amount: 350,  business_unit_id: 1, area_id: 2,  responsible: 'MARKETING', cost_category_id: 2,  expense_class: 'ATRIBUIBLE', counterparty: 'META', detail: 'Meta Ads — optimización de procesos', payment_method: 'TARJETA', status: 'VALIDADO' }),
  m(3,  { ...base, movement_date: '2026-10-03', record_type: 'COSTO_RECONOCIDO', amount: 280,  business_unit_id: 2, area_id: 2,  responsible: 'MARKETING', cost_category_id: 2,  expense_class: 'ATRIBUIBLE', counterparty: 'META', detail: 'Meta Ads — desarrollo web', payment_method: 'TARJETA', status: 'VALIDADO' }),
  m(4,  { ...base, movement_date: '2026-10-04', record_type: 'COSTO_RECONOCIDO', amount: 220,  business_unit_id: 3, area_id: 2,  responsible: 'MARKETING', cost_category_id: 2,  expense_class: 'ATRIBUIBLE', counterparty: 'META', detail: 'Meta Ads — tesis e investigación', status: 'BORRADOR' }),
  m(5,  { ...base, movement_date: '2026-10-05', record_type: 'COSTO_RECONOCIDO', amount: 55,   business_unit_id: 6, area_id: 2,  responsible: 'MARKETING', cost_category_id: 3,  expense_class: 'COMPARTIDO', counterparty: 'CANVA', detail: 'Suscripción general de diseño', payment_method: 'TARJETA', status: 'VALIDADO' }),
  m(6,  { ...base, movement_date: '2026-10-12', record_type: 'COSTO_RECONOCIDO', amount: 750,  business_unit_id: 3, area_id: 13, responsible: 'HENRY TORRES', cost_category_id: 1,  expense_class: 'DIRECTO', project_id: 1, counterparty: 'EDDY RENATO', detail: 'Desarrollo de la plataforma en Inventor', payment_method: 'YAPE', status: 'VALIDADO' }),
  m(7,  { ...base, movement_date: '2026-10-08', record_type: 'COSTO_RECONOCIDO', amount: 320,  business_unit_id: 3, area_id: 14, responsible: 'HENRY TORRES', cost_category_id: 5,  expense_class: 'DIRECTO', project_id: 1, counterparty: 'FERRETERÍA CENTRAL', detail: 'Materiales consumidos del prototipo', status: 'VALIDADO' }),
  m(8,  { ...base, movement_date: '2026-10-09', record_type: 'COMPRA_ACTIVO',    amount: 4800, business_unit_id: 4, area_id: 16, responsible: 'MARCO GUZMÁN', cost_category_id: 13, expense_class: 'NO_APLICA', counterparty: 'GEOTEC PERÚ', detail: 'Equipo geofísico que permanece en Blackbelt', status: 'VALIDADO' }),
  m(9,  { ...base, movement_date: '2026-10-10', record_type: 'INGRESO_RECONOCIDO', amount: 2500, business_unit_id: 5, area_id: 18, responsible: 'SOFÍA CASTRO', cost_category_id: 17, expense_class: 'NO_APLICA', project_id: 6, detail: 'Asesoría de innovación a una empresa', status: 'VALIDADO' }),
  m(10, { ...base, movement_date: '2026-10-11', record_type: 'INGRESO_RECONOCIDO', amount: 3000, business_unit_id: 3, area_id: 13, responsible: 'HENRY TORRES', cost_category_id: 17, expense_class: 'NO_APLICA', project_id: 1, detail: 'Prestación de tesis efectivamente reconocida', status: 'VALIDADO' }),
  m(11, { ...base, movement_date: '2026-10-13', record_type: 'COBRO',            amount: 2000, business_unit_id: 3, area_id: 4,  responsible: 'FINANZAS', cost_category_id: 14, expense_class: 'NO_APLICA', project_id: 1, counterparty: 'WILMER SÁNCHEZ', detail: 'Cuota pactada del cliente', payment_method: 'TRANSFERENCIA', status: 'VALIDADO' }),
  m(12, { ...base, movement_date: '2026-09-30', record_type: 'APORTE_SOCIO',     amount: 1500, business_unit_id: 6, area_id: 4,  responsible: 'FINANZAS', cost_category_id: 16, expense_class: 'NO_APLICA', counterparty: 'SOCIO FUNDADOR', detail: 'Ingreso de capital', payment_method: 'TRANSFERENCIA', status: 'VALIDADO' }),
  m(13, { ...base, movement_date: '2026-10-14', record_type: 'COSTO_RECONOCIDO', amount: 600,  business_unit_id: 5, area_id: 21, responsible: 'SOFÍA CASTRO', cost_category_id: 1,  expense_class: 'DIRECTO', project_id: 6, counterparty: 'FREELANCE MKT', detail: 'Campaña ejecutada para cliente de UN05', status: 'VALIDADO' }),
  m(14, { ...base, movement_date: '2026-10-14', record_type: 'PAGO',             amount: 180,  business_unit_id: 6, area_id: 4,  responsible: 'FINANZAS', cost_category_id: 15, expense_class: 'NO_APLICA', counterparty: 'BITEL', detail: 'Pago de la factura de Bitel', payment_method: 'TARJETA', status: 'VALIDADO' }),
  m(15, { ...base, movement_date: '2026-10-10', record_type: 'RETIRO_SOCIO',     amount: 300,  business_unit_id: 6, area_id: 4,  responsible: 'FINANZAS', cost_category_id: 16, expense_class: 'NO_APLICA', counterparty: 'SOCIO FUNDADOR', detail: 'Retiro de utilidades', status: 'VALIDADO' }),
  // Mal clasificado a propósito: compartido en una unidad → control REVISAR CORP (no alimenta reportes)
  m(16, { ...base, movement_date: '2026-10-06', record_type: 'COSTO_RECONOCIDO', amount: 90,   business_unit_id: 2, area_id: 3,  responsible: 'ADMINISTRACIÓN', cost_category_id: 3,  expense_class: 'COMPARTIDO', counterparty: 'ZOOM', detail: 'Videollamadas (revisar beneficiario)', status: 'VALIDADO' }),
];
