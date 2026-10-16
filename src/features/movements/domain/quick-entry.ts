// features/movements/domain/quick-entry.ts
// Registro rápido: el usuario solo dice si ENTRÓ (ingreso) o SALIÓ (egreso) dinero, cuánto y qué fue.
// Aquí se traduce a las filas del Modelo C (sin cambiar sus reglas):
//   Ingreso → INGRESO_RECONOCIDO (+ COBRO si ya se cobró)
//   Egreso  → COSTO_RECONOCIDO   (+ PAGO  si ya se pagó)
// Unidad, área, categoría y clase se completan solas cuando el usuario no las elige.
// La fila de caja (cobro/pago) guarda en `notes` "Contrapartida de MOV-…" para enlazarse a su par.

import { EXPENSE_CLASS, MOVEMENT_STATUS, RECORD_TYPE } from '../../../types/database';
import type { Area, BusinessUnit, CostCategory } from '../../catalogs/types';
import type { ProjectRow } from '../../clients-projects/types';
import { suggestClass } from './movement-form-defaults';
import { CORP_CODE, computeControl, isEligible } from './movement-rules';
import { CONTROL_STATUS, type ControlStatus, type EnrichedMovement, type MovementFormValues, type RecordType } from '../types';

export type QuickKind = 'INGRESO' | 'EGRESO';

export interface QuickEntryInput {
  kind: QuickKind;
  date: string;
  amount: number;
  concept: string;
  /** ¿Ya entró/salió el dinero? Sí → se crea también el cobro/pago. */
  settled: boolean;
  paymentMethod: string | null;
  counterparty: string | null;
  /** Opcionales: si no se eligen, se completan solos. */
  unitId: number | null;
  projectId: number | null;
  categoryId: number | null;
}

export interface QuickCatalogs {
  units: BusinessUnit[];
  areas: Area[];
  categories: CostCategory[];
  projects: ProjectRow[];
}

export const PAYMENT_METHODS = ['YAPE', 'PLIN', 'BBVA', 'BCP', 'EFECTIVO', 'TRANSFERENCIA', 'TARJETA'] as const;

// ─── Sugerencia de categoría por palabras del concepto ───────────────────────
const KEYWORDS: [string, string[]][] = [
  ['PUB',  ['meta ads', 'facebook', 'instagram', 'tiktok', 'google ads', 'publicidad', 'anuncio', 'campana', 'marketing']],
  ['SOFT', ['canva', 'claude', 'chatgpt', 'chat gpt', 'google one', 'google meet', 'zoom', 'software', 'licencia', 'suscripcion', 'hosting', 'dominio', 'pagina web']],
  ['SERV', ['bitel', 'claro', 'movistar', 'entel', 'internet', 'luz', 'agua', 'telefono', 'celular', 'alquiler']],
  ['MO',   ['especialista', 'honorario', 'sueldo', 'planilla', 'practicante', 'mano de obra']],
  ['MOV',  ['taxi', 'pasaje', 'transporte', 'viatico', 'movilidad', 'gasolina', 'combustible', 'hotel', 'alojamiento']],
  ['ADM',  ['notaria', 'ruc', 'sunarp', 'sunat', 'tramite', 'legal']],
  ['MAT',  ['material', 'insumo', 'impresion', 'papel', 'utiles']],
  ['BAN',  ['comision', 'banco', 'itf']],
  ['CAP',  ['curso', 'capacitacion', 'certificacion', 'taller']],
  ['MANT', ['mantenimiento', 'reparacion']],
  ['TERC', ['laboratorio', 'subcontrat', 'tercerizado']],
  ['MAQ',  ['laptop', 'computadora', 'maquina', 'equipo']],
];

const normalize = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Código de categoría sugerido para un concepto ("Pago Bitel octubre" → SERV). null si no reconoce nada. */
export function suggestCategoryCode(concept: string): string | null {
  const text = ` ${normalize(concept)} `;
  for (const [code, words] of KEYWORDS) {
    if (words.some((w) => new RegExp(`(^|[^a-z])${w}`).test(text))) return code;
  }
  return null;
}

/** Nombre corto y claro de cada categoría para los botones del formulario. */
export const CATEGORY_SHORT: Record<string, string> = {
  MO: 'Especialistas y personal', PUB: 'Publicidad', SOFT: 'Software y apps', SERV: 'Servicios (luz, internet, celular)',
  MAT: 'Materiales', MAQ: 'Equipos', MOV: 'Transporte y viáticos', TERC: 'Servicios de terceros',
  ADM: 'Trámites', CAP: 'Capacitación', BAN: 'Comisiones del banco', MANT: 'Mantenimiento', OTR: 'Otros',
};
/** Categorías que se ofrecen para un egreso (las de caja/socios/activos no aplican). */
export const EXPENSE_CATEGORY_CODES = ['MO', 'PUB', 'SOFT', 'SERV', 'MAT', 'MOV', 'TERC', 'ADM', 'CAP', 'BAN', 'MANT', 'MAQ', 'OTR'];

// ─── Traducción a filas del Modelo C ─────────────────────────────────────────
function byCode<T extends { code: string }>(list: T[], code: string): T | undefined {
  return list.find((x) => x.code === code);
}

/** Área gestora automática: publicidad → MKT; en CORP según el tipo de gasto; en una unidad, su primera subárea. */
export function defaultAreaId(areas: Area[], unit: BusinessUnit | undefined, categoryCode: string): number {
  const general = (code: string) => byCode(areas, code)?.id ?? 0;
  if (categoryCode === 'PUB') return general('MKT');
  if (!unit || unit.code === CORP_CODE) {
    if (categoryCode === 'MO' || categoryCode === 'CAP') return general('RRHH');
    if (categoryCode === 'BAN') return general('FIN');
    return general('ADM');
  }
  const own = areas.filter((a) => a.business_unit_id === unit.id).sort((a, b) => a.id - b.id);
  return own[0]?.id ?? general('DIR');
}

/** Unidad efectiva: la del proyecto, la elegida o (solo egresos) CORP = "toda la empresa". */
export function resolveUnit(input: QuickEntryInput, c: QuickCatalogs): BusinessUnit | undefined {
  const project = input.projectId ? c.projects.find((p) => p.id === input.projectId) : undefined;
  const unitId = project?.businessUnitId ?? input.unitId;
  if (unitId) return c.units.find((u) => u.id === unitId);
  return input.kind === 'EGRESO' ? byCode(c.units, CORP_CODE) : undefined;
}

export type QuickErrors = Partial<Record<'amount' | 'date' | 'concept' | 'unit', string>>;

export function validateQuick(input: QuickEntryInput, c: QuickCatalogs): QuickErrors {
  const e: QuickErrors = {};
  if (!input.date) e.date = 'Pon la fecha.';
  if (!Number.isFinite(input.amount) || input.amount <= 0) e.amount = 'Escribe un monto mayor que 0.';
  if (!input.concept.trim()) e.concept = 'Escribe qué fue (por ejemplo: "Pago Bitel").';
  if (input.kind === 'INGRESO') {
    const unit = resolveUnit(input, c);
    if (!unit || unit.code === CORP_CODE) e.unit = 'Elige qué unidad hizo la venta (o el proyecto).';
  }
  return e;
}

/** Fila principal (ingreso o gasto reconocido). El estado lo decide `statusFor`. */
export function buildMainMovement(input: QuickEntryInput, c: QuickCatalogs): MovementFormValues {
  const unit = resolveUnit(input, c);
  const isIncome = input.kind === 'INGRESO';
  const recordType: RecordType = isIncome ? RECORD_TYPE.INGRESO_RECONOCIDO : RECORD_TYPE.COSTO_RECONOCIDO;
  const chosenCat = input.categoryId ? c.categories.find((x) => x.id === input.categoryId) : undefined;
  const catCode = isIncome ? 'OTR' : (chosenCat?.code ?? suggestCategoryCode(input.concept) ?? 'OTR');
  const category = chosenCat && !isIncome ? chosenCat : byCode(c.categories, catCode);
  const values: MovementFormValues = {
    movement_date: input.date,
    record_type: recordType,
    amount: input.amount,
    business_unit_id: unit?.id ?? 0,
    area_id: defaultAreaId(c.areas, unit, category?.code ?? 'OTR'),
    responsible: null,
    cost_category_id: category?.id ?? 0,
    expense_class: suggestClass(recordType, unit?.code ?? '', input.projectId !== null, EXPENSE_CLASS.NO_APLICA),
    project_id: input.projectId,
    counterparty: input.counterparty?.trim() || null,
    detail: input.concept.trim(),
    payment_method: input.paymentMethod,
    voucher_number: null,
    status: MOVEMENT_STATUS.BORRADOR,
    notes: null,
  };
  return { ...values, status: statusFor(values, unit?.code ?? '') };
}

/** Cuenta al guardar: VALIDADO si el control da OK; si no, BORRADOR (igual no alimentaría reportes). */
export function statusFor(v: MovementFormValues, unitCode: string): MovementFormValues['status'] {
  return computeControl({ movement_code: 'NUEVO', ...v }, unitCode) === CONTROL_STATUS.OK
    ? MOVEMENT_STATUS.VALIDADO
    : MOVEMENT_STATUS.BORRADOR;
}

export const PAIR_PREFIX = 'Contrapartida de ';
export const pairNote = (code: string): string => `${PAIR_PREFIX}${code}`;
/** Código del movimiento al que pertenece una fila de caja, o null. */
export function pairedCode(notes: string | null | undefined): string | null {
  const m = /Contrapartida de (\S+)/.exec(notes ?? '');
  return m ? m[1] : null;
}

/** Fila de caja (cobro o pago) del mismo evento. */
export function buildCashPair(
  main: Pick<MovementFormValues, 'record_type' | 'movement_date' | 'amount' | 'business_unit_id' | 'project_id' | 'counterparty' | 'detail' | 'payment_method' | 'status'>,
  mainCode: string,
  c: Pick<QuickCatalogs, 'areas' | 'categories'>,
  date?: string,
): MovementFormValues {
  const isIncome = main.record_type === RECORD_TYPE.INGRESO_RECONOCIDO;
  return {
    movement_date: date ?? main.movement_date,
    record_type: isIncome ? RECORD_TYPE.COBRO : RECORD_TYPE.PAGO,
    amount: main.amount,
    business_unit_id: main.business_unit_id,
    area_id: byCode(c.areas, 'FIN')?.id ?? 0,
    responsible: null,
    cost_category_id: byCode(c.categories, isIncome ? 'CXC' : 'CXP')?.id ?? 0,
    expense_class: EXPENSE_CLASS.NO_APLICA,
    project_id: main.project_id,
    counterparty: main.counterparty,
    detail: main.detail,
    payment_method: main.payment_method,
    voucher_number: null,
    status: main.status,
    notes: pairNote(mainCode),
  };
}

/** Valores del formulario rápido a partir de un movimiento guardado (para editar). */
export function quickInputFromMovement(
  m: Pick<MovementFormValues, 'record_type' | 'movement_date' | 'amount' | 'business_unit_id' | 'project_id' | 'cost_category_id' | 'counterparty' | 'detail' | 'payment_method'>,
  hasPair: boolean,
  c: QuickCatalogs,
): QuickEntryInput {
  const corpId = byCode(c.units, CORP_CODE)?.id;
  return {
    kind: m.record_type === RECORD_TYPE.INGRESO_RECONOCIDO ? 'INGRESO' : 'EGRESO',
    date: m.movement_date,
    amount: m.amount,
    concept: m.detail ?? '',
    settled: hasPair,
    paymentMethod: m.payment_method,
    counterparty: m.counterparty,
    unitId: m.business_unit_id === corpId ? null : m.business_unit_id,
    projectId: m.project_id,
    categoryId: m.cost_category_id || null,
  };
}

/** Solo ingresos y gastos reconocidos se pueden registrar/editar con el formulario rápido. */
export const isQuickEditable = (t: RecordType): boolean =>
  t === RECORD_TYPE.INGRESO_RECONOCIDO || t === RECORD_TYPE.COSTO_RECONOCIDO;

// ─── Lista simple: una fila por evento ───────────────────────────────────────
export const SIMPLE_TYPE: Record<RecordType, { label: string; sign: 1 | -1 }> = {
  INGRESO_RECONOCIDO: { label: 'Ingreso', sign: 1 },
  COBRO:              { label: 'Cobro', sign: 1 },
  APORTE_SOCIO:       { label: 'Aporte de socio', sign: 1 },
  COSTO_RECONOCIDO:   { label: 'Egreso', sign: -1 },
  PAGO:               { label: 'Pago', sign: -1 },
  RETIRO_SOCIO:       { label: 'Retiro de socio', sign: -1 },
  COMPRA_ACTIVO:      { label: 'Compra de equipo', sign: -1 },
  PRESTAMO_RECIBIDO:  { label: 'Préstamo recibido', sign: 1 },
  PAGO_PRESTAMO:      { label: 'Pago de préstamo', sign: -1 },
};

/** Explicación en palabras simples de por qué un movimiento no cuenta todavía. */
export const CONTROL_HELP: Record<ControlStatus, string> = {
  OK: '',
  INCOMPLETO: 'Falta un dato: monto, unidad, área o categoría.',
  'REVISAR CORP': 'Es un gasto de toda la empresa pero está en una unidad. Elige "Toda la empresa" o cambia de quién es.',
  'REVISAR UNIDAD': 'Es un gasto de una unidad pero está en "Toda la empresa". Elige la unidad.',
  'REVISAR INGRESO': 'Un ingreso debe ser de una unidad, no de "Toda la empresa".',
  'REVISAR CLASE': 'Falta indicar de quién es el gasto.',
  'USAR NO_APLICA': 'Este tipo de registro no lleva clase de gasto.',
};

export interface EventGroup<T> {
  main: T;
  pair: T | null;
}

/** Junta cada ingreso/gasto con su cobro/pago enlazado; las filas de caja enlazadas no se listan aparte. */
export function groupEvents<T extends { movement_code: string; notes: string | null }>(rows: T[]): EventGroup<T>[] {
  const codes = new Set(rows.map((r) => r.movement_code));
  const pairOf = new Map<string, T>();
  for (const r of rows) {
    const code = pairedCode(r.notes);
    if (code && codes.has(code) && !pairOf.has(code)) pairOf.set(code, r);
  }
  const hidden = new Set([...pairOf.values()]);
  return rows.filter((r) => !hidden.has(r)).map((r) => ({ main: r, pair: pairOf.get(r.movement_code) ?? null }));
}

/** Te deben / debes a la fecha: ingresos − cobros y gastos − pagos acumulados (solo lo que cuenta). */
export function pendingBalances(movements: EnrichedMovement[], mes: string): { receivable: number; payable: number } {
  const sum = (t: RecordType) =>
    movements.filter((m) => isEligible(m) && m.mes <= mes && m.record_type === t).reduce((a, m) => a + m.amount, 0);
  const r2 = (n: number) => Math.round(Math.max(0, n) * 100) / 100;
  return {
    receivable: r2(sum(RECORD_TYPE.INGRESO_RECONOCIDO) - sum(RECORD_TYPE.COBRO)),
    payable: r2(sum(RECORD_TYPE.COSTO_RECONOCIDO) - sum(RECORD_TYPE.PAGO)),
  };
}

// ─── Cobro de un proyecto: rellenar con lo que falta pagar ───────────────────
const soles = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Datos que se rellenan solos al elegir un proyecto con saldo: monto = lo que falta, concepto y cliente. */
export function projectIncomeFill(p: Pick<ProjectRow, 'projectName' | 'clientName' | 'businessUnitId'>, pending: number) {
  return {
    amount: Math.max(0, Math.round(pending * 100) / 100),
    concept: `Pago de ${p.clientName} – ${p.projectName}`,
    counterparty: p.clientName,
    unitId: p.businessUnitId,
  };
}

/** Frase simple bajo el monto: cuánto quedará pendiente, si queda pagado o si se pasa. */
export function projectPaymentNote(pending: number, amount: number): { tone: 'ok' | 'warn'; text: string } | null {
  if (!(amount > 0)) return null;
  const left = Math.round((pending - amount) * 100) / 100;
  if (left < 0) return { tone: 'warn', text: `Es más de lo que falta pagar (${soles(pending)}). Revisa el monto.` };
  if (left === 0) return { tone: 'ok', text: 'Con este pago el proyecto queda pagado por completo.' };
  return { tone: 'ok', text: `Después de este pago faltarán ${soles(left)}.` };
}

// ─── Memoria de registros: repetir un gasto/ingreso conocido ─────────────────
export interface ConceptMemory {
  concept: string;
  kind: QuickKind;
  amount: number;
  unitId: number | null;      // null = toda la empresa
  projectId: number | null;
  categoryId: number | null;
  paymentMethod: string | null;
  counterparty: string | null;
  settled: boolean;
}

type MemoryRow = Pick<MovementFormValues, 'record_type' | 'amount' | 'business_unit_id' | 'project_id' | 'cost_category_id' | 'payment_method' | 'counterparty' | 'detail'>
  & { movement_code: string; notes: string | null };

const memKey = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

/** Último registro de cada concepto (filas ordenadas de más nuevo a más antiguo). */
export function buildConceptMemory(rows: MemoryRow[], corpUnitId: number | undefined): Map<string, ConceptMemory> {
  const out = new Map<string, ConceptMemory>();
  for (const { main, pair } of groupEvents(rows)) {
    if (!isQuickEditable(main.record_type) || !main.detail?.trim()) continue;
    const key = memKey(main.detail);
    if (out.has(key)) continue;
    out.set(key, {
      concept: main.detail.trim(),
      kind: main.record_type === RECORD_TYPE.INGRESO_RECONOCIDO ? 'INGRESO' : 'EGRESO',
      amount: main.amount,
      unitId: main.business_unit_id === corpUnitId ? null : main.business_unit_id,
      projectId: main.project_id,
      categoryId: main.cost_category_id || null,
      paymentMethod: (pair?.payment_method ?? main.payment_method) || null,
      counterparty: main.counterparty,
      settled: Boolean(pair),
    });
  }
  return out;
}

export function findConcept(memory: Map<string, ConceptMemory>, concept: string): ConceptMemory | undefined {
  return memory.get(memKey(concept));
}

/** Medio de pago más reciente (para proponerlo por defecto). */
export function lastPaymentMethod(rows: Pick<MovementFormValues, 'payment_method'>[]): string | null {
  return rows.find((r) => r.payment_method)?.payment_method ?? null;
}
