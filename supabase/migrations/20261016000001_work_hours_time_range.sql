-- ==============================================================================
-- Horas-hombre de "desde – hasta" con descansos.
--
-- SOLO AGREGA columnas opcionales a work_hours (no borra ni cambia datos existentes).
-- Los registros anteriores quedan con estas columnas en NULL / 0 y siguen valiendo por `hours`.
-- Idempotente: se puede ejecutar más de una vez.
--   start_time     hora de inicio  (ej. 08:00)
--   end_time       hora de fin     (ej. 17:00; si es menor que start_time, cruzó la medianoche)
--   break_minutes  minutos de descanso descontados
--   breaks         detalle de descansos, texto "13:00-14:00, 16:00-16:15"
-- `hours` se sigue guardando: = (fin − inicio − descansos) / 60, calculado en la app.
-- ==============================================================================

ALTER TABLE work_hours ADD COLUMN IF NOT EXISTS start_time    TIME;
ALTER TABLE work_hours ADD COLUMN IF NOT EXISTS end_time      TIME;
ALTER TABLE work_hours ADD COLUMN IF NOT EXISTS break_minutes INTEGER NOT NULL DEFAULT 0 CHECK (break_minutes >= 0);
ALTER TABLE work_hours ADD COLUMN IF NOT EXISTS breaks        TEXT;
