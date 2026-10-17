// scripts/seed-excel-sql.ts — escribe los 3 SQL para subir el Excel real a la nube (no toca ninguna base).
//   npm run seed:excel:sql
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildBackupAndCleanSql, buildLoadSql, buildVerifySql } from './excel/sql';
import { buildSubirTodo } from './excel/subir-todo';

const dir = resolve(process.cwd(), 'supabase/seed');
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, 'excel-01-respaldo-y-limpieza.sql'), buildBackupAndCleanSql());
writeFileSync(resolve(dir, 'excel-02-cargar-datos.sql'), buildLoadSql());
writeFileSync(resolve(dir, 'excel-03-verificar.sql'), buildVerifySql());
writeFileSync(resolve(dir, 'SUBIR-TODO.sql'), buildSubirTodo(process.cwd(), { clean: buildBackupAndCleanSql(), load: buildLoadSql(), verify: buildVerifySql() }));
console.log('Escribí supabase/seed/SUBIR-TODO.sql (todo en uno) y supabase/seed/excel-01-respaldo-y-limpieza.sql, excel-02-cargar-datos.sql y excel-03-verificar.sql');
