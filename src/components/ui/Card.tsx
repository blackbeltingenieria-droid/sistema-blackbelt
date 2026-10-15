// components/ui/Card.tsx
// White card with line border and 4px radius — design system base component.

import type { ReactNode } from 'react';

type PlainBelow = 'md' | 'lg' | 'xl';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: string;
  /**
   * Por debajo de este breakpoint quita borde y fondo. Sirve para envolver una DataTable
   * (con el mismo `cardsBelow`) sin que las tarjetas queden con doble borde.
   */
  plainBelow?: PlainBelow;
}

// Clases literales para que Tailwind las genere
const PLAIN: Record<PlainBelow, string> = {
  md: 'max-md:border-0 max-md:bg-transparent',
  lg: 'max-lg:border-0 max-lg:bg-transparent',
  xl: 'max-xl:border-0 max-xl:bg-transparent',
};

export function Card({ children, className = '', padding = 'p-5', plainBelow }: CardProps) {
  const plain = plainBelow ? PLAIN[plainBelow] : '';
  return (
    <div
      className={`bg-paper border border-line rounded-card ${padding} ${plain} ${className}`}
    >
      {children}
    </div>
  );
}
