// features/consolidado/services/consolidado-service.ts
// Solo LECTURA de la vista consolidado.resumen_mensual (Principal + Pucallpa + Total).
// No escribe nada ni toca las tablas de public: los reportes existentes siguen igual.

import { isSupabaseConfigured, supabase } from '../../../lib/supabase';
import { normalizar, type ResumenFila } from '../domain/consolidado';

export class ConsolidadoNoDisponible extends Error {}

export async function getResumenMensual(): Promise<ResumenFila[]> {
  if (!isSupabaseConfigured()) {
    throw new ConsolidadoNoDisponible('El consolidado solo está disponible con la base de datos conectada.');
  }
  // El esquema `consolidado` no está en los tipos generados de public.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .schema('consolidado')
    .from('resumen_mensual')
    .select('sede, mes, ingresos, costos, margen, cobros, pagos')
    .order('mes', { ascending: false });
  if (error) {
    if (/schema|does not exist|not found|PGRST106/i.test(`${error.code ?? ''} ${error.message}`)) {
      throw new ConsolidadoNoDisponible('El consolidado aún no está instalado en esta base (esquemas pucallpa y consolidado).');
    }
    throw new Error(`getResumenMensual: ${error.message}`);
  }
  return normalizar((data ?? []) as Record<string, unknown>[]);
}
