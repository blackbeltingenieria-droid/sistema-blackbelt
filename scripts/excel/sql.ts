// scripts/excel/sql.ts — SQL para subir a la nube los datos REALES del Excel «CUADRO DE COSTOS».
// Genera 3 archivos (npm run seed:excel:sql):
//   excel-01-respaldo-y-limpieza.sql  guarda una copia de las tablas y las deja vacías (pide confirmación)
//   excel-02-cargar-datos.sql         carga el Excel (se detiene si ya hay datos)
//   excel-03-verificar.sql            compara la base con los totales del Excel
// Los catálogos se buscan por CÓDIGO (no por id) para que funcione aunque los ids de la nube sean otros.

import {
  XLS_CLIENTS, XLS_INVESTMENTS, XLS_LABOR_CONTRACTS, XLS_MOVEMENTS, XLS_PAYMENTS, XLS_PROJECTS, XLS_SPECIALISTS, datasetTotals,
} from '../../src/features/excel-data/excel-dataset';
import { EXCEL_TOTALES } from '../../src/features/excel-data/excel-raw';
import { Raw, lit } from '../demo/sql';

const unit = (c: string) => new Raw(`(SELECT id FROM business_units WHERE code = ${lit(c)})`);
const area = (c: string) => new Raw(`(SELECT id FROM areas WHERE code = ${lit(c)})`);
const cat = (c: string) => new Raw(`(SELECT id FROM cost_categories WHERE code = ${lit(c)})`);
/** Una copia nueva por cada carga (la anterior se conserva). */
const BACKUP = 'respaldo_20261112';
/** Especialistas que cambiaron de nombre en el Excel: se renombran (no se borran) para no perder su usuario. */
const RENAMES: [string, string][] = [['Alanis Pardavé', 'Alanis Beraún Pardavé']];

function insert(table: string, columns: string[], rows: Record<string, unknown>[]): string {
  const values = rows.map((r) => `  (${columns.map((c) => lit(r[c])).join(', ')})`).join(',\n');
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n${values};`;
}

const DATA_TABLES = ['labor_contracts', 'work_hours', 'tasks', 'sprints', 'movements', 'budgets', 'corp_allocation', 'project_payments', 'projects', 'clients', 'investments'];
/** Actualizar (la nube ya está en uso): solo se reemplaza lo que viene del Excel. Horas, tareas, sprints,
 *  metas, reparto, usuarios y especialistas agregados en la web se quedan; clientes y proyectos se actualizan. */
const UPDATE_TABLES = ['labor_contracts', 'movements', 'project_payments', 'investments'];

/** 'full' = base nueva (vacía todo); 'update' = base en uso (conserva el trabajo del equipo). */
export type LoadMode = 'full' | 'update';

/** Agrega ON CONFLICT (id) DO UPDATE a un INSERT (para clientes y proyectos en modo actualizar). */
function upsert(sql: string, columns: string[]): string {
  const set = columns.filter((c) => c !== 'id').map((c) => `${c} = EXCLUDED.${c}`).join(', ');
  return `${sql.replace(/;$/, '')}\nON CONFLICT (id) DO UPDATE SET ${set};`;
}

export function buildBackupAndCleanSql(mode: LoadMode = 'full'): string {
  const names = XLS_SPECIALISTS.map((s) => lit(s.name.toLowerCase())).join(', ');
  const clean = mode === 'update' ? UPDATE_TABLES : DATA_TABLES;
  return [
    `-- ==============================================================================`,
    `-- PASO 1 de 3 · RESPALDO Y LIMPIEZA antes de cargar el Excel «CUADRO DE COSTOS».`,
    `-- Generado por: npm run seed:excel:sql`,
    `--`,
    `-- Qué hace:`,
    `--   1. Copia cada tabla de datos a "${BACKUP}_<tabla>" (para poder recuperar cualquier cosa).`,
    `--   2. Vacía: ${clean.join(', ')}.`,
    mode === 'update'
      ? `--   3. Conserva horas, tareas, metas, usuarios y especialistas; clientes y proyectos se actualizan en el paso 2.`
      : `--   3. Quita los especialistas que no están en el Excel (Henry Torres Rivera se queda).`,
    `-- NO toca: usuarios, roles, catálogos (unidades, áreas, categorías) ni la configuración.`,
    `--`,
    `-- SEGURIDAD: no hace nada hasta que cambies 'NO' por 'SI' en la línea marcada.`,
    `-- Requiere las migraciones 20261016000001, 20261017000001 y 20261018000001 ya aplicadas.`,
    `-- ==============================================================================`,
    ``,
    `DO $$`,
    `DECLARE`,
    `  v_confirmo TEXT := 'NO';   -- ← CAMBIA A 'SI' PARA BORRAR (después de leer lo de arriba)`,
    `  t TEXT;`,
    `BEGIN`,
    `  IF v_confirmo <> 'SI' THEN`,
    `    RAISE EXCEPTION 'No se borró nada. Cambia v_confirmo a ''SI'' para respaldar y limpiar.';`,
    `  END IF;`,
    `  IF to_regclass('investments') IS NULL THEN`,
    `    RAISE EXCEPTION 'Falta la migración 20261017000001_investments.sql. Aplícala primero.';`,
    `  END IF;`,
    `  IF to_regclass('labor_contracts') IS NULL THEN`,
    `    RAISE EXCEPTION 'Falta la migración 20261018000001_labor_contracts.sql. Aplícala primero.';`,
    `  END IF;`,
    ``,
    `  -- transactions (esquema anterior) se respalda porque al borrar proyectos su enlace quedaría vacío.`,
  `  FOREACH t IN ARRAY ARRAY[${[...DATA_TABLES, 'specialists', 'app_settings', 'users', 'transactions'].map((x) => lit(x)).join(', ')}] LOOP`,
    `    IF to_regclass(t) IS NOT NULL AND to_regclass('${BACKUP}_' || t) IS NULL THEN`,
    `      EXECUTE format('CREATE TABLE %I AS SELECT * FROM %I', '${BACKUP}_' || t, t);`,
    `      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', '${BACKUP}_' || t);  -- sin políticas: no se ve desde la app`,
    `    END IF;`,
    `  END LOOP;`,
    ``,
    `  FOREACH t IN ARRAY ARRAY[${clean.map((x) => lit(x)).join(', ')}] LOOP`,
    `    IF to_regclass(t) IS NOT NULL THEN EXECUTE format('DELETE FROM %I', t); END IF;`,
    `  END LOOP;`,
    ``,
    ...RENAMES.map(([from, to]) =>
      `  UPDATE specialists SET full_name = ${lit(to)} WHERE lower(full_name) = ${lit(from.toLowerCase())}\n` +
      `     AND NOT EXISTS (SELECT 1 FROM specialists WHERE lower(full_name) = ${lit(to.toLowerCase())});`),
    ...(mode === 'update' ? [] : [
      `  UPDATE users SET specialist_id = NULL`,
      `   WHERE specialist_id IN (SELECT id FROM specialists WHERE lower(full_name) NOT IN (${names}));`,
      `  DELETE FROM specialists WHERE lower(full_name) NOT IN (${names});`,
    ]),
    `  RAISE NOTICE 'Listo: copia en tablas ${BACKUP}_* y datos reemplazables borrados. Sigue con la carga.';`,
    `END $$;`,
    ``,
  ].join('\n');
}

export function buildLoadSql(mode: LoadMode = 'full'): string {
  const clientCols = ['id', 'name', 'client_type', 'doc_number', 'phone', 'notes'];
  const projectCols = ['id', 'code', 'client_id', 'business_unit_id', 'area_id', 'name', 'service', 'manager', 'contracted_amount', 'start_date', 'end_date', 'status', 'notes'];
  const clientsSql = insert('clients', clientCols,
    XLS_CLIENTS.map((c) => ({ id: c.id, name: c.name, client_type: 'Persona', doc_number: c.doc, phone: c.phone, notes: c.institution })));
  const projectsSql = insert('projects', projectCols,
    XLS_PROJECTS.map((p) => ({
      id: p.id, code: p.code, client_id: p.clientId, business_unit_id: unit(p.unitCode), area_id: area(p.areaCode), name: p.name,
      service: p.service, manager: p.manager, contracted_amount: p.contracted, start_date: p.start, end_date: p.end, status: p.status, notes: p.notes,
    })));
  const projectGuard = XLS_PROJECTS.map((p) => `(${p.id}, ${lit(p.code)})`).join(', ');
  const clientGuard = XLS_PROJECTS.map((p) => `(${p.id}, ${p.clientId})`).join(', ');
  const t = datasetTotals();
  const specialists = XLS_SPECIALISTS.map((s) =>
    `INSERT INTO specialists (full_name, specialty, active)\n  SELECT ${lit(s.name)}, ${lit(s.specialty)}, TRUE\n  WHERE NOT EXISTS (SELECT 1 FROM specialists WHERE lower(full_name) = ${lit(s.name.toLowerCase())});\n` +
    `UPDATE specialists SET specialty = ${lit(s.specialty)}, active = TRUE WHERE lower(full_name) = ${lit(s.name.toLowerCase())};`).join('\n');
  return [
    `-- ==============================================================================`,
    `-- PASO 2 de 3 · CARGA de los datos REALES del Excel «CUADRO DE COSTOS - PRIMER MODELO».`,
    `-- Generado por: npm run seed:excel:sql  (misma fuente que los datos locales: src/features/excel-data)`,
    `--`,
    `-- Carga: ${XLS_CLIENTS.length} clientes, ${XLS_PROJECTS.length} proyectos, ${XLS_PAYMENTS.length} pagos de clientes, ${XLS_SPECIALISTS.length} especialistas,`,
    `--        ${XLS_MOVEMENTS.length} movimientos (ingresos + cobros, egresos + pagos, aportes y préstamo), ${XLS_INVESTMENTS.length} inversiones`,
    `--        y ${XLS_LABOR_CONTRACTS.length} contratos de mano de obra (TABLA_M.O).`,
    `-- Totales: ingresos S/ ${t.ingresos} · egresos S/ ${t.egresos} · inversión S/ ${t.inversion} (aportes ${t.aportes} + préstamo del socio ${t.prestamos}) · caja S/ ${t.fondoEnCaja}.`,
    `-- El préstamo (TABLA_INVERSIONES fila 9) entra a caja como PRESTAMO_RECIBIDO: no es ingreso ni patrimonio; se devuelve.`,
    `-- Saldo inicial de caja = 0 (el Excel calcula: fondo en caja = ingresos + inversión − egresos).`,
    `-- Fechas: 15/10/2025 de TABLA_INGRESOS era un error de digitación → 15/10/2026 (la empresa empezó en 2026).`,
    `-- Solo se corrigen textos mal escritos: "15/010/2026" → 15/10/2026; "09/092026" → 09/09/2026.`,
    `--`,
    `-- Se detiene si ya hay clientes, proyectos o movimientos (corre antes excel-01-respaldo-y-limpieza.sql).`,
    `-- Todo va en una transacción: si algo falla, no queda nada a medias.`,
    `-- ==============================================================================`,
    ``,
    `BEGIN;`,
    ``,
    `DO $$`,
    `BEGIN`,
    ...(mode === 'update' ? [
      `  IF EXISTS (SELECT 1 FROM movements) THEN`,
      `    RAISE EXCEPTION 'Todavía hay movimientos. Corre primero el paso 1 (respaldo y limpieza).';`,
      `  END IF;`,
      `  -- Un proyecto creado en la web con el mismo número pero otro código sería pisado: mejor detenerse y avisar.`,
      `  IF EXISTS (SELECT 1 FROM projects p JOIN (VALUES ${projectGuard}) AS x(id, code) ON x.id = p.id WHERE coalesce(p.code, '') <> x.code) THEN`,
      `    RAISE EXCEPTION 'Hay proyectos creados en la web que chocan con los del Excel (mismo id, otro código). No se cambió nada: avisa para revisarlos.';`,
      `  END IF;`,
      `  -- Un proyecto o cliente creado en la página con el mismo número que uno del Excel sería pisado: detenerse.`,
      `  IF EXISTS (SELECT 1 FROM projects p WHERE p.id IN (${XLS_PROJECTS.map((p) => p.id).join(', ')}) AND coalesce(p.notes, '') NOT LIKE '%Excel TABLA_CLIENTES fila%') THEN`,
      `    RAISE EXCEPTION 'Hay un proyecto creado en la página con el mismo número que uno del Excel. No se cambió nada: corre REVISAR-NUBE.sql (sección 6) y avisa.';`,
      `  END IF;`,
      `  IF EXISTS (SELECT 1 FROM clients c JOIN (VALUES ${XLS_CLIENTS.map((c) => `(${c.id}, ${lit(c.name.toUpperCase())}, ${lit(c.doc ?? '')})`).join(', ')}) AS x(id, name, doc) ON x.id = c.id`,
      `             WHERE upper(trim(c.name)) <> x.name AND coalesce(c.doc_number, '') <> x.doc`,
      `               AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.client_id = c.id AND p.notes LIKE '%Excel TABLA_CLIENTES fila%')) THEN`,
      `    RAISE EXCEPTION 'Hay un cliente creado en la página con el mismo número que uno del Excel. No se cambió nada: avisa para revisarlo.';`,
      `  END IF;`,
      `  -- Un proyecto ya cargado debe seguir siendo del mismo cliente (sus tareas y horas apuntan a su id).`,
      `  IF EXISTS (SELECT 1 FROM projects p JOIN (VALUES ${clientGuard}) AS x(id, client_id) ON x.id = p.id WHERE p.client_id IS DISTINCT FROM x.client_id) THEN`,
      `    RAISE EXCEPTION 'Un proyecto de la nube es de otro cliente que en el Excel (mismo id). No se cambió nada: avisa para revisarlo.';`,
      `  END IF;`,
    ] : [
      `  IF EXISTS (SELECT 1 FROM movements) OR EXISTS (SELECT 1 FROM projects) OR EXISTS (SELECT 1 FROM clients) THEN`,
      `    RAISE EXCEPTION 'La base ya tiene datos. Corre primero excel-01-respaldo-y-limpieza.sql (o el Excel ya se cargó).';`,
      `  END IF;`,
    ]),
    `  IF to_regclass('investments') IS NULL THEN`,
    `    RAISE EXCEPTION 'Falta la migración 20261017000001_investments.sql. Aplícala primero.';`,
    `  END IF;`,
    `  IF to_regclass('labor_contracts') IS NULL THEN`,
    `    RAISE EXCEPTION 'Falta la migración 20261018000001_labor_contracts.sql. Aplícala primero.';`,
    `  END IF;`,
    `END $$;`,
    ``,
    `INSERT INTO app_settings (key, value) VALUES ('opening_cash', '0')`,
    `ON CONFLICT (key) DO UPDATE SET value = '0';`,
    ``,
    `-- Especialistas (TABLA_M.O)`,
    specialists,
    ``,
    `-- Clientes (TABLA_CLIENTES)${mode === 'update' ? ' — se actualizan si ya existen' : ''}`,
    mode === 'update' ? upsert(clientsSql, clientCols) : clientsSql,
    ``,
    `-- Proyectos (uno por cliente)${mode === 'update' ? ' — se actualizan si ya existen (sus tareas y horas se conservan)' : ''}`,
    mode === 'update' ? upsert(projectsSql, projectCols) : projectsSql,
    ``,
    ...(mode === 'update' ? [
      `-- Proyectos que vinieron de un Excel anterior y ya no están (p. ej. Diana duplicada, fila 21): se quitan con su cliente.`,
      `-- Si alguno tiene tareas, sprints u horas, se detiene (borrar el proyecto las borraría también).`,
      `CREATE TEMP TABLE bb_quitar ON COMMIT DROP AS`,
      `  SELECT id, client_id FROM projects WHERE notes LIKE '%Excel TABLA_CLIENTES fila%' AND id NOT IN (${XLS_PROJECTS.map((p) => p.id).join(', ')});`,
      `DO $$`,
      `BEGIN`,
      `  IF EXISTS (SELECT 1 FROM bb_quitar q WHERE EXISTS (SELECT 1 FROM tasks t WHERE t.project_id = q.id)`,
      `      OR EXISTS (SELECT 1 FROM sprints s WHERE s.project_id = q.id) OR EXISTS (SELECT 1 FROM work_hours w WHERE w.project_id = q.id)) THEN`,
      `    RAISE EXCEPTION 'Un proyecto que ya no está en el Excel tiene tareas u horas en la web. No se cambió nada: avisa para revisarlo.';`,
      `  END IF;`,
      `END $$;`,
      `DELETE FROM projects WHERE id IN (SELECT id FROM bb_quitar);`,
      `DELETE FROM clients c WHERE c.id IN (SELECT client_id FROM bb_quitar) AND c.id NOT IN (${XLS_CLIENTS.map((c) => c.id).join(', ')})`,
      `  AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.client_id = c.id);`,
      ``,
    ] : []),
    `-- Pagos de clientes (TABLA_INGRESOS)`,
    insert('project_payments', ['id', 'project_id', 'amount', 'payment_date', 'payment_method'],
      XLS_PAYMENTS.map((p) => ({ id: p.id, project_id: p.projectId, amount: p.amount, payment_date: p.date, payment_method: p.method }))),
    ``,
    `-- Movimientos (libro único del Modelo C)`,
    insert('movements', ['id', 'movement_code', 'movement_date', 'record_type', 'amount', 'business_unit_id', 'area_id', 'responsible', 'cost_category_id', 'expense_class', 'project_id', 'counterparty', 'detail', 'payment_method', 'status', 'notes'],
      XLS_MOVEMENTS.map((m) => ({
        id: m.id, movement_code: m.code, movement_date: m.date, record_type: m.type, amount: m.amount, business_unit_id: unit(m.unitCode),
        area_id: area(m.areaCode), responsible: m.responsible, cost_category_id: cat(m.categoryCode), expense_class: m.cls,
        project_id: m.projectId, counterparty: m.counterparty, detail: m.detail, payment_method: m.method, status: 'VALIDADO', notes: m.notes,
      }))),
    ``,
    `-- Inversiones (TABLA_INVERSIONES)`,
    insert('investments', ['id', 'code', 'kind', 'investor_name', 'investor_doc', 'amount', 'investment_date', 'payment_method', 'description', 'interest_rate', 'term_months'],
      XLS_INVESTMENTS.map((i) => ({
        id: i.id, code: i.code, kind: i.kind, investor_name: i.name, investor_doc: i.doc, amount: i.amount, investment_date: i.date,
        payment_method: i.method, description: i.description, interest_rate: 0, term_months: null,
      }))),
    ``,
    `-- Mano de obra (TABLA_M.O). Lo pagado se calcula con los egresos enlazados ('Mano de obra CMO-…').`,
    insert('labor_contracts', ['id', 'code', 'specialist_id', 'worker_name', 'worker_doc', 'business_unit_id', 'area_id', 'project_id', 'client_label', 'service', 'description', 'contract_type', 'start_date', 'end_date', 'agreed_amount', 'active', 'notes'],
      XLS_LABOR_CONTRACTS.map((c) => ({
        id: c.id, code: c.code,
        specialist_id: new Raw(`(SELECT id FROM specialists WHERE lower(full_name) = ${lit((XLS_SPECIALISTS.find((s) => s.id === c.specialistId)?.name ?? '').toLowerCase())} LIMIT 1)`),
        worker_name: c.name, worker_doc: c.doc, business_unit_id: unit(c.unitCode), area_id: area(c.areaCode), project_id: c.projectId,
        client_label: c.clientLabel, service: c.service, description: c.description, contract_type: c.type, start_date: c.start,
        end_date: c.end, agreed_amount: c.agreed, active: true, notes: `Excel TABLA_M.O fila ${c.row}`,
      }))),
    ``,
    `-- Los contadores de id siguen después de lo cargado (para que la app cree los siguientes sin chocar)`,
    ...['clients', 'projects', 'project_payments', 'movements', 'investments', 'labor_contracts'].map((tb) =>
      `SELECT setval(pg_get_serial_sequence('${tb}', 'id'), (SELECT max(id) FROM ${tb}));`),
    ``,
    `COMMIT;`,
    ``,
    `-- Siguiente: excel-03-verificar.sql (todas las filas deben decir OK).`,
    ``,
  ].join('\n');
}

export function buildVerifySql(mode: LoadMode = 'full'): string {
  const E = EXCEL_TOTALES;
  const D = datasetTotals();
  const row = (concept: string, expected: number, query: string) =>
    `  SELECT ${lit(concept)} AS concepto, ${expected}::numeric AS excel, (${query})::numeric AS en_la_base`;
  const sum = (where: string) => `SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND ${where}`;
  return [
    `-- ==============================================================================`,
    `-- PASO 3 de 3 · VERIFICAR que la base cuadra con el Excel. Todas las filas deben decir OK.`,
    `-- ==============================================================================`,
    ``,
    `SELECT concepto, excel, en_la_base, CASE WHEN abs(excel - en_la_base) < 0.005 THEN 'OK' ELSE 'NO CUADRA' END AS estado`,
    `FROM (`,
    [
      row('Ingresos (TABLA_INGRESOS)', E.ingresos, sum(`record_type = 'INGRESO_RECONOCIDO'`)),
      row('Cobros de clientes', E.ingresos, sum(`record_type = 'COBRO'`)),
      row('Egresos (TABLA_EGRESOS)', E.egresos, sum(`record_type = 'COSTO_RECONOCIDO'`)),
      row('Pagos', E.egresos, sum(`record_type = 'PAGO'`)),
      row('Inversión total (TABLA_INVERSIONES)', E.inversion, `SELECT coalesce(sum(amount), 0) FROM investments`),
      row('  de eso: aportes de socios (patrimonio)', D.aportes, `SELECT coalesce(sum(amount), 0) FROM investments WHERE kind = 'patrimonio'`),
      row('  de eso: préstamo a devolver (deuda)', D.prestamos, `SELECT coalesce(sum(amount), 0) FROM investments WHERE kind = 'deuda'`),
      row('Fondo en caja', E.fondoEnCaja,
        `SELECT (SELECT value::numeric FROM app_settings WHERE key = 'opening_cash') + coalesce(sum(CASE WHEN record_type IN ('COBRO','APORTE_SOCIO','PRESTAMO_RECIBIDO') THEN amount WHEN record_type IN ('PAGO','RETIRO_SOCIO','PAGO_PRESTAMO') THEN -amount ELSE 0 END), 0) FROM movements WHERE status = 'VALIDADO'`),
      row('Monto contratado (TABLA_CLIENTES)', E.contratado, `SELECT coalesce(sum(contracted_amount), 0) FROM projects`),
      row('Monto pagado por clientes', E.pagadoClientes, `SELECT coalesce(sum(amount), 0) FROM project_payments`),
      row('Falta cobrar (contratado − pagado)', E.faltaCobrar, `SELECT (SELECT coalesce(sum(contracted_amount), 0) FROM projects) - (SELECT coalesce(sum(amount), 0) FROM project_payments)`),
      row('Nada antes de 2026 (la empresa empezó este año)', 0, `SELECT count(*) FROM movements WHERE movement_date < '2026-01-01'`),
      row('Mano de obra: monto requerido (TABLA_M.O)', E.manoObraRequerido, `SELECT coalesce(sum(agreed_amount), 0) FROM labor_contracts WHERE active`),
      row('Mano de obra: monto pagado', E.manoObraPagado,
        `SELECT coalesce(sum(m.amount), 0) FROM movements m WHERE m.status = 'VALIDADO' AND m.record_type = 'COSTO_RECONOCIDO' AND m.notes LIKE '%Mano de obra CMO-%' AND EXISTS (SELECT 1 FROM movements p WHERE p.record_type = 'PAGO' AND p.status = 'VALIDADO' AND p.notes = 'Contrapartida de ' || m.movement_code)`),
      row('Mano de obra: falta pagar', E.manoObraFalta,
        `SELECT (SELECT coalesce(sum(agreed_amount), 0) FROM labor_contracts WHERE active) - (SELECT coalesce(sum(m.amount), 0) FROM movements m WHERE m.status = 'VALIDADO' AND m.record_type = 'COSTO_RECONOCIDO' AND m.notes LIKE '%Mano de obra CMO-%' AND EXISTS (SELECT 1 FROM movements p WHERE p.record_type = 'PAGO' AND p.status = 'VALIDADO' AND p.notes = 'Contrapartida de ' || m.movement_code))`),
      row('Servicios y publicidad (según TABLA_EGRESOS)', E.serviciosPublicidad,
        sum(`record_type = 'COSTO_RECONOCIDO' AND cost_category_id IN (SELECT id FROM cost_categories WHERE code IN ('SERV', 'PUB'))`)),
      row('Herramientas digitales (según TABLA_EGRESOS)', E.herramientas,
        sum(`record_type = 'COSTO_RECONOCIDO' AND cost_category_id = (SELECT id FROM cost_categories WHERE code = 'SOFT')`)),
      row('Resultado (ingresos − egresos)', r2(E.ingresos - E.egresos), `SELECT (${sum(`record_type = 'INGRESO_RECONOCIDO'`)}) - (${sum(`record_type = 'COSTO_RECONOCIDO'`)})`),
      // Solo al actualizar: lo anotado a mano en la web que no viene del Excel se reemplazó. Si no es 0, revisar ${BACKUP}_movements.
      ...(mode === 'update' ? [row(`Anotados solo en la web (si no es 0: están en ${BACKUP}_movements)`, 0,
        `SELECT count(*) FROM ${BACKUP}_movements WHERE coalesce(notes, '') NOT LIKE '%Excel TABLA_%' AND coalesce(notes, '') NOT LIKE 'Contrapartida de %'`)] : []),
    ].join('\n  UNION ALL\n'),
    `) x;`,
    ``,
  ].join('\n');
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** REVISAR-NUBE.sql — SOLO LECTURA (solo SELECT). Antes de actualizar: compara la base con el Excel nuevo y lista lo que
 *  se registró en la página y no está en el Excel (lo que ACTUALIZAR-EXCEL reemplazaría). Una sola tabla de resultado. */
export function buildDiagnosticSql(): string {
  const E = EXCEL_TOTALES;
  const D = datasetTotals();
  const xlsMain = XLS_MOVEMENTS.filter((m) => ['INGRESO_RECONOCIDO', 'COSTO_RECONOCIDO', 'APORTE_SOCIO', 'PRESTAMO_RECIBIDO'].includes(m.type));
  const xlsMovs = xlsMain.map((m) => `(${lit(m.date)}::date, ${lit(m.type)}, ${m.amount}::numeric, ${lit(`${m.notes?.split(':')[0].replace(/^Inversión INV-\d+-\d+ · /, '') ?? ''}`)})`).join(',\n    ');
  const xlsPays = XLS_PAYMENTS.map((p) => `(${p.projectId}, ${p.amount}::numeric, ${lit(p.date)}::date)`).join(', ');
  const xlsInv = XLS_INVESTMENTS.map((i) => `(${lit(i.date)}::date, ${i.amount}::numeric, ${lit(i.kind)})`).join(', ');
  const xlsProj = XLS_PROJECTS.map((p) => `(${p.id}, ${lit(p.code)}, ${p.clientId}, ${lit(XLS_CLIENTS.find((c) => c.id === p.clientId)?.name ?? '')})`).join(',\n    ');
  const money = (x: string) => `to_char(${x}, 'FM999,999,990.00')`;
  const sumMov = (t: string) => `(SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = '${t}')`;
  const fig = (o: number, label: string, base: string, excel: number) =>
    `  SELECT ${o}, '1 · CIFRAS (base hoy vs Excel nuevo)', ${lit(label)}, ${money(base)}, ${money(String(excel))}, CASE WHEN abs((${base}) - ${excel}) < 0.005 THEN 'igual' ELSE 'cambia' END`;
  const webMov = `coalesce(m.notes, '') NOT LIKE '%Excel TABLA_%' AND coalesce(m.notes, '') NOT LIKE 'Contrapartida de %'`;
  const parts = [
    fig(1, 'Ingresos', sumMov('INGRESO_RECONOCIDO'), E.ingresos),
    fig(2, 'Egresos', sumMov('COSTO_RECONOCIDO'), E.egresos),
    fig(3, 'Aportes de socios', sumMov('APORTE_SOCIO'), D.aportes),
    fig(4, 'Préstamos recibidos', sumMov('PRESTAMO_RECIBIDO'), D.prestamos),
    fig(5, 'Caja', `(SELECT coalesce((SELECT value::numeric FROM app_settings WHERE key = 'opening_cash'), 0)) + (SELECT coalesce(sum(CASE WHEN record_type IN ('COBRO','APORTE_SOCIO','PRESTAMO_RECIBIDO') THEN amount WHEN record_type IN ('PAGO','RETIRO_SOCIO','PAGO_PRESTAMO') THEN -amount ELSE 0 END), 0) FROM movements WHERE status = 'VALIDADO')`, E.fondoEnCaja),
    fig(6, 'Monto contratado', `(SELECT coalesce(sum(contracted_amount), 0) FROM projects)`, E.contratado),
    fig(7, 'Pagado por clientes', `(SELECT coalesce(sum(amount), 0) FROM project_payments)`, E.pagadoClientes),
    fig(8, 'Mano de obra acordada', `(SELECT coalesce(sum(agreed_amount), 0) FROM labor_contracts WHERE active)`, E.manoObraRequerido),
    fig(9, 'Cantidad de movimientos', `(SELECT count(*)::numeric FROM movements)`, XLS_MOVEMENTS.length),
    fig(10, 'Cantidad de proyectos', `(SELECT count(*)::numeric FROM projects)`, XLS_PROJECTS.length),
    // 2 · Movimientos hechos en la página (no vienen del Excel): ACTUALIZAR-EXCEL los reemplazaría.
    `  SELECT 100 + row_number() OVER (ORDER BY m.movement_date, m.id), '2 · REGISTRADO EN LA PÁGINA (no viene del Excel)',
    m.movement_code || ' · ' || to_char(m.movement_date, 'DD/MM/YYYY') || ' · ' || m.record_type || ' · ' || coalesce(m.detail, '') || coalesce(' · ' || m.counterparty, '') || ' · ' || m.status,
    ${money('m.amount')}, coalesce((SELECT string_agg(x.origen, ', ') FROM xls x WHERE x.fecha = m.movement_date AND x.tipo = m.record_type AND x.monto = m.amount), ''),
    CASE WHEN EXISTS (SELECT 1 FROM xls x WHERE x.fecha = m.movement_date AND x.tipo = m.record_type AND x.monto = m.amount)
         THEN 'ya está en el Excel (mismo día, tipo y monto)' ELSE 'FALTA EN EL EXCEL' END
  FROM movements m WHERE ${webMov}`,
    // 3 · Pagos de clientes que no están en el Excel nuevo
    `  SELECT 300 + row_number() OVER (ORDER BY pp.payment_date, pp.id), '3 · PAGO DE CLIENTE que no está en el Excel',
    coalesce(p.code, '?') || ' · ' || coalesce(c.name, '?') || ' · ' || to_char(pp.payment_date, 'DD/MM/YYYY'), ${money('pp.amount')}, '', 'FALTA EN EL EXCEL'
  FROM project_payments pp LEFT JOIN projects p ON p.id = pp.project_id LEFT JOIN clients c ON c.id = p.client_id
  WHERE NOT EXISTS (SELECT 1 FROM (VALUES ${xlsPays}) AS x(project_id, amount, fecha) WHERE x.project_id = pp.project_id AND x.amount = pp.amount AND x.fecha = pp.payment_date)`,
    // 4 · Inversiones que no están en el Excel nuevo
    `  SELECT 400 + row_number() OVER (ORDER BY i.investment_date, i.id), '4 · INVERSIÓN que no está en el Excel',
    i.code || ' · ' || i.kind || ' · ' || i.investor_name || ' · ' || to_char(i.investment_date, 'DD/MM/YYYY'), ${money('i.amount')}, '', 'FALTA EN EL EXCEL'
  FROM investments i WHERE NOT EXISTS (SELECT 1 FROM (VALUES ${xlsInv}) AS x(fecha, amount, kind) WHERE x.fecha = i.investment_date AND x.amount = i.amount)`,
    // 5 · Contratos de mano de obra creados en la página
    `  SELECT 500 + row_number() OVER (ORDER BY l.id), '5 · CONTRATO DE MANO DE OBRA creado en la página',
    l.code || ' · ' || l.worker_name || ' · ' || coalesce(l.service, ''), ${money('l.agreed_amount')}, '', 'FALTA EN EL EXCEL'
  FROM labor_contracts l WHERE coalesce(l.notes, '') NOT LIKE 'Excel TABLA_M.O%'`,
    // 6 · Proyectos: creados en la página, o que chocan con el Excel nuevo (mismo id, otro código o cliente)
    `  SELECT 600 + row_number() OVER (ORDER BY p.id), '6 · PROYECTO creado en la página o que choca con el Excel',
    p.id || ' · ' || coalesce(p.code, '') || ' · ' || coalesce(c.name, '?') || ' · ' || coalesce(p.name, ''), ${money('p.contracted_amount')},
    coalesce((SELECT x.code || ' · ' || x.cliente FROM xp x WHERE x.id = p.id), '(no está en el Excel)'),
    CASE WHEN coalesce(p.notes, '') NOT LIKE '%Excel TABLA_CLIENTES fila%' THEN 'CREADO EN LA PÁGINA'
         ELSE 'MISMO ID, OTRO PROYECTO' END
  FROM projects p LEFT JOIN clients c ON c.id = p.client_id
  WHERE coalesce(p.notes, '') NOT LIKE '%Excel TABLA_CLIENTES fila%'
     OR EXISTS (SELECT 1 FROM xp x WHERE x.id = p.id AND (x.code <> coalesce(p.code, '') OR x.client_id <> p.client_id))`,
    // 7 · Proyectos del Excel anterior que ya no están en el nuevo
    `  SELECT 700 + row_number() OVER (ORDER BY p.id), '7 · PROYECTO que ya no está en el Excel (se quitaría)',
    coalesce(p.code, '') || ' · ' || coalesce(c.name, '?'), ${money('p.contracted_amount')},
    (SELECT count(*) FROM tasks t WHERE t.project_id = p.id) || ' tareas · ' || (SELECT count(*) FROM work_hours w WHERE w.project_id = p.id) || ' registros de horas',
    CASE WHEN EXISTS (SELECT 1 FROM tasks t WHERE t.project_id = p.id) OR EXISTS (SELECT 1 FROM work_hours w WHERE w.project_id = p.id) THEN 'TIENE TRABAJO: revisar' ELSE 'se puede quitar' END
  FROM projects p LEFT JOIN clients c ON c.id = p.client_id
  WHERE p.notes LIKE '%Excel TABLA_CLIENTES fila%' AND NOT EXISTS (SELECT 1 FROM xp x WHERE x.id = p.id)`,
    // 8 · Lo que se conserva (no lo toca la actualización)
    `  SELECT 800, '8 · SE CONSERVA (no se toca)', 'Tareas · sprints · horas · metas · usuarios', NULL,
    (SELECT count(*) FROM tasks) || ' · ' || (SELECT count(*) FROM sprints) || ' · ' || (SELECT count(*) FROM work_hours) || ' · ' || (SELECT count(*) FROM budgets) || ' · ' || (SELECT count(*) FROM users), 'info'`,
    `  SELECT 801, '8 · SE CONSERVA (no se toca)', 'Respaldos ya existentes', NULL,
    coalesce((SELECT string_agg(DISTINCT substring(tablename FROM '^(respaldo_[0-9]+)'), ', ') FROM pg_tables WHERE tablename LIKE 'respaldo_%'), 'ninguno'), 'info'`,
  ];
  return [
    `-- ==============================================================================`,
    `-- REVISAR LA NUBE ANTES DE ACTUALIZAR (sistema BLACKBELT) — SOLO LECTURA, no cambia nada.`,
    `-- Generado por: npm run seed:excel:sql`,
    `-- Pega todo en Supabase → SQL Editor → Run. Sale UNA tabla:`,
    `--   1 · cifras de la base hoy frente al Excel nuevo`,
    `--   2 · movimientos registrados en la página que no vienen del Excel (si dice FALTA EN EL EXCEL, se perderían al actualizar)`,
    `--   3–5 · pagos de clientes, inversiones y contratos de mano de obra que no están en el Excel`,
    `--   6–7 · proyectos creados en la página, que chocan con el Excel o que ya no están en él`,
    `--   8 · lo que se conserva`,
    `-- ==============================================================================`,
    ``,
    `WITH xls (fecha, tipo, monto, origen) AS (VALUES`,
    `    ${xlsMovs}`,
    `), xp (id, code, client_id, cliente) AS (VALUES`,
    `    ${xlsProj}`,
    `)`,
    `SELECT seccion, detalle, en_la_base, excel, estado FROM (`,
    parts.join('\n  UNION ALL\n'),
    `) AS r(orden, seccion, detalle, en_la_base, excel, estado)`,
    `ORDER BY orden;`,
    ``,
  ].join('\n');
}
