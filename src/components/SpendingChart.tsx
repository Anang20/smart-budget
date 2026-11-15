/**
 * SpendingChart.tsx
 * Donut chart of spending by category (shadcn chart + Recharts).
 * Slice colours come from the chart palette (--chart-1 … --chart-6).
 */
import { Label, Pie, PieChart } from 'recharts';
import { formatCompact, formatPercent, formatRupiah } from '../lib/formatting';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from './ui/chart';
import ChartEmpty from './ChartEmpty';

export interface SpendingSlice {
  label: string;
  value: number;
}

interface SpendingChartProps {
  slices: SpendingSlice[];
  title?: string;
}

const PALETTE_SIZE = 6;
const sliceColor = (index: number): string => `hsl(var(--chart-${(index % PALETTE_SIZE) + 1}))`;

export default function SpendingChart({ slices, title = 'Pengeluaran per kategori' }: SpendingChartProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return <ChartEmpty>Belum ada data pengeluaran bulan ini.</ChartEmpty>;
  }

  // Series keys are index-based so category names with spaces or symbols never reach CSS variable names.
  const data = slices.map((s, i) => ({
    key: `c${i}`,
    name: s.label,
    value: s.value,
    fill: `var(--color-c${i})`,
  }));
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.key, { label: d.name, color: sliceColor(i) }])
  );

  return (
    <figure aria-label={title} className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
      <ChartContainer config={config} className="aspect-square h-[190px] w-[190px] shrink-0">
        <PieChart>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel valueFormatter={formatRupiah} />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={86}
            strokeWidth={3}
            stroke="hsl(var(--card))"
          >
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !('cx' in viewBox) || !('cy' in viewBox)) return null;
                const cx = viewBox.cx ?? 0;
                const cy = viewBox.cy ?? 0;
                return (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={cx} y={cy - 4} className="fill-foreground text-lg font-semibold">
                      {formatCompact(total)}
                    </tspan>
                    <tspan x={cx} y={cy + 16} className="fill-muted-foreground text-xs">
                      Total
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      <ul className="w-full min-w-0 flex-1 space-y-2.5 text-sm">
        {data.map((d, i) => (
          <li key={d.key} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: sliceColor(i) }}
              aria-hidden="true"
            />
            <span className="truncate text-muted-foreground">{d.name}</span>
            <span className="ml-auto shrink-0 font-medium">{formatRupiah(d.value)}</span>
            <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">{formatPercent((d.value / total) * 100)}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
