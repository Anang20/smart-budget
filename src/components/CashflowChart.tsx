/**
 * CashflowChart.tsx
 * Income vs expense for the last months as grouped bars (shadcn chart + Recharts).
 */
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { CashflowPoint } from '../types';
import { formatCompact, formatRupiah, labelYearMonth } from '../lib/formatting';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from './ui/chart';
import ChartEmpty from './ChartEmpty';

interface CashflowChartProps {
  points: CashflowPoint[];
  height?: number;
}

const config: ChartConfig = {
  income: { label: 'Pemasukan', color: 'hsl(var(--chart-1))' },
  expense: { label: 'Pengeluaran', color: 'hsl(var(--chart-5))' },
};

export default function CashflowChart({ points, height = 190 }: CashflowChartProps) {
  const hasData = points.some((p) => p.income > 0 || p.expense > 0);
  if (!hasData) {
    return <ChartEmpty>Belum ada transaksi dalam beberapa bulan terakhir.</ChartEmpty>;
  }

  return (
    <figure aria-label="Pemasukan dan pengeluaran per bulan">
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
        <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={formatCompact} />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                valueFormatter={formatRupiah}
                labelFormatter={(_, payload) => {
                  const month = (payload?.[0]?.payload as CashflowPoint | undefined)?.month;
                  return month ? labelYearMonth(month) : '';
                }}
              />
            }
          />
          <Bar dataKey="income" fill="var(--color-income)" radius={[8, 8, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expense" fill="var(--color-expense)" radius={[8, 8, 0, 0]} maxBarSize={28} />
          <ChartLegend content={<ChartLegendContent />} />
        </BarChart>
      </ChartContainer>
    </figure>
  );
}
