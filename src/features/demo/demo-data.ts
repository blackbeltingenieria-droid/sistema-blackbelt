// features/demo/demo-data.ts — conjunto demo para el modo en memoria (solo si DEMO_MODE).
import { DEMO_MODE } from '../../lib/demo-mode';
import { buildDemoDataset, toDbUsers, type DemoDataset } from './index';

export const demoData: DemoDataset | null = DEMO_MODE ? buildDemoDataset() : null;
export const demoUsers = demoData ? toDbUsers({ admin: 1, colaborador: 2 }) : null;
