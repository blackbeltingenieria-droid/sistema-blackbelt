// features/dashboard-general/components/Tablero.tsx
// Piezas visuales del Dashboard general con estilo «tablero de Excel» (mismo estilo que el dashboard de la
// sede Pucallpa): panel de filtros oscuro con franja dorada, banner, tarjetas de cifras y paneles de gráfico.
// Solo presentación: no calcula nada.

import type { ReactNode } from 'react';

export function PanelFiltros({ children }: { children: ReactNode }) {
  return (
    <aside className="bg-ink rounded-card p-2.5 space-y-2.5 lg:self-start" aria-label="Filtros">
      <p className="bg-gold text-ink text-xs font-bold uppercase tracking-widest text-center rounded-sm py-1.5">Filtrar por</p>
      {children}
    </aside>
  );
}

export function CajaFiltro({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="bg-paper rounded-card p-2">
      <p className="text-[11px] font-semibold text-ink mb-1.5">{titulo}</p>
      {children}
    </div>
  );
}

export function OpcionFiltro({ activo, onClick, children, testId, role }: {
  activo: boolean; onClick: () => void; children: ReactNode; testId?: string; role?: string;
}) {
  return (
    <button type="button" role={role} aria-selected={activo} data-testid={testId} onClick={onClick}
      className={`w-full text-left text-xs px-2 py-2 rounded-sm transition-colors ${activo ? 'bg-gold text-ink font-semibold' : 'bg-canvas text-ink-soft hover:text-ink'}`}>
      {children}
    </button>
  );
}

export function Banner({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <header className="bg-ink rounded-card px-4 py-3 text-center shadow-sm">
      <h1 className="bb-display text-paper text-xl sm:text-2xl font-bold uppercase tracking-wide">{titulo}</h1>
      {subtitulo && <p className="text-gold text-xs mt-0.5">{subtitulo}</p>}
    </header>
  );
}

export function PanelGrafico({ titulo, children, className = '', testId }: { titulo: string; children: ReactNode; className?: string; testId?: string }) {
  return (
    <section className={`bg-paper rounded-card border border-line shadow-sm p-3 min-w-0 ${className}`} data-testid={testId}>
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-ink text-center mb-2">{titulo}</h2>
      {children}
    </section>
  );
}

/** Tarjeta de cifra estilo tablero. `testId` va en el número (las pruebas leen el monto exacto). */
export function TarjetaCifra({ etiqueta, valor, color = 'text-ink', nota, testId }: {
  etiqueta: string; valor: string; color?: string; nota?: string; testId?: string;
}) {
  return (
    <div className="bg-paper rounded-card border border-line shadow-sm px-3 py-2.5 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-rust">{etiqueta}</p>
      <p className={`bb-mono text-base sm:text-lg 2xl:text-xl font-semibold text-right whitespace-nowrap ${color}`} data-testid={testId}>{valor}</p>
      {nota && <p className="text-[10px] text-ink-soft text-right truncate">{nota}</p>}
    </div>
  );
}
