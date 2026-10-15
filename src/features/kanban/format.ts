// features/kanban/format.ts
// Utilidades de presentación del Kanban.

/** '2026-10-17' → '17/10/2026'. */
export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** '2026-10-17' → '17/10' (para tarjetas angostas). */
export function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** true si la fecha ya pasó (comparación por día, zona local). */
export function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return iso < todayIso;
}

/** 'Henry Torres Rivera' → 'HT'. */
export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
