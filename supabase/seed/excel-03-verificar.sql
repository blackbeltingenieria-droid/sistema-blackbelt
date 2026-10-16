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
  SELECT 'Resultado (ingresos − egresos)' AS concepto, 400.27::numeric AS excel, (SELECT (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'INGRESO_RECONOCIDO') - (SELECT coalesce(sum(amount), 0) FROM movements WHERE status = 'VALIDADO' AND record_type = 'COSTO_RECONOCIDO'))::numeric AS en_la_base
) x;
