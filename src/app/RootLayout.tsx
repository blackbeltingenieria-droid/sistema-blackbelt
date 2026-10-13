// app/RootLayout.tsx
// Authenticated root layout.
//  - ≥1024px (lg): Sidebar fija a la izquierda (240px) + contenido con padding-left.
//  - <1024px: sin Sidebar; barra de navegación inferior (MobileNav) y contenido a todo el ancho.
// Every new module renders inside this layout automatically via the router.

import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/ui/Sidebar';
import { MobileNav } from '../components/ui/MobileNav';

export function RootLayout() {
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      {/* En mobile se reserva el alto de la barra inferior (4rem) + zona segura del dispositivo */}
      <div className="lg:pl-[240px] pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Outlet />
      </div>
      <MobileNav />
    </div>
  );
}
