// features/finance-giros/components/CategoryCodeChip.tsx
// Chip compacto para las 17 clasificaciones de costo del Modelo C.

import type { CostCategoryCode } from '../types';

interface CategoryChipProps {
  code: CostCategoryCode | string;
  name: string;
}

const CATEGORY_STYLE: Record<string, { bg: string; text: string; emoji: string }> = {
  // 17 categorías oficiales Modelo C
  MO:   { bg: '#15130F', text: '#FFFFFF', emoji: '👷' },
  PUB:  { bg: '#C9742E', text: '#FFFFFF', emoji: '📢' },
  SOFT: { bg: '#1677FF', text: '#FFFFFF', emoji: '💻' },
  SERV: { bg: '#007080', text: '#FFFFFF', emoji: '🌐' },
  MAT:  { bg: '#E4DFD3', text: '#15130F', emoji: '📦' },
  MAQ:  { bg: '#6B6659', text: '#FFFFFF', emoji: '⚙️' },
  MOV:  { bg: '#D8B13A', text: '#15130F', emoji: '🚗' },
  TERC: { bg: '#6C3FC5', text: '#FFFFFF', emoji: '🤝' },
  ADM:  { bg: '#55504A', text: '#FFFFFF', emoji: '📋' },
  CAP:  { bg: '#6E8B55', text: '#FFFFFF', emoji: '🎓' },
  BAN:  { bg: '#C79A3A', text: '#15130F', emoji: '🏦' },
  MANT: { bg: '#B0532A', text: '#FFFFFF', emoji: '🔧' },
  ACT:  { bg: '#159957', text: '#FFFFFF', emoji: '🏗️' },
  CXC:  { bg: '#1677FF', text: '#FFFFFF', emoji: '💵' },
  CXP:  { bg: '#B0532A', text: '#FFFFFF', emoji: '💳' },
  SOC:  { bg: '#C9A23A', text: '#15130F', emoji: '👥' },
  OTR:  { bg: '#6B6659', text: '#FFFFFF', emoji: '🏷️' },

  // Compatibilidad con registros legacy
  mano_de_obra:   { bg: '#15130F', text: '#FFFFFF', emoji: '👷' },
  maquinaria:     { bg: '#C9742E', text: '#FFFFFF', emoji: '⚙️' },
  metodo:         { bg: '#D8B13A', text: '#15130F', emoji: '📐' },
  medicion:       { bg: '#6E8B55', text: '#FFFFFF', emoji: '📊' },
  medio_ambiente: { bg: '#55504A', text: '#FFFFFF', emoji: '🏢' },
  materiales:     { bg: '#E4DFD3', text: '#15130F', emoji: '📦' },
};

export function CategoryCodeChip({ code, name }: CategoryChipProps) {
  const style = CATEGORY_STYLE[code] ?? { bg: '#55504A', text: '#FFFFFF', emoji: '🏷️' };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bb-body whitespace-nowrap max-w-full"
      style={{ backgroundColor: style.bg, color: style.text }}
      title={`${code} · ${name}`}
    >
      <span>{style.emoji}</span>
      <span className="bb-mono font-bold text-[10px] opacity-90">{code}</span>
      <span className="min-w-0 truncate max-w-[150px] max-md:max-w-none">{name}</span>
    </span>
  );
}
