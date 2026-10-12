// ─── Seed data — Clientes y Proyectos (Modelo C) ─────────────────────────────
// Basado en las hojas 04_CLIENTES y 05_PROYECTOS del Excel oficial Modelo C.

import type { DbClient, DbProject, DbProjectPayment } from '../../../types/database';
import { SEED_BUSINESS_UNITS } from '../../catalogs/services/seed-data';

export { SEED_BUSINESS_UNITS };

// ─── 04_CLIENTES: Clientes con campos completos de la hoja oficial ───────────
export const SEED_CLIENTS: DbClient[] = [
  {
    id: 1,
    name: 'Wilmer Sánchez Mamani',
    client_type: 'Persona',
    doc_number: '45678901',
    phone: '99999999',
    email: 'wsanchez@gmail.com',
    location: 'Puno',
    notes: 'Cliente de desarrollo de tesis e investigación técnica',
    created_at: '2024-01-10T00:00:00Z',
  },
  {
    id: 2,
    name: 'Tania Aros Rengifo',
    client_type: 'Persona',
    doc_number: '71038520',
    phone: '951234567',
    email: 'taros@outlook.com',
    location: 'Arequipa',
    notes: 'Proyectos de transformación digital y ciberseguridad',
    created_at: '2024-02-15T00:00:00Z',
  },
  {
    id: 3,
    name: 'Carlos Mendoza Torres',
    client_type: 'Persona',
    doc_number: '09854321',
    phone: '984561230',
    email: 'cmendoza@empresa.pe',
    location: 'Cusco',
    notes: 'Estudios de impacto ambiental',
    created_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 4,
    name: 'Empresa Minera Andes S.A.',
    client_type: 'Empresa',
    doc_number: '20538921710',
    phone: '958741236',
    email: 'contacto@mineraandes.com',
    location: 'Lima / Moquegua',
    notes: 'Ingeniería estructural y geofísica',
    created_at: '2024-03-20T00:00:00Z',
  },
  {
    id: 5,
    name: 'Municipalidad de Puno',
    client_type: 'Empresa',
    doc_number: '20109874563',
    phone: '051364789',
    email: 'alcaldia@munipuno.gob.pe',
    location: 'Puno',
    notes: 'Modernización y consultoría operativa',
    created_at: '2024-04-05T00:00:00Z',
  },
  {
    id: 6,
    name: 'Patricia Quispe Huanca',
    client_type: 'Persona',
    doc_number: '41872659',
    phone: '978523641',
    email: 'pquispe@gmail.com',
    location: 'Juliaca',
    notes: 'Emprendimiento y desarrollo de startup agro-exportadora',
    created_at: '2024-05-12T00:00:00Z',
  },
];

// ─── 05_PROYECTOS: Proyectos con campos y códigos de la hoja oficial ──────────
export const SEED_PROJECTS: DbProject[] = [
  {
    id: 1,
    code: 'PRY-2026-001',
    client_id: 1, // Wilmer Sánchez
    business_unit_id: 3, // UN03 Investigación y Desarrollo (igual a hoja 05_PROYECTOS)
    name: 'Desarrollo de Tesis e Investigación Experimental',
    service: 'DESARROLLO DE TESIS',
    manager: 'HENRY TORRES RIVERA',
    start_date: '2024-02-01',
    end_date: '2024-07-31',
    contracted_amount: 3000,
    status: 'activo',
    notes: 'Proyecto modelo C documentado en Excel maestro',
    contract_url: null,
  },
  {
    id: 2,
    code: 'PRY-2024-002',
    client_id: 2,
    business_unit_id: 2, // UN02 Tecnología y Transformación Digital
    name: 'Transformación digital — ERP cloud',
    service: 'Implementación tecnológica',
    manager: 'Equipo Dev / TyTD',
    start_date: '2024-03-15',
    end_date: '2024-12-15',
    contracted_amount: 120000,
    status: 'activo',
    notes: 'Implementación ERP y automatización de procesos',
    contract_url: null,
  },
  {
    id: 3,
    code: 'PRY-2024-003',
    client_id: 3,
    business_unit_id: 3, // UN03 Investigación y Desarrollo
    name: 'Estudio de impacto ambiental — Zona industrial',
    service: 'Investigación técnica',
    manager: 'HENRY TORRES RIVERA',
    start_date: '2024-04-01',
    end_date: '2024-09-30',
    contracted_amount: 32000,
    status: 'activo',
    notes: 'Mediciones de campo y ensayos de laboratorio',
    contract_url: null,
  },
  {
    id: 4,
    code: 'PRY-2024-004',
    client_id: 4,
    business_unit_id: 4, // UN04 Ingeniería Especializada
    name: 'Diseño estructural — Planta concentradora',
    service: 'Ingeniería estructural',
    manager: 'Ing. Especialista UN04',
    start_date: '2024-01-15',
    end_date: '2024-06-15',
    contracted_amount: 85000,
    status: 'finalizado',
    notes: 'Cálculo de elementos finitos y memoria de cálculo',
    contract_url: null,
  },
  {
    id: 5,
    code: 'PRY-2024-005',
    client_id: 5,
    business_unit_id: 1, // UN01 Ingeniería y Productividad
    name: 'Plan de modernización del parque vehicular municipal',
    service: 'Consultoría de Productividad',
    manager: 'Consultor Lean UN01',
    start_date: '2024-06-01',
    end_date: '2025-01-31',
    contracted_amount: 67000,
    status: 'activo',
    notes: 'Diagnóstico operacional y manual de procedimientos',
    contract_url: null,
  },
  {
    id: 6,
    code: 'PRY-2024-006',
    client_id: 6,
    business_unit_id: 5, // UN05 Emprendimiento y Desarrollo Empresarial
    name: 'Asesoría para startup de agro-exportación',
    service: 'Desarrollo empresarial',
    manager: 'Mentor UN05',
    start_date: '2024-07-01',
    end_date: '2024-12-31',
    contracted_amount: 18000,
    status: 'activo',
    notes: 'Plan de negocios y estructuración de canales comerciales',
    contract_url: null,
  },
  {
    id: 7,
    code: 'PRY-2024-007',
    client_id: 1,
    business_unit_id: 4, // UN04 Ingeniería Especializada
    name: 'Auditoría técnica de equipos — Segunda fase',
    service: 'Ingeniería especializada',
    manager: 'Ing. Especialista UN04',
    start_date: '2024-08-01',
    end_date: '2024-11-30',
    contracted_amount: 28000,
    status: 'cancelado',
    notes: 'Cancelado a solicitud del cliente por reestructuración',
    contract_url: null,
  },
  {
    id: 8,
    code: 'PRY-2024-008',
    client_id: 2,
    business_unit_id: 2, // UN02 Tecnología y Transformación Digital
    name: 'Ciberseguridad y cumplimiento ISO 27001',
    service: 'Seguridad digital',
    manager: 'Especialista Ciberseguridad UN02',
    start_date: '2024-09-01',
    end_date: '2025-03-31',
    contracted_amount: 55000,
    status: 'activo',
    notes: 'Auditoría de vulnerabilidades y políticas de seguridad',
    contract_url: null,
  },
];

// ─── Pagos de proyectos ──────────────────────────────────────────────────────
export const SEED_PAYMENTS: DbProjectPayment[] = [
  // Proyecto 1 (3000 contratado, 2000 pagado)
  { id: 1,  project_id: 1, amount: 2000,  payment_date: '2024-02-15', payment_method: 'transferencia' },
  // Proyecto 2 (120,000 contratado, 60,000 pagado)
  { id: 2,  project_id: 2, amount: 40000, payment_date: '2024-03-20', payment_method: 'transferencia' },
  { id: 3,  project_id: 2, amount: 20000, payment_date: '2024-06-01', payment_method: 'cheque' },
  // Proyecto 3 (32,000 contratado, 16,000 pagado)
  { id: 4,  project_id: 3, amount: 16000, payment_date: '2024-04-05', payment_method: 'transferencia' },
  // Proyecto 4 (85,000 contratado, 85,000 pagado completo)
  { id: 5,  project_id: 4, amount: 42500, payment_date: '2024-01-20', payment_method: 'transferencia' },
  { id: 6,  project_id: 4, amount: 42500, payment_date: '2024-06-15', payment_method: 'transferencia' },
  // Proyecto 5 (67,000 contratado, 20,000 pagado)
  { id: 7,  project_id: 5, amount: 20000, payment_date: '2024-06-10', payment_method: 'transferencia' },
  // Proyecto 6 (18,000 contratado, 9,000 pagado)
  { id: 8,  project_id: 6, amount: 9000,  payment_date: '2024-07-10', payment_method: 'efectivo' },
  // Proyecto 8 (55,000 contratado, 15,000 pagado)
  { id: 9,  project_id: 8, amount: 15000, payment_date: '2024-09-15', payment_method: 'transferencia' },
];
