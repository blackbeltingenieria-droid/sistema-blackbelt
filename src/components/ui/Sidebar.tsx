// components/ui/Sidebar.tsx
// Fixed left navigation — 240px, ink background, logo + nav + user footer.
// Solo visible desde 1024px (lg); en pantallas menores la navegación es MobileNav.
// Recibe los ítems ya filtrados por rol. Reused across ALL authenticated views. Do not add business-logic here.

import { NavLink } from 'react-router-dom';
import type { NavItem } from './nav-items';

interface SidebarProps {
  items: NavItem[];
  userName: string;
  roleLabel: string;
  onSignOut: () => void;
  /** "Salir" (con contraseña) o "Cambiar" (selector local). */
  signOutLabel?: string;
  /** Si se da, muestra «Mi contraseña». */
  onChangePassword?: () => void;
}

export function Sidebar({ items, userName, roleLabel, onSignOut, signOutLabel = 'Cambiar', onChangePassword }: SidebarProps) {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[240px] bg-ink flex-col z-20">
      {/* Logo */}
      <div className="px-6 pt-8 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* Belt-stripe mark — 5 belt colors stacked as the logo accent */}
          <div className="flex flex-col gap-0.5 w-2">
            <span className="block h-1 rounded-sm bg-belt-backlog" />
            <span className="block h-1 rounded-sm bg-belt-por_hacer" />
            <span className="block h-1 rounded-sm bg-belt-en_curso" />
            <span className="block h-1 rounded-sm bg-belt-en_revision" />
            <span className="block h-1 rounded-sm bg-belt-hecho" />
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
        {items.map((item) => (
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

      {/* Usuario y cierre de sesión */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center flex-shrink-0">
            <span className="bb-display font-bold text-ink text-xs">{userName.slice(0, 1).toUpperCase()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="bb-body text-paper text-xs font-medium truncate">{userName}</p>
            <p className="bb-body text-white/40 text-[10px] truncate">{roleLabel}</p>
          </div>
          <button type="button" onClick={onSignOut} className="bb-body text-[11px] text-white/60 hover:text-white underline underline-offset-2">
            {signOutLabel}
          </button>
        </div>
        {onChangePassword && (
          <button type="button" onClick={onChangePassword} className="mt-2 bb-body text-[11px] text-white/60 hover:text-white underline underline-offset-2" data-testid="my-password">
            Mi contraseña
          </button>
        )}
      </div>
    </aside>
  );
}
