// components/ui/ProgressBar.tsx
// Segmented payment progress bar using belt-stripe colors.
// pct = 0–100 representing the paid portion.

interface ProgressBarProps {
  pct: number;       // 0–100
  showLabel?: boolean;
  height?: string;   // Tailwind height class, e.g. 'h-2'
}

export function ProgressBar({ pct, showLabel = false, height = 'h-2' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, pct));

  // Color by completion level (belt metaphor: white belt → black belt)
  let fillColor: string;
  if (clamped === 100)      fillColor = '#15130F'; // hecho / black belt
  else if (clamped >= 75)   fillColor = '#6E8B55'; // en_revision / green belt
  else if (clamped >= 40)   fillColor = '#C9742E'; // en_curso / brown belt
  else                      fillColor = '#D8B13A'; // por_hacer / yellow belt

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="bb-label-xs text-ink-soft">Pagado</span>
          <span className="bb-mono text-xs text-ink">{clamped.toFixed(0)}%</span>
        </div>
      )}
      <div className={`w-full bg-line rounded-full overflow-hidden ${height}`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, backgroundColor: fillColor }}
        />
      </div>
    </div>
  );
}
