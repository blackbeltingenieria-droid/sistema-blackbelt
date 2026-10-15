// features/demo/constants.ts — marcas e ids de los datos de demostración.
// TODO dato demo lleva el prefijo «DEMO - » (nombres, detalles, comentarios) y ids ≥ 9000,
// para poder borrarlos sin tocar datos reales (ver scripts/seed-demo.ts).

export const DEMO_PREFIX = 'DEMO - ';
export const DEMO_ID_BASE = 9000;          // los ids demo empiezan en 9001
export const DEMO_MOVEMENT_CODE_PREFIX = 'DEMO-';
export const DEMO_EMAIL_DOMAIN = '@demo.blackbelt.local';
export const DEMO_MONTHS = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'] as const;

/** Genera un PRNG determinista (mulberry32): el seed produce SIEMPRE los mismos datos → idempotente. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pad2 = (n: number): string => String(n).padStart(2, '0');
export const demoDate = (month: string, day: number): string => `${month}-${pad2(day)}`;
export const withPrefix = (text: string): string => `${DEMO_PREFIX}${text}`;
