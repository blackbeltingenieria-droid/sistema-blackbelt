// features/sede-pucallpa/services/sede-service.ts
// Solo LECTURA del esquema `pucallpa` (el administrador del principal puede leerlo por
// pucallpa.puede_leer()). No escribe nada ni toca public.

import { isSupabaseConfigured, supabase } from '../../../lib/supabase';
import { normalizarDatos, type DatosSede } from '../dashboard-sede/sede';

export class SedeNoDisponible extends Error {}

export async function getDatosSede(): Promise<DatosSede> {
  if (!isSupabaseConfigured()) {
    throw new SedeNoDisponible('El dashboard de BlackBelt Institute solo está disponible con la base de datos conectada.');
  }
  // El esquema `pucallpa` no está en los tipos generados de public.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (supabase as any).schema('pucallpa');
  const [cuotas, inscripciones, pagos, gastos, categorias, programas] = await Promise.all([
    db.from('v_cuotas').select('id, inscripcion_id, monto, vencimiento, pagado, saldo'),
    db.from('v_inscripciones').select('id, nro_contrato, fecha_contrato, estado, alumno_id, alumno, programa, precio_neto, descuento'),
    db.from('pagos').select('cuota_id, fecha, monto, medio, anulado'),
    db.from('gastos').select('fecha, fecha_pago, monto, categoria_id, programa_id, pagado, anulado'),
    db.from('categorias_gasto').select('id, nombre, m6'),
    db.from('programas').select('id, nombre'),
  ]);
  for (const r of [cuotas, inscripciones, pagos, gastos, categorias, programas]) {
    if (r.error) {
      if (/schema|does not exist|not found|PGRST106/i.test(`${r.error.code ?? ''} ${r.error.message}`)) {
        throw new SedeNoDisponible('BlackBelt Institute aún no está instalado en esta base (esquema pucallpa).');
      }
      throw new Error(`getDatosSede: ${r.error.message}`);
    }
  }
  return normalizarDatos({
    cuotas: cuotas.data ?? [], inscripciones: inscripciones.data ?? [], pagos: pagos.data ?? [],
    gastos: gastos.data ?? [], categorias: categorias.data ?? [], programas: programas.data ?? [],
  });
}
