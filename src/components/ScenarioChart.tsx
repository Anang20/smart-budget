/**
 * ScenarioChart.tsx
 * Sensitivity analysis: the same investment plan with the return rate lowered and raised.
 * Solid line = base case, dashed lines = pessimistic / optimistic.
 */
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import type { ScenarioPoint } from '../types';
import { formatCompact, formatPercent, formatRupiah } from '../lib/formatting';
import { scenarioRates } from '../lib/calculations';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from './ui/chart';

interface ScenarioChartProps {
  points: ScenarioPoint[];
  /** The user's expected annual return (%), used for the legend labels */
  baseRate: number;
  spread?: number;
  height?: number;
}

export default function ScenarioChart({ points, baseRate, spread = 3, height = 240 }: ScenarioChartProps) {
  const rates = scenarioRates(baseRate, spread);
  const config: ChartConfig = {
    pessimistic: { label: `Pesimis (${formatPercent(rates.pessimistic)})`, color: 'hsl(var(--chart-5))' },
    base: { label: `Dasar (${formatPercent(rates.base)})`, color: 'hsl(var(--chart-1))' },
    optimistic: { label: `Optimis (${formatPercent(rates.optimistic)})`, color: 'hsl(var(--chart-3))' },
  };

  return (
    <figure aria-label="Perbandingan skenario return investasi">
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
        <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
            tickFormatter={(v: number) => `Th ${v}`}
          />
          <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={formatCompact} />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                valueFormatter={formatRupiah}
                labelFormatter={(_, payload) => `Tahun ${payload?.[0]?.payload?.year}`}
              />
            }
          />
          <Line dataKey="pessimistic" type="monotone" stroke="var(--color-pessimistic)" strokeWidth={1.75} strokeDasharray="4 4" dot={false} />
          <Line dataKey="base" type="monotone" stroke="var(--color-base)" strokeWidth={2.25} dot={false} />
          <Line dataKey="optimistic" type="monotone" stroke="var(--color-optimistic)" strokeWidth={1.75} strokeDasharray="4 4" dot={false} />
          <ChartLegend content={<ChartLegendContent />} />
        </LineChart>
      </ChartContainer>
    </figure>
  );
}
