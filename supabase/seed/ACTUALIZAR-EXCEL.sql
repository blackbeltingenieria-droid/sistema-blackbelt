-- ==============================================================================
-- ACTUALIZAR LA NUBE CON EL EXCEL NUEVO (sistema BLACKBELT) — un solo paso
-- Generado por: npm run seed:excel:sql
--
-- CÓMO USARLO: cambia 'NO' por 'SI' en la línea marcada, copia TODO, pégalo en Supabase → SQL Editor
-- → New query → Run. Al final sale una tabla: todas las filas deben decir OK.
--
-- Hace: copia de respaldo de todo (tablas respaldo_*), reemplaza movimientos, pagos de clientes, inversiones
-- y mano de obra por los del Excel, y actualiza clientes y proyectos. CONSERVA horas, tareas, metas,
-- usuarios, contraseñas y especialistas. Si algo falla, se detiene y muestra el motivo.
-- ==============================================================================

SELECT set_config('bb.confirmo', 'NO', false);  -- ← CAMBIA 'NO' POR 'SI'


-- ############################################################################
-- PASO 1 · RESPALDO Y LIMPIEZA (solo movimientos, pagos, inversiones y mano de obra)
-- ############################################################################
-- ==============================================================================
-- PASO 1 de 3 · RESPALDO Y LIMPIEZA antes de cargar el Excel «CUADRO DE COSTOS».
-- Generado por: npm run seed:excel:sql
--
-- Qué hace:
--   1. Copia cada tabla de datos a "respaldo_20261102_<tabla>" (para poder recuperar cualquier cosa).
--   2. Vacía: labor_contracts, movements, project_payments, investments.
--   3. Conserva horas, tareas, metas, usuarios y especialistas; clientes y proyectos se actualizan en el paso 2.
-- NO toca: usuarios, roles, catálogos (unidades, áreas, categorías) ni la configuración.
--
-- SEGURIDAD: no hace nada hasta que cambies 'NO' por 'SI' en la línea marcada.
-- Requiere las migraciones 20261016000001, 20261017000001 y 20261018000001 ya aplicadas.
-- ==============================================================================

DO $$
DECLARE
  v_confirmo TEXT := current_setting('bb.confirmo');   -- ← CAMBIA A 'SI' PARA BORRAR (después de leer lo de arriba)
  t TEXT;
BEGIN
  IF v_confirmo <> 'SI' THEN
    RAISE EXCEPTION 'No se borró nada. Cambia v_confirmo a ''SI'' para respaldar y limpiar.';
  END IF;
  IF to_regclass('investments') IS NULL THEN
    RAISE EXCEPTION 'Falta la migración 20261017000001_investments.sql. Aplícala primero.';
  END IF;
  IF to_regclass('labor_contracts') IS NULL THEN
    RAISE EXCEPTION 'Falta la migración 20261018000001_labor_contracts.sql. Aplícala primero.';
  END IF;

  -- transactions (esquema anterior) se respalda porque al borrar proyectos su enlace quedaría vacío.
  FOREACH t IN ARRAY ARRAY['labor_contracts', 'work_hours', 'tasks', 'sprints', 'movements', 'budgets', 'corp_allocation', 'project_payments', 'projects', 'clients', 'investments', 'specialists', 'app_settings', 'users', 'transactions'] LOOP
    IF to_regclass(t) IS NOT NULL AND to_regclass('respaldo_20261102_' || t) IS NULL THEN
      EXECUTE format('CREATE TABLE %I AS SELECT * FROM %I', 'respaldo_20261102_' || t, t);
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', 'respaldo_20261102_' || t);  -- sin políticas: no se ve desde la app
    END IF;
  END LOOP;

  FOREACH t IN ARRAY ARRAY['labor_contracts', 'movements', 'project_payments', 'investments'] LOOP
    IF to_regclass(t) IS NOT NULL THEN EXECUTE format('DELETE FROM %I', t); END IF;
  END LOOP;

  UPDATE specialists SET full_name = 'Alanis Beraún Pardavé' WHERE lower(full_name) = 'alanis pardavé'
     AND NOT EXISTS (SELECT 1 FROM specialists WHERE lower(full_name) = 'alanis beraún pardavé');
  RAISE NOTICE 'Listo: copia en tablas respaldo_20261102_* y datos reemplazables borrados. Sigue con la carga.';
END $$;


-- ############################################################################
-- PASO 2 · CARGA DEL EXCEL
-- ############################################################################
-- ==============================================================================
-- PASO 2 de 3 · CARGA de los datos REALES del Excel «CUADRO DE COSTOS - PRIMER MODELO».
-- Generado por: npm run seed:excel:sql  (misma fuente que los datos locales: src/features/excel-data)
--
-- Carga: 11 clientes, 11 proyectos, 7 pagos de clientes, 8 especialistas,
--        114 movimientos (ingresos + cobros, egresos + pagos, aportes), 2 inversiones
--        y 8 contratos de mano de obra (TABLA_M.O).
-- Totales: ingresos S/ 5340 · egresos S/ 6282.1 · inversión S/ 1500 · caja S/ 557.9.
-- Saldo inicial de caja = 0 (el Excel calcula: fondo en caja = ingresos + inversión − egresos).
-- Fechas: 15/10/2025 de TABLA_INGRESOS era un error de digitación → 15/10/2026 (la empresa empezó en 2026).
-- Solo se corrigen textos mal escritos: "15/010/2026" → 15/10/2026; "09/092026" → 09/09/2026.
--
-- Se detiene si ya hay clientes, proyectos o movimientos (corre antes excel-01-respaldo-y-limpieza.sql).
-- Todo va en una transacción: si algo falla, no queda nada a medias.
-- ==============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM movements) THEN
    RAISE EXCEPTION 'Todavía hay movimientos. Corre primero el paso 1 (respaldo y limpieza).';
  END IF;
  -- Un proyecto creado en la web con el mismo número pero otro código sería pisado: mejor detenerse y avisar.
  IF EXISTS (SELECT 1 FROM projects p JOIN (VALUES (1, 'PRY-2026-001'), (2, 'PRY-2026-002'), (3, 'PRY-2026-003'), (4, 'PRY-2026-004'), (5, 'PRY-2026-005'), (6, 'PRY-2026-006'), (7, 'PRY-2026-007'), (8, 'PRY-2026-008'), (9, 'PRY-2026-009'), (10, 'PRY-2026-010'), (11, 'PRY-2026-011')) AS x(id, code) ON x.id = p.id WHERE coalesce(p.code, '') <> x.code) THEN
    RAISE EXCEPTION 'Hay proyectos creados en la web que chocan con los del Excel (mismo id, otro código). No se cambió nada: avisa para revisarlos.';
  END IF;
  IF to_regclass('investments') IS NULL THEN
    RAISE EXCEPTION 'Falta la migración 20261017000001_investments.sql. Aplícala primero.';
  END IF;
  IF to_regclass('labor_contracts') IS NULL THEN
    RAISE EXCEPTION 'Falta la migración 20261018000001_labor_contracts.sql. Aplícala primero.';
  END IF;
END $$;

INSERT INTO app_settings (key, value) VALUES ('opening_cash', '0')
ON CONFLICT (key) DO UPDATE SET value = '0';

-- Especialistas (TABLA_M.O)
INSERT INTO specialists (full_name, specialty, active)
  SELECT 'Henry Torres Rivera', 'Gerente general', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM specialists WHERE lower(full_name) = 'henry torres rivera');
UPDATE specialists SET specialty = 'Gerente general', active = TRUE WHERE lower(full_name) = 'henry torres rivera';
INSERT INTO specialists (full_name, specialty, active)
  SELECT 'Eddy Renato Vivanco Núñez', 'Asesoramiento en ing. mecánica', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM specialists WHERE lower(full_name) = 'eddy renato vivanco núñez');
UPDATE specialists SET specialty = 'Asesoramiento en ing. mecánica', active = TRUE WHERE lower(full_name) = 'eddy renato vivanco núñez';
INSERT INTO specialists (full_name, specialty, active)
  SELECT 'Jhimmy Cortéz Ruiz', 'Desarrollo de tesis en general', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM specialists WHERE lower(full_name) = 'jhimmy cortéz ruiz');
UPDATE specialists SET specialty = 'Desarrollo de tesis en general', active = TRUE WHERE lower(full_name) = 'jhimmy cortéz ruiz';
INSERT INTO specialists (full_name, specialty, active)
  SELECT 'Manuel Enrique Panduro Rengifo', 'Asesoramiento de tesis de derecho', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM specialists WHERE lower(full_name) = 'manuel enrique panduro rengifo');
UPDATE specialists SET specialty = 'Asesoramiento de tesis de derecho', active = TRUE WHERE lower(full_name) = 'manuel enrique panduro rengifo';
INSERT INTO specialists (full_name, specialty, active)
  SELECT 'Teddy Garcia Murrieta', 'Asesoramiento de tesis en general', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM specialists WHERE lower(full_name) = 'teddy garcia murrieta');
UPDATE specialists SET specialty = 'Asesoramiento de tesis en general', active = TRUE WHERE lower(full_name) = 'teddy garcia murrieta';
INSERT INTO specialists (full_name, specialty, active)
  SELECT 'Alanis Beraún Pardavé', 'Marketeo de redes sociales', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM specialists WHERE lower(full_name) = 'alanis beraún pardavé');
UPDATE specialists SET specialty = 'Marketeo de redes sociales', active = TRUE WHERE lower(full_name) = 'alanis beraún pardavé';
INSERT INTO specialists (full_name, specialty, active)
  SELECT 'Johann Imanol Herrera Ramos', 'Practicante', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM specialists WHERE lower(full_name) = 'johann imanol herrera ramos');
UPDATE specialists SET specialty = 'Practicante', active = TRUE WHERE lower(full_name) = 'johann imanol herrera ramos';
INSERT INTO specialists (full_name, specialty, active)
  SELECT 'Jeferson Rodriguez Mallqui', 'Por definir', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM specialists WHERE lower(full_name) = 'jeferson rodriguez mallqui');
UPDATE specialists SET specialty = 'Por definir', active = TRUE WHERE lower(full_name) = 'jeferson rodriguez mallqui';

-- Clientes (TABLA_CLIENTES) — se actualizan si ya existen
INSERT INTO clients (id, name, client_type, doc_number, phone, notes) VALUES
  (1, 'WILMER WILFREDO SANCHEZ MAMANI', 'Persona', '45410158', '979343755', 'UNIVERSIDAD CONTINENTAL DEL PERÚ'),
  (2, 'ERIKA MERINO ROÑA', 'Persona', NULL, '951903351', 'UNIVERSIDAD DE CIENCIAS Y HUMANIDADES'),
  (3, 'TANIA LUCIA AROS RENGIFO', 'Persona', '41705907', '970474152', 'NEWMAN ESCUELA DE POSGRADO'),
  (4, 'DIAZ CASTRO STHEFANY', 'Persona', '60555252', '953807468', 'UNIVERSIDAD DE HUÁNUCO'),
  (5, 'ANTHENOL BENITO FARROMEQUE MUTTO', 'Persona', '44850179', '993708737', 'UNIVERSIDAD CÉSAR VALLEJO'),
  (6, 'ÁNGELES MARIANA ESTHER', 'Persona', '40639152', NULL, NULL),
  (7, 'JUAN RICARDO', 'Persona', '76557853', NULL, NULL),
  (8, 'DIANA KOICHEOSKI', 'Persona', NULL, NULL, NULL),
  (9, 'JACKELINE IRINA ARIAS MAMNI', 'Persona', '41828734', NULL, NULL),
  (10, 'SHOTHELAY INDIRA ROSMERY CHILLITUPA PALACIOS', 'Persona', '46231076', NULL, NULL),
  (11, 'JULISSA ELIANA MAMANI SUCASAIRE', 'Persona', '75521448', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, client_type = EXCLUDED.client_type, doc_number = EXCLUDED.doc_number, phone = EXCLUDED.phone, notes = EXCLUDED.notes;

-- Proyectos (uno por cliente) — se actualizan si ya existen (sus tareas y horas se conservan)
INSERT INTO projects (id, code, client_id, business_unit_id, area_id, name, service, manager, contracted_amount, start_date, end_date, status, notes) VALUES
  (1, 'PRY-2026-001', 1, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'DESARROLLO DE TESIS COMPLETO – WILMER WILFREDO SANCHEZ MAMANI', 'DESARROLLO DE TESIS COMPLETO', 'HENRY TORRES RIVERA', 3000, '2026-09-09', '2026-10-18', 'activo', 'UNIVERSIDAD CONTINENTAL DEL PERÚ · Etapa: RESULTADOS Y DISCUSIONES · Excel TABLA_CLIENTES fila 10'),
  (2, 'PRY-2026-002', 2, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'DESARROLLO DE TESIS COMPLETO – ERIKA MERINO ROÑA', 'DESARROLLO DE TESIS COMPLETO', 'HENRY TORRES RIVERA', 2000, '2026-10-04', '2026-10-31', 'activo', 'UNIVERSIDAD DE CIENCIAS Y HUMANIDADES · Excel TABLA_CLIENTES fila 11'),
  (3, 'PRY-2026-003', 3, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'DESARROLLO DE TESIS COMPLETO – TANIA LUCIA AROS RENGIFO', 'DESARROLLO DE TESIS COMPLETO', 'HENRY TORRES RIVERA', 2050, '2026-10-04', '2026-10-15', 'finalizado', 'NEWMAN ESCUELA DE POSGRADO · Excel TABLA_CLIENTES fila 12'),
  (4, 'PRY-2026-004', 4, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'CORRECCION Y FORMATO APA – DIAZ CASTRO STHEFANY', 'CORRECCION Y FORMATO APA', 'HENRY TORRES RIVERA', 90, '2026-10-07', '2026-10-07', 'finalizado', 'UNIVERSIDAD DE HUÁNUCO · Excel TABLA_CLIENTES fila 13'),
  (5, 'PRY-2026-005', 5, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'PROYECTO DE TESIS – ANTHENOL BENITO FARROMEQUE MUTTO', 'PROYECTO DE TESIS', 'HENRY TORRES RIVERA', 1200, '2026-10-09', '2026-12-22', 'activo', 'UNIVERSIDAD CÉSAR VALLEJO · Etapa: ASPECTOS ADMINISTRATIVOS · Excel TABLA_CLIENTES fila 14'),
  (6, 'PRY-2026-006', 6, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'LEVANTAMIENTO DE OBSERVACIONES – ÁNGELES MARIANA ESTHER', 'LEVANTAMIENTO DE OBSERVACIONES', 'HENRY TORRES RIVERA', 800, '2026-10-24', NULL, 'activo', 'Excel TABLA_CLIENTES fila 15'),
  (7, 'PRY-2026-007', 7, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'MATRIZ DE CONSISTENCIA – JUAN RICARDO', 'MATRIZ DE CONSISTENCIA', 'HENRY TORRES RIVERA', 200, NULL, NULL, 'activo', 'Excel TABLA_CLIENTES fila 16'),
  (8, 'PRY-2026-008', 8, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'TESIS COMPLETA – DIANA KOICHEOSKI', 'TESIS COMPLETA', 'HENRY TORRES RIVERA', 3000, NULL, NULL, 'activo', 'Excel TABLA_CLIENTES fila 17'),
  (9, 'PRY-2026-009', 9, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'DISMINUCION DE IA 44% y LEVANTAR OBSERVACIONES – JACKELINE IRINA ARIAS MAMNI', 'DISMINUCION DE IA 44% y LEVANTAR OBSERVACIONES', 'HENRY TORRES RIVERA', 800, NULL, NULL, 'activo', 'Excel TABLA_CLIENTES fila 18'),
  (10, 'PRY-2026-010', 10, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'REDUCCION DE SIMILITUD 40% – SHOTHELAY INDIRA ROSMERY CHILLITUPA PALACIOS', 'REDUCCION DE SIMILITUD 40%', 'HENRY TORRES RIVERA', 90, NULL, NULL, 'activo', 'Excel TABLA_CLIENTES fila 19'),
  (11, 'PRY-2026-011', 11, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'ARTICULO DE INVESTIGACION – JULISSA ELIANA MAMANI SUCASAIRE', 'ARTICULO DE INVESTIGACION', 'HENRY TORRES RIVERA', 300, NULL, NULL, 'activo', 'Excel TABLA_CLIENTES fila 20')
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, client_id = EXCLUDED.client_id, business_unit_id = EXCLUDED.business_unit_id, area_id = EXCLUDED.area_id, name = EXCLUDED.name, service = EXCLUDED.service, manager = EXCLUDED.manager, contracted_amount = EXCLUDED.contracted_amount, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, status = EXCLUDED.status, notes = EXCLUDED.notes;

-- Pagos de clientes (TABLA_INGRESOS)
INSERT INTO project_payments (id, project_id, amount, payment_date, payment_method) VALUES
  (1, 1, 800, '2026-09-24', 'YAPE'),
  (2, 4, 90, '2026-10-07', 'YAPE'),
  (3, 5, 400, '2026-10-10', 'YAPE'),
  (4, 2, 400, '2026-10-10', 'YAPE'),
  (5, 1, 1500, '2026-10-15', 'YAPE'),
  (6, 3, 2050, '2026-10-15', 'YAPE'),
  (7, 6, 100, '2026-10-24', 'YAPE');

-- Movimientos (libro único del Modelo C)
INSERT INTO movements (id, movement_code, movement_date, record_type, amount, business_unit_id, area_id, responsible, cost_category_id, expense_class, project_id, counterparty, detail, payment_method, status, notes) VALUES
  (1, 'MOV-2026-0001', '2026-08-14', 'COSTO_RECONOCIDO', 10, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'GOOGLE ONE', 'Google one', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 18: Herramienta AI para la velocidad de informacion'),
  (2, 'MOV-2026-0002', '2026-08-14', 'PAGO', 10, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'GOOGLE ONE', 'Google one', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0001'),
  (3, 'MOV-2026-0003', '2026-08-15', 'COSTO_RECONOCIDO', 20, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'CHAT GPT GO', 'Chat gpt go', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 17: Herramienta que ayuda a mejorar la efectividad de decisiones'),
  (4, 'MOV-2026-0004', '2026-08-15', 'PAGO', 20, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'CHAT GPT GO', 'Chat gpt go', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0003'),
  (5, 'MOV-2026-0005', '2026-08-16', 'APORTE_SOCIO', 1000, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), NULL, (SELECT id FROM cost_categories WHERE code = 'SOC'), 'NO_APLICA', NULL, 'HANS CARLOS TORRES MURRIETA', 'Inversion como socio', 'YAPE', 'VALIDADO', 'Inversión INV-2026-001 · Excel TABLA_INVERSIONES fila 7'),
  (6, 'MOV-2026-0006', '2026-08-16', 'COSTO_RECONOCIDO', 36, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'GOOGLE MEET', 'Google meet', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 14: Herramienta que sirve para crear reuniones'),
  (7, 'MOV-2026-0007', '2026-08-16', 'PAGO', 36, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'GOOGLE MEET', 'Google meet', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0006'),
  (8, 'MOV-2026-0008', '2026-08-16', 'COSTO_RECONOCIDO', 80, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'CLAUDE AI', 'Claude ai', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 15: Herramienta que ayuda a mejorar la efectividad de decisiones'),
  (9, 'MOV-2026-0009', '2026-08-16', 'PAGO', 80, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'CLAUDE AI', 'Claude ai', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0008'),
  (10, 'MOV-2026-0010', '2026-08-18', 'COSTO_RECONOCIDO', 40, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'MKT'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'CANVA', 'Canva', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 13: Herramienta que sirve para el diseño y publicidad'),
  (11, 'MOV-2026-0011', '2026-08-18', 'PAGO', 40, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'CANVA', 'Canva', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0010'),
  (12, 'MOV-2026-0012', '2026-08-18', 'COSTO_RECONOCIDO', 39.9, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SERV'), 'COMPARTIDO', NULL, 'BITEL', 'Bitel', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 16: servicio telefonico para los mensajes y llamadas de la empresa'),
  (13, 'MOV-2026-0013', '2026-08-18', 'PAGO', 39.9, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'BITEL', 'Bitel', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0012'),
  (14, 'MOV-2026-0014', '2026-08-21', 'COSTO_RECONOCIDO', 200, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'MKT'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'PAGINA WEB', 'Pagina web', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 19: Herramienta que ayudará a dar una base en la web'),
  (15, 'MOV-2026-0015', '2026-08-21', 'PAGO', 200, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'PAGINA WEB', 'Pagina web', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0014'),
  (16, 'MOV-2026-0016', '2026-09-04', 'COSTO_RECONOCIDO', 100, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'DIR'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'ADM'), 'COMPARTIDO', NULL, 'OBTENCION DE RUC', 'Obtencion de ruc', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 9: Se hizo un pago para poner 100 soles como socios como registro de Blackbelt'),
  (17, 'MOV-2026-0017', '2026-09-04', 'PAGO', 100, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'OBTENCION DE RUC', 'Obtencion de ruc', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0016'),
  (18, 'MOV-2026-0018', '2026-09-04', 'COSTO_RECONOCIDO', 150, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'DIR'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'ADM'), 'COMPARTIDO', NULL, 'OBTENCION DE RUC', 'Obtencion de ruc', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 10: Pago por el servicio a la notaria'),
  (19, 'MOV-2026-0019', '2026-09-04', 'PAGO', 150, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'OBTENCION DE RUC', 'Obtencion de ruc', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0018'),
  (20, 'MOV-2026-0020', '2026-09-04', 'COSTO_RECONOCIDO', 57.1, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'DIR'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'MOV'), 'COMPARTIDO', NULL, 'OBTENCION DE RUC', 'Obtencion de ruc', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 11: Pago por el transporte a la transporte'),
  (21, 'MOV-2026-0021', '2026-09-04', 'PAGO', 57.1, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'OBTENCION DE RUC', 'Obtencion de ruc', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0020'),
  (22, 'MOV-2026-0022', '2026-09-04', 'COSTO_RECONOCIDO', 26.6, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'DIR'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'ADM'), 'COMPARTIDO', NULL, 'OBTENCION DE RUC', 'Obtencion de ruc', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 12: Pago por tramite en la sunarp'),
  (23, 'MOV-2026-0023', '2026-09-04', 'PAGO', 26.6, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'OBTENCION DE RUC', 'Obtencion de ruc', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0022'),
  (24, 'MOV-2026-0024', '2026-09-15', 'COSTO_RECONOCIDO', 20, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'DIR'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'CHAT GPT GO', 'Chat gpt go', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 24: Herramienta que ayuda a mejorar la efectividad de decisiones'),
  (25, 'MOV-2026-0025', '2026-09-15', 'PAGO', 20, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'CHAT GPT GO', 'Chat gpt go', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0024'),
  (26, 'MOV-2026-0026', '2026-09-15', 'COSTO_RECONOCIDO', 200, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 1, 'EDDY RENATO VIVANCO NÚÑEZ', 'Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato)', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 25: Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato) · Mano de obra CMO-2026-001'),
  (27, 'MOV-2026-0027', '2026-09-15', 'PAGO', 200, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 1, 'EDDY RENATO VIVANCO NÚÑEZ', 'Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato)', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0026'),
  (28, 'MOV-2026-0028', '2026-09-16', 'COSTO_RECONOCIDO', 36, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'GOOGLE MEET', 'Google meet', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 21: Herramienta que sirve para crear reuniones'),
  (29, 'MOV-2026-0029', '2026-09-16', 'PAGO', 36, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'GOOGLE MEET', 'Google meet', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0028'),
  (30, 'MOV-2026-0030', '2026-09-18', 'APORTE_SOCIO', 500, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), NULL, (SELECT id FROM cost_categories WHERE code = 'SOC'), 'NO_APLICA', NULL, 'HANS CARLOS TORRES MURRIETA', 'Inversion como socio', 'YAPE', 'VALIDADO', 'Inversión INV-2026-002 · Excel TABLA_INVERSIONES fila 8'),
  (31, 'MOV-2026-0031', '2026-09-18', 'COSTO_RECONOCIDO', 40, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'MKT'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'CANVA', 'Canva', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 20: Herramienta que sirve para el diseño y publicidad'),
  (32, 'MOV-2026-0032', '2026-09-18', 'PAGO', 40, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'CANVA', 'Canva', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0031'),
  (33, 'MOV-2026-0033', '2026-09-18', 'COSTO_RECONOCIDO', 39.9, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'DIR'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SERV'), 'COMPARTIDO', NULL, 'BITEL', 'Bitel', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 23: servicio telefonico para los mensajes y llamadas de la empresa'),
  (34, 'MOV-2026-0034', '2026-09-18', 'PAGO', 39.9, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'BITEL', 'Bitel', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0033'),
  (35, 'MOV-2026-0035', '2026-09-20', 'COSTO_RECONOCIDO', 33.9, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'ATRIBUIBLE', NULL, 'QUILLBOT', 'Quillbot', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 22: Herramienta util para el desarrollo de investigaciones'),
  (36, 'MOV-2026-0036', '2026-09-20', 'PAGO', 33.9, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'QUILLBOT', 'Quillbot', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0035'),
  (37, 'MOV-2026-0037', '2026-09-21', 'COSTO_RECONOCIDO', 250.06, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'MKT'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'PUB'), 'ATRIBUIBLE', NULL, 'PUBLICIDAD EN FB', 'Publicidad en fb', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 26: Marketeo que ayudara a conseguir mas clientes'),
  (38, 'MOV-2026-0038', '2026-09-21', 'PAGO', 250.06, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'PUBLICIDAD EN FB', 'Publicidad en fb', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0037'),
  (39, 'MOV-2026-0039', '2026-09-24', 'INGRESO_RECONOCIDO', 800, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), NULL, (SELECT id FROM cost_categories WHERE code = 'OTR'), 'NO_APLICA', 1, 'WILMER WILFREDO SANCHEZ MAMANI', 'Pago de Tesis primera entrega', 'YAPE', 'VALIDADO', 'Excel TABLA_INGRESOS fila 8: DESARROLLO DE TESIS – DESARROLLO DE TESIS COMPLETA'),
  (40, 'MOV-2026-0040', '2026-09-24', 'COBRO', 800, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), NULL, (SELECT id FROM cost_categories WHERE code = 'CXC'), 'NO_APLICA', 1, 'WILMER WILFREDO SANCHEZ MAMANI', 'Pago de Tesis primera entrega', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0039'),
  (41, 'MOV-2026-0041', '2026-10-02', 'COSTO_RECONOCIDO', 80, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 1, 'HENRY TORRES RIVERA', 'Servicio de desarrollo de tesis a Wilmer(henry)', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 27: Servicio de desarrollo de tesis a Wilmer(henry) · Mano de obra CMO-2026-005'),
  (42, 'MOV-2026-0042', '2026-10-02', 'PAGO', 80, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 1, 'HENRY TORRES RIVERA', 'Servicio de desarrollo de tesis a Wilmer(henry)', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0041'),
  (43, 'MOV-2026-0043', '2026-10-02', 'COSTO_RECONOCIDO', 86, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'CHAT GPT PLUS', 'Chat gpt plus', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 28: Herramienta que ayuda a mejorar la efectividad de decisiones'),
  (44, 'MOV-2026-0044', '2026-10-02', 'PAGO', 86, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'CHAT GPT PLUS', 'Chat gpt plus', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0043'),
  (45, 'MOV-2026-0045', '2026-10-04', 'COSTO_RECONOCIDO', 40, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'ATRIBUIBLE', NULL, 'MANUEL ENRIQUE PANDURO RENGIFO', 'Asesoramiento de Investigacion', 'BCP', 'VALIDADO', 'Excel TABLA_EGRESOS fila 29: Asesoramiento de Investigacion · Mano de obra CMO-2026-003'),
  (46, 'MOV-2026-0046', '2026-10-04', 'PAGO', 40, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'MANUEL ENRIQUE PANDURO RENGIFO', 'Asesoramiento de Investigacion', 'BCP', 'VALIDADO', 'Contrapartida de MOV-2026-0045'),
  (47, 'MOV-2026-0047', '2026-10-04', 'COSTO_RECONOCIDO', 100, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'MKT'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'COMPARTIDO', NULL, 'ALANIS BERAÚN PARDAVÉ', 'Marketeo que ayudara a conseguir mas clientes (Alanis)', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 30: Marketeo que ayudara a conseguir mas clientes (Alanis) · Mano de obra CMO-2026-006'),
  (48, 'MOV-2026-0048', '2026-10-04', 'PAGO', 100, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'ALANIS BERAÚN PARDAVÉ', 'Marketeo que ayudara a conseguir mas clientes (Alanis)', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0047'),
  (49, 'MOV-2026-0049', '2026-10-06', 'COSTO_RECONOCIDO', 10, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 1, 'TEDDY GARCIA MURRIETA', 'Servicio de desarrollo de tesis a teddy', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 31: Servicio de desarrollo de tesis a teddy · Mano de obra CMO-2026-004'),
  (50, 'MOV-2026-0050', '2026-10-06', 'PAGO', 10, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 1, 'TEDDY GARCIA MURRIETA', 'Servicio de desarrollo de tesis a teddy', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0049'),
  (51, 'MOV-2026-0051', '2026-10-06', 'COSTO_RECONOCIDO', 175, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 3, 'JHIMMY CORTÉZ RUIZ', 'Servicio de desarrollo de tesis a Jhimmy Cortez', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 32: Servicio de desarrollo de tesis a Jhimmy Cortez · Mano de obra CMO-2026-002'),
  (52, 'MOV-2026-0052', '2026-10-06', 'PAGO', 175, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 3, 'JHIMMY CORTÉZ RUIZ', 'Servicio de desarrollo de tesis a Jhimmy Cortez', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0051'),
  (53, 'MOV-2026-0053', '2026-10-07', 'INGRESO_RECONOCIDO', 90, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), NULL, (SELECT id FROM cost_categories WHERE code = 'OTR'), 'NO_APLICA', 4, 'DIAZ CASTRO STHEFANY', 'Pago por culminacion', 'YAPE', 'VALIDADO', 'Excel TABLA_INGRESOS fila 9: TESINA – ORDENAR A FORMATO APA Y LEVANTAR OBSERVACIONES'),
  (54, 'MOV-2026-0054', '2026-10-07', 'COBRO', 90, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), NULL, (SELECT id FROM cost_categories WHERE code = 'CXC'), 'NO_APLICA', 4, 'DIAZ CASTRO STHEFANY', 'Pago por culminacion', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0053'),
  (55, 'MOV-2026-0055', '2026-10-08', 'COSTO_RECONOCIDO', 76.34, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'MKT'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'PUB'), 'ATRIBUIBLE', NULL, 'PUBLICIDAD EN FB', 'Publicidad en fb', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 33: Marketeo que ayudara a conseguir mas clientes'),
  (56, 'MOV-2026-0056', '2026-10-08', 'PAGO', 76.34, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'PUBLICIDAD EN FB', 'Publicidad en fb', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0055'),
  (57, 'MOV-2026-0057', '2026-10-10', 'INGRESO_RECONOCIDO', 400, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), NULL, (SELECT id FROM cost_categories WHERE code = 'OTR'), 'NO_APLICA', 5, 'ANTHENOL BENITO FARROMEQUE MUTTO', 'Pago por la elaboracion de la Introduccion', 'YAPE', 'VALIDADO', 'Excel TABLA_INGRESOS fila 10: PROYECTO DE INVESTIGACION – REALIZAR LA PARTE DE INTRODUCCION'),
  (58, 'MOV-2026-0058', '2026-10-10', 'COBRO', 400, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), NULL, (SELECT id FROM cost_categories WHERE code = 'CXC'), 'NO_APLICA', 5, 'ANTHENOL BENITO FARROMEQUE MUTTO', 'Pago por la elaboracion de la Introduccion', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0057'),
  (59, 'MOV-2026-0059', '2026-10-10', 'INGRESO_RECONOCIDO', 400, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), NULL, (SELECT id FROM cost_categories WHERE code = 'OTR'), 'NO_APLICA', 2, 'ERIKA MERINO ROÑA', 'Pago por la elaboracion de la Introduccion', 'YAPE', 'VALIDADO', 'Excel TABLA_INGRESOS fila 11: PROYECTO DE INVESTIGACION – REALIZAR LA PARTE DE INTRODUCCION'),
  (60, 'MOV-2026-0060', '2026-10-10', 'COBRO', 400, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), NULL, (SELECT id FROM cost_categories WHERE code = 'CXC'), 'NO_APLICA', 2, 'ERIKA MERINO ROÑA', 'Pago por la elaboracion de la Introduccion', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0059'),
  (61, 'MOV-2026-0061', '2026-10-12', 'COSTO_RECONOCIDO', 125, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 3, 'JHIMMY CORTÉZ RUIZ', 'Servicio de desarrollo de tesis a Jhimmy Cortez', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 34: Servicio de desarrollo de tesis a Jhimmy Cortez · Mano de obra CMO-2026-002'),
  (62, 'MOV-2026-0062', '2026-10-12', 'PAGO', 125, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 3, 'JHIMMY CORTÉZ RUIZ', 'Servicio de desarrollo de tesis a Jhimmy Cortez', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0061'),
  (63, 'MOV-2026-0063', '2026-10-12', 'COSTO_RECONOCIDO', 15, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'MAT'), 'COMPARTIDO', NULL, 'EXTENSION DE CORRIENTE', 'Extension de corriente', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 35: Se requiere una extension para una mejor conectividad de las PC´s y laptops'),
  (64, 'MOV-2026-0064', '2026-10-12', 'PAGO', 15, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'EXTENSION DE CORRIENTE', 'Extension de corriente', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0063'),
  (65, 'MOV-2026-0065', '2026-10-12', 'COSTO_RECONOCIDO', 8, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MOV'), 'COMPARTIDO', NULL, 'TRANSPORTE', 'Transporte', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 36: Se pago el pasaje para la obtencion del RUC'),
  (66, 'MOV-2026-0066', '2026-10-12', 'PAGO', 8, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'TRANSPORTE', 'Transporte', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0065'),
  (67, 'MOV-2026-0067', '2026-10-13', 'COSTO_RECONOCIDO', 77.9, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'OTR'), 'COMPARTIDO', NULL, 'CENA', 'Cena', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 37: Se pago una cena por la celebracion de la obtención del RUC'),
  (68, 'MOV-2026-0068', '2026-10-13', 'PAGO', 77.9, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'CENA', 'Cena', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0067'),
  (69, 'MOV-2026-0069', '2026-10-13', 'COSTO_RECONOCIDO', 250, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'MKT'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'COMPARTIDO', NULL, 'ALANIS BERAÚN PARDAVÉ', 'Marketeo que ayudara a conseguir mas clientes  (Alanis)', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 38: Marketeo que ayudara a conseguir mas clientes  (Alanis) · Mano de obra CMO-2026-006'),
  (70, 'MOV-2026-0070', '2026-10-13', 'PAGO', 250, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'ALANIS BERAÚN PARDAVÉ', 'Marketeo que ayudara a conseguir mas clientes  (Alanis)', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0069'),
  (71, 'MOV-2026-0071', '2026-10-14', 'COSTO_RECONOCIDO', 39.9, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'DIR'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SERV'), 'COMPARTIDO', NULL, 'BITEL', 'Bitel', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 39: Servicio telefonico para los mensajes y llamadas de la empresa'),
  (72, 'MOV-2026-0072', '2026-10-14', 'PAGO', 39.9, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'BITEL', 'Bitel', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0071'),
  (73, 'MOV-2026-0073', '2026-10-15', 'INGRESO_RECONOCIDO', 1500, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), NULL, (SELECT id FROM cost_categories WHERE code = 'OTR'), 'NO_APLICA', 1, 'WILMER WILFREDO SANCHEZ MAMANI', 'Pago de Tesis primera entrega', 'YAPE', 'VALIDADO', 'Excel TABLA_INGRESOS fila 12: DESARROLLO DE TESIS – DESARROLLO DE TESIS COMPLETA'),
  (74, 'MOV-2026-0074', '2026-10-15', 'COBRO', 1500, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), NULL, (SELECT id FROM cost_categories WHERE code = 'CXC'), 'NO_APLICA', 1, 'WILMER WILFREDO SANCHEZ MAMANI', 'Pago de Tesis primera entrega', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0073'),
  (75, 'MOV-2026-0075', '2026-10-15', 'INGRESO_RECONOCIDO', 2050, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), NULL, (SELECT id FROM cost_categories WHERE code = 'OTR'), 'NO_APLICA', 3, 'TANIA LUCIA AROS RENGIFO', 'Pago de Tesis primera entrega', 'YAPE', 'VALIDADO', 'Excel TABLA_INGRESOS fila 13: DESARROLLO DE TESIS – DESARROLLO DE TESIS COMPLETA'),
  (76, 'MOV-2026-0076', '2026-10-15', 'COBRO', 2050, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), NULL, (SELECT id FROM cost_categories WHERE code = 'CXC'), 'NO_APLICA', 3, 'TANIA LUCIA AROS RENGIFO', 'Pago de Tesis primera entrega', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0075'),
  (77, 'MOV-2026-0077', '2026-10-15', 'COSTO_RECONOCIDO', 900, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 3, 'JHIMMY CORTÉZ RUIZ', 'Servicio de desarrollo de tesis a Jhimmy Cortez', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 40: Servicio de desarrollo de tesis a Jhimmy Cortez · Mano de obra CMO-2026-002'),
  (78, 'MOV-2026-0078', '2026-10-15', 'PAGO', 900, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 3, 'JHIMMY CORTÉZ RUIZ', 'Servicio de desarrollo de tesis a Jhimmy Cortez', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0077'),
  (79, 'MOV-2026-0079', '2026-10-15', 'COSTO_RECONOCIDO', 1300, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 1, 'EDDY RENATO VIVANCO NÚÑEZ', 'Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato)', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 41: Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato) · Mano de obra CMO-2026-001'),
  (80, 'MOV-2026-0080', '2026-10-15', 'PAGO', 1300, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 1, 'EDDY RENATO VIVANCO NÚÑEZ', 'Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato)', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0079'),
  (81, 'MOV-2026-0081', '2026-10-15', 'COSTO_RECONOCIDO', 12.13, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 1, 'EDDY RENATO VIVANCO NÚÑEZ', 'Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato)', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 42: Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato)'),
  (82, 'MOV-2026-0082', '2026-10-15', 'PAGO', 12.13, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 1, 'EDDY RENATO VIVANCO NÚÑEZ', 'Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato)', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0081'),
  (83, 'MOV-2026-0083', '2026-10-15', 'COSTO_RECONOCIDO', 100, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 1, 'HENRY TORRES RIVERA', 'Servicio de desarrollo de tesis a Wilmer(henry)', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 43: Servicio de desarrollo de tesis a Wilmer(henry) · Mano de obra CMO-2026-005'),
  (84, 'MOV-2026-0084', '2026-10-15', 'PAGO', 100, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 1, 'HENRY TORRES RIVERA', 'Servicio de desarrollo de tesis a Wilmer(henry)', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0083'),
  (85, 'MOV-2026-0085', '2026-10-15', 'COSTO_RECONOCIDO', 45, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'IA VIDEO', 'Ia video', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 44: Herramienta para hacer videos con inteligencia artificial'),
  (86, 'MOV-2026-0086', '2026-10-15', 'PAGO', 45, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'IA VIDEO', 'Ia video', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0085'),
  (87, 'MOV-2026-0087', '2026-10-16', 'COSTO_RECONOCIDO', 341.11, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'MKT'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MAQ'), 'COMPARTIDO', NULL, 'MICRÓFONO HOLLYLAND LARK A1', 'Micrófono hollyland lark a1', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 45: Marketeo que ayudara a conseguir mas clientes.'),
  (88, 'MOV-2026-0088', '2026-10-16', 'PAGO', 341.11, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'MICRÓFONO HOLLYLAND LARK A1', 'Micrófono hollyland lark a1', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0087'),
  (89, 'MOV-2026-0089', '2026-10-16', 'COSTO_RECONOCIDO', 100, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 1, 'TEDDY GARCIA MURRIETA', 'Especialista de ing. mecanica para la Tesis (Teddy García)', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 46: Especialista de ing. mecanica para la Tesis (Teddy García) · Mano de obra CMO-2026-004'),
  (90, 'MOV-2026-0090', '2026-10-16', 'PAGO', 100, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 1, 'TEDDY GARCIA MURRIETA', 'Especialista de ing. mecanica para la Tesis (Teddy García)', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0089'),
  (91, 'MOV-2026-0091', '2026-10-18', 'COSTO_RECONOCIDO', 112, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'OTR'), 'COMPARTIDO', NULL, 'ALMUERZO', 'Almuerzo', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 47: Almuerzo con aliados estratégicos'),
  (92, 'MOV-2026-0092', '2026-10-18', 'PAGO', 112, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'ALMUERZO', 'Almuerzo', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0091'),
  (93, 'MOV-2026-0093', '2026-10-21', 'COSTO_RECONOCIDO', 41.38, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'GOOGLE MEET', 'Google meet', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 48: Herramienta que sirve para crear reuniones'),
  (94, 'MOV-2026-0094', '2026-10-21', 'PAGO', 41.38, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'GOOGLE MEET', 'Google meet', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0093'),
  (95, 'MOV-2026-0095', '2026-10-22', 'COSTO_RECONOCIDO', 48.32, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'BAN'), 'COMPARTIDO', NULL, 'BBVA', 'Bbva', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 49: Mantenimiento que cobra el banco'),
  (96, 'MOV-2026-0096', '2026-10-22', 'PAGO', 48.32, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'BBVA', 'Bbva', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0095'),
  (97, 'MOV-2026-0097', '2026-10-22', 'COSTO_RECONOCIDO', 171, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'ATRIBUIBLE', NULL, 'QUILLBOT', 'Quillbot', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 50: Herramienta util para el desarrollo de investigaciones'),
  (98, 'MOV-2026-0098', '2026-10-22', 'PAGO', 171, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'QUILLBOT', 'Quillbot', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0097'),
  (99, 'MOV-2026-0099', '2026-10-22', 'COSTO_RECONOCIDO', 71.32, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'MKT'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'PUB'), 'ATRIBUIBLE', NULL, 'PUBLICIDAD EN FB', 'Publicidad en fb', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 51: Marketeo que ayudara a conseguir mas clientes'),
  (100, 'MOV-2026-0100', '2026-10-22', 'PAGO', 71.32, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'PUBLICIDAD EN FB', 'Publicidad en fb', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0099'),
  (101, 'MOV-2026-0101', '2026-10-24', 'INGRESO_RECONOCIDO', 100, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), NULL, (SELECT id FROM cost_categories WHERE code = 'OTR'), 'NO_APLICA', 6, 'ÁNGELES MARIANA ESTHER', 'Pago por adelanto', 'YAPE', 'VALIDADO', 'Excel TABLA_INGRESOS fila 14: PROYECTO DE INVESTIGACION – LEVANTAR OBSERVACIONES Y PERFECCIONAR EL PROYECTO COMPLETO'),
  (102, 'MOV-2026-0102', '2026-10-24', 'COBRO', 100, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), NULL, (SELECT id FROM cost_categories WHERE code = 'CXC'), 'NO_APLICA', 6, 'ÁNGELES MARIANA ESTHER', 'Pago por adelanto', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0101'),
  (103, 'MOV-2026-0103', '2026-10-24', 'COSTO_RECONOCIDO', 49, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'ATRIBUIBLE', NULL, 'TURNITING', 'Turniting', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 52: Herramienta util para el desarrollo de investigaciones'),
  (104, 'MOV-2026-0104', '2026-10-24', 'PAGO', 49, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'TURNITING', 'Turniting', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0103'),
  (105, 'MOV-2026-0105', '2026-10-24', 'COSTO_RECONOCIDO', 70.58, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'MKT'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'PUB'), 'ATRIBUIBLE', NULL, 'PUBLICIDAD EN FB', 'Publicidad en fb', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 53: Marketeo que ayudara a conseguir mas clientes'),
  (106, 'MOV-2026-0106', '2026-10-24', 'PAGO', 70.58, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'PUBLICIDAD EN FB', 'Publicidad en fb', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0105'),
  (107, 'MOV-2026-0107', '2026-10-28', 'COSTO_RECONOCIDO', 136.96, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'MKT'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'PUB'), 'ATRIBUIBLE', NULL, 'PUBLICIDAD EN FB', 'Publicidad en fb', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 54: Marketeo que ayudara a conseguir mas clientes'),
  (108, 'MOV-2026-0108', '2026-10-28', 'PAGO', 136.96, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'PUBLICIDAD EN FB', 'Publicidad en fb', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0107'),
  (109, 'MOV-2026-0109', '2026-11-01', 'COSTO_RECONOCIDO', 50, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'MKT'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'COMPARTIDO', NULL, 'ALANIS BERAÚN PARDAVÉ', 'Marketeo por los videos  (Alanis)', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 55: Marketeo por los videos  (Alanis) · Mano de obra CMO-2026-006'),
  (110, 'MOV-2026-0110', '2026-11-01', 'PAGO', 50, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'ALANIS BERAÚN PARDAVÉ', 'Marketeo por los videos  (Alanis)', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0109'),
  (111, 'MOV-2026-0111', '2026-11-01', 'COSTO_RECONOCIDO', 10, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'TERC'), 'ATRIBUIBLE', NULL, 'TURNITING', 'Turniting', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 56: Informe de  %IA Y %Similitud'),
  (112, 'MOV-2026-0112', '2026-11-01', 'PAGO', 10, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'TURNITING', 'Turniting', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0111'),
  (113, 'MOV-2026-0113', '2026-11-01', 'COSTO_RECONOCIDO', 260.7, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 1, 'HENRY TORRES RIVERA', 'Servicio de desarrollo de tesis', 'SIP', 'VALIDADO', 'Excel TABLA_EGRESOS fila 57: Servicio de desarrollo de tesis · Mano de obra CMO-2026-005'),
  (114, 'MOV-2026-0114', '2026-11-01', 'PAGO', 260.7, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 1, 'HENRY TORRES RIVERA', 'Servicio de desarrollo de tesis', 'SIP', 'VALIDADO', 'Contrapartida de MOV-2026-0113');

-- Inversiones (TABLA_INVERSIONES)
INSERT INTO investments (id, code, kind, investor_name, investor_doc, amount, investment_date, payment_method, description, interest_rate, term_months) VALUES
  (1, 'INV-2026-001', 'patrimonio', 'HANS CARLOS TORRES MURRIETA', '10244394', 1000, '2026-08-16', 'YAPE', 'Inversion como socio', 0, NULL),
  (2, 'INV-2026-002', 'patrimonio', 'HANS CARLOS TORRES MURRIETA', '10244394', 500, '2026-09-18', 'YAPE', 'Inversion como socio', 0, NULL);

-- Mano de obra (TABLA_M.O). Lo pagado se calcula con los egresos enlazados ('Mano de obra CMO-…').
INSERT INTO labor_contracts (id, code, specialist_id, worker_name, worker_doc, business_unit_id, area_id, project_id, client_label, service, description, contract_type, start_date, end_date, agreed_amount, active, notes) VALUES
  (1, 'CMO-2026-001', (SELECT id FROM specialists WHERE lower(full_name) = 'eddy renato vivanco núñez' LIMIT 1), 'EDDY RENATO VIVANCO NÚÑEZ', '74994929', (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 1, 'WILMER SANCHEZ MAMANI', 'ASESORAMIENTO EN ING. MECÁNICA', 'DESARROLLARÁ EL MODELAMIENTO DE LA PLATAFORMA DEL MOLINO DE BOLAS', 'POR_PROYECTO', '2026-09-18', '2026-10-18', 1500, TRUE, 'Excel TABLA_M.O fila 11'),
  (2, 'CMO-2026-002', (SELECT id FROM specialists WHERE lower(full_name) = 'jhimmy cortéz ruiz' LIMIT 1), 'JHIMMY CORTÉZ RUIZ', '40098380', (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 3, 'TANIA AROS RENGIFO', 'DESARROLLO DE TESIS EN GENERAL', 'DESARROLLARA PARTE DE LA INVESTIGACION DE TANIA AROS', 'POR_PROYECTO', '2026-10-03', '2026-10-13', 1200, TRUE, 'Excel TABLA_M.O fila 12'),
  (3, 'CMO-2026-003', (SELECT id FROM specialists WHERE lower(full_name) = 'manuel enrique panduro rengifo' LIMIT 1), 'MANUEL ENRIQUE PANDURO RENGIFO', '40443237', (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), NULL, 'MARISOL FLORES', 'ASESORAMIENTO DE TESIS DE DERECHO', 'ASESORAR LA INVESTIGACION DE MARISOL FLORES', 'POR_PROYECTO', '2026-10-03', '2026-10-04', 40, TRUE, 'Excel TABLA_M.O fila 13'),
  (4, 'CMO-2026-004', (SELECT id FROM specialists WHERE lower(full_name) = 'teddy garcia murrieta' LIMIT 1), 'TEDDY GARCIA MURRIETA', '10250610', (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 1, 'WILMER SANCHEZ MAMANI', 'ASESORAMIENTO DE TESIS EN GENERAL', 'ASESORAR LA INVESTIGACION DE WILMER', 'POR_PROYECTO', '2026-09-18', '2026-10-18', 500, TRUE, 'Excel TABLA_M.O fila 14'),
  (5, 'CMO-2026-005', (SELECT id FROM specialists WHERE lower(full_name) = 'henry torres rivera' LIMIT 1), 'HENRY TORRES RIVERA', '73972788', (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 1, 'WILMER SANCHEZ MAMANI', 'ASESORAMIENTO DE TESIS EN GENERAL', 'ASESORAR LA INVESTIGACION DE WILMER', 'POR_PROYECTO', '2026-09-18', '2026-10-18', 500, TRUE, 'Excel TABLA_M.O fila 15'),
  (6, 'CMO-2026-006', (SELECT id FROM specialists WHERE lower(full_name) = 'alanis beraún pardavé' LIMIT 1), 'ALANIS BERAÚN PARDAVÉ', '61467305', (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'MKT'), NULL, 'BLACKBELT GROUP', 'MARKETEO DE REDES SOCIALES', 'ACTIVAR Y MEJORAR LAS REDES SOCIALES, PUBLICITAR Y REALIZAR DISEÑOS', 'MENSUAL', '2026-10-04', '2026-10-05', 700, TRUE, 'Excel TABLA_M.O fila 16'),
  (7, 'CMO-2026-007', (SELECT id FROM specialists WHERE lower(full_name) = 'johann imanol herrera ramos' LIMIT 1), 'JOHANN IMANOL HERRERA RAMOS', '73515597', (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), NULL, 'BLACKBELT GROUP', 'PRACTICANTE', 'MEJORAR EL SISTEMA DE BLACKBELT, ASI TAMBIEN COMO EL DESARROLLO DE ALGUNAS ACTIVIDADES', 'MENSUAL', '2026-10-08', '2026-11-08', 800, TRUE, 'Excel TABLA_M.O fila 17'),
  (8, 'CMO-2026-008', (SELECT id FROM specialists WHERE lower(full_name) = 'jeferson rodriguez mallqui' LIMIT 1), 'JEFERSON RODRIGUEZ MALLQUI', '76344270', (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), NULL, 'BLACKBELT GROUP', 'POR DEFINIR', NULL, 'MENSUAL', '2026-10-08', '2026-11-08', 700, TRUE, 'Excel TABLA_M.O fila 18');

-- Los contadores de id siguen después de lo cargado (para que la app cree los siguientes sin chocar)
SELECT setval(pg_get_serial_sequence('clients', 'id'), (SELECT max(id) FROM clients));
SELECT setval(pg_get_serial_sequence('projects', 'id'), (SELECT max(id) FROM projects));
SELECT setval(pg_get_serial_sequence('project_payments', 'id'), (SELECT max(id) FROM project_payments));
SELECT setval(pg_get_serial_sequence('movements', 'id'), (SELECT max(id) FROM movements));
SELECT setval(pg_get_serial_sequence('investments', 'id'), (SELECT max(id) FROM investments));
SELECT setval(pg_get_serial_sequence('labor_contracts', 'id'), (SELECT max(id) FROM labor_contracts));

COMMIT;

-- Siguiente: excel-03-verificar.sql (todas las filas deben decir OK).


-- ############################################################################
-- PASO 3 · VERIFICACIÓN
-- ############################################################################
-- ==============================================================================
-- PASO 3 de 3 · VERIFICAR que la base cuadra con el Excel. Todas las filas deben decir OK.
-- ==============================================================================

SELECT concepto, excel, en_la_base, CASE WHEN abs(excel - en_la_base) < 0.005 THEN 'OK' ELSE 'NO CUADRA' END AS estado
FROM (
  SELECT 'Ingresos (TABLA_INGRESOS)' AS concepto, 5340::numeric AS excel, (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'INGRESO_RECONOCIDO')::numeric AS en_la_base
  UNION ALL
  SELECT 'Cobros de clientes' AS concepto, 5340::numeric AS excel, (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'COBRO')::numeric AS en_la_base
  UNION ALL
  SELECT 'Egresos (TABLA_EGRESOS)' AS concepto, 6282.1::numeric AS excel, (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'COSTO_RECONOCIDO')::numeric AS en_la_base
  UNION ALL
  SELECT 'Pagos' AS concepto, 6282.1::numeric AS excel, (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'PAGO')::numeric AS en_la_base
  UNION ALL
  SELECT 'Inversión de socios (TABLA_INVERSIONES)' AS concepto, 1500::numeric AS excel, (SELECT coalesce(sum(amount), 0) FROM investments)::numeric AS en_la_base
  UNION ALL
  SELECT 'Fondo en caja' AS concepto, 557.9::numeric AS excel, (SELECT (SELECT value::numeric FROM app_settings WHERE key = 'opening_cash') + coalesce(sum(CASE WHEN record_type IN ('COBRO','APORTE_SOCIO','PRESTAMO_RECIBIDO') THEN amount WHEN record_type IN ('PAGO','RETIRO_SOCIO','PAGO_PRESTAMO') THEN -amount ELSE 0 END), 0) FROM movements WHERE status = 'VALIDADO')::numeric AS en_la_base
  UNION ALL
  SELECT 'Monto contratado (TABLA_CLIENTES)' AS concepto, 13530::numeric AS excel, (SELECT coalesce(sum(contracted_amount), 0) FROM projects)::numeric AS en_la_base
  UNION ALL
  SELECT 'Monto pagado por clientes' AS concepto, 5340::numeric AS excel, (SELECT coalesce(sum(amount), 0) FROM project_payments)::numeric AS en_la_base
  UNION ALL
  SELECT 'Falta cobrar (contratado − pagado)' AS concepto, 8190::numeric AS excel, (SELECT (SELECT coalesce(sum(contracted_amount), 0) FROM projects) - (SELECT coalesce(sum(amount), 0) FROM project_payments))::numeric AS en_la_base
  UNION ALL
  SELECT 'Nada antes de 2026 (la empresa empezó este año)' AS concepto, 0::numeric AS excel, (SELECT count(*) FROM movements WHERE movement_date < '2026-01-01')::numeric AS en_la_base
  UNION ALL
  SELECT 'Mano de obra: monto requerido (TABLA_M.O)' AS concepto, 5940::numeric AS excel, (SELECT coalesce(sum(agreed_amount), 0) FROM labor_contracts WHERE active)::numeric AS en_la_base
  UNION ALL
  SELECT 'Mano de obra: monto pagado' AS concepto, 3690.7::numeric AS excel, (SELECT coalesce(sum(m.amount), 0) FROM movements m WHERE m.status = 'VALIDADO' AND m.record_type = 'COSTO_RECONOCIDO' AND m.notes LIKE '%Mano de obra CMO-%' AND EXISTS (SELECT 1 FROM movements p WHERE p.record_type = 'PAGO' AND p.status = 'VALIDADO' AND p.notes = 'Contrapartida de ' || m.movement_code))::numeric AS en_la_base
  UNION ALL
  SELECT 'Mano de obra: falta pagar' AS concepto, 2249.3::numeric AS excel, (SELECT (SELECT coalesce(sum(agreed_amount), 0) FROM labor_contracts WHERE active) - (SELECT coalesce(sum(m.amount), 0) FROM movements m WHERE m.status = 'VALIDADO' AND m.record_type = 'COSTO_RECONOCIDO' AND m.notes LIKE '%Mano de obra CMO-%' AND EXISTS (SELECT 1 FROM movements p WHERE p.record_type = 'PAGO' AND p.status = 'VALIDADO' AND p.notes = 'Contrapartida de ' || m.movement_code)))::numeric AS en_la_base
  UNION ALL
  SELECT 'Servicios y publicidad (según TABLA_EGRESOS)' AS concepto, 724.96::numeric AS excel, (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'COSTO_RECONOCIDO' AND cost_category_id IN (SELECT id FROM cost_categories WHERE code IN ('SERV', 'PUB')))::numeric AS en_la_base
  UNION ALL
  SELECT 'Herramientas digitales (según TABLA_EGRESOS)' AS concepto, 908.28::numeric AS excel, (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'COSTO_RECONOCIDO' AND cost_category_id = (SELECT id FROM cost_categories WHERE code = 'SOFT'))::numeric AS en_la_base
  UNION ALL
  SELECT 'Resultado (ingresos − egresos)' AS concepto, -942.1::numeric AS excel, (SELECT (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'INGRESO_RECONOCIDO') - (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'COSTO_RECONOCIDO'))::numeric AS en_la_base
) x;
