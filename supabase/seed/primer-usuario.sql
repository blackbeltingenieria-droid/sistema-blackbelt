-- ==============================================================================
-- Primer usuario del sistema: Henry Torres Rivera, Gerente General (Administrador).
--
-- QUÉ HACE (seguro y repetible):
--   1. Pone su especialidad como "Gerente general" (si estaba como "Dirección general").
--   2. Crea su especialista si no existe.
--   3. Crea su usuario Administrador vinculado a su especialista, SOLO si aún no existe un
--      usuario con ese nombre o ese correo. No borra ni cambia otros usuarios.
--   4. Crea su cuenta para entrar con esa contraseña (o se la cambia si ya existía).
--
-- ANTES DE CORRERLO: cambia el correo y la contraseña en las líneas marcadas (se detiene si no).
-- La contraseña: mínimo 8 caracteres. Henry podrá cambiarla después en «Mi contraseña».
-- Se corre en Supabase → SQL Editor. Requiere las migraciones 20261015000001 (roles/users)
-- y 20261019000001 (login con contraseña). Después de correrlo, BORRA la contraseña de este texto.
-- ==============================================================================

DO $$
DECLARE
  v_email TEXT := 'CAMBIAR@correo.com';   -- ← CAMBIA AQUÍ por el correo de Henry
  v_password TEXT := 'CAMBIAR';           -- ← CAMBIA AQUÍ por su contraseña (mínimo 8 caracteres)
  v_name  TEXT := 'Henry Torres Rivera';
  v_spec  INTEGER;
  v_role  INTEGER;
BEGIN
  IF v_email ILIKE 'CAMBIAR%' THEN
    RAISE EXCEPTION 'Primero cambia el correo de Henry en la línea marcada (v_email).';
  END IF;
  IF v_password = 'CAMBIAR' OR length(v_password) < 8 THEN
    RAISE EXCEPTION 'Primero pon la contraseña de Henry en la línea marcada (v_password, mínimo 8 caracteres).';
  END IF;
  IF to_regprocedure('public.admin_set_login(text,text)') IS NULL THEN
    RAISE EXCEPTION 'Falta la migración 20261019000001_login_con_contrasena.sql. Aplícala primero.';
  END IF;

  UPDATE specialists SET specialty = 'Gerente general'
   WHERE lower(full_name) = lower(v_name) AND (specialty IS NULL OR specialty = 'Dirección general');

  SELECT id INTO v_spec FROM specialists WHERE lower(full_name) = lower(v_name) ORDER BY id LIMIT 1;
  IF v_spec IS NULL THEN
    INSERT INTO specialists (full_name, email, specialty, active)
    VALUES (v_name, v_email, 'Gerente general', TRUE) RETURNING id INTO v_spec;
  END IF;

  SELECT id INTO v_role FROM roles WHERE code = 'admin';

  IF EXISTS (SELECT 1 FROM users WHERE lower(email) = lower(v_email)) THEN
    -- Ya existe con ese correo: se asegura que sea Administrador, activo y vinculado a su especialista.
    UPDATE users SET role_id = v_role, specialist_id = v_spec, active = TRUE WHERE lower(email) = lower(v_email);
    RAISE NOTICE 'Henry ya tenía usuario: quedó como Administrador y vinculado a su especialista.';
  ELSIF EXISTS (SELECT 1 FROM users WHERE lower(full_name) = lower(v_name)) THEN
    -- Ya existe con su nombre pero otro correo: se le pone el correo nuevo (el que usará para entrar).
    UPDATE users SET email = v_email, role_id = v_role, specialist_id = v_spec, active = TRUE WHERE lower(full_name) = lower(v_name);
    RAISE NOTICE 'Henry ya tenía usuario: ahora entra con %, como Administrador.', v_email;
  ELSE
    INSERT INTO users (email, full_name, role_id, specialist_id, active)
    VALUES (v_email, v_name, v_role, v_spec, TRUE);
    RAISE NOTICE 'Usuario de Henry Torres Rivera creado como Administrador.';
  END IF;

  -- Cuenta para entrar (correo + contraseña).
  RAISE NOTICE 'Cuenta para entrar: %', public.admin_set_login(v_email, v_password);

  IF EXISTS (SELECT 1 FROM users WHERE specialist_id = v_spec AND lower(full_name) <> lower(v_name) AND lower(email) <> lower(v_email)) THEN
    RAISE NOTICE 'Aviso: otro usuario también está vinculado al especialista de Henry. Revísalo en Equipo y cámbialo a "Ninguno".';
  END IF;
END $$;
