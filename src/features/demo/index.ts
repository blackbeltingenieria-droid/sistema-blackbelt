// features/demo/index.ts — conjunto de datos de demostración (determinista y marcado «DEMO - »).
import type { DbBudget, DbClient, DbCorpAllocation, DbMovement, DbProject, DbProjectPayment, DbSpecialist, DbSprint, DbTask, DbWorkHour } from '../../types/database';
import { buildAllocation, buildBudgets, buildMovements } from './finance';
import {
  buildClients, buildProjectPayments, buildProjects, buildSpecialists, buildSprintsAndTasks, buildUserDefs, buildWorkHours,
  type DemoUserDef,
} from './people-projects';

export interface DemoDataset {
  clients: DbClient[];
  projects: DbProject[];
  payments: DbProjectPayment[];
  specialists: DbSpecialist[];
  users: DemoUserDef[];
  sprints: DbSprint[];
  tasks: DbTask[];
  workHours: DbWorkHour[];
  movements: DbMovement[];
  budgets: DbBudget[];
  allocation: DbCorpAllocation[];
}

export function buildDemoDataset(): DemoDataset {
  const { sprints, tasks } = buildSprintsAndTasks();
  const movements = buildMovements();
  return {
    clients: buildClients(), projects: buildProjects(), payments: buildProjectPayments(),
    specialists: buildSpecialists(), users: buildUserDefs(), sprints, tasks,
    workHours: buildWorkHours(tasks), movements, budgets: buildBudgets(movements), allocation: buildAllocation(),
  };
}

export { toDbUsers } from './people-projects';
export * from './constants';
