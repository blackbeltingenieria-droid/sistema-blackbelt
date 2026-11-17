// Resumen de dinero de BlackBelt Institute (sede Pucallpa) — lógica pura, sin acceso a datos ni dependencias.
// CARPETA COPIADA IDÉNTICA (sede.ts, sede.test.ts, DashboardSede.tsx) en:
//   sistema-blackbelt/src/features/sede-pucallpa/dashboard-sede/   (página «Sede Pucallpa» del principal)
//   sistema-blackbelt-pucallpa/app/src/dashboard-sede/             (página «Resumen» de la app de la sede)
// Si cambias una, copia la otra: así ambas pantallas dicen y muestran exactamente lo mismo.
//
// Mismo criterio que el Dashboard general del principal: «desde el inicio HASTA HOY» (hasta el mes actual).
// Los meses futuros no cuentan como vendido: lo que falta cobrar está en «Le deben».
// Mismas reglas que consolidado.movimientos (cuadra con la fila «Pucallpa» de Consolidado):
//   Vendió = cada cuota en el mes en que vence (inscripciones no anuladas)
//   Gastó  = gastos no anulados en su fecha
//   Caja   = pagos de alumnos (no anulados) − gastos pagados, acumulado
//   Le deben = saldo de todas las cuotas · Debe = gastos anotados sin pagar

export interface Cuota { id: number; inscripcion_id: number; monto: number; vencimiento: string; pagado: number; saldo: number }
export interface Inscripcion {
  id: number; nro_contrato: string; fecha_contrato: string; estado: string; alumno_id: number; alumno: string;
  programa: string; precio_neto: number; descuento: number;
}
export interface Pago { cuota_id: number; fecha: string; monto: number; medio: string; anulado: boolean }
export interface Gasto { fecha: string; fecha_pago: string | null; monto: number; categoria_id: number; programa_id: number | null; pagado: boolean; anulado: boolean }
export interface Categoria { id: number; nombre: string; m6?: string | null }

/** Las 5M del negocio con las que se ordenan los gastos de la sede. */
export const NOMBRE_6M: Record<string, string> = {
  mano_de_obra: 'Mano de obra', material: 'Material', maquina: 'Máquina', metodo: 'Método', medio_ambiente: 'Medio ambiente',
};
export interface Programa { id: number; nombre: string }

export interface DatosSede { cuotas: Cuota[]; inscripciones: Inscripcion[]; pagos: Pago[]; gastos: Gasto[]; categorias: Categoria[]; programas: Programa[] }

/** 'todo' (desde el inicio hasta hoy), un año AAAA o un mes AAAA-MM. */
export type Periodo = string;
export const TODO: Periodo = 'todo';

const mesDe = (fecha: string) => fecha.slice(0, 7);
const r2 = (n: number) => Math.round(n * 100) / 100;
const suma = <T>(xs: T[], f: (x: T) => number) => r2(xs.reduce((a, x) => a + f(x), 0));
const num = (v: unknown) => Number(v ?? 0);
const fechaPago = (g: Gasto) => g.fecha_pago ?? g.fecha;

/** ¿La fecha cae en el periodo? Nunca después del mes actual. */
function en(fecha: string | null | undefined, p: Periodo, hoy: string): boolean {
  if (!fecha) return false;
  const m = mesDe(fecha);
  return m <= mesDe(hoy) && (p === TODO || (p.length === 4 ? m.startsWith(`${p}-`) : m === p));
}

/** Último mes que abarca el periodo, sin pasar del mes actual. */
function corteDe(p: Periodo, hoy: string): string {
  const actual = mesDe(hoy);
  const fin = p === TODO ? actual : p.length === 4 ? `${p}-12` : p;
  return fin < actual ? fin : actual;
}

/** PostgREST entrega numeric como texto: se convierte todo a número. */
export function normalizarDatos(raw: {
  cuotas: Record<string, unknown>[]; inscripciones: Record<string, unknown>[]; pagos: Record<string, unknown>[];
  gastos: Record<string, unknown>[]; categorias: Record<string, unknown>[]; programas?: Record<string, unknown>[];
}): DatosSede {
  return {
    cuotas: raw.cuotas.map((c) => ({ id: num(c.id), inscripcion_id: num(c.inscripcion_id), monto: num(c.monto), vencimiento: String(c.vencimiento), pagado: num(c.pagado), saldo: num(c.saldo) })),
    inscripciones: raw.inscripciones.map((i) => ({
      id: num(i.id), nro_contrato: String(i.nro_contrato ?? ''), fecha_contrato: String(i.fecha_contrato), estado: String(i.estado),
      alumno_id: num(i.alumno_id), alumno: String(i.alumno ?? ''), programa: String(i.programa ?? 'Sin programa'),
      precio_neto: num(i.precio_neto), descuento: num(i.descuento),
    })),
    pagos: raw.pagos.map((p) => ({ cuota_id: num(p.cuota_id), fecha: String(p.fecha), monto: num(p.monto), medio: String(p.medio ?? 'otro'), anulado: !!p.anulado })),
    gastos: raw.gastos.map((g) => ({
      fecha: String(g.fecha), fecha_pago: g.fecha_pago ? String(g.fecha_pago) : null, monto: num(g.monto),
      categoria_id: num(g.categoria_id), programa_id: g.programa_id == null ? null : num(g.programa_id), pagado: !!g.pagado, anulado: !!g.anulado,
    })),
    categorias: raw.categorias.map((c) => ({ id: num(c.id), nombre: String(c.nombre), m6: c.m6 == null ? null : String(c.m6) })),
    programas: (raw.programas ?? []).map((c) => ({ id: num(c.id), nombre: String(c.nombre) })),
  };
}

/** Solo lo que cuenta: inscripciones no anuladas y sus cuotas, pagos y gastos válidos. */
function validos(d: DatosSede) {
  const vivas = d.inscripciones.filter((i) => i.estado !== 'anulada');
  const ids = new Set(vivas.map((i) => i.id));
  return {
    inscripciones: vivas,
    cuotas: d.cuotas.filter((c) => ids.has(c.inscripcion_id)),
    pagos: d.pagos.filter((p) => !p.anulado),
    gastos: d.gastos.filter((g) => !g.anulado),
  };
}

/** Meses con movimiento desde el inicio hasta el mes actual, del más reciente al más antiguo. */
export function mesesDisponibles(d: DatosSede, hoy: string): string[] {
  const v = validos(d);
  const s = new Set<string>([
    ...v.cuotas.map((c) => mesDe(c.vencimiento)), ...v.pagos.map((p) => mesDe(p.fecha)),
    ...v.gastos.map((g) => mesDe(g.fecha)), ...v.gastos.filter((g) => g.pagado).map((g) => mesDe(fechaPago(g))),
    ...v.inscripciones.map((i) => mesDe(i.fecha_contrato)),
  ]);
  return [...s].filter((m) => m <= mesDe(hoy)).sort().reverse();
}

export interface Resumen {
  /** Vendió, gastó y ganó (negativo = perdió) en el periodo. */
  vendio: number; gasto: number; gano: number; margenPct: number | null;
  /** Lo que entró y salió de caja en el periodo. */
  entro: number; salio: number;
  /** Dinero en caja al final del periodo (acumulado desde el inicio). */
  caja: number;
  /** Foto a hoy: lo que los alumnos deben (todo el saldo), cuánto ya venció, y gastos sin pagar. */
  leDeben: number; vencido: number; debe: number;
  /** Cuotas de meses futuros (aún no vendidas). */
  porVender: number;
  /** Si cobra todo y paga todo lo que debe: ganancia final de lo ya contratado. Solo para «todo». */
  proyectado: number | null;
  /** De lo que ya debía cobrarse (cuotas vencidas a hoy), qué % se cobró. */
  cobranzaPct: number | null;
  nuevas: number; alumnosActivos: number; ticket: number | null; descuentos: number;
}

export function resumen(d: DatosSede, p: Periodo, hoy: string): Resumen {
  const v = validos(d);
  const vendio = suma(v.cuotas.filter((c) => en(c.vencimiento, p, hoy)), (c) => c.monto);
  const gasto = suma(v.gastos.filter((g) => en(g.fecha, p, hoy)), (g) => g.monto);
  const entro = suma(v.pagos.filter((x) => en(x.fecha, p, hoy)), (x) => x.monto);
  const salio = suma(v.gastos.filter((g) => g.pagado && en(fechaPago(g), p, hoy)), (g) => g.monto);
  const corte = corteDe(p, hoy);
  const caja = r2(suma(v.pagos.filter((x) => mesDe(x.fecha) <= corte), (x) => x.monto)
    - suma(v.gastos.filter((g) => g.pagado && mesDe(fechaPago(g)) <= corte), (g) => g.monto));
  const vencidas = v.cuotas.filter((c) => c.vencimiento < hoy);
  const debido = suma(vencidas, (c) => c.monto);
  const porVender = suma(v.cuotas.filter((c) => mesDe(c.vencimiento) > mesDe(hoy)), (c) => c.monto);
  const nuevas = v.inscripciones.filter((i) => en(i.fecha_contrato, p, hoy));
  const gano = r2(vendio - gasto);
  return {
    vendio, gasto, gano, margenPct: vendio > 0 ? (gano / vendio) * 100 : null,
    entro, salio, caja,
    leDeben: suma(v.cuotas, (c) => Math.max(c.saldo, 0)),
    vencido: suma(vencidas, (c) => Math.max(c.saldo, 0)),
    debe: suma(v.gastos.filter((g) => !g.pagado), (g) => g.monto),
    porVender,
    proyectado: p === TODO ? r2(gano + porVender) : null,
    cobranzaPct: debido > 0 ? (suma(vencidas, (c) => Math.min(c.pagado, c.monto)) / debido) * 100 : null,
    nuevas: nuevas.length,
    alumnosActivos: new Set(v.inscripciones.filter((i) => i.estado === 'activa').map((i) => i.alumno_id)).size,
    ticket: nuevas.length ? r2(suma(nuevas, (i) => i.precio_neto) / nuevas.length) : null,
    descuentos: suma(nuevas, (i) => i.descuento),
  };
}

export interface PuntoMes { mes: string; vendio: number; gasto: number; gano: number; entro: number; salio: number; caja: number }

/** Serie mes a mes (del más antiguo al mes actual) con el dinero en caja al cierre de cada mes.
 *  Con un año o un mes elegido, muestra los meses de ese año. */
export function serieMensual(d: DatosSede, hoy: string, p: Periodo = TODO): PuntoMes[] {
  const anio = p === TODO ? null : p.slice(0, 4);
  return mesesDisponibles(d, hoy).reverse().filter((m) => !anio || m.startsWith(anio)).map((mes) => {
    const r = resumen(d, mes, hoy);
    return { mes, vendio: r.vendio, gasto: r.gasto, gano: r.gano, entro: r.entro, salio: r.salio, caja: r.caja };
  });
}

export interface Barra { nombre: string; monto: number }
const ordenar = (m: Map<string, number>): Barra[] =>
  [...m.entries()].map(([nombre, monto]) => ({ nombre, monto: r2(monto) })).filter((b) => b.monto > 0).sort((a, b) => b.monto - a.monto);

/** Gastos agrupados por las 5M (si la categoría no tiene M, por el nombre de la categoría). */
export function gastosPorCategoria(d: DatosSede, p: Periodo, hoy: string): Barra[] {
  const nombres = new Map(d.categorias.map((c) => [c.id, (c.m6 && NOMBRE_6M[c.m6]) || c.nombre]));
  const m = new Map<string, number>();
  for (const g of validos(d).gastos.filter((x) => en(x.fecha, p, hoy))) {
    const n = nombres.get(g.categoria_id) ?? 'Otros';
    m.set(n, (m.get(n) ?? 0) + g.monto);
  }
  return ordenar(m);
}

export function ventasPorPrograma(d: DatosSede, p: Periodo, hoy: string): Barra[] {
  const v = validos(d);
  const prog = new Map(v.inscripciones.map((i) => [i.id, i.programa]));
  const m = new Map<string, number>();
  for (const c of v.cuotas.filter((x) => en(x.vencimiento, p, hoy))) {
    const n = prog.get(c.inscripcion_id) ?? 'Sin programa';
    m.set(n, (m.get(n) ?? 0) + c.monto);
  }
  return ordenar(m);
}

const MEDIOS: Record<string, string> = { qr: 'QR / Yape-Plin', transferencia: 'Transferencia', efectivo: 'Efectivo', deposito: 'Depósito' };
export function cobrosPorMedio(d: DatosSede, p: Periodo, hoy: string): Barra[] {
  const m = new Map<string, number>();
  for (const x of validos(d).pagos.filter((y) => en(y.fecha, p, hoy))) {
    const n = MEDIOS[x.medio] ?? x.medio.charAt(0).toUpperCase() + x.medio.slice(1);
    m.set(n, (m.get(n) ?? 0) + x.monto);
  }
  return ordenar(m);
}

/** Todo lo contratado (cuotas), a hoy: ya cobrado, por cobrar sin vencer, y vencido. */
export function cartera(d: DatosSede, hoy: string): Barra[] {
  const c = validos(d).cuotas;
  return [
    { nombre: 'Cobrado', monto: suma(c, (x) => Math.min(x.pagado, x.monto)) },
    { nombre: 'Por vencer', monto: suma(c.filter((x) => x.vencimiento >= hoy), (x) => Math.max(x.saldo, 0)) },
    { nombre: 'Vencido', monto: suma(c.filter((x) => x.vencimiento < hoy), (x) => Math.max(x.saldo, 0)) },
  ];
}

export interface Alerta { contrato: string; alumno: string; programa: string; monto: number; fecha?: string }

/** Alumnos con cuotas vencidas sin pagar, de mayor a menor deuda. */
export function morosos(d: DatosSede, hoy: string, max = 5): Alerta[] {
  const v = validos(d);
  const ins = new Map(v.inscripciones.map((i) => [i.id, i]));
  const deuda = new Map<number, number>();
  for (const c of v.cuotas) if (c.vencimiento < hoy && c.saldo > 0) deuda.set(c.inscripcion_id, (deuda.get(c.inscripcion_id) ?? 0) + c.saldo);
  return [...deuda.entries()]
    .map(([id, monto]) => { const i = ins.get(id)!; return { contrato: i.nro_contrato, alumno: i.alumno, programa: i.programa, monto: r2(monto) }; })
    .sort((a, b) => b.monto - a.monto).slice(0, max);
}

/** Cuotas con saldo que vencen en los próximos `dias` días (desde hoy inclusive). */
export function proximosVencimientos(d: DatosSede, hoy: string, dias = 30, max = 6): Alerta[] {
  const v = validos(d);
  const ins = new Map(v.inscripciones.map((i) => [i.id, i]));
  const limite = new Date(`${hoy}T00:00:00Z`); limite.setUTCDate(limite.getUTCDate() + dias);
  const tope = limite.toISOString().slice(0, 10);
  return v.cuotas.filter((c) => c.saldo > 0 && c.vencimiento >= hoy && c.vencimiento <= tope)
    .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento)).slice(0, max)
    .map((c) => { const i = ins.get(c.inscripcion_id)!; return { contrato: i.nro_contrato, alumno: i.alumno, programa: i.programa, monto: c.saldo, fecha: c.vencimiento }; });
}

/** Años con movimiento hasta hoy, del más reciente al más antiguo. */
export function aniosDisponibles(d: DatosSede, hoy: string): string[] {
  return [...new Set(mesesDisponibles(d, hoy).map((m) => m.slice(0, 4)))];
}

/** Programas con inscripciones (no anuladas), en orden alfabético. */
export function programasDisponibles(d: DatosSede): string[] {
  return [...new Set(validos(d).inscripciones.map((i) => i.programa))].sort((a, b) => a.localeCompare(b, 'es'));
}

/** Deja solo lo de un programa: sus inscripciones, cuotas y pagos, y los gastos asignados a ese programa
 *  (los gastos compartidos de la sede, sin programa, no se reparten). `null` = todos los programas. */
export function filtrarPrograma(d: DatosSede, programa: string | null): DatosSede {
  if (!programa) return d;
  const inscripciones = d.inscripciones.filter((i) => i.programa === programa);
  const ids = new Set(inscripciones.map((i) => i.id));
  const cuotas = d.cuotas.filter((c) => ids.has(c.inscripcion_id));
  const idsCuota = new Set(cuotas.map((c) => c.id));
  const idsProg = new Set(d.programas.filter((x) => x.nombre === programa).map((x) => x.id));
  return {
    ...d, inscripciones, cuotas,
    pagos: d.pagos.filter((x) => idsCuota.has(x.cuota_id)),
    gastos: d.gastos.filter((g) => g.programa_id !== null && idsProg.has(g.programa_id)),
  };
}
