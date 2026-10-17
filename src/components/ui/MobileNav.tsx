// components/ui/MobileNav.tsx
// Barra de navegación inferior para pantallas < 1024px (lg). Reemplaza al Sidebar fijo.
// Muestra los ítems `primary` y agrupa el resto (y el cambio de usuario) en «Más».

import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { NavItem } from './nav-items';

interface MobileNavProps {
  items: NavItem[];
  userName: string;
  onSignOut: () => void;
  signOutLabel?: string;
  onChangePassword?: () => void;
}

const TAB = 'relative flex flex-col items-center justify-center gap-0.5 h-16 px-1 transition-colors';

export function MobileNav({ items, userName, onSignOut, signOutLabel = 'Cambiar usuario', onChangePassword }: MobileNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const primary = items.filter((i) => i.primary);
  const secondary = items.filter((i) => !i.primary);
  const moreActive = secondary.some((i) => pathname === i.to || pathname.startsWith(`${i.to}/`));

  useEffect(() => { setMoreOpen(false); }, [pathname]);

  return (
    <>
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-ink/40" onClick={() => setMoreOpen(false)} aria-hidden="true" />
      )}
      {moreOpen && (
        <div
          id="mobile-more-sheet"
          role="menu"
          aria-label="Más opciones"
          className="lg:hidden fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 bg-ink border-t border-white/10 rounded-t-card px-3 py-3 animate-bb-slide-in-up"
        >
          <ul className="space-y-0.5">
            {secondary.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  role="menuitem"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 min-h-[48px] rounded-card text-sm ${isActive ? 'bg-gold text-ink font-semibold' : 'text-white/80 active:bg-white/10'}`
                  }
                >
                  <span className="text-lg leading-none" aria-hidden="true">{item.icon}</span>
                  <span className="bb-body">{item.label}</span>
                </NavLink>
              </li>
            ))}
            {onChangePassword && (
              <li className="border-t border-white/10 mt-1 pt-1">
                <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); onChangePassword(); }}
                  className="w-full flex items-center gap-3 px-3 min-h-[48px] rounded-card text-sm text-white/80 active:bg-white/10">
                  <span className="text-lg leading-none" aria-hidden="true">🔑</span>
                  <span className="bb-body">Mi contraseña</span>
                </button>
              </li>
            )}
            <li className="border-t border-white/10 mt-1 pt-1">
              <button type="button" role="menuitem" onClick={onSignOut}
                className="w-full flex items-center justify-between gap-3 px-3 min-h-[48px] rounded-card text-sm text-white/80 active:bg-white/10">
                <span className="bb-body truncate">{userName}</span>
                <span className="bb-body text-xs underline underline-offset-2 shrink-0">{signOutLabel}</span>
              </button>
            </li>
          </ul>
        </div>
      )}

      <nav
        aria-label="Navegación principal"
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-ink border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="flex">
          {primary.map((item) => (
            <li key={item.to} className="flex-1 min-w-0">
              <NavLink
                to={item.to}
                className={({ isActive }) => `${TAB} ${isActive ? 'text-gold font-semibold' : 'text-white/60 active:text-white'}`}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute top-0 inset-x-3 h-0.5 bg-gold rounded-b" />}
                    <span className="text-xl leading-none" aria-hidden="true">{item.icon}</span>
                    <span className="bb-body text-[11px] leading-tight truncate max-w-full">{item.shortLabel}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li className="flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-controls="mobile-more-sheet"
              className={`${TAB} w-full ${moreActive || moreOpen ? 'text-gold font-semibold' : 'text-white/60 active:text-white'}`}
            >
              {moreActive && <span className="absolute top-0 inset-x-3 h-0.5 bg-gold rounded-b" />}
              <span className="text-xl leading-none" aria-hidden="true">☰</span>
              <span className="bb-body text-[11px] leading-tight">Más</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
