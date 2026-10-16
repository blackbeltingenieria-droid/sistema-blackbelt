// Pestaña «Gráficos» de Resultados y caja. Se carga con lazy() para no inflar el bundle inicial.
import { useMemo } from 'react';
import type { MonthReport } from '../services/results-service';
import { buildWaterfall, expensesByCategory, unitBars } from '../domain/presentation';
import type { BusinessUnit } from '../../catalogs/types';
import type { CostCategory } from '../../catalogs/types';
import { TOKENS } from '../../../lib/design-tokens';
import { CashChart } from './charts/CashChart';
import { CategoryChart } from './charts/CategoryChart';
import { TrendChart } from './charts/TrendChart';
import { UnitBarsChart } from './charts/UnitBarsChart';
import { WaterfallChart } from './charts/WaterfallChart';

interface Props {
  report: MonthReport;
  units: BusinessUnit[];
  categories: CostCategory[];
  onTrace: (title: string, ids: number[]) => void;
}

export default function ResultsCharts({ report, units, categories, onTrace }: Props) {
  const colorOf = useMemo(() => {
    const map = new Map<string, string>(units.map((u) => [u.code, u.color]));
    return (code: string) => map.get(code) ?? TOKENS.inkSoft;
  }, [units]);
  const catNames = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start" data-testid="results-charts">
      <UnitBarsChart data={unitBars(report.results)} colorOf={colorOf} onTrace={onTrace} />
      <WaterfallChart steps={buildWaterfall(report.results)} onTrace={onTrace} />
      <TrendChart data={report.evolution} />
      <CashChart data={report.cashByMonth} onTrace={onTrace} />
      <div className="lg:col-span-2">
        <CategoryChart data={expensesByCategory(report.movements, report.months, catNames)} onTrace={onTrace} />
      </div>
    </div>
  );
}
