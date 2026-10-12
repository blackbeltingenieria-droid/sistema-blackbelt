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
