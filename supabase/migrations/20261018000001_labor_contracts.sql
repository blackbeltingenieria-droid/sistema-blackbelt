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
