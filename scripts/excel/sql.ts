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
const BACKUP = 'respaldo_20261016';

function insert(table: string, columns: string[], rows: Record<string, unknown>[]): string {
  const values = rows.map((r) => `  (${columns.map((c) => lit(r[c])).join(', ')})`).join(',\n');
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n${values};`;
}

const DATA_TABLES = ['labor_contracts', 'work_hours', 'tasks', 'sprints', 'movements', 'budgets', 'corp_allocation', 'project_payments', 'projects', 'clients', 'investments'];

export function buildBackupAndCleanSql(): string {
  const names = XLS_SPECIALISTS.map((s) => lit(s.name.toLowerCase())).join(', ');
  return [
    `-- ==============================================================================`,
    `-- PASO 1 de 3 · RESPALDO Y LIMPIEZA antes de cargar el Excel «CUADRO DE COSTOS».`,
    `-- Generado por: npm run seed:excel:sql`,
    `--`,
    `-- Qué hace:`,
    `--   1. Copia cada tabla de datos a "${BACKUP}_<tabla>" (para poder recuperar cualquier cosa).`,
    `--   2. Vacía: ${DATA_TABLES.join(', ')}.`,
    `--   3. Quita los especialistas que no están en el Excel (Henry Torres Rivera se queda).`,
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
    `  FOREACH t IN ARRAY ARRAY[${DATA_TABLES.map((x) => lit(x)).join(', ')}] LOOP`,
    `    IF to_regclass(t) IS NOT NULL THEN EXECUTE format('DELETE FROM %I', t); END IF;`,
    `  END LOOP;`,
    ``,
    `  UPDATE users SET specialist_id = NULL`,
    `   WHERE specialist_id IN (SELECT id FROM specialists WHERE lower(full_name) NOT IN (${names}));`,
    `  DELETE FROM specialists WHERE lower(full_name) NOT IN (${names});`,
    `  RAISE NOTICE 'Listo: copia en tablas ${BACKUP}_* y datos de prueba borrados. Sigue con excel-02-cargar-datos.sql';`,
    `END $$;`,
    ``,
  ].join('\n');
}

export function buildLoadSql(): string {
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
    `--        ${XLS_MOVEMENTS.length} movimientos (ingresos + cobros, egresos + pagos, aportes), ${XLS_INVESTMENTS.length} inversiones`,
    `--        y ${XLS_LABOR_CONTRACTS.length} contratos de mano de obra (TABLA_M.O).`,
    `-- Totales: ingresos S/ ${t.ingresos} · egresos S/ ${t.egresos} · inversión S/ ${t.inversion} · caja S/ ${t.fondoEnCaja}.`,
    `-- Saldo inicial de caja = 0 (el Excel calcula: fondo en caja = ingresos + inversión − egresos).`,
    `-- Fechas: 15/10/2025 son ADELANTOS (Wilmer S/ 1,500 y Tania S/ 2,050) y se cargan tal cual.`,
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
    `  IF EXISTS (SELECT 1 FROM movements) OR EXISTS (SELECT 1 FROM projects) OR EXISTS (SELECT 1 FROM clients) THEN`,
    `    RAISE EXCEPTION 'La base ya tiene datos. Corre primero excel-01-respaldo-y-limpieza.sql (o el Excel ya se cargó).';`,
    `  END IF;`,
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
    `-- Clientes (TABLA_CLIENTES)`,
    insert('clients', ['id', 'name', 'client_type', 'doc_number', 'phone', 'notes'],
      XLS_CLIENTS.map((c) => ({ id: c.id, name: c.name, client_type: 'Persona', doc_number: c.doc, phone: c.phone, notes: c.institution }))),
    ``,
    `-- Proyectos (uno por cliente)`,
    insert('projects', ['id', 'code', 'client_id', 'business_unit_id', 'area_id', 'name', 'service', 'manager', 'contracted_amount', 'start_date', 'end_date', 'status', 'notes'],
      XLS_PROJECTS.map((p) => ({
        id: p.id, code: p.code, client_id: p.clientId, business_unit_id: unit(p.unitCode), area_id: area(p.areaCode), name: p.name,
        service: p.service, manager: p.manager, contracted_amount: p.contracted, start_date: p.start, end_date: p.end, status: p.status, notes: p.notes,
      }))),
    ``,
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

export function buildVerifySql(): string {
  const E = EXCEL_TOTALES;
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
      row('Inversión de socios (TABLA_INVERSIONES)', E.inversion, `SELECT coalesce(sum(amount), 0) FROM investments`),
      row('Fondo en caja', E.fondoEnCaja,
        `SELECT (SELECT value::numeric FROM app_settings WHERE key = 'opening_cash') + coalesce(sum(CASE WHEN record_type IN ('COBRO','APORTE_SOCIO','PRESTAMO_RECIBIDO') THEN amount WHEN record_type IN ('PAGO','RETIRO_SOCIO','PAGO_PRESTAMO') THEN -amount ELSE 0 END), 0) FROM movements WHERE status = 'VALIDADO'`),
      row('Monto contratado (TABLA_CLIENTES)', E.contratado, `SELECT coalesce(sum(contracted_amount), 0) FROM projects`),
      row('Monto pagado por clientes', E.pagadoClientes, `SELECT coalesce(sum(amount), 0) FROM project_payments`),
      row('Falta cobrar', E.faltaCobrar, `SELECT (SELECT coalesce(sum(contracted_amount), 0) FROM projects) - (SELECT coalesce(sum(amount), 0) FROM project_payments)`),
      row('Adelantos cobrados en octubre 2025', 3550, sum(`record_type = 'COBRO' AND movement_date BETWEEN '2025-10-01' AND '2025-10-31'`)),
      row('Mano de obra: monto requerido (TABLA_M.O)', E.manoObraRequerido, `SELECT coalesce(sum(agreed_amount), 0) FROM labor_contracts WHERE active`),
      row('Mano de obra: monto pagado', E.manoObraPagado,
        `SELECT coalesce(sum(m.amount), 0) FROM movements m WHERE m.status = 'VALIDADO' AND m.record_type = 'COSTO_RECONOCIDO' AND m.notes LIKE '%Mano de obra CMO-%' AND EXISTS (SELECT 1 FROM movements p WHERE p.record_type = 'PAGO' AND p.status = 'VALIDADO' AND p.notes = 'Contrapartida de ' || m.movement_code)`),
      row('Mano de obra: falta pagar', E.manoObraFalta,
        `SELECT (SELECT coalesce(sum(agreed_amount), 0) FROM labor_contracts WHERE active) - (SELECT coalesce(sum(m.amount), 0) FROM movements m WHERE m.status = 'VALIDADO' AND m.record_type = 'COSTO_RECONOCIDO' AND m.notes LIKE '%Mano de obra CMO-%' AND EXISTS (SELECT 1 FROM movements p WHERE p.record_type = 'PAGO' AND p.status = 'VALIDADO' AND p.notes = 'Contrapartida de ' || m.movement_code))`),
      row('Resultado (ingresos − egresos)', r2(E.ingresos - E.egresos), `SELECT (${sum(`record_type = 'INGRESO_RECONOCIDO'`)}) - (${sum(`record_type = 'COSTO_RECONOCIDO'`)})`),
    ].join('\n  UNION ALL\n'),
    `) x;`,
    ``,
  ].join('\n');
}

const r2 = (n: number) => Math.round(n * 100) / 100;
