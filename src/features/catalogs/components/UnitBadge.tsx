// ─── features/catalogs/components/UnitBadge.tsx ──────────────────────────────
// Badge oficial para identificar unidades de negocio.
// Utiliza estrictamente los colores de identidad del Modelo C (02-design-system.md).

import type { BusinessUnitCode } from '../types';

interface UnitBadgeProps {
  code: BusinessUnitCode | string;
  name?: string;
  color?: string;
  showName?: boolean;
  size?: 'xs' | 'sm' | 'md';
}

const OFFICIAL_COLORS: Record<string, string> = {
  UN01: '#E67E22', // Ingeniería y Productividad
  UN02: '#1677FF', // Tecnología y Transformación Digital
  UN03: '#6C3FC5', // Investigación y Desarrollo
  UN04: '#159957', // Ingeniería Especializada
  UN05: '#007080', // Emprendimiento y Desarrollo Empresarial
  CORP: '#C9A23A', // Corporativo / General
};

export function UnitBadge({ code, name, color, showName = true, size = 'sm' }: UnitBadgeProps) {
  const bg = color || OFFICIAL_COLORS[code] || '#15130F';

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium text-white shadow-sm bb-body ${sizeClasses}`}
      style={{ backgroundColor: bg }}
      title={name ? `${code} · ${name}` : code}
    >
      <span className="bb-mono font-bold tracking-wider">{code}</span>
      {showName && name && (
        <span className="truncate max-w-[160px] opacity-95 border-l border-white/20 pl-1.5">
          {name}
        </span>
      )}
    </span>
  );
}
