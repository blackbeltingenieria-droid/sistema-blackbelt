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

1. Migraciones (si aún no están): `supabase/migrations/20261016000001_work_hours_time_range.sql` y `supabase/migrations/20261017000001_investments.sql`.
2. `excel-01-respaldo-y-limpieza.sql` → cambia `v_confirmo` a `'SI'`. Copia cada tabla a `respaldo_20261016_*` y vacía movimientos, proyectos, clientes, pagos, metas, reparto, horas, tareas, sprints e inversiones. No toca usuarios, roles ni catálogos.
3. `excel-02-cargar-datos.sql` → carga 5 clientes, 5 proyectos, 6 pagos, 7 especialistas, 88 movimientos y 2 inversiones (en una transacción).
4. `excel-03-verificar.sql` → las 10 filas deben decir **OK** (ingresos 5,240 · egresos 4,839.73 · inversión 1,500 · caja 1,900.27 · contratado 8,340 · falta cobrar 3,100 · resultado 400.27).
5. Si Henry aún no tiene usuario: `primer-usuario.sql` (con su correo).

Regenerar los SQL: `npm run seed:excel:sql` (fuente única: `src/features/excel-data`).
Probar a mano la carga por la página: `npm run dev:vacio` (arranca sin datos del Excel).
