// features/auth/AuthContext.tsx — proveedor de sesión (usuario y rol) para toda la app.
// Web: correo + contraseña (Supabase Auth). Local sin Supabase: selector de usuario.

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getLoginUsers, readStoredUserId, storeUserId } from './services/auth-service';
import { PASSWORD_LOGIN, onSignedOut, passwordSignIn, passwordSignOut, sessionEmail } from './services/login-service';
import type { AuthUser } from './types';

export interface AuthValue {
  user: AuthUser | null;
  users: AuthUser[];
  loading: boolean;
  error: string | null;
  /** true = se entra con correo y contraseña. */
  passwordLogin: boolean;
  /** Selector de usuario (solo desarrollo local). */
  signIn: (userId: number) => void;
  /** Entrar con correo y contraseña. Lanza un error con el motivo si no se puede. */
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  /** Vuelve a leer los usuarios (p. ej. tras vincular un especialista). `selectId` inicia sesión con ese usuario. */
  refresh: (selectId?: number) => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components -- el contexto se consume solo vía useAuth
export const AuthContext = createContext<AuthValue | null>(null);

const NO_ACCESS = 'Tu cuenta no tiene acceso al sistema o fue desactivada. Pídele al administrador que te dé acceso en Equipo.';
const byEmail = (list: AuthUser[], email: string) => list.find((u) => u.email.trim().toLowerCase() === email) ?? null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (PASSWORD_LOGIN) {
        const email = await sessionEmail();
        if (!email) return;
        const list = await getLoginUsers({ allowBootstrap: false });
        if (!alive) return;
        const found = byEmail(list, email);
        if (!found) { await passwordSignOut(); return; }
        setUsers(list);
        setUser(found);
        return;
      }
      const list = await getLoginUsers();
      if (!alive) return;
      setUsers(list);
      const stored = readStoredUserId();
      setUser(list.find((u) => u.id === stored) ?? null);
    })()
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'No se pudo cargar la sesión.'))
      .finally(() => alive && setLoading(false));
    const stop = onSignedOut(() => { setUser(null); setUsers([]); });
    return () => { alive = false; stop(); };
  }, []);

  const signIn = useCallback((userId: number) => {
    const found = users.find((u) => u.id === userId) ?? null;
    setUser(found);
    storeUserId(found ? found.id : null);
  }, [users]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    setError(null);
    const signed = await passwordSignIn(email, password);
    const list = await getLoginUsers({ allowBootstrap: false });
    const found = byEmail(list, signed);
    if (!found) { await passwordSignOut(); throw new Error(NO_ACCESS); }
    setUsers(list);
    setUser(found);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    if (PASSWORD_LOGIN) { setUsers([]); void passwordSignOut(); return; }
    storeUserId(null);
  }, []);

  const refresh = useCallback(async (selectId?: number) => {
    const list = await getLoginUsers({ allowBootstrap: !PASSWORD_LOGIN });
    setUsers(list);
    if (PASSWORD_LOGIN) {
      // Con contraseña la sesión es de quien entró: solo se actualizan sus datos (rol, especialista).
      setUser((cur) => (cur ? byEmail(list, cur.email.trim().toLowerCase()) : null));
      return;
    }
    const wanted = selectId ?? user?.id ?? readStoredUserId();
    const next = list.find((u) => u.id === wanted) ?? null;
    setUser(next);
    storeUserId(next ? next.id : null);
  }, [user]);

  const value = useMemo<AuthValue>(
    () => ({ user, users, loading, error, passwordLogin: PASSWORD_LOGIN, signIn, signInWithPassword, signOut, refresh }),
    [user, users, loading, error, signIn, signInWithPassword, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
