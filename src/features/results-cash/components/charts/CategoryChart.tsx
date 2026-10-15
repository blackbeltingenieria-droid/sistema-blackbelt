// Gastos del mes por categoría: barras horizontales de mayor a menor.
import { Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart } from 'recharts';
import { formatPenShort } from '../../../../lib/format';
import { TOKENS } from '../../../../lib/design-tokens';
import type { CategoryBar } from '../../domain/presentation';
import { ChartCard, MoneyTooltip } from './chart-parts';
import { AXIS_TICK, GRID_STROKE, rowOf } from './chart-utils';

interface Props { data: CategoryBar[]; onTrace: (title: string, ids: number[]) => void }

const clip = (s: string) => (s.length > 18 ? `${s.slice(0, 17)}…` : s);

export function CategoryChart({ data, onTrace }: Props) {
  const summary = data.map((d) => `${d.name}: ${d.amount}`).join('; ');
  return (
    <ChartCard
      title="Gastos por categoría"
      hint="Costos reconocidos del mes, de mayor a menor. Toca una barra para ver los movimientos."
      testId="chart-categories"
      ariaLabel={`Gastos por categoría. ${summary || 'sin gastos este mes'}`}
    >
      {data.length === 0 ? (
        <p className="bb-body text-sm text-ink-soft text-center py-10">Sin gastos reconocidos este mes.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36 + 30)}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap="22%">
            <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
            <XAxis type="number" tick={AXIS_TICK} tickFormatter={formatPenShort} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ ...AXIS_TICK, fontFamily: '"IBM Plex Sans", sans-serif' }} tickFormatter={clip} width={104} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: TOKENS.canvas }} content={<MoneyTooltip rowsOf={(p) => {
              const d = rowOf<CategoryBar>(p[0]);
              return [{ name: d.name, value: d.amount, color: TOKENS.gold }];
            }} />} />
            <Bar isAnimationActive={false} dataKey="amount" name="Gasto" fill={TOKENS.gold} radius={[0, 4, 4, 0]} maxBarSize={22} cursor="pointer"
              onClick={(d) => { const r = rowOf<CategoryBar>(d); onTrace(`Gastos: ${r.name}`, r.ids); }} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
