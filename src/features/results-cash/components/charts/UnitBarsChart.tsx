// Ingresos y costos por unidad, lado a lado, con la contribución marcada (◆). Color oficial de cada unidad.
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatPenShort } from '../../../../lib/format';
import { TOKENS } from '../../../../lib/design-tokens';
import type { UnitBarPoint } from '../../domain/presentation';
import { ChartCard, Key, MoneyTooltip, Swatch } from './chart-parts';
import { AXIS_TICK, AXIS_TICK_X, GRID_STROKE, rowOf } from './chart-utils';

interface Props {
  data: UnitBarPoint[];
  colorOf: (unit: string) => string;
  onTrace: (title: string, ids: number[]) => void;
}

function Diamond(props: { cx?: number; cy?: number }) {
  const { cx, cy } = props;
  if (cx === undefined || cy === undefined) return null;
  return <polygon points={`${cx},${cy - 6} ${cx + 6},${cy} ${cx},${cy + 6} ${cx - 6},${cy}`} fill={TOKENS.ink} stroke={TOKENS.paper} strokeWidth={2} />;
}

export function UnitBarsChart({ data, colorOf, onTrace }: Props) {
  const summary = data.map((d) => `${d.unit}: ingresos ${d.income}, costos ${d.costs}, contribución ${d.contribution}`).join('; ');
  return (
    <ChartCard
      title="Ingresos y costos por unidad"
      hint="Barra llena = ingresos · barra clara = costos · ◆ = contribución. Toca una barra para ver sus movimientos."
      testId="chart-unit-bars"
      ariaLabel={`Gráfico de barras por unidad. ${summary}`}
      footer={<Key items={[
        { label: 'Ingresos', swatch: <Swatch color={TOKENS.inkSoft} /> },
        { label: 'Costos', swatch: <svg width="16" height="10" aria-hidden="true"><rect x="0.75" y="1.75" width="10.5" height="6.5" rx="1.5" fill={TOKENS.inkSoft} fillOpacity="0.3" stroke={TOKENS.inkSoft} /></svg> },
        { label: 'Contribución', swatch: <Swatch color={TOKENS.ink} diamond /> },
      ]} />}
    >
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="18%" barGap={2}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis dataKey="unit" tick={AXIS_TICK_X} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
          <YAxis tick={AXIS_TICK} tickFormatter={formatPenShort} axisLine={false} tickLine={false} width={44} />
          <Tooltip cursor={{ fill: TOKENS.canvas }} content={<MoneyTooltip rowsOf={(p) => {
            const d = rowOf<UnitBarPoint>(p[0]);
            return [
              { name: 'Ingresos', value: d.income, color: colorOf(d.unit) },
              { name: 'Costos', value: d.costs, color: colorOf(d.unit) },
              { name: 'Contribución', value: d.contribution, color: TOKENS.ink },
            ];
          }} />} />
          <Bar isAnimationActive={false} dataKey="income" name="Ingresos" radius={[4, 4, 0, 0]} maxBarSize={22} cursor="pointer"
            onClick={(d) => { const r = rowOf<UnitBarPoint>(d); onTrace(`Ingresos ${r.unit}`, r.incomeIds); }}>
            {data.map((d) => <Cell key={d.unit} fill={colorOf(d.unit)} />)}
          </Bar>
          <Bar isAnimationActive={false} dataKey="costs" name="Costos" radius={[4, 4, 0, 0]} maxBarSize={22} cursor="pointer"
            onClick={(d) => { const r = rowOf<UnitBarPoint>(d); onTrace(`Costos ${r.unit}`, r.costIds); }}>
            {data.map((d) => <Cell key={d.unit} fill={colorOf(d.unit)} fillOpacity={0.3} stroke={colorOf(d.unit)} strokeWidth={1.5} />)}
          </Bar>
          <Line dataKey="contribution" name="Contribución" stroke="none" dot={<Diamond />} activeDot={false} isAnimationActive={false} legendType="none" />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
