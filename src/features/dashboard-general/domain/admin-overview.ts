// features/dashboard-general/domain/admin-overview.ts
// Resumen general de la empresa para «Mi panel» del Admin. Funciones PURAS sobre datos ya leídos.

import { monthLabel } from '../../../lib/format';
import { RECORD_TYPE, EXPENSE_CLASS } from '../../../types/database';
import { isEligible, CORP_CODE } from '../../movements/domain/movement-rules';
import type { EnrichedMovement } from '../../movements/types';
import { allocationStatus, ALLOCATION_STATUS, type AllocationPcts } from '../../results-cash/domain/calculations';

export interface OverviewInput {
  tasks: { status: string }[];
  hours: { work_date: string; hours: number }[];
  projects: { status: string }[];
  movements: EnrichedMovement[];
  allocationByMonth: Record<string, { pcts: AllocationPcts }>;
  /** Mes actual 'AAAA-MM'. */
  month: string;
}

export interface OverviewAlert {
  key: 'control' | 'allocation';
  text: string;
  link: string;
  linkLabel: string;
}

export interface AdminOverview {
  openTasks: number;
  doneTasks: number;
  monthHours: number;
  activeProjects: number;
  pendingValidation: number;   // movimientos en BORRADOR
  controlIssues: number;       // movimientos con control distinto de OK
  unallocatedMonths: string[]; // meses (≤ actual) con gasto CORP compartido y reparto sin definir
  alerts: OverviewAlert[];
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Meses hasta `month` que tienen gasto CORP compartido (validado + OK) y el reparto sigue SIN REPARTIR. */
export function monthsWithoutAllocation(
  movements: EnrichedMovement[],
  allocationByMonth: Record<string, { pcts: AllocationPcts }>,
  month: string,
): string[] {
  const months = new Set<string>();
  for (const m of movements) {
    if (
      isEligible(m) && m.mes && m.mes <= month &&
      m.unitCode === CORP_CODE &&
      m.record_type === RECORD_TYPE.COSTO_RECONOCIDO &&
      m.expense_class === EXPENSE_CLASS.COMPARTIDO
    ) months.add(m.mes);
  }
  return [...months]
    .filter((mes) => allocationStatus(allocationByMonth[mes]?.pcts ?? {}) === ALLOCATION_STATUS.SIN_REPARTIR)
    .sort();
}

export function computeAdminOverview(i: OverviewInput): AdminOverview {
  const openTasks = i.tasks.filter((t) => t.status !== 'hecho').length;
  const monthHours = round2(i.hours.filter((h) => h.work_date.startsWith(i.month)).reduce((a, h) => a + Number(h.hours), 0));
  const pendingValidation = i.movements.filter((m) => m.status === 'BORRADOR').length;
  const controlIssues = i.movements.filter((m) => m.control !== 'OK').length;
  const unallocatedMonths = monthsWithoutAllocation(i.movements, i.allocationByMonth, i.month);

  const alerts: OverviewAlert[] = [];
  if (controlIssues > 0) {
    alerts.push({
      key: 'control',
      text: `${controlIssues} movimiento${controlIssues === 1 ? '' : 's'} con control distinto de OK: no entra${controlIssues === 1 ? '' : 'n'} en los reportes.`,
      link: '/movements', linkLabel: 'Revisar movimientos',
    });
  }
  if (unallocatedMonths.length > 0) {
    alerts.push({
      key: 'allocation',
      text: `Reparto CORP sin definir en ${unallocatedMonths.length === 1 ? 'el mes' : 'los meses'} ${unallocatedMonths.map(monthLabel).join(', ')}.`,
      link: '/budgets', linkLabel: 'Definir reparto',
    });
  }

  return {
    openTasks,
    doneTasks: i.tasks.length - openTasks,
    monthHours,
    activeProjects: i.projects.filter((p) => p.status === 'activo').length,
    pendingValidation,
    controlIssues,
    unallocatedMonths,
    alerts,
  };
}
