import { TOKENS } from '../../../../lib/design-tokens';

export const AXIS_TICK = { fontSize: 11, fill: TOKENS.inkSoft, fontFamily: '"IBM Plex Mono", monospace' } as const;
export const AXIS_TICK_X = { fontSize: 10, fill: TOKENS.inkSoft, fontFamily: '"IBM Plex Sans", sans-serif' } as const;
export const GRID_STROKE = TOKENS.line;


/** Recharts entrega la fila original en `.payload` de la barra. */
export function rowOf<T>(d: unknown): T {
  const x = d as { payload?: T };
  return (x.payload ?? d) as T;
}
