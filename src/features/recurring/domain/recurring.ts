// features/recurring/domain/recurring.ts
// Servicios y marketing: pagos que se repiten cada mes (teléfono, publicidad, herramientas digitales).
// Funciones puras sobre los MISMOS egresos (solo VALIDADO + OK): agrupa por servicio y por mes, y dice si
// el gasto sube o baja y cuándo toca el próximo pago.

import { addMonths } from '../../../lib/autofill';
import { RECORD_TYPE } from '../../../types/database';
import { isEligible } from '../../movements/domain/movement-rules';
import type { EnrichedMovement } from '../../movements/types';

export type RecurringGroup = 'servicios' | 'marketing' | 'herramientas';

/** Categoría de gasto (código) → grupo. */
export const GROUP_OF_CATEGORY: Record<string, RecurringGroup> = { SERV: 'servicios', PUB: 'marketing', SOFT: 'herramientas' };
export const GROUP_LABEL: Record<RecurringGroup, string> = {
  servicios: 'Servicios (teléfono, internet, luz)',
  marketing: 'Publicidad',
  herramientas: 'Herramientas digitales',
};

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const money = (n: number) => `S/ ${Math.abs(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const STOP = new Set(['PAGO', 'DE', 'DEL', 'LA', 'EL', 'EN', 'POR', 'MES', 'MENSUAL', 'SUSCRIPCION', 'PLAN']);

/** Nombre del servicio: "Pago Bitel octubre" y "BITEL " → "BITEL". */
export function serviceKey(m: Pick<EnrichedMovement, 'counterparty' | 'detail'>): string {
  const raw = (m.counterparty?.trim() || m.detail?.trim() || 'Sin nombre').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const words = raw.replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w));
  const months = /^(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SETIEMBRE|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)$/;
  return words.filter((w) => !months.test(w)).join(' ') || raw.trim();
}

export interface RecurringPayment { id: number; date: string; amount: number; method: string | null; code: string }

export interface RecurringService {
  key: string;
  group: RecurringGroup;
  byMonth: Record<string, number>;
  total: number;
  payments: RecurringPayment[];
  recurring: boolean;          // se pagó en 2 o más meses
  lastAmount: number;
  lastDate: string;
  change: number | null;       // último pago − anterior (null si es el primero)
  averagePerMonth: number;     // promedio en los meses en que se pagó
  nextDate: string | null;     // fecha estimada del próximo pago (si es recurrente)
  ids: number[];
}

export interface RecurringReport {
  months: string[];                                  // del más antiguo al más reciente
  services: RecurringService[];
  monthTotals: Record<string, number>;
  groupTotals: Record<RecurringGroup, number>;
  groupByMonth: Record<RecurringGroup, Record<string, number>>;
  total: number;
  fixedMonthly: number;                              // suma del último pago de cada servicio recurrente
  phrases: string[];
}

export function buildRecurringReport(
  movements: EnrichedMovement[],
  categoryCodeOf: (categoryId: number) => string | undefined,
  groups: RecurringGroup[],
  months: string[] | null = null,
): RecurringReport {
  const wanted = new Set(groups);
  const costs = movements.filter((m) => {
    if (!isEligible(m) || m.record_type !== RECORD_TYPE.COSTO_RECONOCIDO) return false;
    const g = GROUP_OF_CATEGORY[categoryCodeOf(m.cost_category_id) ?? ''];
    return Boolean(g && wanted.has(g)) && (!months || months.includes(m.mes));
  });
  const monthList = months ?? [...new Set(costs.map((m) => m.mes))].sort();
  const map = new Map<string, RecurringService>();
  for (const m of [...costs].sort((a, b) => a.movement_date.localeCompare(b.movement_date) || a.id - b.id)) {
    const group = GROUP_OF_CATEGORY[categoryCodeOf(m.cost_category_id) ?? ''] as RecurringGroup;
    const key = serviceKey(m);
    const s = map.get(`${group}|${key}`) ?? {
      key, group, byMonth: {}, total: 0, payments: [], recurring: false, lastAmount: 0, lastDate: '', change: null, averagePerMonth: 0, nextDate: null, ids: [],
    };
    s.byMonth[m.mes] = r2((s.byMonth[m.mes] ?? 0) + m.amount);
    s.total = r2(s.total + m.amount);
    s.payments.push({ id: m.id, date: m.movement_date, amount: m.amount, method: m.payment_method, code: m.movement_code });
    s.ids.push(m.id);
    map.set(`${group}|${key}`, s);
  }
  const services = [...map.values()].map((s) => {
    const paidMonths = Object.keys(s.byMonth).length;
    const last = s.payments[s.payments.length - 1];
    const prev = s.payments[s.payments.length - 2];
    return {
      ...s,
      recurring: paidMonths >= 2,
      lastAmount: last.amount,
      lastDate: last.date,
      change: prev ? r2(last.amount - prev.amount) : null,
      averagePerMonth: r2(s.total / Math.max(1, paidMonths)),
      nextDate: paidMonths >= 2 ? addMonths(last.date, 1) : null,
    };
  }).sort((a, b) => Number(b.recurring) - Number(a.recurring) || b.total - a.total || a.key.localeCompare(b.key));

  const monthTotals: Record<string, number> = {};
  const groupByMonth: Record<RecurringGroup, Record<string, number>> = { servicios: {}, marketing: {}, herramientas: {} };
  const groupTotals: Record<RecurringGroup, number> = { servicios: 0, marketing: 0, herramientas: 0 };
  for (const mes of monthList) monthTotals[mes] = 0;
  for (const s of services) {
    for (const [mes, v] of Object.entries(s.byMonth)) {
      monthTotals[mes] = r2((monthTotals[mes] ?? 0) + v);
      groupByMonth[s.group][mes] = r2((groupByMonth[s.group][mes] ?? 0) + v);
    }
    groupTotals[s.group] = r2(groupTotals[s.group] + s.total);
  }
  const total = r2(services.reduce((a, s) => a + s.total, 0));
  const fixedMonthly = r2(services.filter((s) => s.recurring).reduce((a, s) => a + s.lastAmount, 0));

  const phrases: string[] = [];
  const lastMes = monthList[monthList.length - 1];
  const prevMes = monthList[monthList.length - 2];
  if (lastMes && total > 0) {
    const name = (mes: string) => {
      const n = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][Number(mes.slice(5)) - 1];
      return n ?? mes;
    };
    const cur = monthTotals[lastMes] ?? 0;
    if (prevMes) {
      const diff = r2(cur - (monthTotals[prevMes] ?? 0));
      phrases.push(`En ${name(lastMes)} gastaste ${money(cur)}${Math.abs(diff) >= 0.01 ? ` (${money(diff)} ${diff > 0 ? 'más' : 'menos'} que en ${name(prevMes)})` : ' (igual que el mes anterior)'}.`);
    } else phrases.push(`En ${name(lastMes)} gastaste ${money(cur)}.`);
    if (fixedMonthly > 0) phrases.push(`Tus pagos fijos suman unos ${money(fixedMonthly)} al mes (${services.filter((s) => s.recurring).length} servicios que se repiten).`);
    const up = services.filter((s) => s.change !== null && s.change > 0).sort((a, b) => (b.change ?? 0) - (a.change ?? 0))[0];
    if (up) phrases.push(`${up.key} subió ${money(up.change ?? 0)} en el último pago.`);
  }
  return { months: monthList, services, monthTotals, groupTotals, groupByMonth, total, fixedMonthly, phrases };
}
