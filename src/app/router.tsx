// app/router.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { ClientsProjectsPage } from '../features/clients-projects/ClientsProjectsPage';
import { FinanceGirosPage } from '../features/finance-giros/FinanceGirosPage';
import { DashboardPage } from '../features/dashboard-general/DashboardPage';

function Placeholder({ name }: { name: string }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center" style={{ paddingLeft: '240px' }}>
      <div className="text-center">
        <p className="bb-display font-bold text-ink text-2xl mb-2">{name}</p>
        <p className="bb-body text-ink-soft">Módulo en construcción — próximo sprint</p>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true,                element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard',          element: <DashboardPage /> },
      { path: 'clients-projects',   element: <ClientsProjectsPage /> },
      { path: 'finance',            element: <FinanceGirosPage /> },
      { path: 'kanban',             element: <Placeholder name="Kanban" /> },
      { path: 'work-hours',         element: <Placeholder name="Horas-hombre" /> },
    ],
  },
]);
