// lib/autofill.ts
// Ayudas genéricas de autorrelleno (puras): fechas, siguiente código, normalizar textos.

/** 'AAAA-MM-DD' de hoy (hora local). */
export function todayIso(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** Suma días a una fecha 'AAAA-MM-DD'. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Suma meses a una fecha 'AAAA-MM-DD' (31 ene + 1 mes → 28/29 feb). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

/** Siguiente código con prefijo y año: nextCode(['PRY-2026-001','PRY-2026-007'], 'PRY', 2026) → 'PRY-2026-008'. */
export function nextCode(existing: (string | null | undefined)[], prefix: string, year: number, digits = 3): string {
  const re = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const max = existing.reduce((mx, c) => {
    const m = re.exec(c ?? '');
    return m ? Math.max(mx, Number(m[1])) : mx;
  }, 0);
  return `${prefix}-${year}-${String(max + 1).padStart(digits, '0')}`;
}

/** Texto comparable: minúsculas, sin tildes ni espacios dobles. */
export function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}
