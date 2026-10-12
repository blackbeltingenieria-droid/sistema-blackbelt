-- ==============================================================================
-- Migración: 20261012000001_modelo_c_catalogs.sql
-- Descripción: Actualización de catálogos base según Excel oficial Modelo C
--              (01_UNIDADES, 02_AREAS, 03_CATEGORIAS, 04_CLIENTES, 05_PROYECTOS)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. UNIDADES DE NEGOCIO (business_units)
-- Actualizar esquema y migrar registros existentes a UN01-UN05 + CORP
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS business_units
  ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#15130F',
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Activo',
  ADD COLUMN IF NOT EXISTS scope TEXT;

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS business_units (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#15130F',
  status VARCHAR(20) NOT NULL DEFAULT 'Activo',
  scope TEXT
);

-- Upsert de las 6 unidades oficiales del Modelo C
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

SELECT setval(pg_get_serial_sequence('business_units', 'id'), (SELECT MAX(id) FROM business_units));

-- ------------------------------------------------------------------------------
-- 2. ÁREAS FUNCIONALES (areas) — Tabla nueva
-- Generales (DIR, MKT, ADM, FIN, RRHH, CAL) y Específicas por unidad
-- ------------------------------------------------------------------------------
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
  -- Generales (sirven a toda la empresa, business_unit_id es NULL)
  (1,  'DIR',     'Dirección General',                   'General',    NULL, 'Gestión estratégica, dirección y alianzas'),
  (2,  'MKT',     'Marketing y Ventas Corporativo',      'General',    NULL, 'Promoción propia y captación para cualquiera de las cinco unidades'),
  (3,  'ADM',     'Administración y Servicios',          'General',    NULL, 'Telecomunicaciones generales, oficina, logística administrativa'),
  (4,  'FIN',     'Finanzas y Contabilidad',             'General',    NULL, 'Tesorería, costos, presupuestos, contabilidad'),
  (5,  'RRHH',    'Talento Humano',                      'General',    NULL, 'Contratación, personas, especialistas'),
  (6,  'CAL',     'Calidad y Control',                   'General',    NULL, 'Control de entregables y procesos internos'),
  -- Específicas UN01
  (7,  'U01-OPS', 'Operaciones y Diagnóstico',           'Específica', 1,    'Diagnóstico y optimización operativa'),
  (8,  'U01-MEJ', 'Mejora Continua y Productividad',     'Específica', 1,    'Lean, indicadores y productividad'),
  (9,  'U01-CAL', 'Calidad de Procesos',                 'Específica', 1,    'Calidad y estandarización en clientes'),
  -- Específicas UN02
  (10, 'U02-DEV', 'Desarrollo de Software',              'Específica', 2,    'Aplicaciones y sistemas'),
  (11, 'U02-DAT', 'Datos e Inteligencia de Negocios',    'Específica', 2,    'BI, analítica y tableros'),
  (12, 'U02-IMP', 'Implementación Tecnológica',          'Específica', 2,    'Soporte e implantación'),
  -- Específicas UN03
  (13, 'U03-MET', 'Metodología e Investigación',         'Específica', 3,    'Diseño y análisis metodológico'),
  (14, 'U03-TEC', 'Desarrollo Técnico y Experimental',   'Específica', 3,    'Prototipos, modelos y ensayos'),
  (15, 'U03-REV', 'Revisión y Calidad Científica',       'Específica', 3,    'Revisión técnica y científica'),
  -- Específicas UN04
  (16, 'U04-CAM', 'Operaciones de Campo',                'Específica', 4,    'Adquisición y levantamiento de campo'),
  (17, 'U04-INT', 'Procesamiento e Interpretación',      'Específica', 4,    'Procesamiento de datos técnicos'),
  -- Específicas UN05
  (18, 'U05-INN', 'Innovación y Emprendimiento',         'Específica', 5,    'Innovación, ideación y prototipado de negocios'),
  (19, 'U05-CON', 'Consultoría Empresarial',             'Específica', 5,    'Gestión de empresas y estrategia'),
  (20, 'U05-CAP', 'Capacitación y Formación Profesional','Específica', 5,    'Diseñar, organizar, comercializar y ejecutar programas de capacitación para personas, emprendedores, profesionales y organizaciones.'),
  (21, 'U05-MER', 'Marketing para Clientes',             'Específica', 5,    'Marketing como servicio facturable a clientes, NO publicidad propia de Blackbelt')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  business_unit_id = EXCLUDED.business_unit_id,
  description = EXCLUDED.description;

SELECT setval(pg_get_serial_sequence('areas', 'id'), (SELECT MAX(id) FROM areas));

-- ------------------------------------------------------------------------------
-- 3. CATEGORÍAS DE COSTO (cost_categories) — Reemplaza "las 6M" con las 17 del Modelo C
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cost_categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  main_rule TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar columna main_rule si no existe
ALTER TABLE cost_categories
  ADD COLUMN IF NOT EXISTS main_rule TEXT;

-- Vaciar categorías anteriores si contenían las 6M y cargar las 17 oficiales
INSERT INTO cost_categories (id, code, name, description, main_rule)
VALUES
  (1,  'MO',   'Mano de obra y especialistas',       'Pago a especialistas, personal por proyecto, honorarios', 'Puede ser directo, atribuible o compartido'),
  (2,  'PUB',  'Publicidad y captación',              'Meta Ads, Google Ads, diseño de campañas', 'Área MKT; asignar a unidad anunciada'),
  (3,  'SOFT', 'Software y herramientas digitales',  'Canva, plataformas de IA, videollamadas', 'Asignar al uso real; si transversal CORP'),
  (4,  'SERV', 'Servicios y telecomunicaciones',     'Bitel, internet, luz, alquiler de servicios', 'CORP si es general; unidad si exclusivo'),
  (5,  'MAT',  'Materiales e insumos',                'Consumibles para desarrollo o ejecución', 'Directo si pertenece a un proyecto'),
  (6,  'MAQ',  'Maquinaria y equipos',                'Máquinas, instrumentos, equipos', 'Normalmente activo; costo por uso/depreciación por separado'),
  (7,  'MOV',  'Transporte y viáticos',               'Traslados, campo, alojamientos, movilidad', 'Directo para proyecto o compartido'),
  (8,  'TERC', 'Servicios tercerizados',             'Subcontratistas, laboratorios y soporte externo', 'Asignar a proyecto cuando corresponda'),
  (9,  'ADM',  'Administración y trámites',           'Notaría, RUC, servicios legales, trámites', 'CORP si benefician a empresa completa'),
  (10, 'CAP',  'Capacitación',                        'Cursos y certificaciones', 'Según beneficiario real'),
  (11, 'BAN',  'Comisiones bancarias',                'Comisiones de banco, pasarelas', 'Unidad si imputable o CORP'),
  (12, 'MANT', 'Mantenimiento',                       'Repuestos, mantenimiento de equipos', 'Unidad específica o compartido'),
  (13, 'ACT',  'Adquisición de activos',              'Compra de maquinaria, computadoras, equipos', 'No sumar como gasto operativo directo al comprar'),
  (14, 'CXC',  'Cobros de clientes',                  'Entrada de efectivo por contratos', 'Flujo de caja; no duplicar ingreso devengado'),
  (15, 'CXP',  'Pagos a proveedores',                 'Salida de efectivo de obligaciones', 'Flujo de caja; no duplicar gasto devengado'),
  (16, 'SOC',  'Aportes y retiros de socios',         'Financiamiento o retiro patrimonial', 'No confundir con rentabilidad'),
  (17, 'OTR',  'Otros',                               'Conceptos sin categoría específica', 'Usar solo justificando clasificación')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  main_rule = EXCLUDED.main_rule;

SELECT setval(pg_get_serial_sequence('cost_categories', 'id'), (SELECT MAX(id) FROM cost_categories));

-- ------------------------------------------------------------------------------
-- 4. CLIENTES (clients) — Campos según hoja 04_CLIENTES
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS client_type VARCHAR(20) DEFAULT 'Persona',
  ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS email VARCHAR(100),
  ADD COLUMN IF NOT EXISTS location VARCHAR(150),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ------------------------------------------------------------------------------
-- 5. PROYECTOS (projects) — Campos según hoja 05_PROYECTOS
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS projects
  ADD COLUMN IF NOT EXISTS code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS manager VARCHAR(150),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS contract_url TEXT,
  ADD COLUMN IF NOT EXISTS area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL;
