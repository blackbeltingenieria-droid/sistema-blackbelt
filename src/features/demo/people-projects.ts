// features/demo/people-projects.ts
// Clientes, proyectos, cobros por proyecto, especialistas, usuarios, sprints, tareas y horas de demostración.

import type {
  DbClient, DbProject, DbProjectPayment, DbSpecialist, DbSprint, DbTask, DbUser, DbWorkHour,
  ProjectStatus, RoleCode, TaskStatus,
} from '../../types/database';
import { DEMO_EMAIL_DOMAIN, DEMO_ID_BASE, DEMO_MONTHS, demoDate, makeRng, withPrefix } from './constants';

const id = (n: number): number => DEMO_ID_BASE + n;

// ─── Clientes (15) ───────────────────────────────────────────────────────────
const CLIENT_DEFS: [string, 'Empresa' | 'Persona', string][] = [
  ['Minera Altoandina S.A.C.', 'Empresa', 'Pasco'], ['Agroexport Valle Verde S.A.C.', 'Empresa', 'Huánuco'],
  ['Constructora Pacífico E.I.R.L.', 'Empresa', 'Lima'], ['Municipalidad Distrital de Amarilis', 'Empresa', 'Huánuco'],
  ['Universidad Andina del Norte', 'Empresa', 'Tingo María'], ['Clínica San Gabriel S.A.', 'Empresa', 'Huánuco'],
  ['Textiles Inca Real S.A.', 'Empresa', 'Lima'], ['Lucía Fernández Rojas', 'Persona', 'Huánuco'],
  ['Jorge Salazar Vega', 'Persona', 'Cerro de Pasco'], ['Rosa Huamán Cárdenas', 'Persona', 'Ambo'],
  ['Inversiones Tambo S.R.L.', 'Empresa', 'Huancayo'], ['Cooperativa Cafetalera Monzón', 'Empresa', 'Monzón'],
  ['Diego Paredes Lara', 'Persona', 'Lima'], ['Lácteos del Sur S.A.C.', 'Empresa', 'Arequipa'],
  ['Carmen Zevallos Ruiz', 'Persona', 'Huánuco'],
];

export function buildClients(): DbClient[] {
  return CLIENT_DEFS.map(([name, type, location], i) => ({
    id: id(i + 1), name: withPrefix(name), client_type: type,
    doc_number: type === 'Empresa' ? `2060${String(1000000 + i * 7919).slice(0, 7)}` : `7${String(1000000 + i * 4513).slice(0, 7)}`,
    phone: `9${String(10000000 + i * 123457).slice(0, 8)}`,
    email: `contacto${i + 1}${DEMO_EMAIL_DOMAIN}`, location,
    notes: withPrefix('Cliente de demostración'), created_at: '2026-06-15T00:00:00Z',
  }));
}

// ─── Especialistas (9: 1 dirección + 8 colaboradores) ────────────────────────
const SPECIALIST_DEFS: [string, string][] = [
  ['Henry Torres Rivera', 'Dirección general'], ['Juan Pérez Vásquez', 'Transformación digital'],
  ['Marco Guzmán León', 'Geofísica y suelos'], ['Sofía Castro Ríos', 'Incubación y emprendimiento'],
  ['Valeria Quispe Mori', 'Procesos y calidad'], ['Andrés Rojas Cano', 'Desarrollo de software'],
  ['Mónica Vega Salas', 'Investigación y tesis'], ['Luis Cárdenas Ponce', 'Datos e inteligencia de negocios'],
  ['Paola Ramos Tello', 'Marketing y capacitación'],
];

export function buildSpecialists(): DbSpecialist[] {
  return SPECIALIST_DEFS.map(([name, specialty], i) => ({
    id: id(i + 1), full_name: withPrefix(name), email: `esp${i + 1}${DEMO_EMAIL_DOMAIN}`, specialty, active: true,
  }));
}

// ─── Usuarios: 2 admins (uno sin vínculo, otro con Kanban) + 8 colaboradores ─
export interface DemoUserDef { id: number; email: string; full_name: string; role: RoleCode; specialist_id: number | null }

export function buildUserDefs(): DemoUserDef[] {
  const colabs = SPECIALIST_DEFS.slice(1).map(([name], i): DemoUserDef => ({
    id: id(11 + i), email: `${name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}${DEMO_EMAIL_DOMAIN}`,
    full_name: withPrefix(name), role: 'colaborador', specialist_id: id(i + 2),
  }));
  return [
    { id: id(1), email: `admin${DEMO_EMAIL_DOMAIN}`, full_name: withPrefix('Admin General'), role: 'admin', specialist_id: null },
    { id: id(2), email: `admin.kanban${DEMO_EMAIL_DOMAIN}`, full_name: withPrefix('Admin con Kanban'), role: 'admin', specialist_id: id(1) },
    ...colabs,
  ];
}

export function toDbUsers(roleIdByCode: Record<RoleCode, number>): DbUser[] {
  return buildUserDefs().map((u) => ({
    id: u.id, email: u.email, full_name: u.full_name, role_id: roleIdByCode[u.role], specialist_id: u.specialist_id, active: true,
  }));
}

// ─── Proyectos (25: 5 por unidad) ────────────────────────────────────────────
interface ProjectDef { unit: number; name: string; service: string; client: number; manager: number; start: string; end: string; amount: number; status: ProjectStatus }
const P = (unit: number, name: string, service: string, client: number, manager: number, start: string, end: string, amount: number, status: ProjectStatus): ProjectDef =>
  ({ unit, name, service, client, manager, start, end, amount, status });

export const PROJECT_DEFS: ProjectDef[] = [
  // UN01 Ingeniería y Productividad
  P(1, 'Optimización de líneas de empaque', 'CONSULTORÍA LEAN', 2, 5, '2026-06-20', '2026-12-20', 14000, 'activo'),
  P(1, 'Reducción de mermas en planta láctea', 'MEJORA CONTINUA', 14, 5, '2026-07-01', '2026-12-15', 11500, 'activo'),
  P(1, 'Estandarización de procesos clínicos', 'GESTIÓN DE PROCESOS', 6, 5, '2026-07-10', '2026-12-30', 9800, 'activo'),
  P(1, 'Plan de mantenimiento productivo', 'MANTENIMIENTO TPM', 7, 1, '2026-06-01', '2026-09-15', 8200, 'finalizado'),
  P(1, 'Diagnóstico de productividad textil', 'DIAGNÓSTICO OPERATIVO', 7, 1, '2026-06-05', '2026-08-30', 6500, 'finalizado'),
  // UN02 Tecnología y Transformación Digital
  P(2, 'ERP en la nube para distribuidora', 'TRANSFORMACIÓN DIGITAL', 11, 6, '2026-06-15', '2026-12-31', 22000, 'activo'),
  P(2, 'Dashboard de ventas en Power BI', 'DATOS E INTELIGENCIA', 3, 8, '2026-07-05', '2026-11-30', 9500, 'activo'),
  P(2, 'Automatización de facturación', 'AUTOMATIZACIÓN', 14, 6, '2026-08-01', '2026-12-20', 12500, 'activo'),
  P(2, 'Portal web institucional', 'DESARROLLO WEB', 4, 6, '2026-07-15', '2026-12-10', 10500, 'activo'),
  P(2, 'App de control de inventario', 'DESARROLLO DE SOFTWARE', 2, 6, '2026-06-01', '2026-09-30', 7800, 'finalizado'),
  // UN03 Investigación y Desarrollo
  P(3, 'Tesis de ingeniería agroindustrial', 'DESARROLLO DE TESIS', 8, 7, '2026-06-25', '2026-12-15', 3200, 'activo'),
  P(3, 'Prototipo de secador solar', 'PROTOTIPADO', 12, 7, '2026-07-01', '2026-12-30', 8800, 'activo'),
  P(3, 'Estudio de factibilidad agroindustrial', 'ESTUDIOS TÉCNICOS', 2, 7, '2026-08-10', '2026-12-20', 7400, 'activo'),
  P(3, 'Validación experimental de biofertilizante', 'INVESTIGACIÓN APLICADA', 5, 7, '2026-06-10', '2026-09-20', 6300, 'finalizado'),
  P(3, 'Artículo científico en procesos', 'REDACCIÓN CIENTÍFICA', 13, 7, '2026-07-20', '2026-08-20', 2800, 'cancelado'),
  // UN04 Ingeniería Especializada
  P(4, 'Prospección geofísica minera', 'GEOFÍSICA Y SUELOS', 1, 3, '2026-06-18', '2026-12-18', 28000, 'activo'),
  P(4, 'Estudio de resistividad eléctrica', 'GEOFÍSICA Y SUELOS', 3, 3, '2026-07-08', '2026-12-05', 16500, 'activo'),
  P(4, 'Modelado 3D de subsuelo', 'MODELADO 3D', 1, 3, '2026-06-01', '2026-09-10', 19000, 'finalizado'),
  P(4, 'Levantamiento geofísico para cimentación', 'GEOFÍSICA Y SUELOS', 3, 3, '2026-06-05', '2026-08-25', 13500, 'finalizado'),
  P(4, 'Interpretación sísmica de refracción', 'INTERPRETACIÓN SÍSMICA', 10, 3, '2026-08-01', '2026-10-15', 9000, 'cancelado'),
  // UN05 Emprendimiento y Desarrollo Empresarial
  P(5, 'Plan de negocio para startup agro', 'INCUBACIÓN STARTUP', 12, 4, '2026-06-20', '2026-12-10', 6800, 'activo'),
  P(5, 'Incubación de emprendimiento digital', 'INCUBACIÓN STARTUP', 15, 4, '2026-07-05', '2026-12-30', 7200, 'activo'),
  P(5, 'Capacitación en gestión empresarial', 'CAPACITACIÓN', 11, 9, '2026-07-12', '2026-12-12', 9400, 'activo'),
  P(5, 'Marketing digital para pyme', 'MARKETING PARA CLIENTES', 9, 9, '2026-08-03', '2026-12-22', 8100, 'activo'),
  P(5, 'Consultoría de modelo de negocio', 'CONSULTORÍA EMPRESARIAL', 10, 4, '2026-06-08', '2026-09-05', 5600, 'finalizado'),
];

// Área gestora por unidad para los proyectos (ver catálogo: UN01 7-9, UN02 10-12, UN03 13-15, UN04 16-17, UN05 18-21).
export const UNIT_AREAS: Record<number, number[]> = { 1: [7, 8, 9], 2: [10, 11, 12], 3: [13, 14, 15], 4: [16, 17], 5: [18, 19, 20, 21] };

export function buildProjects(): DbProject[] {
  return PROJECT_DEFS.map((p, i) => ({
    id: id(i + 1), code: `DEMO-PRY-${String(i + 1).padStart(3, '0')}`, client_id: id(p.client),
    business_unit_id: p.unit, area_id: UNIT_AREAS[p.unit][i % UNIT_AREAS[p.unit].length],
    name: withPrefix(p.name), service: p.service, manager: SPECIALIST_DEFS[p.manager - 1][0].toUpperCase(),
    start_date: p.start, end_date: p.end, contracted_amount: p.amount, status: p.status,
    notes: withPrefix('Proyecto de demostración'),
  }));
}

export const projectId = (n: number): number => id(n);
export const specialistId = (n: number): number => id(n);

/** Cobros por proyecto (alimentan «saldo pendiente»): adelanto + cuotas según el avance del proyecto. */
export function buildProjectPayments(): DbProjectPayment[] {
  const out: DbProjectPayment[] = [];
  let n = 0;
  PROJECT_DEFS.forEach((p, i) => {
    const share = p.status === 'finalizado' ? 1 : p.status === 'cancelado' ? 0.3 : 0.35 + ((i * 7) % 4) * 0.12;
    const tranches = p.status === 'finalizado' ? 3 : 2;
    const paid = Math.round((p.amount * share) / 10) * 10;
    for (let t = 0; t < tranches; t++) {
      n += 1;
      out.push({
        id: id(n), project_id: id(i + 1), amount: Math.round(paid / tranches),
        payment_date: demoDate(DEMO_MONTHS[Math.min(t + (i % 2), 5)], 5 + ((i + t * 3) % 20)),
        payment_method: withPrefix(t % 2 ? 'Transferencia' : 'Yape'),
      });
    }
  });
  return out;
}

// ─── Sprints y tareas (proyectos activos) ────────────────────────────────────
const TASK_TITLES = [
  'Levantamiento de información', 'Diseño de la solución', 'Elaboración de informe parcial', 'Reunión de avance con el cliente',
  'Revisión de calidad', 'Ajustes solicitados', 'Preparación de entregable', 'Validación con el responsable',
  'Documentación técnica', 'Capacitación al equipo del cliente', 'Pruebas de campo', 'Cierre y acta de conformidad',
];
const STATUSES: TaskStatus[] = ['backlog', 'por_hacer', 'en_curso', 'en_revision', 'hecho'];

export function buildSprintsAndTasks(): { sprints: DbSprint[]; tasks: DbTask[] } {
  const rng = makeRng(7);
  const sprints: DbSprint[] = [];
  const tasks: DbTask[] = [];
  const active = PROJECT_DEFS.map((p, i) => ({ p, n: i + 1 })).filter((x) => x.p.status === 'activo');
  let sId = 0;
  let tId = 0;
  active.forEach(({ p, n }, k) => {
    const s1 = ++sId;
    const s2 = ++sId;
    sprints.push(
      { id: id(s1), project_id: id(n), name: withPrefix('Sprint 1'), goal: withPrefix('Primer bloque de entregables'), start_date: '2026-09-21', end_date: '2026-10-05', status: 'cerrado' },
      { id: id(s2), project_id: id(n), name: withPrefix('Sprint 2'), goal: withPrefix('Segundo bloque de entregables'), start_date: '2026-10-06', end_date: '2026-10-27', status: 'activo' },
    );
    const count = 3 + (k % 3); // 3–5 tareas por proyecto → ~60
    for (let t = 0; t < count; t++) {
      const status = STATUSES[(k + t * 2 + Math.floor(rng() * 2)) % 5];
      const assignee = (k + t) % 9 === 0 && t === 0 ? null : id(((k * 3 + t) % 9) + 1);
      tasks.push({
        id: id(++tId), project_id: id(n), sprint_id: status === 'backlog' ? null : (t % 2 ? id(s2) : id(s1)),
        title: withPrefix(`${TASK_TITLES[(k + t) % TASK_TITLES.length]} · ${p.service.toLowerCase()}`),
        description: withPrefix('Tarea de demostración'), status, assignee_id: assignee,
        due_date: status === 'hecho' ? `2026-10-0${1 + (t % 8)}` : `2026-10-${String(10 + ((k * 2 + t * 3) % 20)).padStart(2, '0')}`,
      });
    }
  });
  return { sprints, tasks };
}

// ─── Horas-hombre (todos los meses) ──────────────────────────────────────────
export function buildWorkHours(tasks: DbTask[]): DbWorkHour[] {
  const rng = makeRng(11);
  const out: DbWorkHour[] = [];
  let n = 0;
  const activeProjects = PROJECT_DEFS.map((p, i) => ({ p, n: i + 1 })).filter((x) => x.p.status !== 'cancelado');
  for (const month of DEMO_MONTHS) {
    for (let s = 1; s <= 9; s++) {
      const entries = 4 + Math.floor(rng() * 3);
      for (let e = 0; e < entries; e++) {
        const proj = activeProjects[(s * 3 + e * 5 + Number(month.slice(5))) % activeProjects.length];
        const myTasks = tasks.filter((t) => t.project_id === id(proj.n) && t.assignee_id === id(s));
        out.push({
          id: id(++n), specialist_id: id(s), project_id: id(proj.n),
          task_id: myTasks.length && e % 2 === 0 ? myTasks[e % myTasks.length].id : null,
          work_date: demoDate(month, 2 + ((e * 5 + s * 2) % 26)),
          ...demoTimes(Math.round((1 + rng() * 7) * 2) / 2, (s + e) % 2 === 0 ? 8 : 9),
          description: withPrefix(`Trabajo en ${proj.p.service.toLowerCase()}`),
        });
      }
    }
  }
  return out;
}

/** Horario de ejemplo coherente con las horas: desde 08:00/09:00; con almuerzo 13:00–14:00 si pasa de 4 h. */
function demoTimes(hours: number, startHour: number) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const at = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
  const start = startHour * 60;
  const lunch = start + hours * 60 > 13 * 60;
  const end = start + hours * 60 + (lunch ? 60 : 0);
  return {
    hours, start_time: at(start), end_time: at(end),
    break_minutes: lunch ? 60 : 0, breaks: lunch ? '13:00-14:00' : null,
  };
}
