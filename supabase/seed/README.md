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
