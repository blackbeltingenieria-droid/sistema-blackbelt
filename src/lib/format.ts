// lib/format.ts — formateo compartido (soles, fechas, mes AAAA-MM).

const PEN = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });

export function formatPen(amount: number): string {
  return PEN.format(amount);
}

export function formatPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)} %`;
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '—';
}

/** Mes actual como AAAA-MM (hora local). */
export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function monthLabel(month: string): string {
  const [y, m] = month.split('-');
  const name = MONTH_NAMES[Number(m) - 1];
  return name ? `${name} ${y}` : month;
}

/** Lista de meses (más reciente primero) desde `from` hasta `to`, ambos AAAA-MM. */
export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out.reverse();
}
