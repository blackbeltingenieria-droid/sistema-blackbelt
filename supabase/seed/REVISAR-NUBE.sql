-- ==============================================================================
-- REVISAR LA NUBE ANTES DE ACTUALIZAR (sistema BLACKBELT) — SOLO LECTURA, no cambia nada.
-- Generado por: npm run seed:excel:sql
-- Pega todo en Supabase → SQL Editor → Run. Sale UNA tabla:
--   1 · cifras de la base hoy frente al Excel nuevo
--   2 · movimientos registrados en la página que no vienen del Excel (si dice FALTA EN EL EXCEL, se perderían al actualizar)
--   3–5 · pagos de clientes, inversiones y contratos de mano de obra que no están en el Excel
--   6–7 · proyectos creados en la página, que chocan con el Excel o que ya no están en él
--   8 · lo que se conserva
-- ==============================================================================

WITH xls (fecha, tipo, monto, origen) AS (VALUES
    ('2026-08-14'::date, 'COSTO_RECONOCIDO', 10::numeric, 'Excel TABLA_EGRESOS fila 18'),
    ('2026-08-15'::date, 'COSTO_RECONOCIDO', 20::numeric, 'Excel TABLA_EGRESOS fila 17'),
    ('2026-08-16'::date, 'APORTE_SOCIO', 1000::numeric, 'Excel TABLA_INVERSIONES fila 7'),
    ('2026-08-16'::date, 'COSTO_RECONOCIDO', 36::numeric, 'Excel TABLA_EGRESOS fila 14'),
    ('2026-08-16'::date, 'COSTO_RECONOCIDO', 80::numeric, 'Excel TABLA_EGRESOS fila 15'),
    ('2026-08-18'::date, 'COSTO_RECONOCIDO', 40::numeric, 'Excel TABLA_EGRESOS fila 13'),
    ('2026-08-18'::date, 'COSTO_RECONOCIDO', 39.9::numeric, 'Excel TABLA_EGRESOS fila 16'),
    ('2026-08-21'::date, 'COSTO_RECONOCIDO', 200::numeric, 'Excel TABLA_EGRESOS fila 19'),
    ('2026-09-04'::date, 'COSTO_RECONOCIDO', 100::numeric, 'Excel TABLA_EGRESOS fila 9'),
    ('2026-09-04'::date, 'COSTO_RECONOCIDO', 150::numeric, 'Excel TABLA_EGRESOS fila 10'),
    ('2026-09-04'::date, 'COSTO_RECONOCIDO', 57.1::numeric, 'Excel TABLA_EGRESOS fila 11'),
    ('2026-09-04'::date, 'COSTO_RECONOCIDO', 26.6::numeric, 'Excel TABLA_EGRESOS fila 12'),
    ('2026-09-15'::date, 'COSTO_RECONOCIDO', 20::numeric, 'Excel TABLA_EGRESOS fila 24'),
    ('2026-09-15'::date, 'COSTO_RECONOCIDO', 200::numeric, 'Excel TABLA_EGRESOS fila 25'),
    ('2026-09-16'::date, 'COSTO_RECONOCIDO', 36::numeric, 'Excel TABLA_EGRESOS fila 21'),
    ('2026-09-18'::date, 'APORTE_SOCIO', 500::numeric, 'Excel TABLA_INVERSIONES fila 8'),
    ('2026-09-18'::date, 'PRESTAMO_RECIBIDO', 500::numeric, 'Excel TABLA_INVERSIONES fila 9'),
    ('2026-09-18'::date, 'COSTO_RECONOCIDO', 40::numeric, 'Excel TABLA_EGRESOS fila 20'),
    ('2026-09-18'::date, 'COSTO_RECONOCIDO', 39.9::numeric, 'Excel TABLA_EGRESOS fila 23'),
    ('2026-09-20'::date, 'COSTO_RECONOCIDO', 33.9::numeric, 'Excel TABLA_EGRESOS fila 22'),
    ('2026-09-21'::date, 'COSTO_RECONOCIDO', 250.06::numeric, 'Excel TABLA_EGRESOS fila 26'),
    ('2026-09-24'::date, 'INGRESO_RECONOCIDO', 800::numeric, 'Excel TABLA_INGRESOS fila 8'),
    ('2026-10-02'::date, 'COSTO_RECONOCIDO', 80::numeric, 'Excel TABLA_EGRESOS fila 27'),
    ('2026-10-02'::date, 'COSTO_RECONOCIDO', 86::numeric, 'Excel TABLA_EGRESOS fila 28'),
    ('2026-10-04'::date, 'COSTO_RECONOCIDO', 40::numeric, 'Excel TABLA_EGRESOS fila 29'),
    ('2026-10-04'::date, 'COSTO_RECONOCIDO', 100::numeric, 'Excel TABLA_EGRESOS fila 30'),
    ('2026-10-06'::date, 'COSTO_RECONOCIDO', 10::numeric, 'Excel TABLA_EGRESOS fila 31'),
    ('2026-10-06'::date, 'COSTO_RECONOCIDO', 175::numeric, 'Excel TABLA_EGRESOS fila 32'),
    ('2026-10-07'::date, 'INGRESO_RECONOCIDO', 90::numeric, 'Excel TABLA_INGRESOS fila 9'),
    ('2026-10-08'::date, 'COSTO_RECONOCIDO', 76.34::numeric, 'Excel TABLA_EGRESOS fila 33'),
    ('2026-10-10'::date, 'INGRESO_RECONOCIDO', 400::numeric, 'Excel TABLA_INGRESOS fila 10'),
    ('2026-10-10'::date, 'INGRESO_RECONOCIDO', 400::numeric, 'Excel TABLA_INGRESOS fila 11'),
    ('2026-10-12'::date, 'COSTO_RECONOCIDO', 125::numeric, 'Excel TABLA_EGRESOS fila 34'),
    ('2026-10-12'::date, 'COSTO_RECONOCIDO', 15::numeric, 'Excel TABLA_EGRESOS fila 35'),
    ('2026-10-12'::date, 'COSTO_RECONOCIDO', 8::numeric, 'Excel TABLA_EGRESOS fila 36'),
    ('2026-10-13'::date, 'COSTO_RECONOCIDO', 77.9::numeric, 'Excel TABLA_EGRESOS fila 37'),
    ('2026-10-13'::date, 'COSTO_RECONOCIDO', 250::numeric, 'Excel TABLA_EGRESOS fila 38'),
    ('2026-10-14'::date, 'COSTO_RECONOCIDO', 39.9::numeric, 'Excel TABLA_EGRESOS fila 39'),
    ('2026-10-15'::date, 'INGRESO_RECONOCIDO', 1500::numeric, 'Excel TABLA_INGRESOS fila 12'),
    ('2026-10-15'::date, 'INGRESO_RECONOCIDO', 2050::numeric, 'Excel TABLA_INGRESOS fila 13'),
    ('2026-10-15'::date, 'COSTO_RECONOCIDO', 900::numeric, 'Excel TABLA_EGRESOS fila 40'),
    ('2026-10-15'::date, 'COSTO_RECONOCIDO', 1300::numeric, 'Excel TABLA_EGRESOS fila 41'),
    ('2026-10-15'::date, 'COSTO_RECONOCIDO', 12.13::numeric, 'Excel TABLA_EGRESOS fila 42'),
    ('2026-10-15'::date, 'COSTO_RECONOCIDO', 100::numeric, 'Excel TABLA_EGRESOS fila 43'),
    ('2026-10-15'::date, 'COSTO_RECONOCIDO', 45::numeric, 'Excel TABLA_EGRESOS fila 44'),
    ('2026-10-16'::date, 'COSTO_RECONOCIDO', 341.11::numeric, 'Excel TABLA_EGRESOS fila 45'),
    ('2026-10-16'::date, 'COSTO_RECONOCIDO', 100::numeric, 'Excel TABLA_EGRESOS fila 46'),
    ('2026-10-18'::date, 'COSTO_RECONOCIDO', 112::numeric, 'Excel TABLA_EGRESOS fila 47'),
    ('2026-10-21'::date, 'COSTO_RECONOCIDO', 41.38::numeric, 'Excel TABLA_EGRESOS fila 48'),
    ('2026-10-22'::date, 'COSTO_RECONOCIDO', 48.32::numeric, 'Excel TABLA_EGRESOS fila 49'),
    ('2026-10-22'::date, 'COSTO_RECONOCIDO', 171::numeric, 'Excel TABLA_EGRESOS fila 50'),
    ('2026-10-22'::date, 'COSTO_RECONOCIDO', 71.32::numeric, 'Excel TABLA_EGRESOS fila 51'),
    ('2026-10-24'::date, 'INGRESO_RECONOCIDO', 100::numeric, 'Excel TABLA_INGRESOS fila 14'),
    ('2026-10-24'::date, 'COSTO_RECONOCIDO', 49::numeric, 'Excel TABLA_EGRESOS fila 52'),
    ('2026-10-24'::date, 'COSTO_RECONOCIDO', 70.58::numeric, 'Excel TABLA_EGRESOS fila 53'),
    ('2026-10-28'::date, 'COSTO_RECONOCIDO', 136.96::numeric, 'Excel TABLA_EGRESOS fila 54'),
    ('2026-11-01'::date, 'COSTO_RECONOCIDO', 10::numeric, 'Excel TABLA_EGRESOS fila 55'),
    ('2026-11-01'::date, 'COSTO_RECONOCIDO', 260.7::numeric, 'Excel TABLA_EGRESOS fila 56'),
    ('2026-11-02'::date, 'COSTO_RECONOCIDO', 50::numeric, 'Excel TABLA_EGRESOS fila 57'),
    ('2026-11-02'::date, 'COSTO_RECONOCIDO', 45::numeric, 'Excel TABLA_EGRESOS fila 58'),
    ('2026-11-03'::date, 'COSTO_RECONOCIDO', 10::numeric, 'Excel TABLA_EGRESOS fila 59'),
    ('2026-11-03'::date, 'COSTO_RECONOCIDO', 10::numeric, 'Excel TABLA_EGRESOS fila 60'),
    ('2026-11-04'::date, 'COSTO_RECONOCIDO', 10::numeric, 'Excel TABLA_EGRESOS fila 61'),
    ('2026-11-05'::date, 'COSTO_RECONOCIDO', 10::numeric, 'Excel TABLA_EGRESOS fila 62'),
    ('2026-11-06'::date, 'INGRESO_RECONOCIDO', 200::numeric, 'Excel TABLA_INGRESOS fila 15'),
    ('2026-11-07'::date, 'INGRESO_RECONOCIDO', 100::numeric, 'Excel TABLA_INGRESOS fila 16'),
    ('2026-11-07'::date, 'COSTO_RECONOCIDO', 7.5::numeric, 'Excel TABLA_EGRESOS fila 63'),
    ('2026-11-07'::date, 'COSTO_RECONOCIDO', 100::numeric, 'Excel TABLA_EGRESOS fila 64'),
    ('2026-11-07'::date, 'COSTO_RECONOCIDO', 7.5::numeric, 'Excel TABLA_EGRESOS fila 65'),
    ('2026-11-07'::date, 'COSTO_RECONOCIDO', 300::numeric, 'Excel TABLA_EGRESOS fila 66'),
    ('2026-11-07'::date, 'COSTO_RECONOCIDO', 7.5::numeric, 'Excel TABLA_EGRESOS fila 67'),
    ('2026-11-07'::date, 'COSTO_RECONOCIDO', 40::numeric, 'Excel TABLA_EGRESOS fila 68'),
    ('2026-11-08'::date, 'INGRESO_RECONOCIDO', 350::numeric, 'Excel TABLA_INGRESOS fila 17'),
    ('2026-11-08'::date, 'INGRESO_RECONOCIDO', 200::numeric, 'Excel TABLA_INGRESOS fila 18'),
    ('2026-11-08'::date, 'INGRESO_RECONOCIDO', 90::numeric, 'Excel TABLA_INGRESOS fila 19'),
    ('2026-11-08'::date, 'COSTO_RECONOCIDO', 7.5::numeric, 'Excel TABLA_EGRESOS fila 69'),
    ('2026-11-08'::date, 'COSTO_RECONOCIDO', 40::numeric, 'Excel TABLA_EGRESOS fila 70'),
    ('2026-11-08'::date, 'COSTO_RECONOCIDO', 7.5::numeric, 'Excel TABLA_EGRESOS fila 71'),
    ('2026-11-08'::date, 'COSTO_RECONOCIDO', 130::numeric, 'Excel TABLA_EGRESOS fila 72'),
    ('2026-11-08'::date, 'COSTO_RECONOCIDO', 7.5::numeric, 'Excel TABLA_EGRESOS fila 73'),
    ('2026-11-08'::date, 'COSTO_RECONOCIDO', 700::numeric, 'Excel TABLA_EGRESOS fila 74'),
    ('2026-11-08'::date, 'COSTO_RECONOCIDO', 140::numeric, 'Excel TABLA_EGRESOS fila 75'),
    ('2026-11-09'::date, 'COSTO_RECONOCIDO', 78.42::numeric, 'Excel TABLA_EGRESOS fila 76'),
    ('2026-11-12'::date, 'COSTO_RECONOCIDO', 190::numeric, 'Excel TABLA_EGRESOS fila 77')
), xp (id, code, client_id, cliente) AS (VALUES
    (1, 'PRY-2026-001', 1, 'WILMER WILFREDO SANCHEZ MAMANI'),
    (2, 'PRY-2026-002', 2, 'ERIKA MERINO ROÑA'),
    (3, 'PRY-2026-003', 3, 'TANIA LUCIA AROS RENGIFO'),
    (4, 'PRY-2026-004', 4, 'DIAZ CASTRO STHEFANY'),
    (5, 'PRY-2026-005', 5, 'ANTHENOL BENITO FARROMEQUE MUTTO'),
    (6, 'PRY-2026-006', 6, 'ÁNGELES MARIANA ESTHER'),
    (7, 'PRY-2026-007', 7, 'JUAN RICARDO ESPINO'),
    (8, 'PRY-2026-008', 8, 'DIANA KOICHEOSKI'),
    (9, 'PRY-2026-009', 9, 'JACKELINE IRINA ARIAS MAMNI'),
    (10, 'PRY-2026-010', 10, 'SHOTHELAY INDIRA ROSMERY CHILLITUPA PALACIOS'),
    (11, 'PRY-2026-011', 11, 'JULISSA ELIANA MAMANI SUCASAIRE'),
    (13, 'PRY-2026-013', 13, 'JHON SMITH COAQUIRA LIPA'),
    (14, 'PRY-2026-014', 14, 'MARISOL FLORES')
)
SELECT seccion, detalle, en_la_base, excel, estado FROM (
  SELECT 1, '1 · CIFRAS (base hoy vs Excel nuevo)', 'Ingresos', to_char((SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'INGRESO_RECONOCIDO'), 'FM999,999,990.00'), to_char(6280, 'FM999,999,990.00'), CASE WHEN abs(((SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'INGRESO_RECONOCIDO')) - 6280) < 0.005 THEN 'igual' ELSE 'cambia' END
  UNION ALL
  SELECT 2, '1 · CIFRAS (base hoy vs Excel nuevo)', 'Egresos', to_char((SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'COSTO_RECONOCIDO'), 'FM999,999,990.00'), to_char(8130.52, 'FM999,999,990.00'), CASE WHEN abs(((SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'COSTO_RECONOCIDO')) - 8130.52) < 0.005 THEN 'igual' ELSE 'cambia' END
  UNION ALL
  SELECT 3, '1 · CIFRAS (base hoy vs Excel nuevo)', 'Aportes de socios', to_char((SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'APORTE_SOCIO'), 'FM999,999,990.00'), to_char(1500, 'FM999,999,990.00'), CASE WHEN abs(((SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'APORTE_SOCIO')) - 1500) < 0.005 THEN 'igual' ELSE 'cambia' END
  UNION ALL
  SELECT 4, '1 · CIFRAS (base hoy vs Excel nuevo)', 'Préstamos recibidos', to_char((SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'PRESTAMO_RECIBIDO'), 'FM999,999,990.00'), to_char(500, 'FM999,999,990.00'), CASE WHEN abs(((SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'PRESTAMO_RECIBIDO')) - 500) < 0.005 THEN 'igual' ELSE 'cambia' END
  UNION ALL
  SELECT 5, '1 · CIFRAS (base hoy vs Excel nuevo)', 'Caja', to_char((SELECT coalesce((SELECT value::numeric FROM app_settings WHERE key = 'opening_cash'), 0)) + (SELECT coalesce(sum(CASE WHEN record_type IN ('COBRO','APORTE_SOCIO','PRESTAMO_RECIBIDO') THEN amount WHEN record_type IN ('PAGO','RETIRO_SOCIO','PAGO_PRESTAMO') THEN -amount ELSE 0 END), 0) FROM movements WHERE status = 'VALIDADO'), 'FM999,999,990.00'), to_char(149.48, 'FM999,999,990.00'), CASE WHEN abs(((SELECT coalesce((SELECT value::numeric FROM app_settings WHERE key = 'opening_cash'), 0)) + (SELECT coalesce(sum(CASE WHEN record_type IN ('COBRO','APORTE_SOCIO','PRESTAMO_RECIBIDO') THEN amount WHEN record_type IN ('PAGO','RETIRO_SOCIO','PAGO_PRESTAMO') THEN -amount ELSE 0 END), 0) FROM movements WHERE status = 'VALIDADO')) - 149.48) < 0.005 THEN 'igual' ELSE 'cambia' END
  UNION ALL
  SELECT 6, '1 · CIFRAS (base hoy vs Excel nuevo)', 'Monto contratado', to_char((SELECT coalesce(sum(contracted_amount), 0) FROM projects), 'FM999,999,990.00'), to_char(15720, 'FM999,999,990.00'), CASE WHEN abs(((SELECT coalesce(sum(contracted_amount), 0) FROM projects)) - 15720) < 0.005 THEN 'igual' ELSE 'cambia' END
  UNION ALL
  SELECT 7, '1 · CIFRAS (base hoy vs Excel nuevo)', 'Pagado por clientes', to_char((SELECT coalesce(sum(amount), 0) FROM project_payments), 'FM999,999,990.00'), to_char(6280, 'FM999,999,990.00'), CASE WHEN abs(((SELECT coalesce(sum(amount), 0) FROM project_payments)) - 6280) < 0.005 THEN 'igual' ELSE 'cambia' END
  UNION ALL
  SELECT 8, '1 · CIFRAS (base hoy vs Excel nuevo)', 'Mano de obra acordada', to_char((SELECT coalesce(sum(agreed_amount), 0) FROM labor_contracts WHERE active), 'FM999,999,990.00'), to_char(5870, 'FM999,999,990.00'), CASE WHEN abs(((SELECT coalesce(sum(agreed_amount), 0) FROM labor_contracts WHERE active)) - 5870) < 0.005 THEN 'igual' ELSE 'cambia' END
  UNION ALL
  SELECT 9, '1 · CIFRAS (base hoy vs Excel nuevo)', 'Cantidad de movimientos', to_char((SELECT count(*)::numeric FROM movements), 'FM999,999,990.00'), to_char(165, 'FM999,999,990.00'), CASE WHEN abs(((SELECT count(*)::numeric FROM movements)) - 165) < 0.005 THEN 'igual' ELSE 'cambia' END
  UNION ALL
  SELECT 10, '1 · CIFRAS (base hoy vs Excel nuevo)', 'Cantidad de proyectos', to_char((SELECT count(*)::numeric FROM projects), 'FM999,999,990.00'), to_char(13, 'FM999,999,990.00'), CASE WHEN abs(((SELECT count(*)::numeric FROM projects)) - 13) < 0.005 THEN 'igual' ELSE 'cambia' END
  UNION ALL
  SELECT 100 + row_number() OVER (ORDER BY m.movement_date, m.id), '2 · REGISTRADO EN LA PÁGINA (no viene del Excel)',
    m.movement_code || ' · ' || to_char(m.movement_date, 'DD/MM/YYYY') || ' · ' || m.record_type || ' · ' || coalesce(m.detail, '') || coalesce(' · ' || m.counterparty, '') || ' · ' || m.status,
    to_char(m.amount, 'FM999,999,990.00'), coalesce((SELECT string_agg(x.origen, ', ') FROM xls x WHERE x.fecha = m.movement_date AND x.tipo = m.record_type AND x.monto = m.amount), ''),
    CASE WHEN EXISTS (SELECT 1 FROM xls x WHERE x.fecha = m.movement_date AND x.tipo = m.record_type AND x.monto = m.amount)
         THEN 'ya está en el Excel (mismo día, tipo y monto)' ELSE 'FALTA EN EL EXCEL' END
  FROM movements m WHERE coalesce(m.notes, '') NOT LIKE '%Excel TABLA_%' AND coalesce(m.notes, '') NOT LIKE 'Contrapartida de %'
  UNION ALL
  SELECT 300 + row_number() OVER (ORDER BY pp.payment_date, pp.id), '3 · PAGO DE CLIENTE que no está en el Excel',
    coalesce(p.code, '?') || ' · ' || coalesce(c.name, '?') || ' · ' || to_char(pp.payment_date, 'DD/MM/YYYY'), to_char(pp.amount, 'FM999,999,990.00'), '', 'FALTA EN EL EXCEL'
  FROM project_payments pp LEFT JOIN projects p ON p.id = pp.project_id LEFT JOIN clients c ON c.id = p.client_id
  WHERE NOT EXISTS (SELECT 1 FROM (VALUES (1, 800::numeric, '2026-09-24'::date), (4, 90::numeric, '2026-10-07'::date), (5, 400::numeric, '2026-10-10'::date), (2, 400::numeric, '2026-10-10'::date), (1, 1500::numeric, '2026-10-15'::date), (3, 2050::numeric, '2026-10-15'::date), (6, 100::numeric, '2026-10-24'::date), (11, 200::numeric, '2026-11-06'::date), (7, 100::numeric, '2026-11-07'::date), (1, 350::numeric, '2026-11-08'::date), (5, 200::numeric, '2026-11-08'::date), (10, 90::numeric, '2026-11-08'::date)) AS x(project_id, amount, fecha) WHERE x.project_id = pp.project_id AND x.amount = pp.amount AND x.fecha = pp.payment_date)
  UNION ALL
  SELECT 400 + row_number() OVER (ORDER BY i.investment_date, i.id), '4 · INVERSIÓN que no está en el Excel',
    i.code || ' · ' || i.kind || ' · ' || i.investor_name || ' · ' || to_char(i.investment_date, 'DD/MM/YYYY'), to_char(i.amount, 'FM999,999,990.00'), '', 'FALTA EN EL EXCEL'
  FROM investments i WHERE NOT EXISTS (SELECT 1 FROM (VALUES ('2026-08-16'::date, 1000::numeric, 'patrimonio'), ('2026-09-18'::date, 500::numeric, 'patrimonio'), ('2026-09-18'::date, 500::numeric, 'deuda')) AS x(fecha, amount, kind) WHERE x.fecha = i.investment_date AND x.amount = i.amount)
  UNION ALL
  SELECT 500 + row_number() OVER (ORDER BY l.id), '5 · CONTRATO DE MANO DE OBRA creado en la página',
    l.code || ' · ' || l.worker_name || ' · ' || coalesce(l.service, ''), to_char(l.agreed_amount, 'FM999,999,990.00'), '', 'FALTA EN EL EXCEL'
  FROM labor_contracts l WHERE coalesce(l.notes, '') NOT LIKE 'Excel TABLA_M.O%'
  UNION ALL
  SELECT 600 + row_number() OVER (ORDER BY p.id), '6 · PROYECTO creado en la página o que choca con el Excel',
    p.id || ' · ' || coalesce(p.code, '') || ' · ' || coalesce(c.name, '?') || ' · ' || coalesce(p.name, ''), to_char(p.contracted_amount, 'FM999,999,990.00'),
    coalesce((SELECT x.code || ' · ' || x.cliente FROM xp x WHERE x.id = p.id), '(no está en el Excel)'),
    CASE WHEN coalesce(p.notes, '') NOT LIKE '%Excel TABLA_CLIENTES fila%' THEN 'CREADO EN LA PÁGINA'
         ELSE 'MISMO ID, OTRO PROYECTO' END
  FROM projects p LEFT JOIN clients c ON c.id = p.client_id
  WHERE coalesce(p.notes, '') NOT LIKE '%Excel TABLA_CLIENTES fila%'
     OR EXISTS (SELECT 1 FROM xp x WHERE x.id = p.id AND (x.code <> coalesce(p.code, '') OR x.client_id <> p.client_id))
  UNION ALL
  SELECT 700 + row_number() OVER (ORDER BY p.id), '7 · PROYECTO que ya no está en el Excel (se quitaría)',
    coalesce(p.code, '') || ' · ' || coalesce(c.name, '?'), to_char(p.contracted_amount, 'FM999,999,990.00'),
    (SELECT count(*) FROM tasks t WHERE t.project_id = p.id) || ' tareas · ' || (SELECT count(*) FROM work_hours w WHERE w.project_id = p.id) || ' registros de horas',
    CASE WHEN EXISTS (SELECT 1 FROM tasks t WHERE t.project_id = p.id) OR EXISTS (SELECT 1 FROM work_hours w WHERE w.project_id = p.id) THEN 'TIENE TRABAJO: revisar' ELSE 'se puede quitar' END
  FROM projects p LEFT JOIN clients c ON c.id = p.client_id
  WHERE p.notes LIKE '%Excel TABLA_CLIENTES fila%' AND NOT EXISTS (SELECT 1 FROM xp x WHERE x.id = p.id)
  UNION ALL
  SELECT 800, '8 · SE CONSERVA (no se toca)', 'Tareas · sprints · horas · metas · usuarios', NULL,
    (SELECT count(*) FROM tasks) || ' · ' || (SELECT count(*) FROM sprints) || ' · ' || (SELECT count(*) FROM work_hours) || ' · ' || (SELECT count(*) FROM budgets) || ' · ' || (SELECT count(*) FROM users), 'info'
  UNION ALL
  SELECT 801, '8 · SE CONSERVA (no se toca)', 'Respaldos ya existentes', NULL,
    coalesce((SELECT string_agg(DISTINCT substring(tablename FROM '^(respaldo_[0-9]+)'), ', ') FROM pg_tables WHERE tablename LIKE 'respaldo_%'), 'ninguno'), 'info'
) AS r(orden, seccion, detalle, en_la_base, excel, estado)
ORDER BY orden;
