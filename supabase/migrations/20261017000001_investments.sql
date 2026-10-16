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
