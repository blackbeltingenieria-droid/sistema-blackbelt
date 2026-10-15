// features/clients-projects/domain/project-defaults.ts
// Autorrelleno del alta de proyecto: unidad según el servicio, tipo de cliente según DNI/RUC,
// nombre sugerido y unidad habitual del cliente. Todo editable.

import { normalizeText } from '../../../lib/autofill';

const UNIT_KEYWORDS: [string, string[]][] = [
  ['UN03', ['tesis', 'investigacion', 'prototipo', 'estudio tecnico', 'articulo', 'monografia']],
  ['UN04', ['geofis', 'suelo', 'topograf', 'sondeo', 'resistividad', 'impacto ambiental', 'especializad']],
  ['UN02', ['software', 'web', 'app', 'aplicacion', 'sistema', 'datos', 'dashboard', 'automatiz', 'digital', 'bi ']],
  ['UN05', ['emprend', 'negocio', 'innovacion', 'startup', 'incubac', 'marketing', 'plan de negocio']],
  ['UN01', ['proceso', 'calidad', 'lean', 'productividad', 'operacion', 'mejora', 'iso', 'diagnostico']],
];

/** Código de unidad sugerido por el texto del servicio ("DESARROLLO DE TESIS" → UN03). null si no reconoce. */
export function suggestUnitCode(service: string): string | null {
  const t = ` ${normalizeText(service)} `;
  for (const [code, words] of UNIT_KEYWORDS) if (words.some((w) => t.includes(w))) return code;
  return null;
}

/** RUC (11 dígitos) → Empresa · DNI (8 dígitos) → Persona · otro → null. */
export function clientTypeFromDoc(doc: string): 'Empresa' | 'Persona' | null {
  const d = doc.replace(/\D/g, '');
  if (d.length === 11) return 'Empresa';
  if (d.length === 8) return 'Persona';
  return null;
}

/** "DESARROLLO DE TESIS" + "Wilmer Sánchez" → "Desarrollo de tesis – Wilmer Sánchez". */
export function suggestProjectName(service: string, clientName: string): string {
  const s = service.trim();
  const nice = s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
  return [nice, clientName.trim()].filter(Boolean).join(' – ');
}

/** Unidad del proyecto más reciente de ese cliente (para clientes que vuelven). */
export function lastUnitOfClient(projects: { clientId: number; businessUnitId: number; id: number }[], clientId: number): number | null {
  const mine = projects.filter((p) => p.clientId === clientId).sort((a, b) => b.id - a.id);
  return mine[0]?.businessUnitId ?? null;
}
