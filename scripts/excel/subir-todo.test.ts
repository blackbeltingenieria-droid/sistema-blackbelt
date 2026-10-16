import { describe, expect, it } from 'vitest';
import { buildBackupAndCleanSql, buildLoadSql, buildVerifySql } from './sql';
import { MIGRATIONS, buildSubirTodo } from './subir-todo';

describe('SUBIR-TODO.sql', () => {
  const s = buildSubirTodo(process.cwd(), { clean: buildBackupAndCleanSql(), load: buildLoadSql(), verify: buildVerifySql() });
  it('no hace nada si no se cambian los 3 datos de arriba', () => {
    expect(s.indexOf("'bb.confirmo',     'NO'")).toBeGreaterThan(0);
    expect(s.indexOf('No se hizo nada')).toBeLessThan(s.indexOf(MIGRATIONS[0]));
  });
  it('orden: migraciones → limpieza → carga → Henry → verificación', () => {
    const at = (t: string) => s.indexOf(t);
    expect(at(MIGRATIONS[3])).toBeGreaterThan(at(MIGRATIONS[0]));
    expect(at('PASO 1 · RESPALDO')).toBeGreaterThan(at(MIGRATIONS[3]));
    expect(at('PASO 2 · CARGA')).toBeGreaterThan(at('PASO 1 · RESPALDO'));
    expect(at('PASO 3 · CUENTA DE HENRY')).toBeGreaterThan(at('PASO 2 · CARGA'));
    expect(at('PASO 4 · VERIFICACIÓN')).toBeGreaterThan(at('PASO 3 · CUENTA DE HENRY'));
    expect(s).toContain("current_setting('bb.clave_henry')");
    expect(s).not.toContain("v_password TEXT := 'CAMBIAR'");
  });
});
