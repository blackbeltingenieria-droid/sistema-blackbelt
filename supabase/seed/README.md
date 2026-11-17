# Datos de demostración

Datos realistas de **julio a diciembre 2026** para ver el sistema a plena capacidad. **Solo para la base de desarrollo.**

| Qué | Comando |
|---|---|
| Verlos al instante en tu PC, sin base de datos (memoria) | `npm run dev:demo` |
| Cargarlos en la base de **desarrollo** | `npm run seed:demo -- --confirm-dev=<host-de-tu-url>` |
| Borrar solo los datos demo | `npm run seed:demo:clean -- --confirm-dev=<host>` |
| Regenerar los `.sql` (para pegarlos en el SQL editor) | `npm run seed:demo:sql` |

Reglas de seguridad
- Todo dato demo lleva el prefijo `DEMO - ` (los movimientos, el código `DEMO-0001…`) e ids ≥ 9001. El borrado exige **marca e id** a la vez.
- Es idempotente: correrlo dos veces no duplica nada.
- Se detiene si la URL del `.env` es de producción (`PRODUCTION_SUPABASE_URL`, `.env.production` o `supabase/seed/.production-url`), si no escribes `--confirm-dev=<host>` o si la base ya tiene movimientos reales (`--allow-existing` solo para una base de desarrollo con pruebas).
- `demo.sql` también aborta si encuentra movimientos reales (se fuerza con `SET bb.allow_demo_with_real_data = 'on';`).
- Para usar otro archivo de variables: `--env=.env.dev`.

Contenido: 15 clientes, 25 proyectos, ~250 movimientos (7 tipos, 17 categorías, 4 clases, con borradores y 6 casos de control ≠ OK), presupuestos de los 6 meses, reparto CORP definido en 4 de 6 meses (septiembre y diciembre sin repartir), 9 especialistas, 10 usuarios, sprints, ~60 tareas y ~270 registros de horas.

## Datos reales del Excel «CUADRO DE COSTOS» (nube)

Local (`npm run dev` sin Supabase) ya muestra estos datos. Para la nube (Supabase → SQL Editor), en este orden y una sola vez:

1. Migraciones (si aún no están): `20261016000001_work_hours_time_range.sql`, `20261017000001_investments.sql` y `20261018000001_labor_contracts.sql` (carpeta `supabase/migrations/`).
2. `excel-01-respaldo-y-limpieza.sql` → cambia `v_confirmo` a `'SI'`. Copia cada tabla a `respaldo_20261016_*` y vacía movimientos, proyectos, clientes, pagos, metas, reparto, horas, tareas, sprints, inversiones y contratos de mano de obra. No toca usuarios, roles ni catálogos.
3. `excel-02-cargar-datos.sql` → carga 5 clientes, 5 proyectos, 6 pagos, 7 especialistas, 88 movimientos, 2 inversiones y 7 contratos de mano de obra (en una transacción). Los cobros del 15/10/2025 son adelantos y quedan en 2025.
4. `excel-03-verificar.sql` → las 18 filas deben decir **OK** (Excel del 12/11/2026: ingresos 6,280 · egresos 8,130.52 · inversión 2,000 = aportes 1,500 + préstamo 500 · caja 149.48 · contratado 18,720 · falta cobrar 12,440 · nada antes de 2026 · mano de obra 5,870 / 5,010.70 / 859.30 · servicios y publicidad 724.96 · herramientas 1,026.70 · resultado −1,850.52).
5. Si Henry aún no tiene usuario: `primer-usuario.sql` (con su correo).

Regenerar los SQL: `npm run seed:excel:sql` (fuente única: `src/features/excel-data`).
Probar a mano la carga por la página: `npm run dev:vacio` (arranca sin datos del Excel).

## Todo en un solo paso (recomendado)

`SUBIR-TODO.sql`: cambia las 3 líneas marcadas arriba (SI, correo y contraseña de Henry), pega todo en SQL Editor y Run. Hace el esquema completo y las 6 migraciones, respaldo y limpieza, carga del Excel, cuenta de Henry y la verificación (18 filas OK). Se puede repetir.

## Login con contraseña (nube)

1. Migración `supabase/migrations/20261019000001_login_con_contrasena.sql` (después de las demás). Cierra la base: solo responden usuarios del sistema con sesión iniciada.
2. `supabase/seed/primer-usuario.sql` con el correo y la contraseña de Henry (mínimo 8). Crea su cuenta para entrar. Después borra la contraseña del texto.
3. Supabase → Authentication → Sign In / Providers: desactiva **Allow new users to sign up**.
4. El resto de cuentas las crea el Administrador en **Equipo** (Dar acceso / + Agregar usuario) con una contraseña inicial; cada uno la cambia en **Mi contraseña**. Si alguien la olvida: Equipo → «Poner contraseña nueva».

No vuelvas a correr las migraciones 20261014000001 ni 20261015000001 después de esta: volverían a abrir esas tablas.
Probar en local: `npm run dev:login` (contraseña de prueba de todos: blackbelt2026).

## Actualizar la nube con un Excel nuevo (base ya en uso) — `ACTUALIZAR-EXCEL.sql`

1. Pon el Excel nuevo y corre `python3 scripts/excel/gen_raw.py "<excel>.xlsx" src/features/excel-data/excel-raw.ts` y luego `npm run seed:excel:sql`.
2. Prueba local: `npm test` y `npm run dev` (la página muestra el Excel nuevo en memoria).
3. Supabase → SQL Editor: pega `ACTUALIZAR-EXCEL.sql`, cambia `'NO'` por `'SI'` (línea marcada) y Run. Las 18 filas deben decir **OK**.
   Respalda todo en `respaldo_20261112_*`; reemplaza movimientos, pagos de clientes, inversiones y mano de obra; actualiza clientes y
   proyectos **sin cambiar sus ids** (las tareas y horas siguen en su proyecto); conserva horas, tareas, sprints, metas, usuarios y contraseñas.
   Se detiene sin cambiar nada si un proyecto de la nube choca con el Excel. Se puede repetir.

Ojo: los movimientos que se anotaron a mano en la web y no están en el Excel se reemplazan (quedan en `respaldo_20261112_movements`).
Préstamos: la fila 9 de TABLA_INVERSIONES (S/ 500) se carga como **préstamo del socio** (deuda, sin interés): entra a caja,
no es ingreso ni aporte, y aparece en Inversiones → «Deuda por devolver». Para devolverlo: Inversiones → Préstamos → Registrar pago.
