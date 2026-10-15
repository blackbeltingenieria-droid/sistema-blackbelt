import { describe, expect, it } from 'vitest';
import { buildDemoDataset } from '../../src/features/demo';
import { buildCleanSql, buildLoadSql, CLEAN_STEPS, insertSql, lit, Raw } from './sql';

describe('SQL del seed demo', () => {
  it('escapa comillas y NULL', () => {
    expect(lit("O'Brien")).toBe("'O''Brien'");
    expect(lit(null)).toBe('NULL');
    expect(lit(12.5)).toBe('12.5');
    expect(lit(new Raw('now()'))).toBe('now()');
  });
  it('INSERT con ON CONFLICT DO NOTHING (idempotente)', () => {
    const s = insertSql('t', ['id', 'n'], [{ id: 9001, n: 'x' }]);
    expect(s).toContain('ON CONFLICT DO NOTHING');
    expect(s).toContain("(9001, 'x')");
  });
  const d = buildDemoDataset();
  const load = buildLoadSql(d);
  it('la carga incluye todas las tablas y la protección contra bases con datos reales', () => {
    for (const t of ['clients', 'projects', 'project_payments', 'specialists', 'users', 'sprints', 'tasks', 'work_hours', 'movements', 'budgets', 'corp_allocation']) {
      expect(load).toContain(`INSERT INTO ${t} `);
    }
    expect(load).toContain('RAISE EXCEPTION');
    expect(load).toContain("SELECT id FROM roles WHERE code = 'admin'");
  });
  it('es determinista (mismo SQL en cada corrida)', () => {
    expect(buildLoadSql(buildDemoDataset())).toBe(load);
  });
  it('la limpieza solo borra con marca Y id > 9000, en orden seguro', () => {
    const clean = buildCleanSql();
    const deletes = clean.split('\n').filter((l) => l.startsWith('DELETE'));
    expect(deletes).toHaveLength(CLEAN_STEPS.length);
    expect(deletes.every((l) => l.includes('LIKE') && l.includes('AND id > 9000'))).toBe(true);
    const order = CLEAN_STEPS.map((s) => s.table);
    expect(order.indexOf('movements')).toBeLessThan(order.indexOf('projects'));
    expect(order.indexOf('users')).toBeLessThan(order.indexOf('specialists'));
    expect(order.indexOf('tasks')).toBeLessThan(order.indexOf('projects'));
  });
});
