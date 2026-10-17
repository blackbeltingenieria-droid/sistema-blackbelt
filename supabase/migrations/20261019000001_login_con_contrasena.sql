-- ==============================================================================
-- Entrar con correo y contraseña (Supabase Auth) y cerrar la base a quien no tenga cuenta.
--
-- QUÉ HACE (no borra ni cambia datos; se puede correr otra vez):
--   1. is_app_user()  → true si quien llama inició sesión con un correo que está en `users` (activo).
--      is_app_admin() → lo mismo, y además su rol es Administrador.
--   2. admin_set_login(correo, contraseña) → crea la cuenta para entrar o le pone una contraseña
--      nueva. Solo la puede usar un Administrador (o el SQL Editor de Supabase). No envía correos.
--   3. En TODAS las tablas de la app cambia las políticas abiertas (anon_all_*) por una sola:
--      «solo usuarios del sistema con sesión iniciada». Sin iniciar sesión ya no se lee ni se escribe nada.
--      Las tablas de respaldo (respaldo_*) quedan cerradas como estaban.
--
-- DESPUÉS DE CORRERLA: corre supabase/seed/primer-usuario.sql con el correo y la contraseña de Henry,
-- y en Supabase → Authentication → Sign In / Providers desactiva «Allow new users to sign up»
-- (las cuentas las crea el Administrador desde Equipo).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.is_app_user() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
     WHERE u.active AND lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_app_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u JOIN public.roles r ON r.id = u.role_id
     WHERE u.active AND r.code = 'admin' AND lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Crea la cuenta (si no existe) o cambia su contraseña. Devuelve 'creada' o 'actualizada'.
CREATE OR REPLACE FUNCTION public.admin_set_login(p_email text, p_password text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, auth AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
BEGIN
  -- session_user: 'postgres' en el SQL Editor; 'authenticator' cuando llama la página.
  IF NOT (public.is_app_admin() OR session_user IN ('postgres', 'supabase_admin')) THEN
    RAISE EXCEPTION 'Solo un administrador puede crear cuentas o cambiar contraseñas.';
  END IF;
  IF length(coalesce(p_password, '')) < 8 THEN
    RAISE EXCEPTION 'La contraseña debe tener al menos 8 caracteres.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'El correo % no es usuario del sistema. Agrégalo primero en Equipo.', v_email;
  END IF;

  SELECT id INTO v_id FROM auth.users WHERE lower(email) = v_email LIMIT 1;
  IF v_id IS NULL THEN
    v_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
      crypt(p_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
      '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_id, v_id::text,
            jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
            'email', now(), now(), now());
    RETURN 'creada';
  END IF;

  UPDATE auth.users
     SET encrypted_password = crypt(p_password, gen_salt('bf')),
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         updated_at = now()
   WHERE id = v_id;
  RETURN 'actualizada';
END $$;

REVOKE ALL ON FUNCTION public.admin_set_login(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_login(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO anon, authenticated;

-- Políticas: solo usuarios del sistema con sesión iniciada.
DO $$
DECLARE t text; p text;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname NOT LIKE 'respaldo\_%'
  LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname LIKE 'anon_all%' LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'app_users_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_app_user()) WITH CHECK (public.is_app_user())', 'app_users_all', t);
  END LOOP;
END $$;
