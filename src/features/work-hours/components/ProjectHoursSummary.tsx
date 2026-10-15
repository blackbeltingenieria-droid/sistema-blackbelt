// features/work-hours/components/ProjectHoursSummary.tsx — resumen de horas por proyecto y persona.

import { Card } from '../../../components/ui/Card';
import type { ProjectRow } from '../../clients-projects/types';
import type { Specialist } from '../../kanban/types';
import type { ProjectHoursSummary as Summary } from '../hours-summary';

interface Props {
  summaries: Summary[];
  projects: ProjectRow[];
  specialists: Specialist[];
}

export function ProjectHoursSummary({ summaries, projects, specialists }: Props) {
  return (
    <Card>
      <h2 className="bb-display font-semibold text-ink text-base mb-3">Horas por proyecto</h2>
      {summaries.length === 0 ? (
        <p className="bb-body text-sm text-ink-soft py-4 text-center">Aún no hay horas registradas.</p>
      ) : (
        <ul className="divide-y divide-line">
          {summaries.map((s) => {
            const p = projects.find((x) => x.id === s.projectId);
            return (
              <li key={s.projectId} className="py-3" data-testid={`hours-project-${s.projectId}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="bb-mono text-[11px] text-ink-soft">{p?.code ?? `#${s.projectId}`}</p>
                    <p className="bb-body text-sm font-medium text-ink break-words">{p?.projectName ?? 'Proyecto'}</p>
                  </div>
                  <p className="bb-mono text-base font-medium text-ink shrink-0">{s.totalHours} h</p>
                </div>
                <p className="bb-body text-xs text-ink-soft mt-1">
                  {s.bySpecialist.map((b) => `${specialists.find((x) => x.id === b.specialistId)?.full_name ?? 'Persona'}: ${b.hours} h`).join(' · ')}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
