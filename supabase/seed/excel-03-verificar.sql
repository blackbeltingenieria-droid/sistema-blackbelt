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
  SELECT 'Monto contratado (TABLA_CLIENTES)' AS concepto, 13730::numeric AS excel, (SELECT coalesce(sum(contracted_amount), 0) FROM projects)::numeric AS en_la_base
  UNION ALL
  SELECT 'Monto pagado por clientes' AS concepto, 5340::numeric AS excel, (SELECT coalesce(sum(amount), 0) FROM project_payments)::numeric AS en_la_base
  UNION ALL
  SELECT 'Falta cobrar (contratado − pagado)' AS concepto, 8390::numeric AS excel, (SELECT (SELECT coalesce(sum(contracted_amount), 0) FROM projects) - (SELECT coalesce(sum(amount), 0) FROM project_payments))::numeric AS en_la_base
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
