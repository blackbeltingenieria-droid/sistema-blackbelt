// features/demo/finance.ts
// Movimientos, presupuestos y reparto CORP de demostración, coherentes con el Modelo C:
// cada unidad tiene ingresos y costos; el gasto CORP compartido vive en CORP; los casos mal
// clasificados y los borradores existen a propósito para que se vean las alertas.

import {
  type DbBudget, type DbCorpAllocation, type DbMovement, type ExpenseClass, type MovementStatus, type RecordType,
} from '../../types/database';
import { enrichMovement } from '../movements/domain/movement-rules';
import { DEMO_ID_BASE, DEMO_MONTHS, DEMO_MOVEMENT_CODE_PREFIX, demoDate, makeRng, withPrefix } from './constants';
import { PROJECT_DEFS, UNIT_AREAS, projectId } from './people-projects';

// Ids del catálogo oficial (ver catalogs/services/seed-data.ts)
const CORP = 6;
const AREA = { DIR: 1, MKT: 2, ADM: 3, FIN: 4 } as const;
const CAT = { MO: 1, PUB: 2, SOFT: 3, SERV: 4, MAT: 5, MAQ: 6, MOV: 7, TERC: 8, ADM: 9, CAP: 10, BAN: 11, MANT: 12, ACT: 13, CXC: 14, CXP: 15, SOC: 16, OTR: 17 } as const;
const UNIT_CODE: Record<number, string> = { 1: 'UN01', 2: 'UN02', 3: 'UN03', 4: 'UN04', 5: 'UN05', 6: 'CORP' };
const UNITS = [1, 2, 3, 4, 5];

// Perfil económico por unidad (ingreso base mensual y proporciones de costo)
const PROFILE: Record<number, { income: number; direct: number; attrib: number }> = {
  1: { income: 4200, direct: 0.42, attrib: 0.1 },
  2: { income: 5400, direct: 0.38, attrib: 0.11 },
  3: { income: 3500, direct: 0.3, attrib: 0.09 },
  4: { income: 6200, direct: 0.55, attrib: 0.12 },
  5: { income: 3100, direct: 0.28, attrib: 0.1 },
};
// Meses «malos» a propósito (resultado negativo): [unidad, mes] → multiplicador de costo directo
const BAD_MONTHS: Record<string, number> = { '4|2026-09': 1.9, '1|2026-08': 2.3 };

const DIRECT_KINDS: Record<number, { cat: number; cp: string; detail: string }[]> = {
  1: [{ cat: CAT.MO, cp: 'CONSULTOR EXTERNO', detail: 'Honorarios de consultor de procesos' }, { cat: CAT.MOV, cp: 'MOVILIDAD LOCAL', detail: 'Viáticos de visita a planta' }],
  2: [{ cat: CAT.MO, cp: 'DESARROLLADOR FREELANCE', detail: 'Horas de desarrollo contratadas' }, { cat: CAT.TERC, cp: 'HOSTING PERÚ', detail: 'Servicio tercerizado de infraestructura' }],
  3: [{ cat: CAT.MAT, cp: 'FERRETERÍA CENTRAL', detail: 'Materiales del prototipo' }, { cat: CAT.MO, cp: 'ASISTENTE DE LABORATORIO', detail: 'Honorarios de apoyo experimental' }],
  4: [{ cat: CAT.MO, cp: 'TÉCNICO DE CAMPO', detail: 'Jornal de brigada geofísica' }, { cat: CAT.MOV, cp: 'TRANSPORTES ANDES', detail: 'Movilización de equipos a campo' }],
  5: [{ cat: CAT.MO, cp: 'FACILITADOR EXTERNO', detail: 'Honorarios de facilitador' }, { cat: CAT.TERC, cp: 'DISEÑO GRÁFICO FREELANCE', detail: 'Piezas para cliente' }],
};
const UNIT_TOOLS: Record<number, [string, number][]> = {
  1: [['MINITAB', 280], ['SIMUL8', 190]], 2: [['FIGMA', 130], ['GITHUB', 95], ['AWS', 170]],
  3: [['MATLAB', 210], ['MENDELEY', 60]], 4: [['SURFER GOLDEN', 350], ['AUTODESK', 240]], 5: [['HOOTSUITE', 85], ['ZOOM', 75]],
};
const PUB_SUPPLIERS = ['META', 'GOOGLE ADS', 'LINKEDIN ADS'];

const round2 = (n: number): number => Math.round(n * 100) / 100;
const round10 = (n: number): number => Math.round(n / 10) * 10;

interface Draft {
  date: string; type: RecordType; amount: number; unit: number; area: number; cat: number; cls: ExpenseClass;
  project?: number | null; cp?: string; detail: string; method?: string; status?: MovementStatus; responsible?: string; notes?: string;
}

const RESP: Record<number, string> = { 1: 'VALERIA QUISPE', 2: 'ANDRÉS ROJAS', 3: 'MÓNICA VEGA', 4: 'MARCO GUZMÁN', 5: 'SOFÍA CASTRO', 6: 'ADMINISTRACIÓN' };

export function buildMovements(): DbMovement[] {
  const rng = makeRng(2026);
  const drafts: Draft[] = [];
  const projectsOfUnit = (u: number, month: string) =>
    PROJECT_DEFS.map((p, i) => ({ p, n: i + 1 })).filter(({ p }) => p.unit === u && p.status !== 'cancelado' && p.start.slice(0, 7) <= month && (p.status === 'activo' || p.end.slice(0, 7) >= month));

  DEMO_MONTHS.forEach((month, mi) => {
    const growth = 1 + mi * 0.04;
    let monthCosts = 0;
    for (const u of UNITS) {
      const prof = PROFILE[u];
      const projs = projectsOfUnit(u, month);
      const proj = projs.length ? projs[(mi + u) % projs.length] : null;
      const area = UNIT_AREAS[u][(mi + u) % UNIT_AREAS[u].length];
      const noise = 0.85 + rng() * 0.3;
      const income = round10(prof.income * growth * noise);
      const dMult = BAD_MONTHS[`${u}|${month}`] ?? 1;
      const direct = round10(income * prof.direct * dMult * (0.9 + rng() * 0.2));
      const attrib = round10(income * prof.attrib * (0.9 + rng() * 0.2));
      monthCosts += direct + attrib;
      const day = (k: number) => 3 + ((u * 3 + mi * 5 + k * 7) % 24);

      // Ingreso reconocido (1 por unidad y mes)
      drafts.push({ date: demoDate(month, day(0)), type: 'INGRESO_RECONOCIDO', amount: income, unit: u, area, cat: CAT.OTR, cls: 'NO_APLICA',
        project: proj ? projectId(proj.n) : null, detail: withPrefix(`Servicio reconocido ${UNIT_CODE[u]}`), responsible: RESP[u] });
      // Cobro (≈ 85 % del ingreso, desfasado)
      drafts.push({ date: demoDate(month, day(1)), type: 'COBRO', amount: round10(income * (0.78 + rng() * 0.15)), unit: u, area: AREA.FIN, cat: CAT.CXC, cls: 'NO_APLICA',
        project: proj ? projectId(proj.n) : null, cp: 'CLIENTE', detail: withPrefix('Cobro de cuota del cliente'), method: rng() > 0.5 ? 'TRANSFERENCIA' : 'YAPE', responsible: 'FINANZAS' });
      // Costos directos (2 tipos: el 2.º aporta ~35 %)
      DIRECT_KINDS[u].forEach((k, ki) => {
        drafts.push({ date: demoDate(month, day(2 + ki)), type: 'COSTO_RECONOCIDO', amount: round10(direct * (ki === 0 ? 0.65 : 0.35)) || 10, unit: u, area, cat: k.cat, cls: 'DIRECTO',
          project: proj ? projectId(proj.n) : null, cp: k.cp, detail: withPrefix(k.detail), responsible: RESP[u] });
      });
      // Atribuibles: publicidad de la unidad + herramienta SOFT (rota por proveedor)
      drafts.push({ date: demoDate(month, day(5)), type: 'COSTO_RECONOCIDO', amount: round10(attrib * 0.6) || 10, unit: u, area: AREA.MKT, cat: CAT.PUB, cls: 'ATRIBUIBLE',
        cp: PUB_SUPPLIERS[(mi + u) % 3], detail: withPrefix(`Pauta publicitaria ${UNIT_CODE[u]}`), method: 'TARJETA', responsible: 'MARKETING' });
      const tools = UNIT_TOOLS[u];
      const [tool, toolAmt] = tools[(mi + u) % tools.length];
      drafts.push({ date: demoDate(month, day(6)), type: 'COSTO_RECONOCIDO', amount: round10(toolAmt * (0.9 + rng() * 0.2)), unit: u, area: AREA.ADM, cat: CAT.SOFT, cls: 'ATRIBUIBLE',
        cp: tool, detail: withPrefix(`Licencia ${tool} para ${UNIT_CODE[u]}`), method: 'TARJETA', responsible: RESP[u] });
    }

    // Gasto CORP compartido (5 por mes)
    const corp: [number, number, string, string, number][] = [
      [CAT.SOFT, AREA.MKT, 'CANVA', 'Suscripción general de diseño', 55],
      [CAT.SOFT, AREA.ADM, 'MICROSOFT 365', 'Licencias de oficina', 120],
      [CAT.SERV, AREA.ADM, 'CLARO HOGAR', 'Internet de la oficina', 160],
      [CAT.PUB, AREA.MKT, 'META', 'Marketing institucional de Blackbelt', 380 + mi * 20],
      [CAT.ADM, AREA.ADM, 'CONTADOR EXTERNO', 'Honorarios contables y trámites', 450],
      [CAT.BAN, AREA.FIN, 'BCP', 'Comisiones y mantenimiento de cuenta', 28],
    ];
    corp.forEach(([cat, area, cp, detail, amt], k) => {
      drafts.push({ date: demoDate(month, 2 + k * 4), type: 'COSTO_RECONOCIDO', amount: round2(amt * (0.97 + rng() * 0.06)), unit: CORP, area, cat, cls: 'COMPARTIDO',
        cp, detail: withPrefix(detail), method: 'TARJETA', responsible: 'ADMINISTRACIÓN' });
    });
    // Categorías menos frecuentes: capacitación (UN05), maquinaria (UN04, meses pares), mantenimiento (UN03, meses impares)
    const p5 = projectsOfUnit(5, month)[0];
    drafts.push({ date: demoDate(month, 14), type: 'COSTO_RECONOCIDO', amount: 180, unit: 5, area: 20, cat: CAT.CAP, cls: 'DIRECTO', project: p5 ? projectId(p5.n) : null,
      cp: 'INSTITUTO DE FORMACIÓN', detail: withPrefix('Material y sala para capacitación'), responsible: RESP[5] });
    monthCosts += 180;
    if (mi % 2 === 1) {
      drafts.push({ date: demoDate(month, 16), type: 'COSTO_RECONOCIDO', amount: 450, unit: 4, area: 16, cat: CAT.MAQ, cls: 'DIRECTO', cp: 'ALQUILER DE EQUIPOS SUR',
        detail: withPrefix('Alquiler de equipo de campo'), responsible: RESP[4] });
      monthCosts += 450;
    } else {
      drafts.push({ date: demoDate(month, 17), type: 'COSTO_RECONOCIDO', amount: 120, unit: 3, area: 14, cat: CAT.MANT, cls: 'ATRIBUIBLE', cp: 'SERVICIO TÉCNICO ANDINO',
        detail: withPrefix('Mantenimiento de equipos de laboratorio'), responsible: RESP[3] });
      monthCosts += 120;
    }
    // Pagos de caja (proveedores del mes)
    drafts.push({ date: demoDate(month, 18), type: 'PAGO', amount: round10(corp.reduce((a, c) => a + c[4], 0) * 0.9), unit: CORP, area: AREA.FIN, cat: CAT.CXP, cls: 'NO_APLICA',
      cp: 'PROVEEDORES VARIOS', detail: withPrefix('Pago de facturas de proveedores corporativos'), method: 'TRANSFERENCIA', responsible: 'FINANZAS' });
    drafts.push({ date: demoDate(month, 24), type: 'PAGO', amount: round10(monthCosts * 0.85), unit: CORP, area: AREA.FIN, cat: CAT.CXP, cls: 'NO_APLICA',
      cp: 'HONORARIOS DE ESPECIALISTAS', detail: withPrefix('Pago a especialistas y freelancers'), method: 'TRANSFERENCIA', responsible: 'FINANZAS' });
  });

  // Socios y activos
  drafts.push({ date: '2026-07-01', type: 'APORTE_SOCIO', amount: 2500, unit: CORP, area: AREA.FIN, cat: CAT.SOC, cls: 'NO_APLICA', cp: 'SOCIO FUNDADOR', detail: withPrefix('Aporte de capital'), method: 'TRANSFERENCIA', responsible: 'FINANZAS' });
  drafts.push({ date: '2026-10-02', type: 'APORTE_SOCIO', amount: 1500, unit: CORP, area: AREA.FIN, cat: CAT.SOC, cls: 'NO_APLICA', cp: 'SOCIO FUNDADOR', detail: withPrefix('Aporte para capital de trabajo'), method: 'TRANSFERENCIA', responsible: 'FINANZAS' });
  drafts.push({ date: '2026-07-30', type: 'RETIRO_SOCIO', amount: 3000, unit: CORP, area: AREA.FIN, cat: CAT.SOC, cls: 'NO_APLICA', cp: 'SOCIO FUNDADOR', detail: withPrefix('Retiro de utilidades de julio'), responsible: 'FINANZAS' });
  drafts.push({ date: '2026-09-28', type: 'RETIRO_SOCIO', amount: 9000, unit: CORP, area: AREA.FIN, cat: CAT.SOC, cls: 'NO_APLICA', cp: 'SOCIO FUNDADOR', detail: withPrefix('Retiro de utilidades'), responsible: 'FINANZAS' });
  drafts.push({ date: '2026-12-15', type: 'RETIRO_SOCIO', amount: 12000, unit: CORP, area: AREA.FIN, cat: CAT.SOC, cls: 'NO_APLICA', cp: 'SOCIO FUNDADOR', detail: withPrefix('Retiro de utilidades de cierre'), responsible: 'FINANZAS' });
  drafts.push({ date: '2026-08-12', type: 'COMPRA_ACTIVO', amount: 5200, unit: 4, area: 16, cat: CAT.ACT, cls: 'NO_APLICA', cp: 'GEOTEC PERÚ', detail: withPrefix('Equipo de resistividad que queda en Blackbelt'), method: 'TRANSFERENCIA', responsible: 'MARCO GUZMÁN' });
  drafts.push({ date: '2026-09-09', type: 'COMPRA_ACTIVO', amount: 3400, unit: 2, area: 10, cat: CAT.ACT, cls: 'NO_APLICA', cp: 'TIENDA TECH', detail: withPrefix('Laptops para desarrollo'), method: 'TARJETA', responsible: 'ANDRÉS ROJAS' });
  drafts.push({ date: '2026-11-04', type: 'COMPRA_ACTIVO', amount: 2100, unit: 3, area: 14, cat: CAT.ACT, cls: 'NO_APLICA', cp: 'LABORATORIOS ANDINOS', detail: withPrefix('Balanza y estufa de laboratorio'), method: 'TRANSFERENCIA', responsible: 'MÓNICA VEGA' });

  // Casos mal clasificados a propósito (control ≠ OK): una por cada tipo de revisión
  drafts.push({ date: '2026-10-07', type: 'COSTO_RECONOCIDO', amount: 90, unit: 2, area: AREA.ADM, cat: CAT.SOFT, cls: 'COMPARTIDO', cp: 'ZOOM', detail: withPrefix('Videollamadas (revisar beneficiario)'), responsible: 'ADMINISTRACIÓN', notes: withPrefix('Debería estar en CORP') });         // REVISAR CORP
  drafts.push({ date: '2026-08-20', type: 'COSTO_RECONOCIDO', amount: 260, unit: CORP, area: AREA.ADM, cat: CAT.MAT, cls: 'DIRECTO', cp: 'LIBRERÍA UNIVERSAL', detail: withPrefix('Útiles asignados sin unidad (revisar)'), responsible: 'ADMINISTRACIÓN' });                       // REVISAR UNIDAD
  drafts.push({ date: '2026-10-09', type: 'INGRESO_RECONOCIDO', amount: 700, unit: CORP, area: AREA.DIR, cat: CAT.OTR, cls: 'NO_APLICA', detail: withPrefix('Ingreso registrado en CORP (revisar unidad)'), responsible: 'DIRECCIÓN' });                       // REVISAR INGRESO
  drafts.push({ date: '2026-11-10', type: 'COSTO_RECONOCIDO', amount: 140, unit: 3, area: 13, cat: CAT.MAT, cls: 'NO_APLICA', cp: 'FERRETERÍA CENTRAL', detail: withPrefix('Costo con clase NO_APLICA (revisar clase)'), responsible: 'MÓNICA VEGA' });                  // REVISAR CLASE
  drafts.push({ date: '2026-09-14', type: 'COBRO', amount: 500, unit: 1, area: AREA.FIN, cat: CAT.CXC, cls: 'DIRECTO', cp: 'CLIENTE', detail: withPrefix('Cobro con clase DIRECTO (usar NO_APLICA)'), responsible: 'FINANZAS' });                                  // USAR NO_APLICA
  drafts.push({ date: '2026-10-11', type: 'COSTO_RECONOCIDO', amount: 0, unit: 5, area: 18, cat: CAT.PUB, cls: 'ATRIBUIBLE', cp: 'META', detail: withPrefix('Importe pendiente de completar'), responsible: 'MARKETING' });                                  // INCOMPLETO

  // Orden por fecha → ids y códigos estables
  drafts.sort((a, b) => a.date.localeCompare(b.date) || a.detail.localeCompare(b.detail) || a.amount - b.amount);

  // Borradores: los últimos días del mes actual y algo de lo futuro (cada ~9.º movimiento desde el 20 de oct)
  return drafts.map((d, i): DbMovement => {
    const canDraft = d.type !== 'INGRESO_RECONOCIDO' && d.type !== 'COMPRA_ACTIVO';
    const draftLate = canDraft && d.date >= '2026-10-20' && i % 5 === 0;
    const draftOct = canDraft && d.date >= '2026-10-12' && d.date < '2026-10-20' && i % 3 === 0;
    return {
      id: DEMO_ID_BASE + i + 1,
      movement_code: `${DEMO_MOVEMENT_CODE_PREFIX}${String(i + 1).padStart(4, '0')}`,
      movement_date: d.date, record_type: d.type, amount: d.amount,
      business_unit_id: d.unit, area_id: d.area, responsible: d.responsible ?? null, cost_category_id: d.cat,
      expense_class: d.cls, project_id: d.project ?? null, counterparty: d.cp ?? null, detail: d.detail,
      payment_method: d.method ?? null, voucher_number: d.type === 'COSTO_RECONOCIDO' && d.cls !== 'NO_APLICA' && i % 3 === 0 ? `F001-${String(1000 + i)}` : null,
      status: d.status ?? (draftLate || draftOct ? 'BORRADOR' : 'VALIDADO'),
      notes: d.notes ?? null,
    };
  });
}

/** Presupuestos: una fila por combinación mes + unidad + área + categoría que tiene movimientos
 *  de costo/ingreso, con meta ±20 % del real (así la desviación se ve realista). */
export function buildBudgets(movements: DbMovement[]): DbBudget[] {
  const rng = makeRng(99);
  const groups = new Map<string, { month: string; unit: number; area: number; cat: number; income: number; cost: number }>();
  for (const m of movements) {
    if (m.record_type !== 'COSTO_RECONOCIDO' && m.record_type !== 'INGRESO_RECONOCIDO') continue;
    if (m.amount <= 0) continue;
    const month = m.movement_date.slice(0, 7);
    const key = `${month}|${m.business_unit_id}|${m.area_id}|${m.cost_category_id}`;
    const g = groups.get(key) ?? { month, unit: m.business_unit_id, area: m.area_id, cat: m.cost_category_id, income: 0, cost: 0 };
    if (m.record_type === 'COSTO_RECONOCIDO') g.cost += m.amount; else g.income += m.amount;
    groups.set(key, g);
  }
  return [...groups.values()]
    .sort((a, b) => a.month.localeCompare(b.month) || a.unit - b.unit || a.area - b.area || a.cat - b.cat)
    .map((g, i): DbBudget => ({
      id: DEMO_ID_BASE + i + 1, month: g.month, business_unit_id: g.unit, area_id: g.area, cost_category_id: g.cat,
      income_target: round10(g.income * (0.85 + rng() * 0.3)), cost_target: round10(g.cost * (0.85 + rng() * 0.3)),
      comment: withPrefix(`Meta ${UNIT_CODE[g.unit]} ${g.month}`),
    }));
}

/** Reparto CORP: definido en 4 de los 6 meses (jul, ago, oct, nov); sep y dic quedan «sin repartir». */
const ALLOC: Record<string, Record<number, number>> = {
  '2026-07': { 1: 25, 2: 25, 3: 20, 4: 15, 5: 15 },
  '2026-08': { 1: 20, 2: 25, 3: 20, 4: 20, 5: 15 },
  '2026-10': { 1: 20, 2: 30, 3: 15, 4: 20, 5: 15 },
  '2026-11': { 1: 20, 2: 30, 3: 15, 4: 20, 5: 15 },
};
export function buildAllocation(): DbCorpAllocation[] {
  const out: DbCorpAllocation[] = [];
  let n = 0;
  for (const [month, pcts] of Object.entries(ALLOC)) {
    for (const [unit, pct] of Object.entries(pcts)) {
      out.push({ id: DEMO_ID_BASE + ++n, month, business_unit_id: Number(unit), pct, note: withPrefix('Criterio: proporcional al ingreso del trimestre anterior') });
    }
  }
  return out;
}

/** Utilidad para pruebas: cuántos movimientos tienen control distinto de OK. */
export function countControlIssues(ms: DbMovement[]): number {
  return ms.filter((m) => enrichMovement(m, UNIT_CODE[m.business_unit_id]).control !== 'OK').length;
}
