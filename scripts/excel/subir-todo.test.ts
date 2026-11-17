import { describe, expect, it } from 'vitest';
import { buildBackupAndCleanSql, buildLoadSql, buildVerifySql } from './sql';
import { MIGRATIONS, buildSubirTodo } from './subir-todo';

const base = (m: string) => m.split('/').pop() as string;

describe('SUBIR-TODO.sql', () => {
  const s = buildSubirTodo(process.cwd(), { clean: buildBackupAndCleanSql(), load: buildLoadSql(), verify: buildVerifySql() });
  it('no hace nada si no se cambian los 3 datos de arriba', () => {
    expect(s.indexOf("'bb.confirmo',     'NO'")).toBeGreaterThan(0);
    expect(s.indexOf('No se hizo nada')).toBeLessThan(s.indexOf(base(MIGRATIONS[0])));
  });
  it('orden: esquema y migraciones → limpieza → carga → Henry → verificación', () => {
    const at = (t: string) => s.indexOf(t);
    expect(at(base(MIGRATIONS[MIGRATIONS.length - 1]))).toBeGreaterThan(at(base(MIGRATIONS[0])));
    expect(at('PASO 1 · RESPALDO')).toBeGreaterThan(at(base(MIGRATIONS[MIGRATIONS.length - 1])));
    expect(at('PASO 2 · CARGA')).toBeGreaterThan(at('PASO 1 · RESPALDO'));
    expect(at('PASO 3 · CUENTA DE HENRY')).toBeGreaterThan(at('PASO 2 · CARGA'));
    expect(at('PASO 4 · VERIFICACIÓN')).toBeGreaterThan(at('PASO 3 · CUENTA DE HENRY'));
    expect(s).toContain("current_setting('bb.clave_henry')");
    expect(s).not.toContain("v_password TEXT := 'CAMBIAR'");
  });

  it('ACTUALIZAR-EXCEL: respaldo, limpieza y carga en una sola transacción (si se detiene, no cambia nada)', async () => {
    const { buildActualizarExcel } = await import('./subir-todo');
    const { buildBackupAndCleanSql, buildLoadSql, buildVerifySql } = await import('./sql');
    const s = buildActualizarExcel({ clean: buildBackupAndCleanSql('update'), load: buildLoadSql('update'), verify: buildVerifySql('update') });
    expect(s.match(/^BEGIN;$/gm)).toHaveLength(1);
    expect(s.match(/^COMMIT;$/gm)).toHaveLength(1);
    expect(s.indexOf('BEGIN;')).toBeLessThan(s.indexOf('CREATE TABLE %I AS SELECT'));
    expect(s.indexOf('DELETE FROM %I')).toBeLessThan(s.indexOf('COMMIT;'));
  });
});
