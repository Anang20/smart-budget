/**
 * DashboardView.tsx
 * This month's summary: stat cards, budget usage, spending donut,
 * 6-month cash flow and goal progress. shadcn/ui + shadcn charts.
 */
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Percent } from 'lucide-react';
import { useAppContext } from '../App';
import {
  cashflowLastMonths,
  categoryAmount,
  goalProgressPercent,
  sumByCategoryId,
  sumByType,
} from '../lib/calculations';
import { formatRupiah, currentYearMonth, yearMonth, labelYearMonth } from '../lib/formatting';
import { cn } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import SpendingChart from './SpendingChart';
import CashflowChart from './CashflowChart';

// ─── Stat card ────────────────────────────────────────────────────────────────

type StatTone = 'hero' | 'mint' | 'pink' | 'blue' | 'yellow';

const TONE_CLASS: Record<StatTone, string> = {
  hero: 'bg-gradient-to-br from-tint-lime to-primary/50',
  mint: 'bg-tint-mint',
  pink: 'bg-tint-pink',
  blue: 'bg-tint-blue',
  yellow: 'bg-tint-yellow',
};

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  tone: StatTone;
  valueClassName?: string;
  className?: string;
}

function StatCard({ label, value, icon: Icon, tone, valueClassName, className }: StatCardProps) {
  return (
    <Card className={cn('border-0', TONE_CLASS[tone], className)}>
      <CardContent className="pt-5">
        <span
          className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/80"
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className={cn('mt-1 break-words text-lg font-semibold tracking-tight sm:text-xl', valueClassName)}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── DashboardView ────────────────────────────────────────────────────────────

export default function DashboardView() {
  const { state } = useAppContext();
  const { transactions, budget, goals } = state;

  const currentMonth = currentYearMonth();

  const monthTx = useMemo(
    () => transactions.filter((t) => yearMonth(t.date) === currentMonth),
    [transactions, currentMonth]
  );

  const totalIncome = useMemo(() => sumByType(monthTx, 'income'), [monthTx]);
  const totalExpense = useMemo(() => sumByType(monthTx, 'expense'), [monthTx]);
  const remaining = budget.monthlyIncome - totalExpense;
  const savingsRate =
    budget.monthlyIncome > 0
      ? Math.max(0, ((budget.monthlyIncome - totalExpense) / budget.monthlyIncome) * 100)
      : 0;

  const spendingSlices = useMemo(
    () =>
      budget.categories
        .map((cat) => ({ label: cat.name, value: sumByCategoryId(monthTx, cat.id) }))
        .filter((s) => s.value > 0),
    [budget.categories, monthTx]
  );

  const cashflow = useMemo(
    () => cashflowLastMonths(transactions, currentMonth, 6),
    [transactions, currentMonth]
  );

  const activeGoals = useMemo(
    () =>
      goals
        .filter((g) => g.savedAmount < g.targetAmount)
        .sort((a, b) => goalProgressPercent(b) - goalProgressPercent(a))
        .slice(0, 3),
    [goals]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dasbor</h1>
        <p className="mt-1 text-sm text-muted-foreground">{labelYearMonth(currentMonth)}</p>
      </div>

      {budget.monthlyIncome === 0 && (
        <Alert variant="info">
          <AlertDescription>
            Mulai dengan mengisi <strong>Pendapatan Bulanan</strong> di menu <strong>Anggaran</strong>.
          </AlertDescription>
        </Alert>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <StatCard
          label="Pendapatan Bulanan"
          value={budget.monthlyIncome > 0 ? formatRupiah(budget.monthlyIncome) : '—'}
          icon={Wallet}
          tone="hero"
          className="col-span-2 xl:col-span-1"
        />
        <StatCard
          label="Pemasukan"
          value={totalIncome > 0 ? formatRupiah(totalIncome) : '—'}
          icon={TrendingUp}
          tone="mint"
        />
        <StatCard
          label="Pengeluaran"
          value={totalExpense > 0 ? formatRupiah(totalExpense) : '—'}
          icon={TrendingDown}
          tone="pink"
        />
        <StatCard
          label="Sisa Anggaran"
          value={budget.monthlyIncome > 0 ? formatRupiah(remaining) : '—'}
          icon={PiggyBank}
          tone="blue"
          valueClassName={budget.monthlyIncome > 0 && remaining < 0 ? 'text-destructive' : undefined}
        />
        <StatCard
          label="Tingkat Tabungan"
          value={budget.monthlyIncome > 0 ? `${savingsRate.toFixed(1)}%` : '—'}
          icon={Percent}
          tone="yellow"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-2 xl:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pengeluaran per Kategori</CardTitle>
            <CardDescription>Bulan ini</CardDescription>
          </CardHeader>
          <CardContent>
            <SpendingChart slices={spendingSlices} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Arus Kas</CardTitle>
            <CardDescription>Pemasukan dan pengeluaran 6 bulan terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            <CashflowChart points={cashflow} />
          </CardContent>
        </Card>
      </div>

      {/* Budget progress */}
      {budget.monthlyIncome > 0 && budget.categories.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Realisasi Anggaran Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {budget.categories.map((cat) => {
              const allocated = categoryAmount(budget.monthlyIncome, cat.percentage);
              const spent = sumByCategoryId(monthTx, cat.id);
              const pct = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
              const isOver = spent > allocated;
              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex flex-wrap justify-between gap-x-3 text-sm">
                    <span className="font-medium">{cat.name}</span>
                    <span>
                      <span className={isOver ? 'font-semibold text-destructive' : 'text-foreground'}>
                        {formatRupiah(spent)}
                      </span>
                      <span className="text-muted-foreground"> / {formatRupiah(allocated)}</span>
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className={isOver ? '[&>div]:bg-destructive' : pct > 80 ? '[&>div]:bg-warning' : ''}
                    aria-label={`Penggunaan ${cat.name}: ${pct.toFixed(0)}%`}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Goals */}
      {activeGoals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Target Keuangan</CardTitle>
            <CardDescription>Yang paling dekat tercapai</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeGoals.map((goal) => {
              const pct = goalProgressPercent(goal);
              return (
                <div key={goal.id} className="space-y-1.5">
                  <div className="flex flex-wrap justify-between gap-x-3 text-sm">
                    <span className="font-medium">{goal.name}</span>
                    <span className="text-muted-foreground">
                      {formatRupiah(goal.savedAmount)} / {formatRupiah(goal.targetAmount)}
                    </span>
                  </div>
                  <Progress value={pct} aria-label={`Progres ${goal.name}: ${pct.toFixed(0)}%`} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
