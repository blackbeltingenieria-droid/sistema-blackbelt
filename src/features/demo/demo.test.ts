import { describe, expect, it } from 'vitest';
import { enrichMovement } from '../movements/domain/movement-rules';
import { computeResults } from '../results-cash/domain/calculations';
import { rankSoftwareTools } from '../dashboard-general/domain/tool-ranking';
import { DEMO_ID_BASE, DEMO_MONTHS, DEMO_PREFIX, DEMO_MOVEMENT_CODE_PREFIX } from './constants';
import { buildDemoDataset } from './index';
import { breaksFromText, computeWorkedHours } from '../work-hours/time-range';

const UNIT_CODE: Record<number, string> = { 1: 'UN01', 2: 'UN02', 3: 'UN03', 4: 'UN04', 5: 'UN05', 6: 'CORP' };
const d = buildDemoDataset();
const enriched = d.movements.map((m) => enrichMovement(m, UNIT_CODE[m.business_unit_id]));
const unique = (xs: unknown[]) => new Set(xs).size === xs.length;

describe('datos demo: marca e idempotencia', () => {
  it('es determinista: dos generaciones son idénticas (el seed no duplica)', () => {
    expect(buildDemoDataset()).toEqual(d);
  });
  it('todo id es ≥ 9001 y único por tabla', () => {
    for (const [name, rows] of Object.entries(d)) {
      const ids = (rows as { id: number }[]).map((r) => r.id);
      expect(unique(ids), name).toBe(true);
      expect(ids.every((i) => i > DEMO_ID_BASE), name).toBe(true);
    }
  });
  it('todo dato demo lleva la marca «DEMO - » (o código DEMO-)', () => {
    expect(d.clients.every((c) => c.name.startsWith(DEMO_PREFIX))).toBe(true);
    expect(d.projects.every((p) => p.name.startsWith(DEMO_PREFIX))).toBe(true);
    expect(d.specialists.every((s) => s.full_name.startsWith(DEMO_PREFIX))).toBe(true);
    expect(d.users.every((u) => u.full_name.startsWith(DEMO_PREFIX))).toBe(true);
    expect(d.sprints.every((s) => s.name.startsWith(DEMO_PREFIX))).toBe(true);
    expect(d.tasks.every((t) => t.title.startsWith(DEMO_PREFIX))).toBe(true);
    expect(d.workHours.every((h) => h.description?.startsWith(DEMO_PREFIX))).toBe(true);
    expect(d.payments.every((p) => p.payment_method?.startsWith(DEMO_PREFIX))).toBe(true);
    expect(d.movements.every((m) => m.detail?.startsWith(DEMO_PREFIX) && m.movement_code.startsWith(DEMO_MOVEMENT_CODE_PREFIX))).toBe(true);
    expect(d.budgets.every((b) => b.comment?.startsWith(DEMO_PREFIX))).toBe(true);
    expect(d.allocation.every((a) => a.note?.startsWith(DEMO_PREFIX))).toBe(true);
    expect(unique(d.movements.map((m) => m.movement_code))).toBe(true);
  });
});

describe('datos demo: volumen pedido', () => {
  it('15 clientes, 25 proyectos con estados distintos, ~200 movimientos, 9 especialistas', () => {
    expect(d.clients).toHaveLength(15);
    expect(d.projects).toHaveLength(25);
    expect(new Set(d.projects.map((p) => p.status))).toEqual(new Set(['activo', 'finalizado', 'cancelado']));
    for (const u of [1, 2, 3, 4, 5]) expect(d.projects.filter((p) => p.business_unit_id === u)).toHaveLength(5);
    expect(d.movements.length).toBeGreaterThanOrEqual(190);
    expect(d.movements.length).toBeLessThanOrEqual(260);
    expect(d.specialists.length).toBeGreaterThanOrEqual(8);
  });
  it('usa los 7 tipos, las 4 clases y las 17 categorías', () => {
    expect(new Set(d.movements.map((m) => m.record_type)).size).toBe(7);
    expect(new Set(d.movements.map((m) => m.expense_class)).size).toBe(4);
    expect(new Set(d.movements.map((m) => m.cost_category_id)).size).toBeGreaterThanOrEqual(16);
  });
  it('gastos CORP compartidos (Canva, internet, marketing) y 8+ herramientas SOFT', () => {
    const corp = enriched.filter((m) => m.unitCode === 'CORP' && m.expense_class === 'COMPARTIDO').map((m) => m.counterparty);
    expect(corp).toEqual(expect.arrayContaining(['CANVA', 'CLARO HOGAR', 'META']));
    const soft = rankSoftwareTools(enriched, 3);
    expect(soft.length).toBeGreaterThanOrEqual(8);
  });
});

describe('datos demo: coherencia con el Modelo C', () => {
  it('cada unidad tiene ingresos todos los meses', () => {
    for (const mes of DEMO_MONTHS) {
      const r = computeResults(enriched, mes, {});
      for (const u of r.units) expect(u.income.amount, `${u.unit} ${mes}`).toBeGreaterThan(0);
    }
  });
  it('la conciliación cuadra en los 6 meses', () => {
    const alloc: Record<string, Record<string, number>> = {};
    for (const a of d.allocation) (alloc[a.month] ??= {})[UNIT_CODE[a.business_unit_id]] = a.pct;
    for (const mes of DEMO_MONTHS) expect(computeResults(enriched, mes, alloc[mes] ?? {}).reconciliation.ok, mes).toBe(true);
  });
  it('hay resultados negativos y positivos (gráficos realistas)', () => {
    const finals = DEMO_MONTHS.flatMap((mes) => computeResults(enriched, mes, {}).units.map((u) => u.contribution));
    expect(finals.some((x) => x < 0)).toBe(true);
    expect(finals.filter((x) => x > 0).length).toBeGreaterThan(20);
  });
  it('incluye borradores y los 6 tipos de control ≠ OK', () => {
    expect(enriched.filter((m) => m.status === 'BORRADOR').length).toBeGreaterThanOrEqual(5);
    const issues = new Set(enriched.filter((m) => m.control !== 'OK').map((m) => m.control));
    expect(issues).toEqual(new Set(['REVISAR CORP', 'REVISAR UNIDAD', 'REVISAR INGRESO', 'REVISAR CLASE', 'USAR NO_APLICA', 'INCOMPLETO']));
  });
  it('reparto CORP definido en 4 de 6 meses (suma 100) y 2 sin repartir', () => {
    const months = new Set(d.allocation.map((a) => a.month));
    expect(months.size).toBe(4);
    for (const m of months) expect(d.allocation.filter((a) => a.month === m).reduce((s, a) => s + a.pct, 0)).toBe(100);
    expect(DEMO_MONTHS.filter((m) => !months.has(m))).toHaveLength(2);
  });
  it('presupuestos: combinaciones únicas y presentes en los 6 meses', () => {
    const keys = d.budgets.map((b) => `${b.month}|${b.business_unit_id}|${b.area_id}|${b.cost_category_id}`);
    expect(unique(keys)).toBe(true);
    expect(new Set(d.budgets.map((b) => b.month)).size).toBe(6);
  });
});

describe('datos demo: integridad referencial', () => {
  const ids = (rows: { id: number }[]) => new Set(rows.map((r) => r.id));
  it('proyectos, tareas, sprints, horas y usuarios apuntan a filas existentes', () => {
    const clients = ids(d.clients), projects = ids(d.projects), specs = ids(d.specialists), sprints = ids(d.sprints), tasks = ids(d.tasks);
    expect(d.projects.every((p) => clients.has(p.client_id))).toBe(true);
    expect(d.payments.every((p) => projects.has(p.project_id))).toBe(true);
    expect(d.sprints.every((s) => projects.has(s.project_id))).toBe(true);
    expect(d.tasks.every((t) => projects.has(t.project_id) && (t.sprint_id === null || sprints.has(t.sprint_id)) && (t.assignee_id === null || specs.has(t.assignee_id)))).toBe(true);
    expect(d.workHours.every((h) => specs.has(h.specialist_id) && projects.has(h.project_id) && (h.task_id === null || tasks.has(h.task_id)) && h.hours > 0 && h.hours <= 24)).toBe(true);
    expect(d.users.every((u) => u.specialist_id === null || specs.has(u.specialist_id))).toBe(true);
    expect(d.movements.every((m) => m.project_id === null || projects.has(m.project_id))).toBe(true);
  });
  it('usuarios: 2 admins (uno sin vínculo, otro vinculado) y 8 colaboradores vinculados', () => {
    const admins = d.users.filter((u) => u.role === 'admin');
    expect(admins).toHaveLength(2);
    expect(admins.map((a) => a.specialist_id === null).sort()).toEqual([false, true]);
    const colabs = d.users.filter((u) => u.role === 'colaborador');
    expect(colabs).toHaveLength(8);
    expect(colabs.every((u) => u.specialist_id !== null)).toBe(true);
    expect(unique(d.users.map((u) => u.specialist_id).filter((x) => x !== null))).toBe(true);
  });
  it('Kanban en las 5 columnas y horas en los 6 meses', () => {
    expect(new Set(d.tasks.map((t) => t.status)).size).toBe(5);
    expect(new Set(d.workHours.map((h) => h.work_date.slice(0, 7))).size).toBe(6);
  });
});

describe('horario de las horas demo', () => {
  it('desde–hasta menos descansos coincide con las horas guardadas', async () => {
    for (const w of buildDemoDataset().workHours) {
      const r = computeWorkedHours(w.start_time ?? '', w.end_time ?? '', breaksFromText(w.breaks));
      expect(r.error).toBeNull();
      expect(r.hours).toBe(w.hours);
    }
  });
});
