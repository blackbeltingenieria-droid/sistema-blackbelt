// components/ui/MobileNav.tsx
// Barra de navegación inferior para pantallas < 1024px (lg). Reemplaza al Sidebar fijo.
// Usa la misma lista NAV_ITEMS del Sidebar — no duplicar la navegación.

import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './Sidebar';

export function MobileNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-ink border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                [
                  'relative flex flex-col items-center justify-center gap-0.5 h-16 px-1 transition-colors',
                  isActive ? 'text-gold font-semibold' : 'text-white/60 active:text-white',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {/* Marca de estado activo: franja dorada superior (belt-stripe) */}
                  {isActive && <span className="absolute top-0 inset-x-3 h-0.5 bg-gold rounded-b" />}
                  <span className="text-xl leading-none" aria-hidden="true">{item.icon}</span>
                  <span className="bb-body text-[11px] leading-tight truncate max-w-full">
                    {item.shortLabel}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
