import { describe, expect, it } from 'vitest';
import { buildBackupAndCleanSql, buildLoadSql, buildVerifySql } from './sql';

describe('SQL del Excel para la nube', () => {
  it('la limpieza no hace nada sin confirmación y respalda antes de borrar', () => {
    const s = buildBackupAndCleanSql();
    expect(s).toContain("v_confirmo TEXT := 'NO'");
    expect(s.indexOf('CREATE TABLE %I AS SELECT')).toBeLessThan(s.indexOf('DELETE FROM %I'));
    expect(s).not.toMatch(/DELETE FROM (users|roles|business_units|areas|cost_categories)\b/);
  });
  it('la carga va en una transacción, se detiene si ya hay datos y busca catálogos por código', () => {
    const s = buildLoadSql();
    expect(s.trim().startsWith('--')).toBe(true);
    expect(s).toContain('BEGIN;');
    expect(s).toContain('COMMIT;');
    expect(s).toContain('La base ya tiene datos');
    expect(s).toContain("(SELECT id FROM business_units WHERE code = 'UN03')");
    expect((s.match(/'VALIDADO', /g) ?? []).length).toBe(88);
  });
  it('la verificación compara 16 cifras con el Excel', () => {
    expect((buildVerifySql().match(/AS concepto/g) ?? []).length).toBe(16);
  });
});
