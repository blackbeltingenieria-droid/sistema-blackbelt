// features/consolidado/domain/consolidado.ts
// Lógica pura de la página Consolidado (Principal + BlackBelt Institute + Total), sin acceso a datos.
// Fuente: la vista consolidado.resumen_mensual (solo lectura, security_invoker).

export type Sede = 'Principal' | 'BlackBelt Institute' | 'Total BlackBelt';

export interface ResumenFila {
  sede: string;
  mes: string; // AAAA-MM
  ingresos: number;
  costos: number;
  margen: number;
  cobros: number;
  pagos: number;
}

export const SEDES: Sede[] = ['Principal', 'BlackBelt Institute', 'Total BlackBelt'];

const CERO = { ingresos: 0, costos: 0, margen: 0, cobros: 0, pagos: 0 };

/** Normaliza lo que devuelve PostgREST (numeric llega como texto o número). */
export function normalizar(rows: Record<string, unknown>[]): ResumenFila[] {
  return rows.map((r) => ({
    sede: String(r.sede),
    mes: String(r.mes),
    ingresos: Number(r.ingresos ?? 0),
    costos: Number(r.costos ?? 0),
    margen: Number(r.margen ?? 0),
    cobros: Number(r.cobros ?? 0),
    pagos: Number(r.pagos ?? 0),
  }));
}

/** Meses con datos hasta `hasta` (AAAA-MM, el mes actual), del más reciente al más antiguo.
 *  Mismo criterio que el Dashboard general: los meses futuros (cuotas que aún no vencen) no cuentan. */
export function mesesDisponibles(rows: ResumenFila[], hasta = '9999-12'): string[] {
  return [...new Set(rows.map((r) => r.mes))].filter((m) => m <= hasta).sort().reverse();
}

/** Las tres filas (Principal, BlackBelt Institute, Total) de un mes; una sede sin movimientos sale en cero. */
export function filasDelMes(rows: ResumenFila[], mes: string): (ResumenFila & { sede: Sede })[] {
  return SEDES.map((sede) => {
    const f = rows.find((r) => r.mes === mes && r.sede === sede);
    return { ...CERO, ...f, sede, mes };
  });
}

/** Acumulado por sede desde el inicio hasta `hasta` (AAAA-MM, el mes actual). */
export function acumulado(rows: ResumenFila[], hasta = '9999-12'): (ResumenFila & { sede: Sede })[] {
  return SEDES.map((sede) => {
    const t = rows.filter((r) => r.sede === sede && r.mes <= hasta).reduce(
      (a, r) => ({
        ingresos: a.ingresos + r.ingresos, costos: a.costos + r.costos, margen: a.margen + r.margen,
        cobros: a.cobros + r.cobros, pagos: a.pagos + r.pagos,
      }),
      { ...CERO },
    );
    return { ...t, sede, mes: 'todo' };
  });
}

/** Control: el Total debe ser exactamente Principal + BlackBelt Institute (a 2 decimales). */
export function totalCuadra(filas: ResumenFila[]): boolean {
  const by = (s: Sede) => filas.find((f) => f.sede === s) ?? { ...CERO };
  const p = by('Principal'); const q = by('BlackBelt Institute'); const t = by('Total BlackBelt');
  const r2 = (n: number) => Math.round(n * 100);
  return (['ingresos', 'costos', 'margen', 'cobros', 'pagos'] as const).every((k) => r2(p[k]) + r2(q[k]) === r2(t[k]));
}
