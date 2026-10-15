// features/auth/components/RequireRole.tsx
// Protege las rutas por rol: sin sesión → login; con sesión sin permiso → su página de inicio.
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { canAccess, homeFor } from '../access';
import { useAuth } from '../hooks/useAuth';
import { LoginPage } from './LoginPage';

export function RequireRole({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return <p className="min-h-screen bg-canvas flex items-center justify-center bb-body text-ink-soft">Cargando…</p>;
  }
  if (!user) return <LoginPage />;
  if (pathname === '/') return <Navigate to={homeFor(user.role)} replace />;
  if (!canAccess(user.role, pathname)) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}
