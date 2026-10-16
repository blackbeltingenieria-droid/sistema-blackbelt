// features/auth/services/login-service.ts
// Entrar con correo y contraseña.
//  - En la web (Supabase configurado): Supabase Auth. La base solo responde a usuarios del sistema con
//    sesión iniciada (migración 20261019000001). Las cuentas las crea el Administrador desde Equipo
//    con la función admin_set_login (no se envían correos).
//  - En local sin Supabase: el selector «¿Quién eres?» de siempre. Con VITE_PASSWORD_LOGIN=1
//    (npm run dev:login) se prueba el login con contraseña en memoria.

import { isSupabaseConfigured, supabase } from '../../../lib/supabase';

/** true = se entra con correo y contraseña; false = selector de usuario (solo desarrollo local). */
export const PASSWORD_LOGIN: boolean = isSupabaseConfigured() || import.meta.env.VITE_PASSWORD_LOGIN === '1';

export const MIN_PASSWORD = 8;

export function validatePassword(pw: string): string | null {
  if (pw.length < MIN_PASSWORD) return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
  if (pw.trim() !== pw) return 'La contraseña no puede empezar ni terminar con espacios.';
  return null;
}

/** Mensajes de Supabase Auth en palabras simples. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'La cuenta aún no está activa. Pide al administrador que te ponga una contraseña en Equipo.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera un momento y vuelve a probar.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sin conexión. Revisa tu internet.';
  return message;
}

// ─── Memoria (solo desarrollo local con VITE_PASSWORD_LOGIN=1) ─────────────────
const DEV_PASSWORD = 'blackbelt2026';
const mem: { passwords: Map<string, string>; session: string | null } = { passwords: new Map(), session: null };
const key = (email: string) => email.trim().toLowerCase();

/** Inicia sesión. Devuelve el correo con el que entró. */
export async function passwordSignIn(email: string, password: string): Promise<string> {
  const e = key(email);
  if (!e || !password) throw new Error('Escribe tu correo y tu contraseña.');
  if (!isSupabaseConfigured()) {
    const saved = mem.passwords.get(e) ?? DEV_PASSWORD;
    if (password !== saved) throw new Error('Correo o contraseña incorrectos.');
    mem.session = e;
    return e;
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email: e, password });
  if (error) throw new Error(friendlyAuthError(error.message));
  return data.user?.email?.toLowerCase() ?? e;
}

/** Correo de la sesión guardada (al recargar la página), o null. */
export async function sessionEmail(): Promise<string | null> {
  if (!isSupabaseConfigured()) return mem.session;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.email?.toLowerCase() ?? null;
}

export async function passwordSignOut(): Promise<void> {
  if (!isSupabaseConfigured()) { mem.session = null; return; }
  await supabase.auth.signOut();
}

/** Cambiar la contraseña propia: primero comprueba la actual. */
export async function changeOwnPassword(email: string, current: string, next: string): Promise<void> {
  const problem = validatePassword(next);
  if (problem) throw new Error(problem);
  if (current === next) throw new Error('La nueva contraseña debe ser distinta de la actual.');
  if (!isSupabaseConfigured()) {
    if ((mem.passwords.get(key(email)) ?? DEV_PASSWORD) !== current) throw new Error('La contraseña actual no es correcta.');
    mem.passwords.set(key(email), next);
    return;
  }
  const check = await supabase.auth.signInWithPassword({ email: key(email), password: current });
  if (check.error) throw new Error('La contraseña actual no es correcta.');
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) throw new Error(friendlyAuthError(error.message));
}

/** Administrador: crea la cuenta para entrar de un usuario o le pone una contraseña nueva. */
export async function setLoginPassword(email: string, password: string): Promise<'creada' | 'actualizada'> {
  const problem = validatePassword(password);
  if (problem) throw new Error(problem);
  if (!isSupabaseConfigured()) {
    const existed = mem.passwords.has(key(email));
    mem.passwords.set(key(email), password);
    return existed ? 'actualizada' : 'creada';
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- la función RPC no está en los tipos generados
  const { data, error } = await (supabase as any).rpc('admin_set_login', { p_email: key(email), p_password: password });
  if (error) {
    if (String(error.message).includes('admin_set_login')) throw new Error('Falta la migración 20261019000001 (login con contraseña) en Supabase.');
    throw new Error(error.message);
  }
  return data === 'actualizada' ? 'actualizada' : 'creada';
}

/** Avisa cuando la sesión se cierra en otra pestaña o vence. Devuelve la función para dejar de escuchar. */
export function onSignedOut(cb: () => void): () => void {
  if (!isSupabaseConfigured()) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') cb(); });
  return () => data.subscription.unsubscribe();
}
