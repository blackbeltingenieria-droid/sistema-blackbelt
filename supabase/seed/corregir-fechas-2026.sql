-- ==============================================================================
-- CORREGIR FECHAS: los cobros del 15/10/2025 (Wilmer S/ 1,500 y Tania S/ 2,050) son del 15/10/2026.
-- La empresa empezó en 2026 (confirmado por la usuaria, 19/10/2026).
--
-- QUÉ HACE (no borra nada; si ya se corrió, no cambia nada):
--   1. A los movimientos con código MOV-2025-… les da el siguiente código MOV-2026-… libre
--      (y actualiza su enlace cobro ↔ ingreso, "Contrapartida de MOV-…").
--   2. Cambia la fecha 15/10/2025 → 15/10/2026 en movimientos y pagos de proyectos.
--   3. Muestra cuántos registros quedan antes de 2026 (debe ser 0).
-- Uso: Supabase → SQL Editor → pegar todo → Run.
-- ==============================================================================

DO $$
DECLARE
  r RECORD;
  v_next INTEGER;
  v_new TEXT;
BEGIN
  SELECT coalesce(max(substring(movement_code FROM 10)::int), 0) INTO v_next
    FROM movements WHERE movement_code ~ '^MOV-2026-[0-9]+$';
  FOR r IN SELECT id, movement_code FROM movements WHERE movement_code LIKE 'MOV-2025-%' ORDER BY movement_date, id LOOP
    v_next := v_next + 1;
    v_new := 'MOV-2026-' || lpad(v_next::text, 4, '0');
    UPDATE movements SET notes = 'Contrapartida de ' || v_new WHERE notes = 'Contrapartida de ' || r.movement_code;
    UPDATE movements SET movement_code = v_new WHERE id = r.id;
    RAISE NOTICE '% → %', r.movement_code, v_new;
  END LOOP;

  UPDATE movements SET movement_date = DATE '2026-10-15' WHERE movement_date = DATE '2025-10-15';
  UPDATE project_payments SET payment_date = DATE '2026-10-15' WHERE payment_date = DATE '2025-10-15';
END $$;

SELECT
  (SELECT count(*) FROM movements WHERE movement_date < DATE '2026-01-01') AS movimientos_antes_de_2026,
  (SELECT count(*) FROM project_payments WHERE payment_date < DATE '2026-01-01') AS pagos_antes_de_2026,
  CASE WHEN (SELECT count(*) FROM movements WHERE movement_date < DATE '2026-01-01') = 0
        AND (SELECT count(*) FROM project_payments WHERE payment_date < DATE '2026-01-01') = 0
       THEN 'OK' ELSE 'REVISAR' END AS estado;
