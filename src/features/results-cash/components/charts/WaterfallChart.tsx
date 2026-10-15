// Cascada del mes: ingresos → costos directos → gastos atribuibles → gasto CORP → resultado final.
// Termina exactamente en el resultado de la conciliación.
import { Bar, CartesianGrid, Cell, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatPen, formatPenShort } from '../../../../lib/format';
import { TOKENS } from '../../../../lib/design-tokens';
import type { WaterfallStep } from '../../domain/presentation';
import { ChartCard, MoneyTooltip } from './chart-parts';
import { AXIS_TICK, AXIS_TICK_X, GRID_STROKE, rowOf } from './chart-utils';

const SHORT: Record<string, string> = {
  income: 'Ingresos', direct: 'Directos', attributable: 'Atribuibles', corp: 'CORP', result: 'Resultado',
};

interface Props { steps: WaterfallStep[]; onTrace: (title: string, ids: number[]) => void }

type Row = WaterfallStep & { range: [number, number]; short: string };

export function WaterfallChart({ steps, onTrace }: Props) {
  const rows: Row[] = steps.map((s) => ({ ...s, short: SHORT[s.key] ?? s.label, range: [Math.min(s.start, s.end), Math.max(s.start, s.end)] }));
  const colorOf = (s: WaterfallStep) =>
    s.kind === 'income' ? TOKENS.positive : s.kind === 'cost' ? TOKENS.rust : s.value < 0 ? TOKENS.rust : TOKENS.ink;
  const summary = steps.map((s) => `${s.label}: ${s.value}`).join('; ');

  return (
    <ChartCard
      title="De ingresos a resultado final"
      hint="Cómo se va el dinero del mes: lo que entra, cada costo que lo reduce y lo que finalmente queda."
      testId="chart-waterfall"
      ariaLabel={`Cascada del mes. ${summary}`}
      footer={
        <dl className="mt-3 divide-y divide-line">
          {steps.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-3 py-1.5">
              <dt className="bb-body text-xs text-ink-soft flex items-center gap-2">
                <span aria-hidden="true" className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: colorOf(s) }} />{s.label}
              </dt>
              <dd className="bb-mono text-xs text-ink">
                {s.ids.length ? (
                  <button type="button" onClick={() => onTrace(s.label, s.ids)} className="underline decoration-dotted underline-offset-4 min-h-[28px]">
                    {s.kind === 'cost' ? '−' : ''}{formatPen(Math.abs(s.value))}
                  </button>
                ) : <span className="font-medium" data-testid="waterfall-result">{formatPen(s.value)}</span>}
              </dd>
            </div>
          ))}
        </dl>
      }
    >
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="14%">
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis dataKey="short" tick={AXIS_TICK_X} axisLine={{ stroke: GRID_STROKE }} tickLine={false} interval={0} />
          <YAxis tick={AXIS_TICK} tickFormatter={formatPenShort} axisLine={false} tickLine={false} width={44} />
          <ReferenceLine y={0} stroke={TOKENS.inkSoft} />
          <Tooltip cursor={{ fill: TOKENS.canvas }} content={<MoneyTooltip rowsOf={(p) => {
            const s = rowOf<Row>(p[0]);
            return [{ name: s.label, value: s.value, color: colorOf(s) }];
          }} />} />
          <Bar isAnimationActive={false} dataKey="range" radius={[3, 3, 3, 3]} maxBarSize={36} cursor="pointer"
            onClick={(d) => { const s = rowOf<Row>(d); if (s.ids.length) onTrace(s.label, s.ids); }}>
            {rows.map((s) => <Cell key={s.key} fill={colorOf(s)} />)}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
