// components/ui/StatusChip.tsx
// Belt-stripe status chip — the signature visual language of the system.
// Used for project status, task status, and any future status in the system.
// DO NOT invent a separate color system in another module.

import type { ProjectStatus } from '../../types/database';

type StatusVariant = ProjectStatus | 'backlog' | 'por_hacer' | 'en_curso' | 'en_revision' | 'hecho';

interface StatusChipProps {
  status: StatusVariant;
  label?: string; // override display label
}

const STATUS_CONFIG: Record<StatusVariant, { label: string; bg: string; text: string }> = {
  backlog:      { label: 'Backlog',      bg: '#E4DFD3', text: '#15130F' },
  por_hacer:    { label: 'Por hacer',    bg: '#D8B13A', text: '#15130F' },
  en_curso:     { label: 'En curso',     bg: '#C9742E', text: '#FFFFFF' },
  en_revision:  { label: 'En revisión',  bg: '#6E8B55', text: '#FFFFFF' },
  hecho:        { label: 'Hecho',        bg: '#15130F', text: '#FFFFFF' },
  // Project-specific statuses mapped to belt colors
  activo:       { label: 'Activo',       bg: '#6E8B55', text: '#FFFFFF' },
  finalizado:   { label: 'Finalizado',   bg: '#15130F', text: '#FFFFFF' },
  cancelado:    { label: 'Cancelado',    bg: '#B0532A', text: '#FFFFFF' },
};

export function StatusChip({ status, label }: StatusChipProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.backlog;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bb-body"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: config.text, opacity: 0.6 }}
      />
      {label ?? config.label}
    </span>
  );
}
