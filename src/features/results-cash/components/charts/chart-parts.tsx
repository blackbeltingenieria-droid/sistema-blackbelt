// Piezas comunes de los gráficos de Resultados y caja.
import type { ReactNode } from 'react';
import { Card } from '../../../../components/ui/Card';
import { formatPen } from '../../../../lib/format';
import { TOKENS } from '../../../../lib/design-tokens';

/** Tarjeta de gráfico: título + pista de lectura + descripción accesible. */
export function ChartCard({ title, hint, testId, ariaLabel, children, footer }: {
  title: string; hint: string; testId: string; ariaLabel: string; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <Card className="min-w-0" >
      <h3 className="bb-display font-semibold text-ink text-base">{title}</h3>
      <p className="bb-body text-xs text-ink-soft mb-3">{hint}</p>
      <div role="img" aria-label={ariaLabel} data-testid={testId} className="min-w-0">{children}</div>
      {footer}
    </Card>
  );
}

interface TipRow { name?: string; value?: number | string | [number, number]; color?: string; dataKey?: string | number }

/** Tooltip estándar en soles. `rows` permite sobreescribir lo que muestra cada serie. */
export function MoneyTooltip({ active, payload, label, rowsOf }: {
  active?: boolean; payload?: TipRow[]; label?: string | number;
  rowsOf?: (p: TipRow[]) => { name: string; value: number; color?: string }[];
}) {
  if (!active || !payload?.length) return null;
  const rows = rowsOf
    ? rowsOf(payload)
    : payload.filter((p) => typeof p.value === 'number').map((p) => ({ name: String(p.name), value: p.value as number, color: p.color }));
  return (
    <div className="bg-paper border border-line rounded-card px-3 py-2 shadow-sm">
      {label !== undefined && <p className="bb-label-xs text-ink-soft mb-1">{label}</p>}
      {rows.map((r) => (
        <p key={r.name} className="bb-mono text-xs text-ink flex items-center gap-2">
          <span aria-hidden="true" className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: r.color }} />
          {r.name}: <span className="font-medium">{formatPen(r.value)}</span>
        </p>
      ))}
    </div>
  );
}

/** Clave de lectura de colores (nunca solo por color: lleva forma y texto). */
export function Key({ items }: { items: { label: string; swatch: ReactNode }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 bb-body text-[11px] text-ink-soft">{i.swatch}{i.label}</li>
      ))}
    </ul>
  );
}

export const Swatch = ({ color, dashed = false, line = false, diamond = false }: { color: string; dashed?: boolean; line?: boolean; diamond?: boolean }) => (
  <svg width="16" height="10" aria-hidden="true">
    {line ? <line x1="0" y1="5" x2="16" y2="5" stroke={color} strokeWidth="2.5" strokeDasharray={dashed ? '4 3' : undefined} />
      : diamond ? <polygon points="8,0 13,5 8,10 3,5" fill={TOKENS.ink} />
      : <rect x="0" y="1" width="12" height="8" rx="1.5" fill={color} />}
  </svg>
);

