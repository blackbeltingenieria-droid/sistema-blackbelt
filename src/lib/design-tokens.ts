// lib/design-tokens.ts
// Espejo de la paleta de tailwind.config.js para las librerías que necesitan un valor de color
// en JS (gráficos SVG). Un test (design-tokens.test.ts) verifica que coincide con Tailwind,
// así que este archivo es la ÚNICA fuente de colores para gráficos: no escribir hex en componentes.
// Los colores de cada unidad vienen del catálogo (business_units.color), no de aquí.

export const TOKENS = {
  ink: '#15130F',
  canvas: '#F6F3EC',
  paper: '#FFFFFF',
  gold: '#C79A3A',
  rust: '#B0532A',
  inkSoft: '#6B6659',
  line: '#E4DFD3',
  positive: '#6E8B55', // belt.en_revision (verde): entradas, ingresos
} as const;

export type TokenName = keyof typeof TOKENS;
