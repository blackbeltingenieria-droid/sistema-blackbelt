// scripts/demo/sql.ts — genera demo.sql (carga idempotente) y demo-clean.sql (borra solo lo demo).
import type { DemoDataset } from '../../src/features/demo';
import { DEMO_EMAIL_DOMAIN, DEMO_ID_BASE, DEMO_MOVEMENT_CODE_PREFIX, DEMO_PREFIX } from '../../src/features/demo/constants';

/** Fragmento SQL tal cual (no se escapa). */
export class Raw { constructor(readonly sql: string) {} }

export function lit(v: unknown): string {
  if (v instanceof Raw) return v.sql;
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return `'${String(v).replace(/'/g, "''")}'`;
}

/** INSERT con ON CONFLICT DO NOTHING: ids fijos (≥ 9001) → correrlo dos veces no duplica nada. */
export function insertSql(table: string, columns: string[], rows: Record<string, unknown>[]): string {
  if (!rows.length) return `-- (sin filas para ${table})`;
  const values = rows.map((r) => `  (${columns.map((c) => lit(r[c])).join(', ')})`).join(',\n');
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n${values}\nON CONFLICT DO NOTHING;`;
}

const role = (code: string) => new Raw(`(SELECT id FROM roles WHERE code = '${code}')`);

export function buildLoadSql(d: DemoDataset): string {
  const users = d.users.map((u) => ({ ...u, role_id: role(u.role), active: true }));
  return [
    `-- ==============================================================================`,
    `-- DATOS DEMO de Blackbelt (julio–diciembre 2026). Generado por: npm run seed:demo:sql`,
    `-- SOLO PARA LA BASE DE DESARROLLO. Todo lleva la marca «${DEMO_PREFIX}» e ids ≥ ${DEMO_ID_BASE + 1}.`,
    `-- Es idempotente (ON CONFLICT DO NOTHING). Para borrarlo: supabase/seed/demo-clean.sql`,
    `-- Se detiene si la base ya tiene movimientos reales; para forzarlo en una base de desarrollo:`,
    `--   SET bb.allow_demo_with_real_data = 'on';   (en la misma sesión, antes de ejecutar)`,
    `-- ==============================================================================`,
    ``,
    `DO $$`,
    `BEGIN`,
    `  IF coalesce(current_setting('bb.allow_demo_with_real_data', true), 'off') <> 'on'`,
    `     AND EXISTS (SELECT 1 FROM movements WHERE movement_code NOT LIKE '${DEMO_MOVEMENT_CODE_PREFIX}%') THEN`,
    `    RAISE EXCEPTION 'Esta base tiene movimientos reales: parece la base en uso. El seed demo es solo para desarrollo.';`,
    `  END IF;`,
    `END $$;`,
    ``,
    `BEGIN;`,
    ``,
    insertSql('clients', ['id', 'name', 'client_type', 'doc_number', 'phone', 'email', 'location', 'notes'], d.clients as never),
    ``,
    insertSql('projects', ['id', 'code', 'client_id', 'business_unit_id', 'area_id', 'name', 'service', 'manager', 'start_date', 'end_date', 'contracted_amount', 'status', 'notes'], d.projects as never),
    ``,
    insertSql('project_payments', ['id', 'project_id', 'amount', 'payment_date', 'payment_method'], d.payments as never),
    ``,
    insertSql('specialists', ['id', 'full_name', 'email', 'specialty', 'active'], d.specialists as never),
    ``,
    insertSql('users', ['id', 'email', 'full_name', 'role_id', 'specialist_id', 'active'], users),
    ``,
    insertSql('sprints', ['id', 'project_id', 'name', 'goal', 'start_date', 'end_date', 'status'], d.sprints as never),
    ``,
    insertSql('tasks', ['id', 'project_id', 'sprint_id', 'title', 'description', 'status', 'assignee_id', 'due_date'], d.tasks as never),
    ``,
    insertSql('work_hours', ['id', 'specialist_id', 'project_id', 'task_id', 'work_date', 'hours', 'description'], d.workHours as never),
    ``,
    insertSql('movements', ['id', 'movement_code', 'movement_date', 'record_type', 'amount', 'business_unit_id', 'area_id', 'responsible', 'cost_category_id', 'expense_class', 'project_id', 'counterparty', 'detail', 'payment_method', 'voucher_number', 'status', 'notes'], d.movements as never),
    ``,
    insertSql('budgets', ['id', 'month', 'business_unit_id', 'area_id', 'cost_category_id', 'income_target', 'cost_target', 'comment'], d.budgets as never),
    ``,
    insertSql('corp_allocation', ['id', 'month', 'business_unit_id', 'pct', 'note'], d.allocation as never),
    ``,
    `COMMIT;`,
    ``,
  ].join('\n');
}

/** Borra SOLO lo demo: marca de texto Y id ≥ 9001 a la vez. Orden inverso de dependencias. */
export const CLEAN_STEPS: { table: string; column: string; pattern: string }[] = [
  { table: 'work_hours', column: 'description', pattern: `${DEMO_PREFIX}%` },
  { table: 'tasks', column: 'title', pattern: `${DEMO_PREFIX}%` },
  { table: 'sprints', column: 'name', pattern: `${DEMO_PREFIX}%` },
  { table: 'movements', column: 'movement_code', pattern: `${DEMO_MOVEMENT_CODE_PREFIX}%` },
  { table: 'budgets', column: 'comment', pattern: `${DEMO_PREFIX}%` },
  { table: 'corp_allocation', column: 'note', pattern: `${DEMO_PREFIX}%` },
  { table: 'project_payments', column: 'payment_method', pattern: `${DEMO_PREFIX}%` },
  { table: 'users', column: 'email', pattern: `%${DEMO_EMAIL_DOMAIN}` },
  { table: 'projects', column: 'name', pattern: `${DEMO_PREFIX}%` },
  { table: 'clients', column: 'name', pattern: `${DEMO_PREFIX}%` },
  { table: 'specialists', column: 'full_name', pattern: `${DEMO_PREFIX}%` },
];

export function buildCleanSql(): string {
  return [
    `-- ==============================================================================`,
    `-- BORRA SOLO LOS DATOS DEMO (marca «${DEMO_PREFIX}» + id ≥ ${DEMO_ID_BASE + 1}). Generado por: npm run seed:demo:sql`,
    `-- No toca datos reales. Los datos reales nunca tienen ids ≥ ${DEMO_ID_BASE + 1} con esa marca.`,
    `-- ==============================================================================`,
    ``,
    `BEGIN;`,
    ...CLEAN_STEPS.map((s) => `DELETE FROM ${s.table} WHERE ${s.column} LIKE ${lit(s.pattern)} AND id > ${DEMO_ID_BASE};`),
    `COMMIT;`,
    ``,
  ].join('\n');
}
