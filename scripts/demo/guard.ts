// scripts/demo/guard.ts
// Seguridad del seed demo: se detiene si el destino parece la base de PRODUCCIÓN o si hay datos reales.
// Función pura (con pruebas): el CLI solo le pasa los hechos que leyó.

export type SeedMode = 'load' | 'clean';

export interface TargetFacts {
  url: string | undefined;
  anonKey: string | undefined;
  /** URLs que se sabe son producción (PRODUCTION_SUPABASE_URL, .env.production, supabase/seed/.production-url). */
  productionUrls: string[];
  /** Host que la persona escribió en --confirm-dev=<host>. Debe coincidir con el de la URL. */
  confirmHost: string | undefined;
  /** Movimientos que NO son demo en la base destino (solo se consulta al cargar). */
  realMovements: number;
  allowExisting: boolean;
  mode: SeedMode;
}

export interface Assessment { ok: boolean; reasons: string[] }

export const normalizeUrl = (u: string): string => u.trim().replace(/\/+$/, '').toLowerCase();

export function hostOf(url: string): string | null {
  try { return new URL(url).host.toLowerCase(); } catch { return null; }
}

export function assessTarget(f: TargetFacts): Assessment {
  const reasons: string[] = [];
  const url = f.url?.trim() ?? '';
  const host = url ? hostOf(url) : null;

  if (!url || !f.anonKey?.trim() || url.includes('placeholder') || !url.startsWith('https://') || !host) {
    reasons.push('No hay una base de datos configurada (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY vacíos o de ejemplo). En modo local usa «npm run dev:demo».');
    return { ok: false, reasons };
  }
  if (f.productionUrls.map(normalizeUrl).includes(normalizeUrl(url))) {
    reasons.push(`La URL apunta a la base de PRODUCCIÓN (${host}). El seed demo solo se corre contra la base de desarrollo.`);
  }
  if (!f.confirmHost || f.confirmHost.trim().toLowerCase() !== host) {
    reasons.push(`Confirma que es la base de DESARROLLO agregando --confirm-dev=${host}`);
  }
  if (f.mode === 'load' && f.realMovements > 0 && !f.allowExisting) {
    reasons.push(`La base ya tiene ${f.realMovements} movimientos reales (no demo). Parece una base en uso; si de verdad es de desarrollo, agrega --allow-existing.`);
  }
  return { ok: reasons.length === 0, reasons };
}
