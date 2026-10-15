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
