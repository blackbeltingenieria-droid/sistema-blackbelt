// scripts/excel/subir-todo.ts — un solo archivo para pegar UNA vez en Supabase → SQL Editor.
// Junta, en orden: guardia (3 datos a cambiar arriba) → esquema inicial + 6 migraciones → respaldo y limpieza →
// carga del Excel → primer usuario (Henry, con contraseña) → verificación (16 filas OK).
// No se conecta a ninguna base: solo escribe texto. Lo corre la usuaria.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Todo el esquema, desde el inicial, en orden. Cada archivo es seguro de repetir (IF NOT EXISTS / ON CONFLICT),
 *  así sirve tanto para una base nueva como para una que ya tenga parte aplicada. */
export const MIGRATIONS = [
  'supabase/schema_completo_blackbelt.sql',
  'supabase/migrations/20261014000001_kanban_sprints_tasks.sql',
  'supabase/migrations/20261015000001_modelo_c_movements_budgets_roles.sql',
  'supabase/migrations/20261016000001_work_hours_time_range.sql',
  'supabase/migrations/20261017000001_investments.sql',
  'supabase/migrations/20261018000001_labor_contracts.sql',
  'supabase/migrations/20261019000001_login_con_contrasena.sql',
];

function swap(text: string, from: string, to: string, file: string): string {
  if (!text.includes(from)) throw new Error(`No encontré «${from}» en ${file}`);
  return text.replace(from, to);
}

export function buildSubirTodo(root: string, parts: { clean: string; load: string; verify: string }): string {
  const read = (p: string) => readFileSync(resolve(root, p), 'utf8');
  const first = swap(
    swap(read('supabase/seed/primer-usuario.sql'),
      "v_email TEXT := 'CAMBIAR@correo.com';", "v_email TEXT := current_setting('bb.correo_henry');", 'primer-usuario.sql'),
    "v_password TEXT := 'CAMBIAR';", "v_password TEXT := current_setting('bb.clave_henry');", 'primer-usuario.sql');
  const clean = swap(parts.clean, "v_confirmo TEXT := 'NO';", "v_confirmo TEXT := current_setting('bb.confirmo');", 'excel-01');
  const block = (title: string, body: string) => `\n-- ############################################################################\n-- ${title}\n-- ############################################################################\n${body.trim()}\n`;
  return [
    `-- ==============================================================================`,
    `-- SUBIR TODO A SUPABASE EN UN SOLO PASO (sistema BLACKBELT)`,
    `-- Generado por: npm run seed:excel:sql`,
    `--`,
    `-- CÓMO USARLO:`,
    `--   1. Cambia SOLO las 3 líneas marcadas con ← (justo debajo).`,
    `--   2. Copia TODO este archivo, pégalo en Supabase → SQL Editor → New query y pulsa Run.`,
    `--   3. Al final aparece una tabla de 16 filas: todas deben decir OK.`,
    `--   4. Borra la contraseña del editor (no guardes este texto con la contraseña).`,
    `--`,
    `-- Hace, en orden: esquema completo + 6 migraciones (seguras, se pueden repetir) → copia de respaldo de los datos`,
    `-- actuales (tablas respaldo_20261016_*) y limpieza → carga del Excel → cuenta de Henry → verificación.`,
    `-- Si algo falla, se detiene ahí y muestra el motivo en rojo.`,
    `-- ==============================================================================`,
    ``,
    `SELECT set_config('bb.confirmo',     'NO',                 false),  -- ← 1. CAMBIA 'NO' POR 'SI' (borra los datos de prueba, con respaldo)`,
    `       set_config('bb.correo_henry', 'CAMBIAR@correo.com', false),  -- ← 2. correo de Henry (para entrar)`,
    `       set_config('bb.clave_henry',  'CAMBIAR',            false);  -- ← 3. contraseña de Henry (mínimo 8 caracteres)`,
    ``,
    `DO $$`,
    `BEGIN`,
    `  IF current_setting('bb.confirmo') <> 'SI' THEN RAISE EXCEPTION 'No se hizo nada. Cambia la línea 1 a ''SI''.'; END IF;`,
    `  IF current_setting('bb.correo_henry') ILIKE 'CAMBIAR%' OR position('@' IN current_setting('bb.correo_henry')) = 0 THEN`,
    `    RAISE EXCEPTION 'No se hizo nada. Pon el correo de Henry en la línea 2.'; END IF;`,
    `  IF current_setting('bb.clave_henry') = 'CAMBIAR' OR length(current_setting('bb.clave_henry')) < 8 THEN`,
    `    RAISE EXCEPTION 'No se hizo nada. Pon la contraseña de Henry en la línea 3 (mínimo 8 caracteres).'; END IF;`,
    `END $$;`,
    ...MIGRATIONS.map((m) => block(`ESQUEMA ${m.split('/').pop()}`, read(m))),
    block('PASO 1 · RESPALDO Y LIMPIEZA', clean),
    block('PASO 2 · CARGA DEL EXCEL', parts.load),
    block('PASO 3 · CUENTA DE HENRY (Administrador)', first),
    block('PASO 4 · VERIFICACIÓN (16 filas OK)', parts.verify),
  ].join('\n');
}
