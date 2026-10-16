// features/excel-data/excel-dataset.ts
// Traduce las filas reales del Excel (excel-raw.ts) al Modelo C, igual que lo haría una persona con el
// formulario simple: cada ingreso = INGRESO_RECONOCIDO + COBRO (+ pago del proyecto); cada egreso =
// COSTO_RECONOCIDO + PAGO; cada inversión = registro en investments + APORTE_SOCIO.
// Las referencias a catálogos van por CÓDIGO (UN03, U03-MET, MO…) para servir tanto a los datos locales
// (ids del catálogo semilla) como al SQL de la nube (subconsultas por código).

import { EXCEL_CLIENTES, EXCEL_EGRESOS, EXCEL_INGRESOS, EXCEL_INVERSIONES, EXCEL_MANO_OBRA } from './excel-raw';

export type XlsRecordType = 'INGRESO_RECONOCIDO' | 'COSTO_RECONOCIDO' | 'COBRO' | 'PAGO' | 'APORTE_SOCIO';
export type XlsClass = 'DIRECTO' | 'ATRIBUIBLE' | 'COMPARTIDO' | 'NO_APLICA';

export interface XlsClient { id: number; name: string; doc: string | null; phone: string | null; institution: string; row: number }
export interface XlsProject {
  id: number; code: string; clientId: number; unitCode: string; areaCode: string; name: string; service: string;
  manager: string; start: string; end: string; contracted: number; status: 'activo' | 'finalizado'; notes: string;
}
export interface XlsPayment { id: number; projectId: number; amount: number; date: string; method: string }
export interface XlsSpecialist { id: number; name: string; specialty: string }
export interface XlsMovement {
  id: number; code: string; date: string; type: XlsRecordType; amount: number;
  unitCode: string; areaCode: string; categoryCode: string; cls: XlsClass; projectId: number | null;
  counterparty: string | null; detail: string; method: string; responsible: string | null; notes: string | null;
}
export interface XlsInvestment {
  id: number; code: string; kind: 'patrimonio'; name: string; doc: string; amount: number; date: string; method: string; description: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const norm = (s: string) => s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

// ─── Clientes y proyectos (TABLA_CLIENTES) ───────────────────────────────────
export const XLS_CLIENTS: XlsClient[] = EXCEL_CLIENTES.map((c, i) => ({
  id: i + 1, name: c.name, doc: c.doc, phone: c.phone, institution: c.institution, row: c.row,
}));

/** Cliente por nombre o DNI (TABLA_INGRESOS escribe a veces el nombre distinto: "CASTRO ESTFHANY DIAZ"). */
function clientIdFor(name: string, doc: string | null): number {
  const byDoc = doc ? XLS_CLIENTS.find((c) => c.doc === doc) : undefined;
  if (byDoc) return byDoc.id;
  const n = norm(name);
  const byName = XLS_CLIENTS.find((c) => norm(c.name).includes(n) || n.includes(norm(c.name)) || norm(c.name).split(' ').slice(0, 2).every((w) => n.includes(w)));
  if (!byName) throw new Error(`Cliente del Excel sin ficha en TABLA_CLIENTES: ${name}`);
  return byName.id;
}

const TODAY = '2026-10-16';
const byStart = [...EXCEL_CLIENTES].map((c, i) => ({ c, clientId: i + 1 })).sort((a, b) => a.c.start.localeCompare(b.c.start) || a.clientId - b.clientId);

export const XLS_PROJECTS: XlsProject[] = byStart.map(({ c, clientId }, i) => ({
  id: i + 1,
  code: `PRY-2026-${String(i + 1).padStart(3, '0')}`,
  clientId,
  unitCode: 'UN03',
  areaCode: 'U03-MET',
  name: `${c.service} – ${c.name}`,
  service: c.service,
  manager: 'HENRY TORRES RIVERA',
  start: c.start,
  end: c.end,
  contracted: c.contracted,
  // Terminado y pagado completo → finalizado; el resto sigue activo.
  status: c.pending === 0 && c.end < TODAY ? 'finalizado' : 'activo',
  notes: `${c.institution} · Excel TABLA_CLIENTES fila ${c.row}`,
}));

const projectOfClient = (clientId: number) => XLS_PROJECTS.find((p) => p.clientId === clientId) as XlsProject;

// ─── Especialistas (TABLA_M.O) ───────────────────────────────────────────────
export const XLS_SPECIALISTS: XlsSpecialist[] = [
  { id: 1, name: 'Henry Torres Rivera', specialty: 'Gerente general' },
  ...EXCEL_MANO_OBRA.filter((m) => norm(m.name) !== 'HENRY TORRES RIVERA').map((m, i) => ({
    id: i + 2,
    name: m.name.split(' ').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
    specialty: m.service.charAt(0) + m.service.slice(1).toLowerCase(),
  })),
];

// ─── Movimientos ─────────────────────────────────────────────────────────────
interface Event { date: string; order: number; build: (code: (n: number) => string, nextId: () => number) => XlsMovement[] }
const events: Event[] = [];

/** Especialista mencionado en el texto del egreso (Excel lo escribe entre paréntesis o al final). */
function specialistIn(spec: string): string | null {
  const s = norm(spec);
  if (s.includes('EDDY')) return 'EDDY RENATO VIVANCO NÚÑEZ';
  if (s.includes('JHIMMY')) return 'JHIMMY CORTÉZ RUIZ';
  if (s.includes('ALANIS')) return 'ALANIS PARDAVÉ';
  if (s.includes('(HENRY)')) return 'HENRY TORRES RIVERA';
  if (s.includes('TEDDY')) return 'TEDDY GARCIA MURRIETA';
  if (s.includes('ASESORAMIENTO DE INVESTIGACION')) return 'MANUEL ENRIQUE PANDURO RENGIFO';
  return null;
}

/** Proyecto al que corresponde un pago a especialista (según TABLA_M.O: a quién asesora). */
function projectForExpense(spec: string): number | null {
  const s = norm(spec);
  const wilmer = projectOfClient(clientIdFor('WILMER WILFREDO SANCHEZ MAMANI', '45410158')).id;
  const tania = projectOfClient(clientIdFor('TANIA LUCIA AROS RENGIFO', '41705907')).id;
  if (s.includes('WILMER') || s.includes('TEDDY')) return wilmer;   // Teddy y Henry asesoran a Wilmer (M.O filas 14–15)
  if (s.includes('JHIMMY')) return tania;                           // Jhimmy desarrolla la tesis de Tania (M.O fila 12)
  return null;
}

function categoryFor(group: string, product: string, spec: string): string {
  const g = norm(group), p = norm(product), s = norm(spec);
  if (g === 'HERRAMIENTAS DIGITALES') return 'SOFT';
  if (g === 'SERVICIO TELEFONICO') return 'SERV';
  if (g === 'SERVICIOS DE INVESTIGACION') return 'MO';
  if (g === 'MARKETING DIGITAL') return p.startsWith('PUBLICIDAD') ? 'PUB' : 'MO';
  if (g === 'TRANSPORTES Y TRAMITES') return p === 'TRANSPORTE' || s.includes('TRANSPORTE') ? 'MOV' : 'ADM';
  if (g === 'HERRAMIENTA') return 'MAT';
  return 'OTR'; // REUNIONES EJECUTIVAS
}

const AREA: Record<string, string> = {
  'DIRECCION ESTRATEGICA': 'DIR', MARKETING: 'MKT', GENERAL: 'ADM', 'INVESTIGACION Y DESARROLLO': 'U03-MET',
};

for (const [i, r] of EXCEL_INGRESOS.entries()) {
  const clientId = clientIdFor(r.client, r.doc);
  const project = projectOfClient(clientId);
  const client = XLS_CLIENTS.find((c) => c.id === clientId) as XlsClient;
  events.push({
    date: r.date, order: 100 + i,
    build: (code, nextId) => {
      const mainId = nextId(); const mainCode = code(mainId);
      const base = { date: r.date, amount: r.amount, unitCode: 'UN03', projectId: project.id, counterparty: client.name, detail: r.spec, method: r.method, responsible: null };
      const cobroId = nextId();
      return [
        { ...base, id: mainId, code: mainCode, type: 'INGRESO_RECONOCIDO', areaCode: 'U03-MET', categoryCode: 'OTR', cls: 'NO_APLICA', notes: `Excel TABLA_INGRESOS fila ${r.row}: ${r.product} – ${r.group}` },
        { ...base, id: cobroId, code: code(cobroId), type: 'COBRO', areaCode: 'FIN', categoryCode: 'CXC', cls: 'NO_APLICA', notes: `Contrapartida de ${mainCode}` },
      ] as XlsMovement[];
    },
  });
}

for (const [i, r] of EXCEL_EGRESOS.entries()) {
  const isCorp = r.unit === 'GENERAL';
  const category = categoryFor(r.group, r.product, r.spec);
  const projectId = isCorp ? null : projectForExpense(r.spec);
  const specialist = category === 'MO' ? specialistIn(r.spec) : null;
  const detail = category === 'MO' ? r.spec : `${r.product.charAt(0)}${r.product.slice(1).toLowerCase()}`;
  events.push({
    date: r.date, order: 200 + i,
    build: (code, nextId) => {
      const mainId = nextId(); const mainCode = code(mainId);
      const base = { date: r.date, amount: r.amount, unitCode: isCorp ? 'CORP' : 'UN03', projectId, counterparty: specialist ?? r.product, detail, method: r.method, responsible: r.payer };
      const payId = nextId();
      return [
        { ...base, id: mainId, code: mainCode, type: 'COSTO_RECONOCIDO', areaCode: AREA[r.area] ?? 'ADM', categoryCode: category,
          cls: isCorp ? 'COMPARTIDO' : projectId ? 'DIRECTO' : 'ATRIBUIBLE', notes: `Excel TABLA_EGRESOS fila ${r.row}: ${r.spec}` },
        { ...base, id: payId, code: code(payId), type: 'PAGO', areaCode: 'FIN', categoryCode: 'CXP', cls: 'NO_APLICA', notes: `Contrapartida de ${mainCode}` },
      ] as XlsMovement[];
    },
  });
}

export const XLS_INVESTMENTS: XlsInvestment[] = EXCEL_INVERSIONES.map((r, i) => ({
  id: i + 1, code: `INV-2026-${String(i + 1).padStart(3, '0')}`, kind: 'patrimonio',
  name: r.name, doc: r.doc, amount: r.amount, date: r.date, method: r.method, description: r.spec,
}));

for (const [i, inv] of XLS_INVESTMENTS.entries()) {
  events.push({
    date: inv.date, order: i,
    build: (code, nextId) => {
      const id = nextId();
      return [{
        id, code: code(id), date: inv.date, type: 'APORTE_SOCIO', amount: inv.amount, unitCode: 'CORP', areaCode: 'FIN', categoryCode: 'SOC',
        cls: 'NO_APLICA', projectId: null, counterparty: inv.name, detail: inv.description, method: inv.method, responsible: null,
        notes: `Inversión ${inv.code} · Excel TABLA_INVERSIONES fila ${EXCEL_INVERSIONES[i].row}`,
      }];
    },
  });
}

let seq = 0;
export const XLS_MOVEMENTS: XlsMovement[] = events
  .sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order)
  .flatMap((e) => e.build((n) => `MOV-2026-${String(n).padStart(4, '0')}`, () => ++seq));

export const XLS_PAYMENTS: XlsPayment[] = EXCEL_INGRESOS
  .map((r) => ({ r, projectId: projectOfClient(clientIdFor(r.client, r.doc)).id }))
  .sort((a, b) => a.r.date.localeCompare(b.r.date))
  .map(({ r, projectId }, i) => ({ id: i + 1, projectId, amount: r.amount, date: r.date, method: r.method }));

/** Totales calculados desde el dataset (para comparar con EXCEL_TOTALES en los tests y en el SQL). */
export function datasetTotals() {
  const sum = (t: XlsRecordType) => r2(XLS_MOVEMENTS.filter((m) => m.type === t).reduce((a, m) => a + m.amount, 0));
  return {
    ingresos: sum('INGRESO_RECONOCIDO'),
    cobros: sum('COBRO'),
    egresos: sum('COSTO_RECONOCIDO'),
    pagos: sum('PAGO'),
    inversion: sum('APORTE_SOCIO'),
    fondoEnCaja: r2(sum('COBRO') + sum('APORTE_SOCIO') - sum('PAGO')),
    contratado: r2(XLS_PROJECTS.reduce((a, p) => a + p.contracted, 0)),
    pagadoClientes: r2(XLS_PAYMENTS.reduce((a, p) => a + p.amount, 0)),
  };
}
