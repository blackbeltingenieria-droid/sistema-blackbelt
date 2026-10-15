// Evolución de los últimos 6 meses: ingresos, costos y resultado.
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatPenShort, monthShort } from '../../../../lib/format';
import { TOKENS } from '../../../../lib/design-tokens';
import type { MonthlyPoint } from '../../domain/presentation';
import { ChartCard, MoneyTooltip } from './chart-parts';
import { AXIS_TICK, AXIS_TICK_X, GRID_STROKE } from './chart-utils';

export function TrendChart({ data }: { data: MonthlyPoint[] }) {
  const rows = data.map((d) => ({ ...d, label: monthShort(d.mes, false) }));
  const summary = data.map((d) => `${d.mes}: ingresos ${d.income}, costos ${d.costs}, resultado ${d.result}`).join('; ');
  return (
    <ChartCard
      title="Evolución de los últimos 6 meses"
      hint="Ingresos (línea verde), costos (línea punteada) y resultado (línea gruesa oscura)."
      testId="chart-trend"
      ariaLabel={`Evolución mensual. ${summary}`}
    >
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis dataKey="label" tick={AXIS_TICK_X} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
          <YAxis tick={AXIS_TICK} tickFormatter={formatPenShort} axisLine={false} tickLine={false} width={44} />
          <ReferenceLine y={0} stroke={TOKENS.inkSoft} strokeDasharray="2 2" />
          <Tooltip content={<MoneyTooltip />} />
          <Legend verticalAlign="bottom" iconType="plainline" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Line isAnimationActive={false} type="monotone" dataKey="income" name="Ingresos" stroke={TOKENS.positive} strokeWidth={2} dot={{ r: 3, stroke: TOKENS.paper, strokeWidth: 2 }} activeDot={{ r: 5 }} />
          <Line isAnimationActive={false} type="monotone" dataKey="costs" name="Costos" stroke={TOKENS.rust} strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, stroke: TOKENS.paper, strokeWidth: 2 }} activeDot={{ r: 5 }} />
          <Line isAnimationActive={false} type="monotone" dataKey="result" name="Resultado" stroke={TOKENS.ink} strokeWidth={3} dot={{ r: 3.5, stroke: TOKENS.paper, strokeWidth: 2 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
