/**
 * GrowthChart.tsx
 * Year-by-year investment growth as a stacked area chart (shadcn chart + Recharts):
 * contributed capital at the bottom, gains stacked on top. The tooltip shows the total.
 */
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { YearlyProjection } from '../types';
import { formatCompact, formatRupiah } from '../lib/formatting';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from './ui/chart';
import ChartEmpty from './ChartEmpty';

interface GrowthChartProps {
  projections: YearlyProjection[];
  title?: string;
  /** Chart height in px */
  height?: number;
}

const config: ChartConfig = {
  contributed: { label: 'Modal disetor', color: 'hsl(var(--chart-1))' },
  gain: { label: 'Keuntungan', color: 'hsl(var(--chart-3))' },
};

export default function GrowthChart({
  projections,
  title = 'Pertumbuhan investasi per tahun',
  height = 280,
}: GrowthChartProps) {
  if (projections.length === 0) {
    return <ChartEmpty>Masukkan parameter simulasi untuk melihat grafik pertumbuhan.</ChartEmpty>;
  }

  const data = projections.map((p) => ({
    year: p.year,
    contributed: p.totalContributed,
    gain: Math.max(0, p.totalGain),
  }));

  return (
    <figure aria-label={title}>
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                labelFormatter={(_, payload) => {
                  const year = payload?.[0]?.payload?.year;
                  const total = (payload ?? []).reduce((sum, p) => sum + (typeof p.value === 'number' ? p.value : 0), 0);
                  return `Tahun ${year} · Total ${formatRupiah(total)}`;
                }}
              />
            }
          />
          <Area
            dataKey="contributed"
            type="monotone"
            stackId="growth"
            stroke="var(--color-contributed)"
            fill="var(--color-contributed)"
            fillOpacity={0.15}
            strokeWidth={1.5}
          />
          <Area
            dataKey="gain"
            type="monotone"
            stackId="growth"
            stroke="var(--color-gain)"
            fill="var(--color-gain)"
            fillOpacity={0.3}
            strokeWidth={1.5}
          />
          <ChartLegend content={<ChartLegendContent />} />
        </AreaChart>
      </ChartContainer>
    </figure>
  );
}
