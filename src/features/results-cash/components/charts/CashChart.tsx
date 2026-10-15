// Caja: barras de entradas (cobros + aportes) y salidas (pagos + retiros) por mes + línea del saldo acumulado.
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatPenShort, monthShort } from '../../../../lib/format';
import { TOKENS } from '../../../../lib/design-tokens';
import type { CashPoint } from '../../domain/presentation';
import { ChartCard, MoneyTooltip } from './chart-parts';
import { AXIS_TICK, AXIS_TICK_X, GRID_STROKE, rowOf } from './chart-utils';

interface Props { data: CashPoint[]; onTrace: (title: string, ids: number[]) => void }

export function CashChart({ data, onTrace }: Props) {
  const rows = data.map((d) => ({ ...d, label: monthShort(d.mes, false) }));
  type Row = (typeof rows)[number];
  const summary = data.map((d) => `${d.mes}: entradas ${d.inflow}, salidas ${d.outflow}, saldo ${d.balance}`).join('; ');
  return (
    <ChartCard
      title="Caja: entradas, salidas y saldo"
      hint="Barras verdes = entradas (cobros y aportes) · barras rojizas = salidas (pagos y retiros) · línea = saldo acumulado."
      testId="chart-cash"
      ariaLabel={`Caja por mes. ${summary}`}
    >
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barCategoryGap="20%" barGap={2}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis dataKey="label" tick={AXIS_TICK_X} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
          <YAxis tick={AXIS_TICK} tickFormatter={formatPenShort} axisLine={false} tickLine={false} width={44} />
          <ReferenceLine y={0} stroke={TOKENS.inkSoft} strokeDasharray="2 2" />
          <Tooltip cursor={{ fill: TOKENS.canvas }} content={<MoneyTooltip />} />
          <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Bar isAnimationActive={false} dataKey="inflow" name="Entradas" fill={TOKENS.positive} radius={[4, 4, 0, 0]} maxBarSize={20} cursor="pointer"
            onClick={(d) => { const r = rowOf<Row>(d); onTrace(`Entradas de caja ${r.label}`, r.inflowIds); }} />
          <Bar isAnimationActive={false} dataKey="outflow" name="Salidas" fill={TOKENS.rust} radius={[4, 4, 0, 0]} maxBarSize={20} cursor="pointer"
            onClick={(d) => { const r = rowOf<Row>(d); onTrace(`Salidas de caja ${r.label}`, r.outflowIds); }} />
          <Line isAnimationActive={false} type="monotone" dataKey="balance" name="Saldo acumulado" stroke={TOKENS.ink} strokeWidth={3} dot={{ r: 3.5, stroke: TOKENS.paper, strokeWidth: 2 }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
