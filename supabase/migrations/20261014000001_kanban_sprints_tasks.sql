-- ==============================================================================
-- Migración: 20261014000001_kanban_sprints_tasks.sql
-- Descripción: Módulo Kanban/Scrum — sprints y tareas por proyecto.
--   * specialists : responsables de tareas (Principio 8: especialistas ≠ usuarios,
--                   no requieren login; el vínculo a `users` se agrega cuando exista).
--                   Se crea solo si no existe (no toca una tabla ya creada).
--   * sprints     : ciclos de trabajo de un proyecto (projects.id).
--   * tasks       : tarjetas del tablero. Estado = motivo belt-stripe oficial:
--                   backlog → por_hacer → en_curso → en_revision → hecho.
-- No duplica catálogos: referencia projects y specialists. Idempotente.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. GUARDA: si `specialists` ya existe con otra estructura, abortar sin tocar nada
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.specialists') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'specialists'
         AND column_name IN ('id', 'full_name')
       GROUP BY table_name HAVING COUNT(*) = 2
     ) THEN
    RAISE EXCEPTION 'La tabla specialists ya existe con otra estructura (se esperan id y full_name). Revisar antes de migrar.';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 1. ESPECIALISTAS (responsables)
-- ------------------------------------------------------------------------------
-- Los responsables iniciales se cargan SOLO si la tabla la crea esta migración
-- (si ya existía, no se le agregan filas).
DO $$
DECLARE
  ya_existia BOOLEAN := to_regclass('public.specialists') IS NOT NULL;
BEGIN
  CREATE TABLE IF NOT EXISTS specialists (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(100),
    specialty VARCHAR(100),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  IF NOT ya_existia THEN
    -- Responsables ya presentes como "manager" en los proyectos del Modelo C
    INSERT INTO specialists (id, full_name, specialty) VALUES
      (1, 'Henry Torres Rivera', 'Dirección general'),
      (2, 'Juan Pérez Vásquez',  'Transformación digital'),
      (3, 'Marco Guzmán',        'Geofísica y suelos'),
      (4, 'Sofía Castro',        'Incubación y emprendimiento');
    PERFORM setval(pg_get_serial_sequence('specialists', 'id'), 4);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. SPRINTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sprints (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  goal TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'planificado'
    CHECK (status IN ('planificado', 'activo', 'cerrado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);

-- ------------------------------------------------------------------------------
-- 3. TAREAS (tarjetas del tablero)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id INTEGER REFERENCES sprints(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'por_hacer', 'en_curso', 'en_revision', 'hecho')),
  assignee_id INTEGER REFERENCES specialists(id) ON DELETE SET NULL,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_tasks_project  ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint   ON tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);

-- ------------------------------------------------------------------------------
-- 4. POLÍTICAS RLS (mismo criterio que el resto de tablas: clave anónima de la app)
-- ------------------------------------------------------------------------------
ALTER TABLE specialists ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks       ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "anon_all_specialists" ON specialists;
  CREATE POLICY "anon_all_specialists" ON specialists FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "anon_all_sprints" ON sprints;
  CREATE POLICY "anon_all_sprints" ON sprints FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "anon_all_tasks" ON tasks;
  CREATE POLICY "anon_all_tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
END $$;
