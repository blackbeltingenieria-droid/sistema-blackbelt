// features/auth/AuthContext.tsx — proveedor de sesión (rol activo) para toda la app.

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getLoginUsers, readStoredUserId, storeUserId } from './services/auth-service';
import type { AuthUser } from './types';

export interface AuthValue {
  user: AuthUser | null;
  users: AuthUser[];
  loading: boolean;
  error: string | null;
  signIn: (userId: number) => void;
  signOut: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components -- el contexto se consume solo vía useAuth
export const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getLoginUsers()
      .then((list) => {
        if (!alive) return;
        setUsers(list);
        const stored = readStoredUserId();
        setUser(list.find((u) => u.id === stored) ?? null);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'No se pudo cargar la sesión.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const signIn = useCallback((userId: number) => {
    const found = users.find((u) => u.id === userId) ?? null;
    setUser(found);
    storeUserId(found ? found.id : null);
  }, [users]);

  const signOut = useCallback(() => {
    setUser(null);
    storeUserId(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, users, loading, error, signIn, signOut }),
    [user, users, loading, error, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
