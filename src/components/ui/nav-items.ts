// components/ui/nav-items.ts
// Única fuente de navegación: la reutilizan Sidebar (≥1024px) y MobileNav (barra inferior).
// `primary` = aparece directo en la barra inferior; el resto va en «Más».

export interface NavItem {
  label: string;
  shortLabel: string; // etiqueta corta para la barra inferior en mobile
  to: string;
  icon: string;
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',            shortLabel: 'Inicio',      to: '/dashboard',         icon: '📈', primary: true },
  { label: 'Mi panel',             shortLabel: 'Mi panel',    to: '/my',                icon: '🏠', primary: true },
  { label: 'Ingresos y egresos',   shortLabel: 'Registros',      to: '/movements',         icon: '💸', primary: true },
  { label: 'Clientes y Proyectos', shortLabel: 'Proyectos',   to: '/clients-projects',  icon: '📋' },
  { label: 'Presupuestos y reparto', shortLabel: 'Presup.',   to: '/budgets',           icon: '🎯' },
  { label: 'Resultados y caja',    shortLabel: 'Resultados',  to: '/results-cash',      icon: '🧮' },
  { label: 'Kanban',               shortLabel: 'Kanban',      to: '/kanban',            icon: '🗂️', primary: true },
  { label: 'Horas-hombre',         shortLabel: 'Horas',       to: '/work-hours',        icon: '⏱️', primary: true },
  { label: 'Usuarios',             shortLabel: 'Usuarios',    to: '/users',             icon: '👥' },
];
