// app/RootLayout.tsx
// Authenticated root layout: Sidebar (fixed left) + Outlet for page content.
// Every new module renders inside this layout automatically via the router.

import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/ui/Sidebar';

export function RootLayout() {
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <Outlet />
    </div>
  );
}
