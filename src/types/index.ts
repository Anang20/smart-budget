// ─── View names ───────────────────────────────────────────────────────────────
export type ViewName = 'dashboard' | 'budget' | 'transactions' | 'goals' | 'investment' | 'settings';

// ─── Budget ───────────────────────────────────────────────────────────────────

/** A single budget category with its percentage allocation */
export interface BudgetCategory {
  id: string;
  name: string;
  /** Percentage of monthly income allocated (0–100) */
  percentage: number;
  /** 'needs' | 'wants' | 'savings' are the three default groups; custom categories use 'custom' */
  group: 'needs' | 'wants' | 'savings' | 'custom';
}

export interface BudgetState {
  monthlyIncome: number;
  categories: BudgetCategory[];
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  type: TransactionType;
  amount: number;
  categoryId: string; // references BudgetCategory.id or 'income'
  note: string;
}

// ─── Financial goals ──────────────────────────────────────────────────────────

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  /** Amount saved so far */
  savedAmount: number;
  /** ISO date YYYY-MM-DD, or '' when the goal has no deadline */
  deadline: string;
}

// ─── Chart data ───────────────────────────────────────────────────────────────

/** Income vs expense for one calendar month (dashboard cash-flow chart) */
export interface CashflowPoint {
  /** YYYY-MM */
  month: string;
  /** Short label, e.g. "Nov" */
  label: string;
  income: number;
  expense: number;
}

/** Balance per year for three return scenarios (investment sensitivity chart) */
export interface ScenarioPoint {
  year: number;
  pessimistic: number;
  base: number;
  optimistic: number;
}

// ─── Investment Planner ───────────────────────────────────────────────────────

export interface InvestmentInputs {
  initialCapital: number;
  monthlyContribution: number;
  annualReturnRate: number; // percent, e.g. 7 for 7%
  durationYears: number;
}

export interface YearlyProjection {
  year: number;
  balance: number;
  totalContributed: number;
  totalGain: number;
}

export interface InvestmentResult {
  finalValue: number;
  totalContributed: number;
  totalGain: number;
  yearlyProjections: YearlyProjection[];
}

export interface TargetCalculatorInputs {
  targetAmount: number;
  annualReturnRate: number;
  durationYears: number;
  initialCapital: number;
}

// ─── App state (persisted to localStorage) ────────────────────────────────────

export interface AppData {
  /** Storage schema version for forward-migration */
  version: number;
  budget: BudgetState;
  transactions: Transaction[];
  goals: Goal[];
}

// ─── Reducer actions ──────────────────────────────────────────────────────────

export type AppAction =
  | { type: 'SET_MONTHLY_INCOME'; payload: number }
  | { type: 'SET_BUDGET_CATEGORIES'; payload: BudgetCategory[] }
  | { type: 'ADD_CATEGORY'; payload: BudgetCategory }
  | { type: 'UPDATE_CATEGORY'; payload: BudgetCategory }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'ADD_GOAL'; payload: Goal }
  | { type: 'UPDATE_GOAL'; payload: Goal }
  | { type: 'DELETE_GOAL'; payload: string }
  | { type: 'IMPORT_DATA'; payload: AppData }
  | { type: 'RESET_DATA' };
