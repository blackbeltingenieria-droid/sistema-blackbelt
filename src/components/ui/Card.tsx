// components/ui/Card.tsx
// White card with line border and 4px radius — design system base component.

import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: string;
}

export function Card({ children, className = '', padding = 'p-5' }: CardProps) {
  return (
    <div
      className={`bg-paper border border-line rounded-card ${padding} ${className}`}
    >
      {children}
    </div>
  );
}
