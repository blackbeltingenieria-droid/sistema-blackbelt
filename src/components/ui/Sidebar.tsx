// components/ui/Sidebar.tsx
// Fixed left navigation — 240px, ink background, logo + nav + user footer.
// Solo visible desde 1024px (lg); en pantallas menores la navegación es MobileNav.
// Reused across ALL authenticated views. Do not add business-logic here.

import { NavLink } from 'react-router-dom';

export interface NavItem {
  label: string;
  shortLabel: string; // etiqueta corta para la barra inferior en mobile
  to: string;
  icon: string; // emoji or lucide-style text for now
}

// Única fuente de navegación: la reutiliza MobileNav (barra inferior en mobile).
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',            shortLabel: 'Inicio',    to: '/dashboard',         icon: '📈' },
  { label: 'Clientes y Proyectos', shortLabel: 'Proyectos', to: '/clients-projects',  icon: '📋' },
  { label: 'Costos por Giro',      shortLabel: 'Costos',    to: '/finance',           icon: '💸' },
  { label: 'Kanban',               shortLabel: 'Kanban',    to: '/kanban',            icon: '🗂️'  },
  { label: 'Horas-hombre',         shortLabel: 'Horas',     to: '/work-hours',        icon: '⏱️'  },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[240px] bg-ink flex-col z-20">
      {/* Logo */}
      <div className="px-6 pt-8 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* Belt-stripe mark — 5 belt colors stacked as the logo accent */}
          <div className="flex flex-col gap-0.5 w-2">
            <span className="block h-1 rounded-sm" style={{ backgroundColor: '#E4DFD3' }} />
            <span className="block h-1 rounded-sm" style={{ backgroundColor: '#D8B13A' }} />
            <span className="block h-1 rounded-sm" style={{ backgroundColor: '#C9742E' }} />
            <span className="block h-1 rounded-sm" style={{ backgroundColor: '#6E8B55' }} />
            <span className="block h-1 rounded-sm" style={{ backgroundColor: '#15130F' }} />
          </div>
          <div>
            <p className="bb-display font-bold text-paper text-sm tracking-wide leading-none">
              BLACKBELT
            </p>
            <p className="bb-body text-[10px] text-white/40 tracking-widest uppercase mt-0.5">
              Group
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-card text-sm transition-colors',
                isActive
                  ? 'bg-gold text-ink font-semibold'
                  : 'text-white/60 hover:text-white hover:bg-white/10',
              ].join(' ')
            }
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="bb-body">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center flex-shrink-0">
            <span className="bb-display font-bold text-ink text-xs">A</span>
          </div>
          <div className="min-w-0">
            <p className="bb-body text-paper text-xs font-medium truncate">Admin</p>
            <p className="bb-body text-white/40 text-[10px] truncate">Blackbelt Group</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
