// features/dashboard-general/services/admin-overview-service.ts
// Reúne lo necesario para el resumen del Admin en «Mi panel» (solo lectura).

import { currentMonth } from '../../../lib/format';
import { getAllocationsByMonth } from '../../budgets-allocation/services/budget-service';
import { getProjectRows } from '../../clients-projects/services/project-service';
import { getAllTasks } from '../../kanban/services/kanban-service';
import { getMovements } from '../../movements/services/movement-service';
import { getWorkHours } from '../../work-hours/services/work-hours-service';
import { computeAdminOverview, type AdminOverview } from '../domain/admin-overview';

export async function getAdminOverview(month: string = currentMonth()): Promise<AdminOverview> {
  const [tasks, hours, projects, movements, allocationByMonth] = await Promise.all([
    getAllTasks(), getWorkHours(), getProjectRows(), getMovements(), getAllocationsByMonth(),
  ]);
  return computeAdminOverview({ tasks, hours, projects, movements, allocationByMonth, month });
}
