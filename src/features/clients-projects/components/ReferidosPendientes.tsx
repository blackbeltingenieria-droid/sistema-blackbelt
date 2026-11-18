// features/clients-projects/components/ReferidosPendientes.tsx
// Proyectos de investigación que BlackBelt Institute captó y espera que el administrador verifique.
// «Verificar y crear proyecto» abre el formulario de siempre con los datos ya rellenados;
// «Rechazar» pide el motivo (el Institute lo ve).

import { Card } from '../../../components/ui/Card';
import type { ProyectoReferido } from '../services/referidos-service';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(amount);
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

interface Props {
  referidos: ProyectoReferido[];
  onVerificar: (r: ProyectoReferido) => void;
  onRechazar: (r: ProyectoReferido) => void;
}

export function ReferidosPendientes({ referidos, onVerificar, onRechazar }: Props) {
  if (referidos.length === 0) return null;
  return (
    <section className="mb-5 sm:mb-8" data-testid="referidos-pendientes">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-gold text-ink bb-mono text-xs font-bold">
          {referidos.length}
        </span>
        <h2 className="bb-display font-semibold text-ink text-lg">Pendientes de verificar</h2>
        <span className="bb-body text-xs text-ink-soft">· captados por BlackBelt Institute</span>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {referidos.map((r) => (
          <Card key={r.id} className="border-l-4 border-l-gold">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="bb-body text-[10px] uppercase tracking-widest text-ink-soft font-semibold">⏳ Pendiente de verificar</p>
                <p className="bb-body text-sm font-semibold text-ink leading-snug">{r.proyecto_nombre}</p>
                <p className="bb-body text-sm text-ink">
                  {r.cliente_nombre}
                  {r.cliente_doc && <span className="text-ink-soft"> · {r.cliente_tipo === 'Empresa' ? 'RUC' : 'DNI'} {r.cliente_doc}</span>}
                </p>
                <p className="bb-body text-xs text-ink-soft">
                  {[r.servicio, r.cliente_ciudad, r.cliente_telefono, r.cliente_correo].filter(Boolean).join(' · ')}
                </p>
              </div>
              {r.monto_estimado != null && (
                <div className="text-right shrink-0">
                  <p className="bb-body text-[10px] text-ink-soft">Estimado</p>
                  <p className="bb-mono text-sm font-semibold text-ink">{formatCurrency(r.monto_estimado)}</p>
                </div>
              )}
            </div>
            {r.descripcion && <p className="bb-body text-sm text-ink mt-2 whitespace-pre-line">{r.descripcion}</p>}
            <p className="bb-body text-[11px] text-ink-soft mt-2">
              Enviado el {formatDate(r.created_at)}{r.referido_por_nombre ? ` por ${r.referido_por_nombre}` : ''}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={() => onVerificar(r)}
                className="bg-gold text-ink px-3 py-2 min-h-[40px] sm:min-h-0 rounded-card bb-body text-sm font-semibold hover:bg-gold/90 transition-colors"
              >
                Verificar y crear proyecto
              </button>
              <button
                type="button"
                onClick={() => onRechazar(r)}
                className="border border-line text-rust px-3 py-2 min-h-[40px] sm:min-h-0 rounded-card bb-body text-sm hover:bg-rust/5 transition-colors"
              >
                Rechazar
              </button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
