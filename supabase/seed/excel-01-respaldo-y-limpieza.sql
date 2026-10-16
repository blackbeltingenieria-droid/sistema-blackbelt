-- ==============================================================================
-- PASO 1 de 3 · RESPALDO Y LIMPIEZA antes de cargar el Excel «CUADRO DE COSTOS».
-- Generado por: npm run seed:excel:sql
--
-- Qué hace:
--   1. Copia cada tabla de datos a "respaldo_20261016_<tabla>" (para poder recuperar cualquier cosa).
--   2. Vacía: work_hours, tasks, sprints, movements, budgets, corp_allocation, project_payments, projects, clients, investments.
--   3. Quita los especialistas que no están en el Excel (Henry Torres Rivera se queda).
-- NO toca: usuarios, roles, catálogos (unidades, áreas, categorías) ni la configuración.
--
-- SEGURIDAD: no hace nada hasta que cambies 'NO' por 'SI' en la línea marcada.
-- Requiere las migraciones 20261016000001 y 20261017000001 ya aplicadas.
-- ==============================================================================

DO $$
DECLARE
  v_confirmo TEXT := 'NO';   -- ← CAMBIA A 'SI' PARA BORRAR (después de leer lo de arriba)
  t TEXT;
BEGIN
  IF v_confirmo <> 'SI' THEN
    RAISE EXCEPTION 'No se borró nada. Cambia v_confirmo a ''SI'' para respaldar y limpiar.';
  END IF;
  IF to_regclass('investments') IS NULL THEN
    RAISE EXCEPTION 'Falta la migración 20261017000001_investments.sql. Aplícala primero.';
  END IF;

  -- transactions (esquema anterior) se respalda porque al borrar proyectos su enlace quedaría vacío.
  FOREACH t IN ARRAY ARRAY['work_hours', 'tasks', 'sprints', 'movements', 'budgets', 'corp_allocation', 'project_payments', 'projects', 'clients', 'investments', 'specialists', 'app_settings', 'users', 'transactions'] LOOP
    IF to_regclass(t) IS NOT NULL AND to_regclass('respaldo_20261016_' || t) IS NULL THEN
      EXECUTE format('CREATE TABLE %I AS SELECT * FROM %I', 'respaldo_20261016_' || t, t);
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', 'respaldo_20261016_' || t);  -- sin políticas: no se ve desde la app
    END IF;
  END LOOP;

  FOREACH t IN ARRAY ARRAY['work_hours', 'tasks', 'sprints', 'movements', 'budgets', 'corp_allocation', 'project_payments', 'projects', 'clients', 'investments'] LOOP
    IF to_regclass(t) IS NOT NULL THEN EXECUTE format('DELETE FROM %I', t); END IF;
  END LOOP;

  UPDATE users SET specialist_id = NULL
   WHERE specialist_id IN (SELECT id FROM specialists WHERE lower(full_name) NOT IN ('henry torres rivera', 'eddy renato vivanco núñez', 'jhimmy cortéz ruiz', 'manuel enrique panduro rengifo', 'teddy garcia murrieta', 'alanis pardavé', 'johann imanol herrera ramos'));
  DELETE FROM specialists WHERE lower(full_name) NOT IN ('henry torres rivera', 'eddy renato vivanco núñez', 'jhimmy cortéz ruiz', 'manuel enrique panduro rengifo', 'teddy garcia murrieta', 'alanis pardavé', 'johann imanol herrera ramos');
  RAISE NOTICE 'Listo: copia en tablas respaldo_20261016_* y datos de prueba borrados. Sigue con excel-02-cargar-datos.sql';
END $$;
