// components/ui/KpiCard.tsx
// Label (11px uppercase) + big mono figure. Used in dashboards and detail panels.
// Opcional: variación vs. mes anterior (↑/↓ + %) y una frase corta en lenguaje simple.

import { Card } from './Card';

interface KpiCardProps {
  label: string;
  value: string;
  valueColor?: string; // Tailwind text class, e.g. 'text-rust'
  subtext?: string;
  className?: string;
  /** Variación % contra el mes anterior. `null` = sin base de comparación. Omitir = no mostrar. */
  delta?: number | null;
  /** Qué dirección es buena: ingresos suben (up), gastos bajan (down). Define el color. */
  deltaGood?: 'up' | 'down';
  /** Frase corta en lenguaje simple bajo la cifra. */
  note?: string;
}

function DeltaLine({ delta, good }: { delta: number | null; good: 'up' | 'down' }) {
  if (delta === null) {
    return <p className="bb-body text-[11px] text-ink-soft mt-1" data-testid="kpi-delta">Sin mes anterior para comparar</p>;
  }
  const up = delta > 0;
  const flat = delta === 0;
  const isGood = flat ? null : (up ? good === 'up' : good === 'down');
  const color = isGood === null ? 'text-ink-soft' : isGood ? 'text-belt-en_revision' : 'text-rust';
  const arrow = flat ? '→' : up ? '↑' : '↓';
  return (
    <p className={`bb-mono text-[11px] mt-1 ${color}`} data-testid="kpi-delta">
      <span aria-hidden="true">{arrow}</span> {Math.abs(delta).toFixed(1)} %
      <span className="text-ink-soft"> vs mes anterior</span>
    </p>
  );
}

export function KpiCard({
  label, value, valueColor = 'text-ink', subtext, className = '', delta, deltaGood = 'up', note,
}: KpiCardProps) {
  return (
    <Card className={className}>
      <p className="bb-label-xs text-ink-soft mb-1">{label}</p>
      <p className={`bb-mono text-base sm:text-2xl font-medium whitespace-nowrap ${valueColor}`}>{value}</p>
      {delta !== undefined && <DeltaLine delta={delta} good={deltaGood} />}
      {subtext && <p className="bb-body text-xs text-ink-soft mt-1">{subtext}</p>}
      {note && <p className="bb-body text-xs text-ink mt-1.5 leading-snug" data-testid="kpi-note">{note}</p>}
    </Card>
  );
}
