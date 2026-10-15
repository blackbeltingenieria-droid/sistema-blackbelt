// components/ui/KpiCard.tsx
// Label (11px uppercase) + big mono figure. Used in dashboards and detail panels.

import { Card } from './Card';

interface KpiCardProps {
  label: string;
  value: string;
  valueColor?: string; // Tailwind text class, e.g. 'text-rust'
  subtext?: string;
  className?: string;
}

export function KpiCard({ label, value, valueColor = 'text-ink', subtext, className = '' }: KpiCardProps) {
  return (
    <Card className={className}>
      <p className="bb-label-xs text-ink-soft mb-1">{label}</p>
      <p className={`bb-mono text-base sm:text-2xl font-medium whitespace-nowrap ${valueColor}`}>{value}</p>
      {subtext && <p className="bb-body text-xs text-ink-soft mt-1">{subtext}</p>}
    </Card>
  );
}
