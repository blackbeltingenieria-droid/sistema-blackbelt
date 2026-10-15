// scripts/seed-demo.ts — datos de demostración (julio–diciembre 2026).
//   npm run seed:demo        → carga en la base DE DESARROLLO (idempotente)
//   npm run seed:demo:clean  → borra SOLO los datos demo
//   npm run seed:demo:sql    → solo escribe supabase/seed/demo.sql y demo-clean.sql (no toca ninguna base)
// Opciones: --env=<archivo> (por defecto .env) · --confirm-dev=<host> (obligatorio) · --allow-existing
// Se detiene si la URL es la de producción o si la base ya tiene movimientos reales.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDemoDataset, toDbUsers } from '../src/features/demo';
import { SEED_AREAS, SEED_BUSINESS_UNITS, SEED_COST_CATEGORIES } from '../src/features/catalogs/services/seed-data';
import { assessTarget, hostOf, type SeedMode } from './demo/guard';
import { buildCleanSql, buildLoadSql, CLEAN_STEPS } from './demo/sql';

const root = resolve(import.meta.dirname ?? '.', '..');
const args = process.argv.slice(2);
const flag = (name: string): string | undefined => args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`))?.split('=')[1] ?? (args.includes(`--${name}`) ? '1' : undefined);

function parseEnv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

function productionUrls(): string[] {
  const urls: string[] = [];
  const fromEnv = process.env.PRODUCTION_SUPABASE_URL;
  if (fromEnv) urls.push(...fromEnv.split(',').map((s) => s.trim()).filter(Boolean));
  const prodEnv = parseEnv(resolve(root, '.env.production')).VITE_SUPABASE_URL;
  if (prodEnv) urls.push(prodEnv);
  const file = resolve(root, 'supabase/seed/.production-url');
  if (existsSync(file)) urls.push(...readFileSync(file, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#')));
  return urls;
}

function writeSql(): void {
  const dir = resolve(root, 'supabase/seed');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'demo.sql'), buildLoadSql(buildDemoDataset()));
  writeFileSync(resolve(dir, 'demo-clean.sql'), buildCleanSql());
  console.log('Escribí supabase/seed/demo.sql y supabase/seed/demo-clean.sql');
}

async function main(): Promise<void> {
  if (flag('sql')) { writeSql(); return; }

  const mode: SeedMode = flag('clean') ? 'clean' : 'load';
  const envFile = resolve(root, flag('env') ?? '.env');
  const env = parseEnv(envFile);
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;

  // 1) Chequeo previo SIN tocar la base: URL, producción y confirmación.
  const pre = assessTarget({ url, anonKey: key, productionUrls: productionUrls(), confirmHost: flag('confirm-dev'), realMovements: 0, allowExisting: true, mode });
  if (!pre.ok) { stop(pre.reasons); return; }

  const db = createClient(url as string, key as string);
  console.log(`Destino: ${hostOf(url as string)}  ·  modo: ${mode === 'load' ? 'CARGAR demo' : 'BORRAR demo'}`);

  // 2) Chequeo con la base: ¿hay movimientos reales? ¿los catálogos coinciden con los ids del seed?
  if (mode === 'load') {
    const real = await db.from('movements').select('id', { count: 'exact', head: true }).not('movement_code', 'like', 'DEMO-%');
    if (real.error) { stop([`No pude leer movements (¿aplicaste las migraciones?): ${real.error.message}`]); return; }
    const post = assessTarget({ url, anonKey: key, productionUrls: productionUrls(), confirmHost: flag('confirm-dev'), realMovements: real.count ?? 0, allowExisting: Boolean(flag('allow-existing')), mode });
    if (!post.ok) { stop(post.reasons); return; }
    await assertCatalogs(db);
  }

  if (mode === 'clean') { await clean(db); return; }
  await load(db);
}

function stop(reasons: string[]): void {
  console.error('\n⛔ El seed demo se detuvo:');
  reasons.forEach((r) => console.error(`  - ${r}`));
  process.exitCode = 1;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente sin esquema tipado (igual que los servicios de la app)
type Db = SupabaseClient<any, 'public', any>;

async function assertCatalogs(db: Db): Promise<void> {
  const [u, a, c] = await Promise.all([
    db.from('business_units').select('id, code'), db.from('areas').select('id, code'), db.from('cost_categories').select('id, code'),
  ]);
  const same = (rows: { id: number; code: string }[] | null, seed: { id: number; code: string }[], what: string) => {
    for (const s of seed) {
      if (!rows?.find((r) => r.id === s.id && r.code === s.code)) throw new Error(`El catálogo ${what} de esta base no coincide con el esperado (${s.code} con id ${s.id}).`);
    }
  };
  same(u.data as never, SEED_BUSINESS_UNITS, 'business_units');
  same(a.data as never, SEED_AREAS, 'areas');
  same(c.data as never, SEED_COST_CATEGORIES, 'cost_categories');
}

async function insertChunks(db: Db, table: string, rows: object[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + 100) as never, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`  ${table.padEnd(18)} ${rows.length} filas`);
}

async function load(db: Db): Promise<void> {
  const d = buildDemoDataset();
  const roles = await db.from('roles').select('id, code');
  if (roles.error || !roles.data?.length) throw new Error('No encontré la tabla roles (aplica la migración 20261015000001).');
  const roleIds = Object.fromEntries((roles.data as { id: number; code: string }[]).map((r) => [r.code, r.id])) as Record<'admin' | 'colaborador', number>;
  await insertChunks(db, 'clients', d.clients);
  await insertChunks(db, 'projects', d.projects);
  await insertChunks(db, 'project_payments', d.payments);
  await insertChunks(db, 'specialists', d.specialists);
  await insertChunks(db, 'users', toDbUsers(roleIds));
  await insertChunks(db, 'sprints', d.sprints);
  await insertChunks(db, 'tasks', d.tasks);
  // Solo columnas base: funciona aunque la base de desarrollo no tenga la migración de horario (20261016000001).
  await insertChunks(db, 'work_hours', d.workHours.map((w) => ({
    id: w.id, specialist_id: w.specialist_id, project_id: w.project_id, task_id: w.task_id,
    work_date: w.work_date, hours: w.hours, description: w.description,
  })));
  await insertChunks(db, 'movements', d.movements);
  await insertChunks(db, 'budgets', d.budgets);
  await insertChunks(db, 'corp_allocation', d.allocation);
  console.log('\n✔ Datos demo cargados (volver a correrlo no duplica nada).');
}

async function clean(db: Db): Promise<void> {
  for (const s of CLEAN_STEPS) {
    const { error, count } = await db.from(s.table).delete({ count: 'exact' }).like(s.column, s.pattern).gt('id', 9000);
    if (error) throw new Error(`${s.table}: ${error.message}`);
    console.log(`  ${s.table.padEnd(18)} ${count ?? 0} filas borradas`);
  }
  console.log('\n✔ Datos demo borrados. Los datos reales no se tocaron.');
}

main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });

