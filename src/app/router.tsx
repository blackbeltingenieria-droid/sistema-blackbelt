// app/router.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { BudgetsAllocationPage } from '../features/budgets-allocation/BudgetsAllocationPage';
import { ClientsProjectsPage } from '../features/clients-projects/ClientsProjectsPage';
import { DashboardPage } from '../features/dashboard-general/DashboardPage';
import { MyDashboardPage } from '../features/dashboard-general/MyDashboardPage';
import { KanbanHomePage } from '../features/kanban/KanbanHomePage';
import { KanbanPage } from '../features/kanban/KanbanPage';
import { MovementsPage } from '../features/movements/MovementsPage';
import { ResultsCashPage } from '../features/results-cash/ResultsCashPage';
import { UsersPage } from '../features/users/UsersPage';
import { InvestmentsPage } from '../features/investments/InvestmentsPage';
import { WorkHoursPage } from '../features/work-hours/WorkHoursPage';
import { LaborPage } from '../features/labor/LaborPage';
import { RecurringPage } from '../features/recurring/RecurringPage';

// Las rutas se protegen por rol en RootLayout → RequireRole (ver features/auth/access.ts).
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true,                element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard',          element: <DashboardPage /> },
      { path: 'my',                 element: <MyDashboardPage /> },
      { path: 'clients-projects',   element: <ClientsProjectsPage /> },
      { path: 'movements',          element: <MovementsPage /> },
      { path: 'finance',            element: <Navigate to="/movements" replace /> },
      { path: 'budgets',            element: <BudgetsAllocationPage /> },
      { path: 'results-cash',       element: <ResultsCashPage /> },
      { path: 'kanban',             element: <KanbanHomePage /> },
      { path: 'kanban/:projectId',  element: <KanbanPage /> },
      { path: 'users',              element: <UsersPage /> },
      { path: 'investments',        element: <InvestmentsPage /> },
      { path: 'labor',              element: <LaborPage /> },
      { path: 'recurring',          element: <RecurringPage /> },
      { path: 'work-hours',         element: <WorkHoursPage /> },
      { path: '*',                  element: <Navigate to="/" replace /> },
    ],
  },
]);
