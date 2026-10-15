// app/RootLayout.tsx
// Layout raíz autenticado.
//  - Sin sesión: pantalla «¿Quién eres?».
//  - ≥1024px (lg): Sidebar fija a la izquierda (240px) + contenido con padding-left.
//  - <1024px: sin Sidebar; barra de navegación inferior (MobileNav) y contenido a todo el ancho.
// Cada módulo nuevo se renderiza dentro de este layout vía el router; el menú se filtra por rol.

import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/ui/Sidebar';
import { MobileNav } from '../components/ui/MobileNav';
import { NAV_ITEMS } from '../components/ui/nav-items';
import { AuthProvider } from '../features/auth/AuthContext';
import { canAccess } from '../features/auth/access';
import { RequireRole } from '../features/auth/components/RequireRole';
import { useAuth } from '../features/auth/hooks/useAuth';

function Shell() {
  const { user, signOut } = useAuth();
  const items = NAV_ITEMS.filter((i) => canAccess(user?.role, i.to));
  const roleLabel = user?.role === 'admin' ? 'Administrador' : 'Colaborador';

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar items={items} userName={user?.fullName ?? ''} roleLabel={roleLabel} onSignOut={signOut} />
      {/* En mobile se reserva el alto de la barra inferior (4rem) + zona segura del dispositivo */}
      <div className="lg:pl-[240px] pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Outlet />
      </div>
      <MobileNav items={items} userName={user?.fullName ?? ''} onSignOut={signOut} />
    </div>
  );
}

export function RootLayout() {
  return (
    <AuthProvider>
      <RequireRole>
        <Shell />
      </RequireRole>
    </AuthProvider>
  );
}
