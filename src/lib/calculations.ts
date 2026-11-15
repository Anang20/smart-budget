/**
 * calculations.ts
 * Pure financial calculation functions.
 * No side effects, no imports from non-lib modules.
 */

import type {
  BudgetCategory,
  CashflowPoint,
  Goal,
  InvestmentInputs,
  InvestmentResult,
  ScenarioPoint,
  TargetCalculatorInputs,
  YearlyProjection,
} from '../types';
import { shiftYearMonth, shortLabelYearMonth, yearMonth } from './formatting';

// ─── Budget split ─────────────────────────────────────────────────────────────

/** Default 50/30/20 budget split categories */
export function defaultBudgetCategories(): BudgetCategory[] {
  return [
    { id: 'needs', name: 'Kebutuhan', percentage: 50, group: 'needs' },
    { id: 'wants', name: 'Keinginan', percentage: 30, group: 'wants' },
    { id: 'savings', name: 'Tabungan & Investasi', percentage: 20, group: 'savings' },
  ];
}

/** Compute the Rupiah amount allocated to a category given the monthly income */
export function categoryAmount(income: number, percentage: number): number {
  return (income * percentage) / 100;
}

/** Sum all category percentages */
export function totalPercentage(categories: BudgetCategory[]): number {
  return categories.reduce((acc, c) => acc + c.percentage, 0);
}

// ─── Investment compound interest ─────────────────────────────────────────────

/**
 * Compound interest with monthly contributions, compounded monthly.
 *
 * Formula for each month m (1-indexed):
 *   balance_m = balance_{m-1} * (1 + r) + contribution
 * where r = annualRate / 12 / 100
 *
 * We iterate month-by-month to build yearly snapshots.
 */
export function calculateInvestment(inputs: InvestmentInputs): InvestmentResult {
  const { initialCapital, monthlyContribution, annualReturnRate, durationYears } = inputs;
  const monthlyRate = annualReturnRate / 12 / 100;
  const totalMonths = durationYears * 12;

  let balance = initialCapital;
  const yearlyProjections: YearlyProjection[] = [];

  for (let month = 1; month <= totalMonths; month++) {
    // Apply monthly return first, then add contribution
    balance = balance * (1 + monthlyRate) + monthlyContribution;

    if (month % 12 === 0) {
      const year = month / 12;
      const totalContributed = initialCapital + monthlyContribution * month;
      const totalGain = balance - totalContributed;
      yearlyProjections.push({ year, balance, totalContributed, totalGain });
    }
  }

  const finalValue = balance;
  const totalContributed = initialCapital + monthlyContribution * totalMonths;
  const totalGain = finalValue - totalContributed;

  return { finalValue, totalContributed, totalGain, yearlyProjections };
}

/**
 * Total return as a percentage of the money put in: gain / contributed * 100.
 * Returns null when nothing was contributed (the percentage would be undefined).
 */
export function gainPercent(totalGain: number, totalContributed: number): number | null {
  if (totalContributed <= 0) return null;
  return (totalGain / totalContributed) * 100;
}

/**
 * Target calculator: monthly contribution needed to reach a target value.
 *
 * We solve for PMT in the future-value-of-annuity formula:
 *   FV = PV*(1+r)^n + PMT * (((1+r)^n - 1) / r)
 *   PMT = (FV - PV*(1+r)^n) * r / ((1+r)^n - 1)
 *
 * When r == 0 (zero return), PMT = (FV - PV) / n.
 */
export function calculateTargetContribution(inputs: TargetCalculatorInputs): number {
  const { targetAmount, annualReturnRate, durationYears, initialCapital } = inputs;
  const r = annualReturnRate / 12 / 100;
  const n = durationYears * 12;

  if (n === 0) return 0;

  if (r === 0) {
    // No interest: simply fill the gap linearly
    return Math.max(0, (targetAmount - initialCapital) / n);
  }

  const factor = Math.pow(1 + r, n);
  const pmt = (targetAmount - initialCapital * factor) * r / (factor - 1);
  return Math.max(0, pmt);
}

// ─── Transaction aggregations ─────────────────────────────────────────────────

import type { Transaction } from '../types';

/** Sum all transactions of a given type */
export function sumByType(transactions: Transaction[], type: Transaction['type']): number {
  return transactions
    .filter((t) => t.type === type)
    .reduce((acc, t) => acc + t.amount, 0);
}

/** Sum expenses for a specific categoryId */
export function sumByCategoryId(transactions: Transaction[], categoryId: string): number {
  return transactions
    .filter((t) => t.type === 'expense' && t.categoryId === categoryId)
    .reduce((acc, t) => acc + t.amount, 0);
}

/**
 * Income vs expense for the `count` months ending at `endYm` (oldest first).
 * Months without transactions are included with zero values so the chart axis is continuous.
 */
export function cashflowLastMonths(
  transactions: Transaction[],
  endYm: string,
  count: number
): CashflowPoint[] {
  return Array.from({ length: count }, (_, i) => {
    const month = shiftYearMonth(endYm, i - (count - 1));
    const monthTx = transactions.filter((t) => yearMonth(t.date) === month);
    return {
      month,
      label: shortLabelYearMonth(month),
      income: sumByType(monthTx, 'income'),
      expense: sumByType(monthTx, 'expense'),
    };
  });
}

// ─── Investment: inflation & scenarios ────────────────────────────────────────

/** Present-day purchasing power of a future amount: value / (1 + inflation)^years */
export function adjustForInflation(value: number, annualInflationRate: number, years: number): number {
  return value / Math.pow(1 + annualInflationRate / 100, years);
}

/** Annual return rates (%) used by the three scenarios, kept within 0–100 */
export function scenarioRates(baseRate: number, spread = 3): { pessimistic: number; base: number; optimistic: number } {
  const clamp = (r: number) => Math.min(100, Math.max(0, r));
  return { pessimistic: clamp(baseRate - spread), base: clamp(baseRate), optimistic: clamp(baseRate + spread) };
}

/**
 * Sensitivity analysis: run the same plan with the return rate lowered and raised by `spread`
 * percentage points. Returns one point per year for the pessimistic / base / optimistic cases.
 */
export function calculateScenarios(inputs: InvestmentInputs, spread = 3): ScenarioPoint[] {
  const rates = scenarioRates(inputs.annualReturnRate, spread);
  const run = (rate: number) => calculateInvestment({ ...inputs, annualReturnRate: rate }).yearlyProjections;
  const pessimistic = run(rates.pessimistic);
  const base = run(rates.base);
  const optimistic = run(rates.optimistic);
  return base.map((p, i) => ({
    year: p.year,
    pessimistic: pessimistic[i].balance,
    base: p.balance,
    optimistic: optimistic[i].balance,
  }));
}

// ─── Goals ────────────────────────────────────────────────────────────────────

/** Progress towards a goal as a percentage clamped to 0–100 */
export function goalProgressPercent(goal: Goal): number {
  if (goal.targetAmount <= 0) return 0;
  return Math.min(100, Math.max(0, (goal.savedAmount / goal.targetAmount) * 100));
}

/**
 * Monthly saving needed to reach the goal by its deadline.
 * Returns null when there is no deadline, the goal is already reached, or the deadline has passed.
 */
export function goalMonthlyNeeded(goal: Goal, todayIso: string): number | null {
  if (!goal.deadline || goal.savedAmount >= goal.targetAmount || goal.deadline <= todayIso) return null;
  const [ty, tm] = todayIso.split('-').map(Number);
  const [dy, dm] = goal.deadline.split('-').map(Number);
  const months = Math.max(1, (dy - ty) * 12 + (dm - tm));
  return (goal.targetAmount - goal.savedAmount) / months;
}
