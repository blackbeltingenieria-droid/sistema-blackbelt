// components/ui/PageHeader.tsx — cabecera común de página: título, subtítulo y acciones.

import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="bb-display font-bold text-ink text-2xl">{title}</h1>
        {subtitle && <p className="bb-body text-sm text-ink-soft mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-col sm:flex-row gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
