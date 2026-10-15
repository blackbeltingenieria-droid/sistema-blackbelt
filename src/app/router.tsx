// app/router.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { ClientsProjectsPage } from '../features/clients-projects/ClientsProjectsPage';
import { FinanceGirosPage } from '../features/finance-giros/FinanceGirosPage';
import { KanbanHomePage } from '../features/kanban/KanbanHomePage';
import { KanbanPage } from '../features/kanban/KanbanPage';
import { DashboardPage } from '../features/dashboard-general/DashboardPage';

function Placeholder({ name }: { name: string }) {
  return (
    <div className="min-h-[60vh] lg:min-h-screen bg-canvas flex items-center justify-center px-4">
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
      { path: 'kanban',             element: <KanbanHomePage /> },
      { path: 'kanban/:projectId',  element: <KanbanPage /> },
      { path: 'work-hours',         element: <Placeholder name="Horas-hombre" /> },
    ],
  },
]);
