-- ==============================================================================
-- SUBIR TODO A SUPABASE EN UN SOLO PASO (sistema BLACKBELT)
-- Generado por: npm run seed:excel:sql
--
-- CÓMO USARLO:
--   1. Cambia SOLO las 3 líneas marcadas con ← (justo debajo).
--   2. Copia TODO este archivo, pégalo en Supabase → SQL Editor → New query y pulsa Run.
--   3. Al final aparece una tabla de 16 filas: todas deben decir OK.
--   4. Borra la contraseña del editor (no guardes este texto con la contraseña).
--
-- Hace, en orden: esquema completo + 6 migraciones (seguras, se pueden repetir) → copia de respaldo de los datos
-- actuales (tablas respaldo_20261016_*) y limpieza → carga del Excel → cuenta de Henry → verificación.
-- Si algo falla, se detiene ahí y muestra el motivo en rojo.
-- ==============================================================================

SELECT set_config('bb.confirmo',     'NO',                 false),  -- ← 1. CAMBIA 'NO' POR 'SI' (borra los datos de prueba, con respaldo)
       set_config('bb.correo_henry', 'CAMBIAR@correo.com', false),  -- ← 2. correo de Henry (para entrar)
       set_config('bb.clave_henry',  'CAMBIAR',            false);  -- ← 3. contraseña de Henry (mínimo 8 caracteres)

DO $$
BEGIN
  IF current_setting('bb.confirmo') <> 'SI' THEN RAISE EXCEPTION 'No se hizo nada. Cambia la línea 1 a ''SI''.'; END IF;
  IF current_setting('bb.correo_henry') ILIKE 'CAMBIAR%' OR position('@' IN current_setting('bb.correo_henry')) = 0 THEN
    RAISE EXCEPTION 'No se hizo nada. Pon el correo de Henry en la línea 2.'; END IF;
  IF current_setting('bb.clave_henry') = 'CAMBIAR' OR length(current_setting('bb.clave_henry')) < 8 THEN
    RAISE EXCEPTION 'No se hizo nada. Pon la contraseña de Henry en la línea 3 (mínimo 8 caracteres).'; END IF;
END $$;

-- ############################################################################
-- ESQUEMA schema_completo_blackbelt.sql
-- ############################################################################
-- ==============================================================================
-- BLACKBELT GROUP — ESQUEMA COMPLETO Y DATOS INICIALES (MODELO C)
-- Pega este script completo en el SQL Editor de Supabase y dale a "Run"
-- ==============================================================================

-- 1. UNIDADES DE NEGOCIO (business_units)
CREATE TABLE IF NOT EXISTS business_units (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#15130F',
  status VARCHAR(20) NOT NULL DEFAULT 'Activo',
  scope TEXT
);

INSERT INTO business_units (id, code, name, color, status, scope)
VALUES
  (1, 'UN01', 'Ingeniería y Productividad', '#E67E22', 'Activo', 'Consultoría de operaciones, calidad y productividad'),
  (2, 'UN02', 'Tecnología y Transformación Digital', '#1677FF', 'Activo', 'Software, datos, automatización y soluciones digitales'),
  (3, 'UN03', 'Investigación y Desarrollo', '#6C3FC5', 'Activo', 'Investigación, tesis, prototipos y estudios técnicos'),
  (4, 'UN04', 'Ingeniería Especializada', '#159957', 'Activo', 'Geofísica y otros servicios especializados validados'),
  (5, 'UN05', 'Emprendimiento y Desarrollo Empresarial', '#007080', 'Activo', 'Consultoría, innovación y desarrollo de negocios'),
  (6, 'CORP', 'Corporativo / General', '#C9A23A', 'Activo', 'Gastos que benefician al conjunto o no tienen asignación validada')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  color = EXCLUDED.color,
  status = EXCLUDED.status,
  scope = EXCLUDED.scope;

SELECT setval(pg_get_serial_sequence('business_units', 'id'), COALESCE((SELECT MAX(id) FROM business_units), 1));

-- 2. ÁREAS FUNCIONALES (areas)
CREATE TABLE IF NOT EXISTS areas (
  id SERIAL PRIMARY KEY,
  code VARCHAR(15) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('General', 'Específica')),
  business_unit_id INTEGER REFERENCES business_units(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO areas (id, code, name, type, business_unit_id, description)
VALUES
  (1,  'DIR',     'Dirección General',                   'General',    NULL, 'Gestión estratégica, dirección y alianzas'),
  (2,  'MKT',     'Marketing y Ventas Corporativo',      'General',    NULL, 'Promoción propia y captación para cualquiera de las cinco unidades'),
  (3,  'ADM',     'Administración y Servicios',          'General',    NULL, 'Telecomunicaciones generales, oficina, logística administrativa'),
  (4,  'FIN',     'Finanzas y Contabilidad',             'General',    NULL, 'Tesorería, costos, presupuestos, contabilidad'),
  (5,  'RRHH',    'Talento Humano',                      'General',    NULL, 'Contratación, personas, especialistas'),
  (6,  'CAL',     'Calidad y Control',                   'General',    NULL, 'Control de entregables y procesos internos'),
  (7,  'U01-OPS', 'Operaciones y Diagnóstico',           'Específica', 1,    'Diagnóstico y optimización operativa'),
  (8,  'U01-MEJ', 'Mejora Continua y Productividad',     'Específica', 1,    'Lean, indicadores y productividad'),
  (9,  'U01-CAL', 'Calidad de Procesos',                 'Específica', 1,    'Calidad y estandarización en clientes'),
  (10, 'U02-DEV', 'Desarrollo de Software',              'Específica', 2,    'Aplicaciones y sistemas'),
  (11, 'U02-DAT', 'Datos e Inteligencia de Negocios',    'Específica', 2,    'BI, analítica y tableros'),
  (12, 'U02-IMP', 'Implementación Tecnológica',          'Específica', 2,    'Soporte e implantación'),
  (13, 'U03-MET', 'Metodología e Investigación',         'Específica', 3,    'Diseño y análisis metodológico'),
  (14, 'U03-TEC', 'Desarrollo Técnico y Experimental',   'Específica', 3,    'Prototipos, modelos y ensayos'),
  (15, 'U03-REV', 'Revisión y Calidad Científica',       'Específica', 3,    'Revisión técnica y científica'),
  (16, 'U04-CAM', 'Operaciones de Campo',                'Específica', 4,    'Adquisición y levantamiento de campo'),
  (17, 'U04-INT', 'Procesamiento e Interpretación',      'Específica', 4,    'Procesamiento de datos técnicos'),
  (18, 'U05-INN', 'Innovación y Emprendimiento',         'Específica', 5,    'Innovación, ideación y prototipado de negocios'),
  (19, 'U05-CON', 'Consultoría Empresarial',             'Específica', 5,    'Gestión de empresas y estrategia'),
  (20, 'U05-CAP', 'Capacitación y Formación Profesional','Específica', 5,    'Diseñar, organizar y ejecutar programas de capacitación'),
  (21, 'U05-MER', 'Marketing para Clientes',             'Específica', 5,    'Marketing facturable a clientes externos')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  business_unit_id = EXCLUDED.business_unit_id,
  description = EXCLUDED.description;

SELECT setval(pg_get_serial_sequence('areas', 'id'), COALESCE((SELECT MAX(id) FROM areas), 1));

-- 3. CATEGORÍAS DE COSTO (cost_categories) — 17 Modelo C
CREATE TABLE IF NOT EXISTS cost_categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  main_rule TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO cost_categories (id, code, name, description, main_rule)
VALUES
  (1,  'MO',   'Mano de obra y especialistas',       'Pago a especialistas, personal por proyecto, honorarios', 'Puede ser directo, atribuible o compartido'),
  (2,  'PUB',  'Publicidad y captación',              'Meta Ads, Google Ads, diseño de campañas', 'Área MKT; asignar a unidad anunciada'),
  (3,  'SOFT', 'Software y herramientas digitales',  'Canva, plataformas de IA, videollamadas', 'Asignar al uso real; si transversal CORP'),
  (4,  'SERV', 'Servicios y telecomunicaciones',     'Bitel, internet, luz, alquiler de servicios', 'CORP si es general; unidad si exclusivo'),
  (5,  'MAT',  'Materiales e insumos',                'Consumibles para desarrollo o ejecución', 'Directo si pertenece a un proyecto'),
  (6,  'MAQ',  'Maquinaria y equipos',                'Máquinas, instrumentos, equipos', 'Normalmente activo; costo por uso/depreciación'),
  (7,  'MOV',  'Transporte y viáticos',               'Traslados, campo, alojamientos, movilidad', 'Directo para proyecto o compartido'),
  (8,  'TERC', 'Servicios tercerizados',             'Subcontratistas, laboratorios y soporte externo', 'Asignar a proyecto cuando corresponda'),
  (9,  'ADM',  'Administración y trámites',           'Notaría, RUC, servicios legales, trámites', 'CORP si benefician a empresa completa'),
  (10, 'CAP',  'Capacitación',                        'Cursos y certificaciones', 'Según beneficiario real'),
  (11, 'BAN',  'Comisiones bancarias',                'Comisiones de banco, pasarelas', 'Unidad si imputable o CORP'),
  (12, 'MANT', 'Mantenimiento',                       'Repuestos, mantenimiento de equipos', 'Unidad específica o compartido'),
  (13, 'ACT',  'Adquisición de activos',              'Compra de maquinaria, computadoras, equipos', 'No sumar como gasto operativo directo'),
  (14, 'CXC',  'Cobros de clientes',                  'Entrada de efectivo por contratos', 'Flujo de caja; no duplicar ingreso'),
  (15, 'CXP',  'Pagos a proveedores',                 'Salida de efectivo de obligaciones', 'Flujo de caja; no duplicar gasto'),
  (16, 'SOC',  'Aportes y retiros de socios',         'Financiamiento o retiro patrimonial', 'No confundir con rentabilidad'),
  (17, 'OTR',  'Otros',                               'Conceptos sin categoría específica', 'Usar solo justificando clasificación')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  main_rule = EXCLUDED.main_rule;

SELECT setval(pg_get_serial_sequence('cost_categories', 'id'), COALESCE((SELECT MAX(id) FROM cost_categories), 1));

-- 4. CLIENTES (clients)
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  client_type VARCHAR(20) DEFAULT 'Persona',
  doc_number VARCHAR(20),
  phone VARCHAR(30),
  email VARCHAR(100),
  location VARCHAR(150),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO clients (id, name, client_type, doc_number, phone, email, location, notes)
VALUES
  (1, 'Wilmer Sánchez Mamani', 'Persona', '45678901', '99999999', 'wsanchez@gmail.com', 'Puno', 'Cliente de desarrollo de tesis e investigación técnica'),
  (2, 'Tania Aros Rengifo', 'Persona', '71038520', '951234567', 'taros@outlook.com', 'Arequipa', 'Proyectos de transformación digital y ciberseguridad'),
  (3, 'Carlos Mendoza Torres', 'Persona', '09854321', '984561230', 'cmendoza@empresa.pe', 'Cusco', 'Estudios de impacto ambiental'),
  (4, 'Empresa Minera Andes S.A.', 'Empresa', '20538921710', '958741236', 'contacto@mineraandes.com', 'Lima / Moquegua', 'Ingeniería estructural y geofísica'),
  (5, 'Municipalidad de Puno', 'Empresa', '20109874563', '051364789', 'alcaldia@munipuno.gob.pe', 'Puno', 'Modernización y consultoría operativa'),
  (6, 'Patricia Quispe Huanca', 'Persona', '41872659', '978523641', 'pquispe@gmail.com', 'Juliaca', 'Emprendimiento y desarrollo de startup')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('clients', 'id'), COALESCE((SELECT MAX(id) FROM clients), 1));

-- 5. PROYECTOS (projects)
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30),
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  business_unit_id INTEGER NOT NULL REFERENCES business_units(id) ON DELETE RESTRICT,
  area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  service VARCHAR(150),
  manager VARCHAR(150),
  start_date DATE,
  end_date DATE,
  contracted_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'finalizado', 'cancelado')),
  notes TEXT,
  contract_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO projects (id, code, client_id, business_unit_id, name, service, manager, start_date, end_date, contracted_amount, status, notes)
VALUES
  (1, 'PRY-2026-001', 1, 3, 'Desarrollo de Tesis e Investigación Experimental', 'DESARROLLO DE TESIS', 'HENRY TORRES RIVERA', '2024-02-01', '2024-07-31', 3000.00, 'activo', 'Proyecto Modelo C documentado en Excel maestro'),
  (2, 'PRY-2024-002', 2, 2, 'Automatización de Flujos y ERP Cloud', 'TRANSFORMACIÓN DIGITAL', 'JUAN PÉREZ VÁSQUEZ', '2024-02-15', '2024-05-15', 8500.00, 'activo', 'Despliegue e integración tecnológica'),
  (3, 'PRY-2024-003', 3, 1, 'Optimización de Procesos de Planta', 'CONSULTORÍA LEAN', 'HENRY TORRES RIVERA', '2024-03-01', '2024-06-30', 12000.00, 'activo', 'Diagnóstico operacional y reducción de mermas'),
  (4, 'PRY-2024-004', 4, 4, 'Prospección Geofísica y Modelado 3D', 'GEOFÍSICA Y SUELOS', 'MARCO GUZMÁN', '2024-03-20', '2024-04-30', 25000.00, 'finalizado', 'Levantamiento de campo y procesado sísmico'),
  (5, 'PRY-2024-005', 5, 1, 'Reingeniería Administrativa Municipal', 'GESTIÓN PÚBLICA', 'HENRY TORRES RIVERA', '2024-04-05', '2024-08-30', 18000.00, 'activo', 'Modernización de trámites y procesos'),
  (6, 'PRY-2024-006', 6, 5, 'Incubación y Modelo de Negocio Agro-Tech', 'INCUBACIÓN STARTUP', 'SOFÍA CASTRO', '2024-05-12', '2024-09-30', 6000.00, 'activo', 'Validación comercial y prototipado')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('projects', 'id'), COALESCE((SELECT MAX(id) FROM projects), 1));

-- 6. PAGOS DE PROYECTOS (project_payments)
CREATE TABLE IF NOT EXISTS project_payments (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO project_payments (id, project_id, amount, payment_date, payment_method)
VALUES
  (1, 1, 1500.00, '2024-02-05', 'transferencia'),
  (2, 1, 500.00,  '2024-03-01', 'transferencia'),
  (3, 2, 4250.00, '2024-02-20', 'transferencia'),
  (4, 3, 4000.00, '2024-03-10', 'transferencia'),
  (5, 4, 25000.00,'2024-04-25', 'transferencia'),
  (6, 5, 6000.00, '2024-04-15', 'cheque')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('project_payments', 'id'), COALESCE((SELECT MAX(id) FROM project_payments), 1));

-- 7. HERRAMIENTAS (tools)
CREATE TABLE IF NOT EXISTS tools (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('exclusive', 'shared', 'general')),
  exclusive_business_unit_id INTEGER REFERENCES business_units(id) ON DELETE SET NULL,
  monthly_reference_cost NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO tools (id, name, scope, exclusive_business_unit_id, monthly_reference_cost, notes)
VALUES
  (1, 'Google Workspace', 'general',   NULL, 450.00, 'Plataforma institucional corporativa — beneficio común'),
  (2, 'Asana',            'shared',    NULL, 280.00, 'Gestión de proyectos colaborativos'),
  (3, 'AutoCAD LT',       'exclusive', 4,    320.00, 'Licencia especializada para levantamiento y cálculo')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('tools', 'id'), COALESCE((SELECT MAX(id) FROM tools), 1));

-- 8. HERRAMIENTAS COMPARTIDAS (tool_business_units)
CREATE TABLE IF NOT EXISTS tool_business_units (
  id SERIAL PRIMARY KEY,
  tool_id INTEGER NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  business_unit_id INTEGER NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  default_pct NUMERIC(5, 2) NOT NULL,
  UNIQUE(tool_id, business_unit_id)
);

INSERT INTO tool_business_units (id, tool_id, business_unit_id, default_pct)
VALUES
  (1, 2, 1, 60.00),
  (2, 2, 2, 40.00)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('tool_business_units', 'id'), COALESCE((SELECT MAX(id) FROM tool_business_units), 1));

-- 9. TRANSACCIONES / GASTOS (transactions)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  transaction_date DATE NOT NULL,
  payment_method VARCHAR(50),
  cost_category_id INTEGER NOT NULL REFERENCES cost_categories(id) ON DELETE RESTRICT,
  tool_id INTEGER REFERENCES tools(id) ON DELETE SET NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

INSERT INTO transactions (id, description, amount, transaction_date, payment_method, cost_category_id, tool_id, project_id)
VALUES
  (1, 'Dirección Estratégica — honorarios mensuales', 701.50, '2024-09-30', 'transferencia', 1, NULL, NULL),
  (2, 'Marketing digital — campaña mensual', 630.06, '2024-09-30', 'tarjeta', 2, NULL, NULL),
  (3, 'Investigación y Desarrollo — investigador externo', 563.90, '2024-09-30', 'transferencia', 1, NULL, NULL),
  (4, 'Google Workspace — renovación mensual', 450.00, '2024-10-01', 'tarjeta', 3, 1, NULL),
  (5, 'Asana — suscripción de equipo', 280.00, '2024-10-01', 'tarjeta', 3, 2, NULL),
  (6, 'AutoCAD LT — licencia mensual', 320.00, '2024-10-01', 'tarjeta', 3, 3, NULL)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('transactions', 'id'), COALESCE((SELECT MAX(id) FROM transactions), 1));

-- 10. REPARTO DE TRANSACCIONES (transaction_allocations)
CREATE TABLE IF NOT EXISTS transaction_allocations (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  business_unit_id INTEGER NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  pct NUMERIC(5, 2) NOT NULL
);

INSERT INTO transaction_allocations (id, transaction_id, business_unit_id, pct)
VALUES
  (1, 1, 1, 20.00), (2, 1, 2, 20.00), (3, 1, 3, 20.00), (4, 1, 4, 20.00), (5, 1, 5, 20.00),
  (6, 2, 1, 25.00), (7, 2, 2, 25.00), (8, 2, 3, 25.00), (9, 2, 5, 25.00),
  (10, 3, 3, 100.00),
  (11, 4, 1, 20.00), (12, 4, 2, 20.00), (13, 4, 3, 20.00), (14, 4, 4, 20.00), (15, 4, 5, 20.00),
  (16, 5, 1, 60.00), (17, 5, 2, 40.00),
  (18, 6, 4, 100.00)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('transaction_allocations', 'id'), COALESCE((SELECT MAX(id) FROM transaction_allocations), 1));

-- ------------------------------------------------------------------------------
-- POLÍTICAS RLS (Permitir lectura y escritura con clave anónima para la app)
-- ------------------------------------------------------------------------------
ALTER TABLE business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_allocations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- business_units
  DROP POLICY IF EXISTS "anon_all_business_units" ON business_units;
  CREATE POLICY "anon_all_business_units" ON business_units FOR ALL USING (true) WITH CHECK (true);

  -- areas
  DROP POLICY IF EXISTS "anon_all_areas" ON areas;
  CREATE POLICY "anon_all_areas" ON areas FOR ALL USING (true) WITH CHECK (true);

  -- cost_categories
  DROP POLICY IF EXISTS "anon_all_cost_categories" ON cost_categories;
  CREATE POLICY "anon_all_cost_categories" ON cost_categories FOR ALL USING (true) WITH CHECK (true);

  -- clients
  DROP POLICY IF EXISTS "anon_all_clients" ON clients;
  CREATE POLICY "anon_all_clients" ON clients FOR ALL USING (true) WITH CHECK (true);

  -- projects
  DROP POLICY IF EXISTS "anon_all_projects" ON projects;
  CREATE POLICY "anon_all_projects" ON projects FOR ALL USING (true) WITH CHECK (true);

  -- project_payments
  DROP POLICY IF EXISTS "anon_all_project_payments" ON project_payments;
  CREATE POLICY "anon_all_project_payments" ON project_payments FOR ALL USING (true) WITH CHECK (true);

  -- tools
  DROP POLICY IF EXISTS "anon_all_tools" ON tools;
  CREATE POLICY "anon_all_tools" ON tools FOR ALL USING (true) WITH CHECK (true);

  -- tool_business_units
  DROP POLICY IF EXISTS "anon_all_tool_business_units" ON tool_business_units;
  CREATE POLICY "anon_all_tool_business_units" ON tool_business_units FOR ALL USING (true) WITH CHECK (true);

  -- transactions
  DROP POLICY IF EXISTS "anon_all_transactions" ON transactions;
  CREATE POLICY "anon_all_transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

  -- transaction_allocations
  DROP POLICY IF EXISTS "anon_all_transaction_allocations" ON transaction_allocations;
  CREATE POLICY "anon_all_transaction_allocations" ON transaction_allocations FOR ALL USING (true) WITH CHECK (true);
END $$;


-- ############################################################################
-- ESQUEMA 20261014000001_kanban_sprints_tasks.sql
-- ############################################################################
-- ==============================================================================
-- Migración: 20261014000001_kanban_sprints_tasks.sql
-- Descripción: Módulo Kanban/Scrum — sprints y tareas por proyecto.
--   * specialists : responsables de tareas (Principio 8: especialistas ≠ usuarios,
--                   no requieren login; el vínculo a `users` se agrega cuando exista).
--                   Se crea solo si no existe (no toca una tabla ya creada).
--   * sprints     : ciclos de trabajo de un proyecto (projects.id).
--   * tasks       : tarjetas del tablero. Estado = motivo belt-stripe oficial:
--                   backlog → por_hacer → en_curso → en_revision → hecho.
-- No duplica catálogos: referencia projects y specialists. Idempotente.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. GUARDA: si `specialists` ya existe con otra estructura, abortar sin tocar nada
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.specialists') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'specialists'
         AND column_name IN ('id', 'full_name')
       GROUP BY table_name HAVING COUNT(*) = 2
     ) THEN
    RAISE EXCEPTION 'La tabla specialists ya existe con otra estructura (se esperan id y full_name). Revisar antes de migrar.';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 1. ESPECIALISTAS (responsables)
-- ------------------------------------------------------------------------------
-- Los responsables iniciales se cargan SOLO si la tabla la crea esta migración
-- (si ya existía, no se le agregan filas).
DO $$
DECLARE
  ya_existia BOOLEAN := to_regclass('public.specialists') IS NOT NULL;
BEGIN
  CREATE TABLE IF NOT EXISTS specialists (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(100),
    specialty VARCHAR(100),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  IF NOT ya_existia THEN
    -- Responsables ya presentes como "manager" en los proyectos del Modelo C
    INSERT INTO specialists (id, full_name, specialty) VALUES
      (1, 'Henry Torres Rivera', 'Gerente general'),
      (2, 'Juan Pérez Vásquez',  'Transformación digital'),
      (3, 'Marco Guzmán',        'Geofísica y suelos'),
      (4, 'Sofía Castro',        'Incubación y emprendimiento');
    PERFORM setval(pg_get_serial_sequence('specialists', 'id'), 4);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. SPRINTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sprints (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  goal TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'planificado'
    CHECK (status IN ('planificado', 'activo', 'cerrado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);

-- ------------------------------------------------------------------------------
-- 3. TAREAS (tarjetas del tablero)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id INTEGER REFERENCES sprints(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'por_hacer', 'en_curso', 'en_revision', 'hecho')),
  assignee_id INTEGER REFERENCES specialists(id) ON DELETE SET NULL,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_tasks_project  ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint   ON tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);

-- ------------------------------------------------------------------------------
-- 4. POLÍTICAS RLS (mismo criterio que el resto de tablas: clave anónima de la app)
-- ------------------------------------------------------------------------------
ALTER TABLE specialists ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks       ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "anon_all_specialists" ON specialists;
  CREATE POLICY "anon_all_specialists" ON specialists FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "anon_all_sprints" ON sprints;
  CREATE POLICY "anon_all_sprints" ON sprints FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "anon_all_tasks" ON tasks;
  CREATE POLICY "anon_all_tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
END $$;


-- ############################################################################
-- ESQUEMA 20261015000001_modelo_c_movements_budgets_roles.sql
-- ############################################################################
-- ==============================================================================
-- Migración: 20261015000001_modelo_c_movements_budgets_roles.sql
-- Descripción: Tablas del Modelo C que faltaban para cerrar el sistema:
--   movements (06), budgets (07), corp_allocation (08), app_settings (saldo inicial de caja),
--   roles + users, work_hours.
--
-- SEGURA PARA DATOS EXISTENTES: solo CREA tablas nuevas (IF NOT EXISTS) y siembra roles
-- y saldo inicial si faltan. No altera, borra ni migra `transactions`, `tools`,
-- `tool_business_units` ni `transaction_allocations` (esquema anterior; quedan solo de
-- referencia hasta que Gerencia confirme cómo reclasificar ese historial).
-- Idempotente: se puede ejecutar más de una vez.
-- Requiere: catálogos (20261012000001), clients/projects y Kanban (20261014000001, crea specialists).
--
-- Valores CALCULADOS que NO se guardan como columna: mes y control de movements,
-- resultados, caja, saldo pendiente. Se derivan en el dominio (src/features/*/domain).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Guarda: dependencias mínimas
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.business_units') IS NULL OR to_regclass('public.areas') IS NULL
     OR to_regclass('public.cost_categories') IS NULL OR to_regclass('public.projects') IS NULL
     OR to_regclass('public.specialists') IS NULL OR to_regclass('public.tasks') IS NULL THEN
    RAISE EXCEPTION 'Faltan tablas previas (business_units, areas, cost_categories, projects, specialists, tasks). Ejecuta antes las migraciones 20261012000001 y 20261014000001.';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 1. movements — libro único (hoja 06_MOVIMIENTOS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movements (
  id SERIAL PRIMARY KEY,
  movement_code VARCHAR(20) NOT NULL UNIQUE,            -- ID visible MOV-AAAA-NNNN (trazabilidad)
  movement_date DATE NOT NULL,
  record_type VARCHAR(20) NOT NULL CHECK (record_type IN (
    'INGRESO_RECONOCIDO', 'COSTO_RECONOCIDO', 'COBRO', 'PAGO',
    'APORTE_SOCIO', 'RETIRO_SOCIO', 'COMPRA_ACTIVO')),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),   -- 0 queda marcado INCOMPLETO por el control
  business_unit_id INTEGER NOT NULL REFERENCES business_units(id) ON DELETE RESTRICT, -- BENEFICIARIA
  area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,                   -- GESTORA (≠ beneficiaria)
  responsible VARCHAR(150),
  cost_category_id INTEGER NOT NULL REFERENCES cost_categories(id) ON DELETE RESTRICT,
  expense_class VARCHAR(12) NOT NULL CHECK (expense_class IN ('DIRECTO', 'ATRIBUIBLE', 'COMPARTIDO', 'NO_APLICA')),
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  counterparty VARCHAR(150),                            -- tercero / proveedor
  detail TEXT,
  payment_method VARCHAR(50),
  voucher_number VARCHAR(60),
  status VARCHAR(10) NOT NULL DEFAULT 'BORRADOR' CHECK (status IN ('BORRADOR', 'VALIDADO')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_movements_date     ON movements (movement_date);
CREATE INDEX IF NOT EXISTS idx_movements_unit     ON movements (business_unit_id);
CREATE INDEX IF NOT EXISTS idx_movements_project  ON movements (project_id);
CREATE INDEX IF NOT EXISTS idx_movements_status   ON movements (status);

-- CORP por defecto (regla 1): se resuelve por código, no por id fijo.
CREATE OR REPLACE FUNCTION bb_default_corp_unit() RETURNS INTEGER
LANGUAGE sql STABLE AS $$ SELECT id FROM business_units WHERE code = 'CORP' LIMIT 1 $$;

ALTER TABLE movements ALTER COLUMN business_unit_id SET DEFAULT bb_default_corp_unit();

-- ------------------------------------------------------------------------------
-- 2. budgets — una fila por (mes, unidad, área, categoría) (hoja 07_PRESUPUESTOS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  month CHAR(7) NOT NULL CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  business_unit_id INTEGER NOT NULL REFERENCES business_units(id) ON DELETE RESTRICT,
  area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  cost_category_id INTEGER NOT NULL REFERENCES cost_categories(id) ON DELETE RESTRICT,
  income_target NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (income_target >= 0),
  cost_target NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (cost_target >= 0),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_budgets_combination UNIQUE (month, business_unit_id, area_id, cost_category_id)
);

-- ------------------------------------------------------------------------------
-- 3. corp_allocation — reparto mensual de gasto CORP a UN01–UN05 (hoja 08_REPARTO)
--    Una fila por (mes, unidad comercial). Sin filas = 0 % = "SIN REPARTIR".
--    Nunca hay reparto por defecto ni parejo.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS corp_allocation (
  id SERIAL PRIMARY KEY,
  month CHAR(7) NOT NULL CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  business_unit_id INTEGER NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  pct NUMERIC(6, 3) NOT NULL DEFAULT 0 CHECK (pct >= 0 AND pct <= 100),
  note TEXT,                                            -- criterio documentado
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_corp_allocation UNIQUE (month, business_unit_id)
);

-- CORP no puede recibir reparto (solo UN01–UN05)
CREATE OR REPLACE FUNCTION bb_check_allocation_unit() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM business_units WHERE id = NEW.business_unit_id AND code = 'CORP') THEN
    RAISE EXCEPTION 'corp_allocation: CORP no puede recibir reparto (solo UN01–UN05).';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_corp_allocation_unit ON corp_allocation;
CREATE TRIGGER trg_corp_allocation_unit
  BEFORE INSERT OR UPDATE ON corp_allocation
  FOR EACH ROW EXECUTE FUNCTION bb_check_allocation_unit();

-- ------------------------------------------------------------------------------
-- 4. app_settings — configuración (saldo inicial de caja del Modelo C)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(60) PRIMARY KEY,
  value TEXT NOT NULL
);

-- Saldo inicial de caja: 500 según 00_INICIO del Excel oficial. Editable; no se pisa si ya existe.
INSERT INTO app_settings (key, value) VALUES ('opening_cash', '500')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 5. roles y users
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE CHECK (code IN ('admin', 'colaborador')),
  name VARCHAR(60) NOT NULL
);

INSERT INTO roles (code, name) VALUES
  ('admin', 'Administrador'),
  ('colaborador', 'Colaborador')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  specialist_id INTEGER REFERENCES specialists(id) ON DELETE SET NULL,   -- especialista ≠ usuario
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. work_hours — horas-hombre por persona, proyecto y tarea
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_hours (
  id SERIAL PRIMARY KEY,
  specialist_id INTEGER NOT NULL REFERENCES specialists(id) ON DELETE RESTRICT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  work_date DATE NOT NULL,
  hours NUMERIC(5, 2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_hours_project    ON work_hours (project_id);
CREATE INDEX IF NOT EXISTS idx_work_hours_specialist ON work_hours (specialist_id);
CREATE INDEX IF NOT EXISTS idx_work_hours_date       ON work_hours (work_date);

-- ------------------------------------------------------------------------------
-- 7. RLS — mismo criterio del resto del proyecto (anon_all_<tabla>) mientras no haya Auth real
-- ------------------------------------------------------------------------------
ALTER TABLE movements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE corp_allocation ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_hours      ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['movements', 'budgets', 'corp_allocation', 'app_settings', 'roles', 'users', 'work_hours'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_all_' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (true) WITH CHECK (true)', 'anon_all_' || t, t);
  END LOOP;
END $$;


-- ############################################################################
-- ESQUEMA 20261016000001_work_hours_time_range.sql
-- ############################################################################
-- ==============================================================================
-- Horas-hombre de "desde – hasta" con descansos.
--
-- SOLO AGREGA columnas opcionales a work_hours (no borra ni cambia datos existentes).
-- Los registros anteriores quedan con estas columnas en NULL / 0 y siguen valiendo por `hours`.
-- Idempotente: se puede ejecutar más de una vez.
--   start_time     hora de inicio  (ej. 08:00)
--   end_time       hora de fin     (ej. 17:00; si es menor que start_time, cruzó la medianoche)
--   break_minutes  minutos de descanso descontados
--   breaks         detalle de descansos, texto "13:00-14:00, 16:00-16:15"
-- `hours` se sigue guardando: = (fin − inicio − descansos) / 60, calculado en la app.
-- ==============================================================================

ALTER TABLE work_hours ADD COLUMN IF NOT EXISTS start_time    TIME;
ALTER TABLE work_hours ADD COLUMN IF NOT EXISTS end_time      TIME;
ALTER TABLE work_hours ADD COLUMN IF NOT EXISTS break_minutes INTEGER NOT NULL DEFAULT 0 CHECK (break_minutes >= 0);
ALTER TABLE work_hours ADD COLUMN IF NOT EXISTS breaks        TEXT;


-- ############################################################################
-- ESQUEMA 20261017000001_investments.sql
-- ############################################################################
-- ==============================================================================
-- Inversiones: aportes de socios (patrimonio) y préstamos (deuda).
--
-- SEGURA PARA DATOS EXISTENTES e idempotente:
--   1. movements.record_type acepta 2 tipos nuevos que mueven caja sin ser ingreso ni gasto:
--        PRESTAMO_RECIBIDO (entra dinero prestado) y PAGO_PRESTAMO (se devuelve capital).
--      Los intereses de un préstamo se registran como COSTO_RECONOCIDO (sí son gasto).
--   2. Crea la tabla investments (una fila por aporte o préstamo). El dinero entra a caja con un
--      movimiento enlazado (APORTE_SOCIO o PRESTAMO_RECIBIDO) cuyo notes = 'Inversión INV-AAAA-NNN'.
-- No borra ni cambia datos.
-- ==============================================================================

DO $$
DECLARE c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'movements'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%record_type%'
  LOOP
    EXECUTE format('ALTER TABLE movements DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE movements ADD CONSTRAINT movements_record_type_check CHECK (record_type IN (
  'INGRESO_RECONOCIDO', 'COSTO_RECONOCIDO', 'COBRO', 'PAGO',
  'APORTE_SOCIO', 'RETIRO_SOCIO', 'COMPRA_ACTIVO',
  'PRESTAMO_RECIBIDO', 'PAGO_PRESTAMO'));

CREATE TABLE IF NOT EXISTS investments (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,                                   -- INV-AAAA-NNN
  kind VARCHAR(12) NOT NULL CHECK (kind IN ('patrimonio', 'deuda')),
  investor_name VARCHAR(150) NOT NULL,                                -- socio o prestamista
  investor_doc VARCHAR(20),                                           -- DNI/RUC
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  investment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  description TEXT,
  interest_rate NUMERIC(6, 3) NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),  -- % anual (deuda)
  term_months INTEGER CHECK (term_months IS NULL OR term_months > 0),        -- plazo (deuda)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investments_kind ON investments (kind);

ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
-- Política abierta solo si aún no se aplicó 20261019000001 (login con contraseña), que la reemplaza.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investments' AND policyname = 'app_users_all') THEN
    DROP POLICY IF EXISTS anon_all_investments ON investments;
    CREATE POLICY anon_all_investments ON investments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ############################################################################
-- ESQUEMA 20261018000001_labor_contracts.sql
-- ############################################################################
-- ==============================================================================
-- Mano de obra: contratos de colaboradores (TABLA_M.O del Excel).
--
-- SEGURA PARA DATOS EXISTENTES e idempotente. No borra ni cambia datos.
--   Crea labor_contracts: un contrato por colaborador y trabajo, con el monto acordado y la fecha
--   de culminación (= fecha límite para pagarle).
--   Lo PAGADO no se guarda: se calcula con los egresos enlazados (movements.notes contiene
--   'Mano de obra CMO-AAAA-NNN') que ya tienen su pago. Así cuadra con caja y resultados.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS labor_contracts (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,                                         -- CMO-AAAA-NNN
  specialist_id INTEGER REFERENCES specialists(id) ON DELETE SET NULL,
  worker_name VARCHAR(150) NOT NULL,
  worker_doc VARCHAR(20),
  business_unit_id INTEGER NOT NULL REFERENCES business_units(id),
  area_id INTEGER REFERENCES areas(id),
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  client_label VARCHAR(150),
  service VARCHAR(200) NOT NULL,
  description TEXT,
  contract_type VARCHAR(20) NOT NULL DEFAULT 'POR_PROYECTO' CHECK (contract_type IN ('POR_PROYECTO', 'MENSUAL')),
  start_date DATE NOT NULL,
  end_date DATE,
  agreed_amount NUMERIC(14, 2) NOT NULL CHECK (agreed_amount > 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_labor_contracts_specialist ON labor_contracts (specialist_id);
CREATE INDEX IF NOT EXISTS idx_labor_contracts_project ON labor_contracts (project_id);

ALTER TABLE labor_contracts ENABLE ROW LEVEL SECURITY;
-- Política abierta solo si aún no se aplicó 20261019000001 (login con contraseña), que la reemplaza.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'labor_contracts' AND policyname = 'app_users_all') THEN
    DROP POLICY IF EXISTS anon_all_labor_contracts ON labor_contracts;
    CREATE POLICY anon_all_labor_contracts ON labor_contracts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ############################################################################
-- ESQUEMA 20261019000001_login_con_contrasena.sql
-- ############################################################################
-- ==============================================================================
-- Entrar con correo y contraseña (Supabase Auth) y cerrar la base a quien no tenga cuenta.
--
-- QUÉ HACE (no borra ni cambia datos; se puede correr otra vez):
--   1. is_app_user()  → true si quien llama inició sesión con un correo que está en `users` (activo).
--      is_app_admin() → lo mismo, y además su rol es Administrador.
--   2. admin_set_login(correo, contraseña) → crea la cuenta para entrar o le pone una contraseña
--      nueva. Solo la puede usar un Administrador (o el SQL Editor de Supabase). No envía correos.
--   3. En TODAS las tablas de la app cambia las políticas abiertas (anon_all_*) por una sola:
--      «solo usuarios del sistema con sesión iniciada». Sin iniciar sesión ya no se lee ni se escribe nada.
--      Las tablas de respaldo (respaldo_*) quedan cerradas como estaban.
--
-- DESPUÉS DE CORRERLA: corre supabase/seed/primer-usuario.sql con el correo y la contraseña de Henry,
-- y en Supabase → Authentication → Sign In / Providers desactiva «Allow new users to sign up»
-- (las cuentas las crea el Administrador desde Equipo).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.is_app_user() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
     WHERE u.active AND lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_app_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u JOIN public.roles r ON r.id = u.role_id
     WHERE u.active AND r.code = 'admin' AND lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Crea la cuenta (si no existe) o cambia su contraseña. Devuelve 'creada' o 'actualizada'.
CREATE OR REPLACE FUNCTION public.admin_set_login(p_email text, p_password text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, auth AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
BEGIN
  -- session_user: 'postgres' en el SQL Editor; 'authenticator' cuando llama la página.
  IF NOT (public.is_app_admin() OR session_user IN ('postgres', 'supabase_admin')) THEN
    RAISE EXCEPTION 'Solo un administrador puede crear cuentas o cambiar contraseñas.';
  END IF;
  IF length(coalesce(p_password, '')) < 8 THEN
    RAISE EXCEPTION 'La contraseña debe tener al menos 8 caracteres.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'El correo % no es usuario del sistema. Agrégalo primero en Equipo.', v_email;
  END IF;

  SELECT id INTO v_id FROM auth.users WHERE lower(email) = v_email LIMIT 1;
  IF v_id IS NULL THEN
    v_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
      crypt(p_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
      '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_id, v_id::text,
            jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
            'email', now(), now(), now());
    RETURN 'creada';
  END IF;

  UPDATE auth.users
     SET encrypted_password = crypt(p_password, gen_salt('bf')),
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         updated_at = now()
   WHERE id = v_id;
  RETURN 'actualizada';
END $$;

REVOKE ALL ON FUNCTION public.admin_set_login(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_login(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO anon, authenticated;

-- Políticas: solo usuarios del sistema con sesión iniciada.
DO $$
DECLARE t text; p text;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname NOT LIKE 'respaldo\_%'
  LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname LIKE 'anon_all%' LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'app_users_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_app_user()) WITH CHECK (public.is_app_user())', 'app_users_all', t);
  END LOOP;
END $$;


-- ############################################################################
-- PASO 1 · RESPALDO Y LIMPIEZA
-- ############################################################################
-- ==============================================================================
-- PASO 1 de 3 · RESPALDO Y LIMPIEZA antes de cargar el Excel «CUADRO DE COSTOS».
-- Generado por: npm run seed:excel:sql
--
-- Qué hace:
--   1. Copia cada tabla de datos a "respaldo_20261016_<tabla>" (para poder recuperar cualquier cosa).
--   2. Vacía: labor_contracts, work_hours, tasks, sprints, movements, budgets, corp_allocation, project_payments, projects, clients, investments.
--   3. Quita los especialistas que no están en el Excel (Henry Torres Rivera se queda).
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
    IF to_regclass(t) IS NOT NULL AND to_regclass('respaldo_20261016_' || t) IS NULL THEN
      EXECUTE format('CREATE TABLE %I AS SELECT * FROM %I', 'respaldo_20261016_' || t, t);
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', 'respaldo_20261016_' || t);  -- sin políticas: no se ve desde la app
    END IF;
  END LOOP;

  FOREACH t IN ARRAY ARRAY['labor_contracts', 'work_hours', 'tasks', 'sprints', 'movements', 'budgets', 'corp_allocation', 'project_payments', 'projects', 'clients', 'investments'] LOOP
    IF to_regclass(t) IS NOT NULL THEN EXECUTE format('DELETE FROM %I', t); END IF;
  END LOOP;

  UPDATE users SET specialist_id = NULL
   WHERE specialist_id IN (SELECT id FROM specialists WHERE lower(full_name) NOT IN ('henry torres rivera', 'eddy renato vivanco núñez', 'jhimmy cortéz ruiz', 'manuel enrique panduro rengifo', 'teddy garcia murrieta', 'alanis pardavé', 'johann imanol herrera ramos'));
  DELETE FROM specialists WHERE lower(full_name) NOT IN ('henry torres rivera', 'eddy renato vivanco núñez', 'jhimmy cortéz ruiz', 'manuel enrique panduro rengifo', 'teddy garcia murrieta', 'alanis pardavé', 'johann imanol herrera ramos');
  RAISE NOTICE 'Listo: copia en tablas respaldo_20261016_* y datos de prueba borrados. Sigue con excel-02-cargar-datos.sql';
END $$;


-- ############################################################################
-- PASO 2 · CARGA DEL EXCEL
-- ############################################################################
-- ==============================================================================
-- PASO 2 de 3 · CARGA de los datos REALES del Excel «CUADRO DE COSTOS - PRIMER MODELO».
-- Generado por: npm run seed:excel:sql  (misma fuente que los datos locales: src/features/excel-data)
--
-- Carga: 5 clientes, 5 proyectos, 6 pagos de clientes, 7 especialistas,
--        88 movimientos (ingresos + cobros, egresos + pagos, aportes), 2 inversiones
--        y 7 contratos de mano de obra (TABLA_M.O).
-- Totales: ingresos S/ 5240 · egresos S/ 4839.73 · inversión S/ 1500 · caja S/ 1900.27.
-- Saldo inicial de caja = 0 (el Excel calcula: fondo en caja = ingresos + inversión − egresos).
-- Fechas: 15/10/2025 son ADELANTOS (Wilmer S/ 1,500 y Tania S/ 2,050) y se cargan tal cual.
-- Solo se corrigen textos mal escritos: "15/010/2026" → 15/10/2026; "09/092026" → 09/09/2026.
--
-- Se detiene si ya hay clientes, proyectos o movimientos (corre antes excel-01-respaldo-y-limpieza.sql).
-- Todo va en una transacción: si algo falla, no queda nada a medias.
-- ==============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM movements) OR EXISTS (SELECT 1 FROM projects) OR EXISTS (SELECT 1 FROM clients) THEN
    RAISE EXCEPTION 'La base ya tiene datos. Corre primero excel-01-respaldo-y-limpieza.sql (o el Excel ya se cargó).';
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
  SELECT 'Jhimmy Cortéz Ruiz', 'Asesoramiento de tesis en general', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM specialists WHERE lower(full_name) = 'jhimmy cortéz ruiz');
UPDATE specialists SET specialty = 'Asesoramiento de tesis en general', active = TRUE WHERE lower(full_name) = 'jhimmy cortéz ruiz';
INSERT INTO specialists (full_name, specialty, active)
  SELECT 'Manuel Enrique Panduro Rengifo', 'Asesoramiento de tesis de derecho', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM specialists WHERE lower(full_name) = 'manuel enrique panduro rengifo');
UPDATE specialists SET specialty = 'Asesoramiento de tesis de derecho', active = TRUE WHERE lower(full_name) = 'manuel enrique panduro rengifo';
INSERT INTO specialists (full_name, specialty, active)
  SELECT 'Teddy Garcia Murrieta', 'Asesoramiento de tesis en general', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM specialists WHERE lower(full_name) = 'teddy garcia murrieta');
UPDATE specialists SET specialty = 'Asesoramiento de tesis en general', active = TRUE WHERE lower(full_name) = 'teddy garcia murrieta';
INSERT INTO specialists (full_name, specialty, active)
  SELECT 'Alanis Pardavé', 'Marketeo de redes sociales', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM specialists WHERE lower(full_name) = 'alanis pardavé');
UPDATE specialists SET specialty = 'Marketeo de redes sociales', active = TRUE WHERE lower(full_name) = 'alanis pardavé';
INSERT INTO specialists (full_name, specialty, active)
  SELECT 'Johann Imanol Herrera Ramos', 'Practicante', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM specialists WHERE lower(full_name) = 'johann imanol herrera ramos');
UPDATE specialists SET specialty = 'Practicante', active = TRUE WHERE lower(full_name) = 'johann imanol herrera ramos';

-- Clientes (TABLA_CLIENTES)
INSERT INTO clients (id, name, client_type, doc_number, phone, notes) VALUES
  (1, 'WILMER WILFREDO SANCHEZ MAMANI', 'Persona', '45410158', '979343755', 'UNIVERSIDAD CONTINENTAL DEL PERÚ'),
  (2, 'ERIKA MERINO ROÑA', 'Persona', NULL, '951903351', 'UNIVERSIDAD DE CIENCIAS Y HUMANIDADES'),
  (3, 'TANIA LUCIA AROS RENGIFO', 'Persona', '41705907', '970474152', 'NEWMAN ESCUELA DE POSGRADO'),
  (4, 'DIAZ CASTRO STHEFANY', 'Persona', '60555252', '953807468', 'UNIVERSIDAD DE HUÁNUCO'),
  (5, 'ANTHENOL BENITO FARROMEQUE MUTTO', 'Persona', '44850179', '993708737', 'UNIVERSIDAD CÉSAR VALLEJO');

-- Proyectos (uno por cliente)
INSERT INTO projects (id, code, client_id, business_unit_id, area_id, name, service, manager, contracted_amount, start_date, end_date, status, notes) VALUES
  (1, 'PRY-2026-001', 1, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'DESARROLLO DE TESIS COMPLETO – WILMER WILFREDO SANCHEZ MAMANI', 'DESARROLLO DE TESIS COMPLETO', 'HENRY TORRES RIVERA', 3000, '2026-09-09', '2026-10-18', 'activo', 'UNIVERSIDAD CONTINENTAL DEL PERÚ · Excel TABLA_CLIENTES fila 10'),
  (2, 'PRY-2026-002', 2, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'DESARROLLO DE TESIS COMPLETO – ERIKA MERINO ROÑA', 'DESARROLLO DE TESIS COMPLETO', 'HENRY TORRES RIVERA', 2000, '2026-10-04', '2026-10-31', 'activo', 'UNIVERSIDAD DE CIENCIAS Y HUMANIDADES · Excel TABLA_CLIENTES fila 11'),
  (3, 'PRY-2026-003', 3, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'DESARROLLO DE TESIS COMPLETO – TANIA LUCIA AROS RENGIFO', 'DESARROLLO DE TESIS COMPLETO', 'HENRY TORRES RIVERA', 2050, '2026-10-04', '2026-10-15', 'finalizado', 'NEWMAN ESCUELA DE POSGRADO · Excel TABLA_CLIENTES fila 12'),
  (4, 'PRY-2026-004', 4, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'CORRECCION Y FORMATO APA – DIAZ CASTRO STHEFANY', 'CORRECCION Y FORMATO APA', 'HENRY TORRES RIVERA', 90, '2026-10-07', '2026-10-07', 'finalizado', 'UNIVERSIDAD DE HUÁNUCO · Excel TABLA_CLIENTES fila 13'),
  (5, 'PRY-2026-005', 5, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'PROYECTO DE TESIS – ANTHENOL BENITO FARROMEQUE MUTTO', 'PROYECTO DE TESIS', 'HENRY TORRES RIVERA', 1200, '2026-10-09', '2026-12-22', 'activo', 'UNIVERSIDAD CÉSAR VALLEJO · Excel TABLA_CLIENTES fila 14');

-- Pagos de clientes (TABLA_INGRESOS)
INSERT INTO project_payments (id, project_id, amount, payment_date, payment_method) VALUES
  (1, 1, 1500, '2025-10-15', 'YAPE'),
  (2, 3, 2050, '2025-10-15', 'YAPE'),
  (3, 1, 800, '2026-09-24', 'YAPE'),
  (4, 4, 90, '2026-10-07', 'YAPE'),
  (5, 5, 400, '2026-10-10', 'YAPE'),
  (6, 2, 400, '2026-10-10', 'YAPE');

-- Movimientos (libro único del Modelo C)
INSERT INTO movements (id, movement_code, movement_date, record_type, amount, business_unit_id, area_id, responsible, cost_category_id, expense_class, project_id, counterparty, detail, payment_method, status, notes) VALUES
  (1, 'MOV-2025-0001', '2025-10-15', 'INGRESO_RECONOCIDO', 1500, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), NULL, (SELECT id FROM cost_categories WHERE code = 'OTR'), 'NO_APLICA', 1, 'WILMER WILFREDO SANCHEZ MAMANI', 'Pago de Tesis primera entrega', 'YAPE', 'VALIDADO', 'Excel TABLA_INGRESOS fila 12: DESARROLLO DE TESIS – DESARROLLO DE TESIS COMPLETA'),
  (2, 'MOV-2025-0002', '2025-10-15', 'COBRO', 1500, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), NULL, (SELECT id FROM cost_categories WHERE code = 'CXC'), 'NO_APLICA', 1, 'WILMER WILFREDO SANCHEZ MAMANI', 'Pago de Tesis primera entrega', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2025-0001'),
  (3, 'MOV-2025-0003', '2025-10-15', 'INGRESO_RECONOCIDO', 2050, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), NULL, (SELECT id FROM cost_categories WHERE code = 'OTR'), 'NO_APLICA', 3, 'TANIA LUCIA AROS RENGIFO', 'Pago de Tesis primera entrega', 'YAPE', 'VALIDADO', 'Excel TABLA_INGRESOS fila 13: DESARROLLO DE TESIS – DESARROLLO DE TESIS COMPLETA'),
  (4, 'MOV-2025-0004', '2025-10-15', 'COBRO', 2050, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), NULL, (SELECT id FROM cost_categories WHERE code = 'CXC'), 'NO_APLICA', 3, 'TANIA LUCIA AROS RENGIFO', 'Pago de Tesis primera entrega', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2025-0003'),
  (5, 'MOV-2026-0001', '2026-08-14', 'COSTO_RECONOCIDO', 10, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'GOOGLE ONE', 'Google one', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 18: Herramienta AI para la velocidad de informacion'),
  (6, 'MOV-2026-0002', '2026-08-14', 'PAGO', 10, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'GOOGLE ONE', 'Google one', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0001'),
  (7, 'MOV-2026-0003', '2026-08-15', 'COSTO_RECONOCIDO', 20, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'CHAT GPT GO', 'Chat gpt go', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 17: Herramienta que ayuda a mejorar la efectividad de decisiones'),
  (8, 'MOV-2026-0004', '2026-08-15', 'PAGO', 20, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'CHAT GPT GO', 'Chat gpt go', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0003'),
  (9, 'MOV-2026-0005', '2026-08-16', 'APORTE_SOCIO', 1000, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), NULL, (SELECT id FROM cost_categories WHERE code = 'SOC'), 'NO_APLICA', NULL, 'HANS CARLOS TORRES MURRIETA', 'Inversion como socio', 'YAPE', 'VALIDADO', 'Inversión INV-2026-001 · Excel TABLA_INVERSIONES fila 7'),
  (10, 'MOV-2026-0006', '2026-08-16', 'COSTO_RECONOCIDO', 36, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'GOOGLE MEET', 'Google meet', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 14: Herramienta que sirve para crear reuniones'),
  (11, 'MOV-2026-0007', '2026-08-16', 'PAGO', 36, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'GOOGLE MEET', 'Google meet', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0006'),
  (12, 'MOV-2026-0008', '2026-08-16', 'COSTO_RECONOCIDO', 80, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'CLAUDE AI', 'Claude ai', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 15: Herramienta que ayuda a mejorar la efectividad de decisiones'),
  (13, 'MOV-2026-0009', '2026-08-16', 'PAGO', 80, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'CLAUDE AI', 'Claude ai', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0008'),
  (14, 'MOV-2026-0010', '2026-08-18', 'COSTO_RECONOCIDO', 40, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'MKT'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'CANVA', 'Canva', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 13: Herramienta que sirve para el diseño y publicidad'),
  (15, 'MOV-2026-0011', '2026-08-18', 'PAGO', 40, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'CANVA', 'Canva', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0010'),
  (16, 'MOV-2026-0012', '2026-08-18', 'COSTO_RECONOCIDO', 39.9, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SERV'), 'COMPARTIDO', NULL, 'BITEL', 'Bitel', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 16: servicio telefonico para los mensajes y llamadas de la empresa'),
  (17, 'MOV-2026-0013', '2026-08-18', 'PAGO', 39.9, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'BITEL', 'Bitel', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0012'),
  (18, 'MOV-2026-0014', '2026-08-21', 'COSTO_RECONOCIDO', 200, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'MKT'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'PAGINA WEB', 'Pagina web', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 19: Herramienta que ayudará a dar una base en la web'),
  (19, 'MOV-2026-0015', '2026-08-21', 'PAGO', 200, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'PAGINA WEB', 'Pagina web', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0014'),
  (20, 'MOV-2026-0016', '2026-09-04', 'COSTO_RECONOCIDO', 100, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'DIR'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'ADM'), 'COMPARTIDO', NULL, 'OBTENCION DE RUC', 'Obtencion de ruc', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 9: Se hizo un pago para poner 100 soles como socios como registro de Blackbelt'),
  (21, 'MOV-2026-0017', '2026-09-04', 'PAGO', 100, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'OBTENCION DE RUC', 'Obtencion de ruc', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0016'),
  (22, 'MOV-2026-0018', '2026-09-04', 'COSTO_RECONOCIDO', 150, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'DIR'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'ADM'), 'COMPARTIDO', NULL, 'OBTENCION DE RUC', 'Obtencion de ruc', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 10: Pago por el servicio a la notaria'),
  (23, 'MOV-2026-0019', '2026-09-04', 'PAGO', 150, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'OBTENCION DE RUC', 'Obtencion de ruc', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0018'),
  (24, 'MOV-2026-0020', '2026-09-04', 'COSTO_RECONOCIDO', 57.1, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'DIR'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'MOV'), 'COMPARTIDO', NULL, 'OBTENCION DE RUC', 'Obtencion de ruc', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 11: Pago por el transporte a la transporte'),
  (25, 'MOV-2026-0021', '2026-09-04', 'PAGO', 57.1, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'OBTENCION DE RUC', 'Obtencion de ruc', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0020'),
  (26, 'MOV-2026-0022', '2026-09-04', 'COSTO_RECONOCIDO', 26.6, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'DIR'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'ADM'), 'COMPARTIDO', NULL, 'OBTENCION DE RUC', 'Obtencion de ruc', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 12: Pago por tramite en la sunarp'),
  (27, 'MOV-2026-0023', '2026-09-04', 'PAGO', 26.6, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'OBTENCION DE RUC', 'Obtencion de ruc', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0022'),
  (28, 'MOV-2026-0024', '2026-09-15', 'COSTO_RECONOCIDO', 20, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'DIR'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'CHAT GPT GO', 'Chat gpt go', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 24: Herramienta que ayuda a mejorar la efectividad de decisiones'),
  (29, 'MOV-2026-0025', '2026-09-15', 'PAGO', 20, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'CHAT GPT GO', 'Chat gpt go', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0024'),
  (30, 'MOV-2026-0026', '2026-09-15', 'COSTO_RECONOCIDO', 200, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 1, 'EDDY RENATO VIVANCO NÚÑEZ', 'Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato)', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 25: Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato) · Mano de obra CMO-2026-001'),
  (31, 'MOV-2026-0027', '2026-09-15', 'PAGO', 200, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 1, 'EDDY RENATO VIVANCO NÚÑEZ', 'Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato)', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0026'),
  (32, 'MOV-2026-0028', '2026-09-16', 'COSTO_RECONOCIDO', 36, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'GOOGLE MEET', 'Google meet', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 21: Herramienta que sirve para crear reuniones'),
  (33, 'MOV-2026-0029', '2026-09-16', 'PAGO', 36, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'GOOGLE MEET', 'Google meet', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0028'),
  (34, 'MOV-2026-0030', '2026-09-18', 'APORTE_SOCIO', 500, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), NULL, (SELECT id FROM cost_categories WHERE code = 'SOC'), 'NO_APLICA', NULL, 'HANS CARLOS TORRES MURRIETA', 'Inversion como socio', 'YAPE', 'VALIDADO', 'Inversión INV-2026-002 · Excel TABLA_INVERSIONES fila 8'),
  (35, 'MOV-2026-0031', '2026-09-18', 'COSTO_RECONOCIDO', 40, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'MKT'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'CANVA', 'Canva', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 20: Herramienta que sirve para el diseño y publicidad'),
  (36, 'MOV-2026-0032', '2026-09-18', 'PAGO', 40, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'CANVA', 'Canva', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0031'),
  (37, 'MOV-2026-0033', '2026-09-18', 'COSTO_RECONOCIDO', 39.9, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'DIR'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SERV'), 'COMPARTIDO', NULL, 'BITEL', 'Bitel', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 23: servicio telefonico para los mensajes y llamadas de la empresa'),
  (38, 'MOV-2026-0034', '2026-09-18', 'PAGO', 39.9, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'BITEL', 'Bitel', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0033'),
  (39, 'MOV-2026-0035', '2026-09-20', 'COSTO_RECONOCIDO', 33.9, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'ATRIBUIBLE', NULL, 'QUILLBOT', 'Quillbot', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 22: Herramienta util para el desarrollo de investigaciones'),
  (40, 'MOV-2026-0036', '2026-09-20', 'PAGO', 33.9, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'QUILLBOT', 'Quillbot', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0035'),
  (41, 'MOV-2026-0037', '2026-09-21', 'COSTO_RECONOCIDO', 250.06, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'MKT'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'PUB'), 'ATRIBUIBLE', NULL, 'PUBLICIDAD EN FB', 'Publicidad en fb', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 26: Marketeo que ayudara a conseguir mas clientes'),
  (42, 'MOV-2026-0038', '2026-09-21', 'PAGO', 250.06, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'PUBLICIDAD EN FB', 'Publicidad en fb', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0037'),
  (43, 'MOV-2026-0039', '2026-09-24', 'INGRESO_RECONOCIDO', 800, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), NULL, (SELECT id FROM cost_categories WHERE code = 'OTR'), 'NO_APLICA', 1, 'WILMER WILFREDO SANCHEZ MAMANI', 'Pago de Tesis primera entrega', 'YAPE', 'VALIDADO', 'Excel TABLA_INGRESOS fila 8: DESARROLLO DE TESIS – DESARROLLO DE TESIS COMPLETA'),
  (44, 'MOV-2026-0040', '2026-09-24', 'COBRO', 800, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), NULL, (SELECT id FROM cost_categories WHERE code = 'CXC'), 'NO_APLICA', 1, 'WILMER WILFREDO SANCHEZ MAMANI', 'Pago de Tesis primera entrega', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0039'),
  (45, 'MOV-2026-0041', '2026-10-02', 'COSTO_RECONOCIDO', 80, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 1, 'HENRY TORRES RIVERA', 'Servicio de desarrollo de tesis a Wilmer(henry)', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 27: Servicio de desarrollo de tesis a Wilmer(henry) · Mano de obra CMO-2026-005'),
  (46, 'MOV-2026-0042', '2026-10-02', 'PAGO', 80, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 1, 'HENRY TORRES RIVERA', 'Servicio de desarrollo de tesis a Wilmer(henry)', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0041'),
  (47, 'MOV-2026-0043', '2026-10-02', 'COSTO_RECONOCIDO', 86, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'CHAT GPT PLUS', 'Chat gpt plus', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 28: Herramienta que ayuda a mejorar la efectividad de decisiones'),
  (48, 'MOV-2026-0044', '2026-10-02', 'PAGO', 86, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'CHAT GPT PLUS', 'Chat gpt plus', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0043'),
  (49, 'MOV-2026-0045', '2026-10-04', 'COSTO_RECONOCIDO', 40, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'ATRIBUIBLE', NULL, 'MANUEL ENRIQUE PANDURO RENGIFO', 'Asesoramiento de Investigacion', 'BCP', 'VALIDADO', 'Excel TABLA_EGRESOS fila 29: Asesoramiento de Investigacion · Mano de obra CMO-2026-003'),
  (50, 'MOV-2026-0046', '2026-10-04', 'PAGO', 40, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'MANUEL ENRIQUE PANDURO RENGIFO', 'Asesoramiento de Investigacion', 'BCP', 'VALIDADO', 'Contrapartida de MOV-2026-0045'),
  (51, 'MOV-2026-0047', '2026-10-04', 'COSTO_RECONOCIDO', 100, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'MKT'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'COMPARTIDO', NULL, 'ALANIS PARDAVÉ', 'Marketeo que ayudara a conseguir mas clientes (Alanis)', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 30: Marketeo que ayudara a conseguir mas clientes (Alanis) · Mano de obra CMO-2026-006'),
  (52, 'MOV-2026-0048', '2026-10-04', 'PAGO', 100, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'ALANIS PARDAVÉ', 'Marketeo que ayudara a conseguir mas clientes (Alanis)', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0047'),
  (53, 'MOV-2026-0049', '2026-10-06', 'COSTO_RECONOCIDO', 10, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 1, 'TEDDY GARCIA MURRIETA', 'Servicio de desarrollo de tesis a teddy', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 31: Servicio de desarrollo de tesis a teddy · Mano de obra CMO-2026-004'),
  (54, 'MOV-2026-0050', '2026-10-06', 'PAGO', 10, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 1, 'TEDDY GARCIA MURRIETA', 'Servicio de desarrollo de tesis a teddy', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0049'),
  (55, 'MOV-2026-0051', '2026-10-06', 'COSTO_RECONOCIDO', 175, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 3, 'JHIMMY CORTÉZ RUIZ', 'Servicio de desarrollo de tesis a Jhimmy Cortez', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 32: Servicio de desarrollo de tesis a Jhimmy Cortez · Mano de obra CMO-2026-002'),
  (56, 'MOV-2026-0052', '2026-10-06', 'PAGO', 175, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 3, 'JHIMMY CORTÉZ RUIZ', 'Servicio de desarrollo de tesis a Jhimmy Cortez', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0051'),
  (57, 'MOV-2026-0053', '2026-10-07', 'INGRESO_RECONOCIDO', 90, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), NULL, (SELECT id FROM cost_categories WHERE code = 'OTR'), 'NO_APLICA', 4, 'DIAZ CASTRO STHEFANY', 'Pago por culminacion', 'YAPE', 'VALIDADO', 'Excel TABLA_INGRESOS fila 9: TESINA – ORDENAR A FORMATO APA Y LEVANTAR OBSERVACIONES'),
  (58, 'MOV-2026-0054', '2026-10-07', 'COBRO', 90, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), NULL, (SELECT id FROM cost_categories WHERE code = 'CXC'), 'NO_APLICA', 4, 'DIAZ CASTRO STHEFANY', 'Pago por culminacion', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0053'),
  (59, 'MOV-2026-0055', '2026-10-08', 'COSTO_RECONOCIDO', 76.34, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'MKT'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'PUB'), 'ATRIBUIBLE', NULL, 'PUBLICIDAD EN FB', 'Publicidad en fb', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 33: Marketeo que ayudara a conseguir mas clientes'),
  (60, 'MOV-2026-0056', '2026-10-08', 'PAGO', 76.34, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'PUBLICIDAD EN FB', 'Publicidad en fb', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0055'),
  (61, 'MOV-2026-0057', '2026-10-10', 'INGRESO_RECONOCIDO', 400, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), NULL, (SELECT id FROM cost_categories WHERE code = 'OTR'), 'NO_APLICA', 5, 'ANTHENOL BENITO FARROMEQUE MUTTO', 'Pago por la elaboracion de la Introduccion', 'YAPE', 'VALIDADO', 'Excel TABLA_INGRESOS fila 10: PROYECTO DE INVESTIGACION – REALIZAR LA PARTE DE INTRODUCCION'),
  (62, 'MOV-2026-0058', '2026-10-10', 'COBRO', 400, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), NULL, (SELECT id FROM cost_categories WHERE code = 'CXC'), 'NO_APLICA', 5, 'ANTHENOL BENITO FARROMEQUE MUTTO', 'Pago por la elaboracion de la Introduccion', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0057'),
  (63, 'MOV-2026-0059', '2026-10-10', 'INGRESO_RECONOCIDO', 400, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), NULL, (SELECT id FROM cost_categories WHERE code = 'OTR'), 'NO_APLICA', 2, 'ERIKA MERINO ROÑA', 'Pago por la elaboracion de la Introduccion', 'YAPE', 'VALIDADO', 'Excel TABLA_INGRESOS fila 11: PROYECTO DE INVESTIGACION – REALIZAR LA PARTE DE INTRODUCCION'),
  (64, 'MOV-2026-0060', '2026-10-10', 'COBRO', 400, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), NULL, (SELECT id FROM cost_categories WHERE code = 'CXC'), 'NO_APLICA', 2, 'ERIKA MERINO ROÑA', 'Pago por la elaboracion de la Introduccion', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0059'),
  (65, 'MOV-2026-0061', '2026-10-12', 'COSTO_RECONOCIDO', 125, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 3, 'JHIMMY CORTÉZ RUIZ', 'Servicio de desarrollo de tesis a Jhimmy Cortez', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 34: Servicio de desarrollo de tesis a Jhimmy Cortez · Mano de obra CMO-2026-002'),
  (66, 'MOV-2026-0062', '2026-10-12', 'PAGO', 125, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 3, 'JHIMMY CORTÉZ RUIZ', 'Servicio de desarrollo de tesis a Jhimmy Cortez', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0061'),
  (67, 'MOV-2026-0063', '2026-10-12', 'COSTO_RECONOCIDO', 20, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 1, 'TEDDY GARCIA MURRIETA', 'Servicio de desarrollo de tesis a Teddy', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 35: Servicio de desarrollo de tesis a Teddy · Mano de obra CMO-2026-004'),
  (68, 'MOV-2026-0064', '2026-10-12', 'PAGO', 20, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 1, 'TEDDY GARCIA MURRIETA', 'Servicio de desarrollo de tesis a Teddy', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0063'),
  (69, 'MOV-2026-0065', '2026-10-12', 'COSTO_RECONOCIDO', 15, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'MAT'), 'COMPARTIDO', NULL, 'EXTENSION DE CORRIENTE', 'Extension de corriente', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 36: Se requiere una extension para una mejor conectividad de las PC´s y laptops'),
  (70, 'MOV-2026-0066', '2026-10-12', 'PAGO', 15, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'TEDDY GARCIA MURRIETA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'EXTENSION DE CORRIENTE', 'Extension de corriente', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0065'),
  (71, 'MOV-2026-0067', '2026-10-12', 'COSTO_RECONOCIDO', 8, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MOV'), 'COMPARTIDO', NULL, 'TRANSPORTE', 'Transporte', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 37: Se pago el pasaje para la obtencion del RUC'),
  (72, 'MOV-2026-0068', '2026-10-12', 'PAGO', 8, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'TRANSPORTE', 'Transporte', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0067'),
  (73, 'MOV-2026-0069', '2026-10-13', 'COSTO_RECONOCIDO', 77.9, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'OTR'), 'COMPARTIDO', NULL, 'CENA', 'Cena', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 38: Se pago una cena por la celebracion de la obtención del RUC'),
  (74, 'MOV-2026-0070', '2026-10-13', 'PAGO', 77.9, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'CENA', 'Cena', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0069'),
  (75, 'MOV-2026-0071', '2026-10-13', 'COSTO_RECONOCIDO', 250, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'MKT'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'COMPARTIDO', NULL, 'ALANIS PARDAVÉ', 'Marketeo que ayudara a conseguir mas clientes  (Alanis)', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 39: Marketeo que ayudara a conseguir mas clientes  (Alanis) · Mano de obra CMO-2026-006'),
  (76, 'MOV-2026-0072', '2026-10-13', 'PAGO', 250, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'ALANIS PARDAVÉ', 'Marketeo que ayudara a conseguir mas clientes  (Alanis)', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0071'),
  (77, 'MOV-2026-0073', '2026-10-14', 'COSTO_RECONOCIDO', 39.9, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'DIR'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SERV'), 'COMPARTIDO', NULL, 'BITEL', 'Bitel', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 40: servicio telefonico para los mensajes y llamadas de la empresa'),
  (78, 'MOV-2026-0074', '2026-10-14', 'PAGO', 39.9, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'BITEL', 'Bitel', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0073'),
  (79, 'MOV-2026-0075', '2026-10-15', 'COSTO_RECONOCIDO', 900, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 3, 'JHIMMY CORTÉZ RUIZ', 'Servicio de desarrollo de tesis a Jhimmy Cortez', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 41: Servicio de desarrollo de tesis a Jhimmy Cortez · Mano de obra CMO-2026-002'),
  (80, 'MOV-2026-0076', '2026-10-15', 'PAGO', 900, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 3, 'JHIMMY CORTÉZ RUIZ', 'Servicio de desarrollo de tesis a Jhimmy Cortez', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0075'),
  (81, 'MOV-2026-0077', '2026-10-15', 'COSTO_RECONOCIDO', 1300, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 1, 'EDDY RENATO VIVANCO NÚÑEZ', 'Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato)', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 42: Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato) · Mano de obra CMO-2026-001'),
  (82, 'MOV-2026-0078', '2026-10-15', 'PAGO', 1300, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 1, 'EDDY RENATO VIVANCO NÚÑEZ', 'Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato)', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0077'),
  (83, 'MOV-2026-0079', '2026-10-15', 'COSTO_RECONOCIDO', 12.13, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 1, 'EDDY RENATO VIVANCO NÚÑEZ', 'Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato)', 'BBVA', 'VALIDADO', 'Excel TABLA_EGRESOS fila 43: Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato)'),
  (84, 'MOV-2026-0080', '2026-10-15', 'PAGO', 12.13, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 1, 'EDDY RENATO VIVANCO NÚÑEZ', 'Especialista de ing. mecanica para la Tesis de Wilmer(Eddy Renato)', 'BBVA', 'VALIDADO', 'Contrapartida de MOV-2026-0079'),
  (85, 'MOV-2026-0081', '2026-10-15', 'COSTO_RECONOCIDO', 100, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'MO'), 'DIRECTO', 1, 'HENRY TORRES RIVERA', 'Servicio de desarrollo de tesis a Wilmer(henry)', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 44: Servicio de desarrollo de tesis a Wilmer(henry) · Mano de obra CMO-2026-005'),
  (86, 'MOV-2026-0082', '2026-10-15', 'PAGO', 100, (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', 1, 'HENRY TORRES RIVERA', 'Servicio de desarrollo de tesis a Wilmer(henry)', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0081'),
  (87, 'MOV-2026-0083', '2026-10-15', 'COSTO_RECONOCIDO', 45, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'SOFT'), 'COMPARTIDO', NULL, 'IA VIDEO', 'Ia video', 'YAPE', 'VALIDADO', 'Excel TABLA_EGRESOS fila 45: Servicio de desarrollo de tesis a Wilmer(henry)'),
  (88, 'MOV-2026-0084', '2026-10-15', 'PAGO', 45, (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'FIN'), 'HENRY TORRES RIVERA', (SELECT id FROM cost_categories WHERE code = 'CXP'), 'NO_APLICA', NULL, 'IA VIDEO', 'Ia video', 'YAPE', 'VALIDADO', 'Contrapartida de MOV-2026-0083');

-- Inversiones (TABLA_INVERSIONES)
INSERT INTO investments (id, code, kind, investor_name, investor_doc, amount, investment_date, payment_method, description, interest_rate, term_months) VALUES
  (1, 'INV-2026-001', 'patrimonio', 'HANS CARLOS TORRES MURRIETA', '10244394', 1000, '2026-08-16', 'YAPE', 'Inversion como socio', 0, NULL),
  (2, 'INV-2026-002', 'patrimonio', 'HANS CARLOS TORRES MURRIETA', '10244394', 500, '2026-09-18', 'YAPE', 'Inversion como socio', 0, NULL);

-- Mano de obra (TABLA_M.O). Lo pagado se calcula con los egresos enlazados ('Mano de obra CMO-…').
INSERT INTO labor_contracts (id, code, specialist_id, worker_name, worker_doc, business_unit_id, area_id, project_id, client_label, service, description, contract_type, start_date, end_date, agreed_amount, active, notes) VALUES
  (1, 'CMO-2026-001', (SELECT id FROM specialists WHERE lower(full_name) = 'eddy renato vivanco núñez' LIMIT 1), 'EDDY RENATO VIVANCO NÚÑEZ', '74994929', (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 1, 'WILMER SANCHEZ MAMANI', 'ASESORAMIENTO EN ING. MECÁNICA', 'DESARROLLARÁ EL MODELAMIENTO DE LA PLATAFORMA DEL MOLINO DE BOLAS', 'POR_PROYECTO', '2026-09-18', '2026-10-18', 1500, TRUE, 'Excel TABLA_M.O fila 11'),
  (2, 'CMO-2026-002', (SELECT id FROM specialists WHERE lower(full_name) = 'jhimmy cortéz ruiz' LIMIT 1), 'JHIMMY CORTÉZ RUIZ', '40098380', (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 3, 'TANIA AROS RENGIFO', 'ASESORAMIENTO DE TESIS EN GENERAL', 'DESARROLLARA PARTE DE LA INVESTIGACION DE TANIA AROS', 'POR_PROYECTO', '2026-10-03', '2026-10-13', 1200, TRUE, 'Excel TABLA_M.O fila 12'),
  (3, 'CMO-2026-003', (SELECT id FROM specialists WHERE lower(full_name) = 'manuel enrique panduro rengifo' LIMIT 1), 'MANUEL ENRIQUE PANDURO RENGIFO', '40443237', (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), NULL, 'MARISOL FLORES', 'ASESORAMIENTO DE TESIS DE DERECHO', 'ASESORAR LA INVESTIGACION DE MARISOL FLORES', 'POR_PROYECTO', '2026-10-03', '2026-10-04', 40, TRUE, 'Excel TABLA_M.O fila 13'),
  (4, 'CMO-2026-004', (SELECT id FROM specialists WHERE lower(full_name) = 'teddy garcia murrieta' LIMIT 1), 'TEDDY GARCIA MURRIETA', '10250610', (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 1, 'WILMER SANCHEZ MAMANI', 'ASESORAMIENTO DE TESIS EN GENERAL', 'ASESORAR LA INVESTIGACION DE WILMER', 'POR_PROYECTO', '2026-09-18', '2026-10-18', 280, TRUE, 'Excel TABLA_M.O fila 14'),
  (5, 'CMO-2026-005', (SELECT id FROM specialists WHERE lower(full_name) = 'henry torres rivera' LIMIT 1), 'HENRY TORRES RIVERA', '73972788', (SELECT id FROM business_units WHERE code = 'UN03'), (SELECT id FROM areas WHERE code = 'U03-MET'), 1, 'WILMER SANCHEZ MAMANI', 'ASESORAMIENTO DE TESIS EN GENERAL', 'ASESORAR LA INVESTIGACION DE WILMER', 'POR_PROYECTO', '2026-09-18', '2026-10-18', 280, TRUE, 'Excel TABLA_M.O fila 15'),
  (6, 'CMO-2026-006', (SELECT id FROM specialists WHERE lower(full_name) = 'alanis pardavé' LIMIT 1), 'ALANIS PARDAVÉ', '61467305', (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'MKT'), NULL, 'BLACKBELT GROUP', 'MARKETEO DE REDES SOCIALES', 'ACTIVAR Y MEJORAR LAS REDES SOCIALES, PUBLICITAR Y REALIZAR DISEÑOS', 'MENSUAL', '2026-10-04', '2026-10-05', 700, TRUE, 'Excel TABLA_M.O fila 16'),
  (7, 'CMO-2026-007', (SELECT id FROM specialists WHERE lower(full_name) = 'johann imanol herrera ramos' LIMIT 1), 'JOHANN IMANOL HERRERA RAMOS', '73515597', (SELECT id FROM business_units WHERE code = 'CORP'), (SELECT id FROM areas WHERE code = 'ADM'), NULL, 'BLACKBELT GROUP', 'PRACTICANTE', 'MEJORAR EL SISTEMA DE BLACKBELT, ASI TAMBIEN COMO EL DESARROLLO DE ALGUNAS ACTIVIDADES', 'MENSUAL', '2026-10-08', '2026-11-08', 700, TRUE, 'Excel TABLA_M.O fila 17');

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
-- PASO 3 · CUENTA DE HENRY (Administrador)
-- ############################################################################
-- ==============================================================================
-- Primer usuario del sistema: Henry Torres Rivera, Gerente General (Administrador).
--
-- QUÉ HACE (seguro y repetible):
--   1. Pone su especialidad como "Gerente general" (si estaba como "Dirección general").
--   2. Crea su especialista si no existe.
--   3. Crea su usuario Administrador vinculado a su especialista, SOLO si aún no existe un
--      usuario con ese nombre o ese correo. No borra ni cambia otros usuarios.
--   4. Crea su cuenta para entrar con esa contraseña (o se la cambia si ya existía).
--
-- ANTES DE CORRERLO: cambia el correo y la contraseña en las líneas marcadas (se detiene si no).
-- La contraseña: mínimo 8 caracteres. Henry podrá cambiarla después en «Mi contraseña».
-- Se corre en Supabase → SQL Editor. Requiere las migraciones 20261015000001 (roles/users)
-- y 20261019000001 (login con contraseña). Después de correrlo, BORRA la contraseña de este texto.
-- ==============================================================================

DO $$
DECLARE
  v_email TEXT := current_setting('bb.correo_henry');   -- ← CAMBIA AQUÍ por el correo de Henry
  v_password TEXT := current_setting('bb.clave_henry');           -- ← CAMBIA AQUÍ por su contraseña (mínimo 8 caracteres)
  v_name  TEXT := 'Henry Torres Rivera';
  v_spec  INTEGER;
  v_role  INTEGER;
BEGIN
  IF v_email ILIKE 'CAMBIAR%' THEN
    RAISE EXCEPTION 'Primero cambia el correo de Henry en la línea marcada (v_email).';
  END IF;
  IF v_password = 'CAMBIAR' OR length(v_password) < 8 THEN
    RAISE EXCEPTION 'Primero pon la contraseña de Henry en la línea marcada (v_password, mínimo 8 caracteres).';
  END IF;
  IF to_regprocedure('public.admin_set_login(text,text)') IS NULL THEN
    RAISE EXCEPTION 'Falta la migración 20261019000001_login_con_contrasena.sql. Aplícala primero.';
  END IF;

  UPDATE specialists SET specialty = 'Gerente general'
   WHERE lower(full_name) = lower(v_name) AND (specialty IS NULL OR specialty = 'Dirección general');

  SELECT id INTO v_spec FROM specialists WHERE lower(full_name) = lower(v_name) ORDER BY id LIMIT 1;
  IF v_spec IS NULL THEN
    INSERT INTO specialists (full_name, email, specialty, active)
    VALUES (v_name, v_email, 'Gerente general', TRUE) RETURNING id INTO v_spec;
  END IF;

  SELECT id INTO v_role FROM roles WHERE code = 'admin';

  IF EXISTS (SELECT 1 FROM users WHERE lower(email) = lower(v_email)) THEN
    -- Ya existe con ese correo: se asegura que sea Administrador, activo y vinculado a su especialista.
    UPDATE users SET role_id = v_role, specialist_id = v_spec, active = TRUE WHERE lower(email) = lower(v_email);
    RAISE NOTICE 'Henry ya tenía usuario: quedó como Administrador y vinculado a su especialista.';
  ELSIF EXISTS (SELECT 1 FROM users WHERE lower(full_name) = lower(v_name)) THEN
    -- Ya existe con su nombre pero otro correo: se le pone el correo nuevo (el que usará para entrar).
    UPDATE users SET email = v_email, role_id = v_role, specialist_id = v_spec, active = TRUE WHERE lower(full_name) = lower(v_name);
    RAISE NOTICE 'Henry ya tenía usuario: ahora entra con %, como Administrador.', v_email;
  ELSE
    INSERT INTO users (email, full_name, role_id, specialist_id, active)
    VALUES (v_email, v_name, v_role, v_spec, TRUE);
    RAISE NOTICE 'Usuario de Henry Torres Rivera creado como Administrador.';
  END IF;

  -- Cuenta para entrar (correo + contraseña).
  RAISE NOTICE 'Cuenta para entrar: %', public.admin_set_login(v_email, v_password);

  IF EXISTS (SELECT 1 FROM users WHERE specialist_id = v_spec AND lower(full_name) <> lower(v_name) AND lower(email) <> lower(v_email)) THEN
    RAISE NOTICE 'Aviso: otro usuario también está vinculado al especialista de Henry. Revísalo en Equipo y cámbialo a "Ninguno".';
  END IF;
END $$;


-- ############################################################################
-- PASO 4 · VERIFICACIÓN (16 filas OK)
-- ############################################################################
-- ==============================================================================
-- PASO 3 de 3 · VERIFICAR que la base cuadra con el Excel. Todas las filas deben decir OK.
-- ==============================================================================

SELECT concepto, excel, en_la_base, CASE WHEN abs(excel - en_la_base) < 0.005 THEN 'OK' ELSE 'NO CUADRA' END AS estado
FROM (
  SELECT 'Ingresos (TABLA_INGRESOS)' AS concepto, 5240::numeric AS excel, (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'INGRESO_RECONOCIDO')::numeric AS en_la_base
  UNION ALL
  SELECT 'Cobros de clientes' AS concepto, 5240::numeric AS excel, (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'COBRO')::numeric AS en_la_base
  UNION ALL
  SELECT 'Egresos (TABLA_EGRESOS)' AS concepto, 4839.73::numeric AS excel, (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'COSTO_RECONOCIDO')::numeric AS en_la_base
  UNION ALL
  SELECT 'Pagos' AS concepto, 4839.73::numeric AS excel, (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'PAGO')::numeric AS en_la_base
  UNION ALL
  SELECT 'Inversión de socios (TABLA_INVERSIONES)' AS concepto, 1500::numeric AS excel, (SELECT coalesce(sum(amount), 0) FROM investments)::numeric AS en_la_base
  UNION ALL
  SELECT 'Fondo en caja' AS concepto, 1900.27::numeric AS excel, (SELECT (SELECT value::numeric FROM app_settings WHERE key = 'opening_cash') + coalesce(sum(CASE WHEN record_type IN ('COBRO','APORTE_SOCIO','PRESTAMO_RECIBIDO') THEN amount WHEN record_type IN ('PAGO','RETIRO_SOCIO','PAGO_PRESTAMO') THEN -amount ELSE 0 END), 0) FROM movements WHERE status = 'VALIDADO')::numeric AS en_la_base
  UNION ALL
  SELECT 'Monto contratado (TABLA_CLIENTES)' AS concepto, 8340::numeric AS excel, (SELECT coalesce(sum(contracted_amount), 0) FROM projects)::numeric AS en_la_base
  UNION ALL
  SELECT 'Monto pagado por clientes' AS concepto, 5240::numeric AS excel, (SELECT coalesce(sum(amount), 0) FROM project_payments)::numeric AS en_la_base
  UNION ALL
  SELECT 'Falta cobrar' AS concepto, 3100::numeric AS excel, (SELECT (SELECT coalesce(sum(contracted_amount), 0) FROM projects) - (SELECT coalesce(sum(amount), 0) FROM project_payments))::numeric AS en_la_base
  UNION ALL
  SELECT 'Adelantos cobrados en octubre 2025' AS concepto, 3550::numeric AS excel, (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'COBRO' AND movement_date BETWEEN '2025-10-01' AND '2025-10-31')::numeric AS en_la_base
  UNION ALL
  SELECT 'Mano de obra: monto requerido (TABLA_M.O)' AS concepto, 4700::numeric AS excel, (SELECT coalesce(sum(agreed_amount), 0) FROM labor_contracts WHERE active)::numeric AS en_la_base
  UNION ALL
  SELECT 'Mano de obra: monto pagado' AS concepto, 3300::numeric AS excel, (SELECT coalesce(sum(m.amount), 0) FROM movements m WHERE m.status = 'VALIDADO' AND m.record_type = 'COSTO_RECONOCIDO' AND m.notes LIKE '%Mano de obra CMO-%' AND EXISTS (SELECT 1 FROM movements p WHERE p.record_type = 'PAGO' AND p.status = 'VALIDADO' AND p.notes = 'Contrapartida de ' || m.movement_code))::numeric AS en_la_base
  UNION ALL
  SELECT 'Mano de obra: falta pagar' AS concepto, 1400::numeric AS excel, (SELECT (SELECT coalesce(sum(agreed_amount), 0) FROM labor_contracts WHERE active) - (SELECT coalesce(sum(m.amount), 0) FROM movements m WHERE m.status = 'VALIDADO' AND m.record_type = 'COSTO_RECONOCIDO' AND m.notes LIKE '%Mano de obra CMO-%' AND EXISTS (SELECT 1 FROM movements p WHERE p.record_type = 'PAGO' AND p.status = 'VALIDADO' AND p.notes = 'Contrapartida de ' || m.movement_code)))::numeric AS en_la_base
  UNION ALL
  SELECT 'Servicios y publicidad (TABLA_SERVICIOS Y PUBLICIDAD)' AS concepto, 446.1::numeric AS excel, (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'COSTO_RECONOCIDO' AND cost_category_id IN (SELECT id FROM cost_categories WHERE code IN ('SERV', 'PUB')))::numeric AS en_la_base
  UNION ALL
  SELECT 'Herramientas digitales (TABLA_HERRAMIENTAS)' AS concepto, 646.9::numeric AS excel, (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'COSTO_RECONOCIDO' AND cost_category_id = (SELECT id FROM cost_categories WHERE code = 'SOFT'))::numeric AS en_la_base
  UNION ALL
  SELECT 'Resultado (ingresos − egresos)' AS concepto, 400.27::numeric AS excel, (SELECT (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'INGRESO_RECONOCIDO') - (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'COSTO_RECONOCIDO'))::numeric AS en_la_base
) x;
