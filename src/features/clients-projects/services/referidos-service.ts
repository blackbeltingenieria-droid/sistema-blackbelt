// features/clients-projects/services/referidos-service.ts
// Proyectos de investigación referidos por BlackBelt Institute (esquema `pucallpa`).
// El administrador los LEE (pucallpa.puede_leer) y los revisa solo con pucallpa.revisar_referido:
// aprobar exige que el proyecto ya esté creado con el formulario de siempre; rechazar exige motivo.

import { isSupabaseConfigured, supabase } from '../../../lib/supabase';

export interface ProyectoReferido {
  id: number;
  cliente_nombre: string;
  cliente_tipo: 'Persona' | 'Empresa';
  cliente_doc: string | null;
  cliente_telefono: string | null;
  cliente_correo: string | null;
  cliente_ciudad: string | null;
  proyecto_nombre: string;
  servicio: string | null;
  monto_estimado: number | null;
  descripcion: string | null;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  created_at: string;
  referido_por_nombre: string | null;
}

// El esquema `pucallpa` no está en los tipos generados de public.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pucallpa = () => (supabase as any).schema('pucallpa');

/** Referidos pendientes de verificar. Si el Institute no está instalado en la base, devuelve []. */
export async function getReferidosPendientes(): Promise<ProyectoReferido[]> {
  if (!isSupabaseConfigured()) return [];
  const [r, u] = await Promise.all([
    pucallpa().from('proyectos_referidos').select('*').eq('estado', 'pendiente').order('created_at'),
    pucallpa().from('usuarios').select('id, nombre'),
  ]);
  if (r.error) {
    if (/schema|does not exist|not found|PGRST106|PGRST205|permission denied/i.test(`${r.error.code ?? ''} ${r.error.message}`)) return [];
    throw new Error(`getReferidosPendientes: ${r.error.message}`);
  }
  const nombres = new Map<number, string>(((u.data ?? []) as { id: number; nombre: string }[]).map((x) => [x.id, x.nombre]));
  return ((r.data ?? []) as (Omit<ProyectoReferido, 'referido_por_nombre'> & { referido_por: number | null })[]).map((x) => ({
    ...x,
    monto_estimado: x.monto_estimado == null ? null : Number(x.monto_estimado),
    referido_por_nombre: x.referido_por == null ? null : nombres.get(x.referido_por) ?? null,
  }));
}

/** Marca el referido como aprobado, enlazado al proyecto ya creado. */
export async function aprobarReferido(id: number, projectId: number): Promise<void> {
  const { error } = await pucallpa().rpc('revisar_referido', { p_id: id, p_aprobar: true, p_project_id: projectId });
  if (error) throw new Error(error.message);
}

/** Rechaza el referido con su motivo (queda visible para el Institute). */
export async function rechazarReferido(id: number, motivo: string): Promise<void> {
  const { error } = await pucallpa().rpc('revisar_referido', { p_id: id, p_aprobar: false, p_motivo: motivo });
  if (error) throw new Error(error.message);
}
