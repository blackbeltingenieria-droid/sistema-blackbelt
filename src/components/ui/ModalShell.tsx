// components/ui/ModalShell.tsx
// Contenedor común de modales/formularios.
//  - ≥640px (sm): modal centrado, como en escritorio.
//  - <640px: hoja a pantalla completa; cabecera y botón de guardar siempre visibles,
//    solo el cuerpo se desplaza. Se ajusta al alto VISIBLE (visualViewport) para que el
//    teclado del celular no tape el botón de guardar.

import { useEffect, useState, type ReactNode } from 'react';
import { Card } from './Card';

interface ModalShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Botones de acción (Cancelar / Guardar). Quedan fijos al pie. Usar `form="<id>"` en el submit. */
  footer: ReactNode;
  maxWidth?: 'max-w-lg' | 'max-w-xl';
}

/** Alto visible real (descontando el teclado en pantalla). null = usar 100dvh por defecto. */
function useVisibleHeight(): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setHeight(Math.round(vv.height));
    update();
    vv.addEventListener('resize', update);
    return () => vv.removeEventListener('resize', update);
  }, []);

  return height;
}

export function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = 'max-w-lg',
}: ModalShellProps) {
  const visibleHeight = useVisibleHeight();

  // Bloquea el scroll de la página de fondo mientras el modal está abierto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex items-stretch sm:items-center justify-center bg-ink/40 sm:backdrop-blur-sm sm:p-4 h-[100dvh]"
      style={visibleHeight ? { height: visibleHeight } : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <Card
        className={`w-full ${maxWidth} flex flex-col h-full sm:h-auto sm:max-h-[90vh] max-sm:rounded-none max-sm:border-0 animate-bb-slide-in-up sm:animate-none`}
        padding="p-0"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-line shrink-0">
          <div className="min-w-0">
            <h2 className="bb-display font-semibold text-ink text-base">{title}</h2>
            {subtitle && <p className="bb-mono text-[10px] text-ink-soft mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-11 h-11 sm:w-8 sm:h-8 -mr-2 flex items-center justify-center text-ink-soft hover:text-ink text-2xl sm:text-xl leading-none transition-colors"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Cuerpo (único bloque con scroll) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5">
          {children}
        </div>

        {/* Pie fijo con las acciones */}
        <div className="shrink-0 border-t border-line bg-paper px-4 sm:px-6 py-3 flex gap-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3">
          {footer}
        </div>
      </Card>
    </div>
  );
}
