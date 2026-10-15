// components/ui/MonthSelect.tsx
// Selector de mes (AAAA-MM). Reutilizable por movimientos, presupuestos, resultados y caja.

import { monthLabel } from '../../lib/format';

interface MonthSelectProps {
  id: string;
  label?: string;
  value: string;
  months: string[];
  onChange: (month: string) => void;
  /** Agrega la opción "Todos los meses" con valor ''. */
  includeAll?: boolean;
  className?: string;
}

export function MonthSelect({ id, label = 'Mes', value, months, onChange, includeAll = false, className = '' }: MonthSelectProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="bb-label">{label}</label>
      <select id={id} className="bb-input !bg-paper" value={value} onChange={(e) => onChange(e.target.value)}>
        {includeAll && <option value="">Todos los meses</option>}
        {months.map((m) => (
          <option key={m} value={m}>{monthLabel(m)}</option>
        ))}
      </select>
    </div>
  );
}
