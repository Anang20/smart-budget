import React, { createContext, useContext, useReducer, useEffect } from 'react';
import {
  LayoutDashboard,
  PiggyBank,
  ArrowLeftRight,
  Target,
  TrendingUp,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppAction, AppData, ViewName } from './types';
import { loadAppData, saveAppData, defaultAppData } from './lib/storage';

// ─── Reducer ──────────────────────────────────────────────────────────────────

function appReducer(state: AppData, action: AppAction): AppData {
  switch (action.type) {
    case 'SET_MONTHLY_INCOME':
      return { ...state, budget: { ...state.budget, monthlyIncome: action.payload } };
    case 'SET_BUDGET_CATEGORIES':
      return { ...state, budget: { ...state.budget, categories: action.payload } };
    case 'ADD_CATEGORY':
      return { ...state, budget: { ...state.budget, categories: [...state.budget.categories, action.payload] } };
    case 'UPDATE_CATEGORY':
      return { ...state, budget: { ...state.budget, categories: state.budget.categories.map((c) => c.id === action.payload.id ? action.payload : c) } };
    case 'DELETE_CATEGORY':
      return { ...state, budget: { ...state.budget, categories: state.budget.categories.filter((c) => c.id !== action.payload) } };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [...state.transactions, action.payload] };
    case 'UPDATE_TRANSACTION':
      return { ...state, transactions: state.transactions.map((t) => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.payload) };
    case 'ADD_GOAL':
      return { ...state, goals: [...state.goals, action.payload] };
    case 'UPDATE_GOAL':
      return { ...state, goals: state.goals.map((g) => g.id === action.payload.id ? action.payload : g) };
    case 'DELETE_GOAL':
      return { ...state, goals: state.goals.filter((g) => g.id !== action.payload) };
    case 'IMPORT_DATA':
      return action.payload;
    case 'RESET_DATA':
      return defaultAppData();
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppData;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

// ─── Views (lazy) ─────────────────────────────────────────────────────────────

import DashboardView from './components/DashboardView';
import BudgetView from './components/BudgetView';
import TransactionsView from './components/TransactionsView';
import GoalsView from './components/GoalsView';
import InvestmentView from './components/InvestmentView';
import SettingsView from './components/SettingsView';
import PwaPrompt from './components/PwaPrompt';

// ─── Navigation ───────────────────────────────────────────────────────────────

interface NavItem {
  id: ViewName;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dasbor', icon: LayoutDashboard },
  { id: 'budget', label: 'Anggaran', icon: PiggyBank },
  { id: 'transactions', label: 'Transaksi', icon: ArrowLeftRight },
  { id: 'goals', label: 'Target Keuangan', icon: Target },
  { id: 'investment', label: 'Investasi', icon: TrendingUp },
  { id: 'settings', label: 'Data & Setelan', icon: Settings },
];

interface NavProps {
  activeView: ViewName;
  onNavigate: (view: ViewName) => void;
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
        aria-hidden="true"
      >
        <PiggyBank className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-semibold leading-tight">Smart Budget</div>
        <div className="text-xs text-muted-foreground">Perencana Keuangan</div>
      </div>
    </div>
  );
}

/** Desktop (lg+): floating sidebar card with labelled items. */
function Sidebar({ activeView, onNavigate }: NavProps) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 p-4 lg:block">
      <nav
        className="flex h-full flex-col overflow-y-auto rounded-3xl bg-card p-4 shadow-soft"
        aria-label="Menu samping"
      >
        <div className="px-2 py-2">
          <Brand />
        </div>

        <ul className="mt-6 flex-1 space-y-1" role="list">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-primary font-medium text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="px-3 pt-4 text-xs text-muted-foreground">v1.2 · Bisa dipakai offline</div>
      </nav>
    </aside>
  );
}

/** Mobile / tablet (below lg): floating pill bar fixed to the bottom, icons only. */
function BottomNav({ activeView, onNavigate }: NavProps) {
  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden"
      aria-label="Menu bawah"
    >
      <ul
        className="pointer-events-auto flex items-center gap-1 rounded-full bg-card/95 p-1.5 shadow-soft ring-1 ring-border backdrop-blur"
        role="list"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                title={item.label}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, loadAppData);
  const [activeView, setActiveView] = React.useState<ViewName>('dashboard');

  useEffect(() => {
    saveAppData(state);
  }, [state]);

  // The page itself scrolls (better for mobile browsers and installed PWAs), so reset it on navigation.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeView]);

  const viewMap: Record<ViewName, React.ReactNode> = {
    dashboard: <DashboardView />,
    budget: <BudgetView />,
    transactions: <TransactionsView />,
    goals: <GoalsView />,
    investment: <InvestmentView />,
    settings: <SettingsView />,
  };

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <div className="flex min-h-dvh bg-background">
        <Sidebar activeView={activeView} onNavigate={setActiveView} />
        <div className="min-w-0 flex-1">
          <header className="px-4 pb-1 pt-[max(1rem,env(safe-area-inset-top))] md:px-6 lg:hidden">
            <Brand />
          </header>
          <main
            id="main-content"
            className="px-4 pb-28 pt-4 md:px-6 lg:px-8 lg:py-8 lg:pb-8"
          >
            {viewMap[activeView]}
          </main>
        </div>
        <BottomNav activeView={activeView} onNavigate={setActiveView} />
        <PwaPrompt />
      </div>
    </AppContext.Provider>
  );
}
