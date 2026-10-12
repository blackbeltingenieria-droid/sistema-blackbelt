// features/finance-giros/components/ScopeChip.tsx
// Chip de alcance de herramienta: exclusive / shared / general

import type { ToolScope } from '../types';
import { TOOL_SCOPE } from '../../../types/database';

interface ScopeChipProps {
  scope: ToolScope;
}

const SCOPE_CONFIG: Record<ToolScope, { label: string; bg: string; text: string }> = {
  [TOOL_SCOPE.GENERAL]:   { label: 'General (5 giros)',  bg: '#15130F', text: '#FFFFFF' },
  [TOOL_SCOPE.SHARED]:    { label: 'Compartida',         bg: '#D8B13A', text: '#15130F' },
  [TOOL_SCOPE.EXCLUSIVE]: { label: 'Exclusiva (1 giro)', bg: '#E4DFD3', text: '#15130F' },
};

export function ScopeChip({ scope }: ScopeChipProps) {
  const cfg = SCOPE_CONFIG[scope];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bb-body"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}
