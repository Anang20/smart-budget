/**
 * storage.ts
 * localStorage read/write with versioned key, try/catch, and safe fallbacks.
 */

import type { AppData, Goal } from '../types';
import { defaultBudgetCategories } from './calculations';

export const STORAGE_KEY = 'smart_budget_v1';
export const CURRENT_VERSION = 2;

export function defaultAppData(): AppData {
  return {
    version: CURRENT_VERSION,
    budget: {
      monthlyIncome: 0,
      categories: defaultBudgetCategories(),
    },
    transactions: [],
    goals: [],
  };
}

/**
 * Bring stored data up to CURRENT_VERSION. Returns null when the data is unusable.
 * v1 -> v2: financial goals were added (existing budget and transactions are kept).
 */
export function migrateAppData(raw: unknown): AppData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (obj['version'] !== 1 && obj['version'] !== CURRENT_VERSION) return null;
  if (typeof obj['budget'] !== 'object' || obj['budget'] === null || !Array.isArray(obj['transactions'])) {
    return null;
  }
  return {
    ...(obj as unknown as AppData),
    version: CURRENT_VERSION,
    goals: Array.isArray(obj['goals']) ? (obj['goals'] as Goal[]) : [],
  };
}

/** Load AppData from localStorage. Returns defaults if missing or corrupted. */
export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAppData();
    return migrateAppData(JSON.parse(raw)) ?? defaultAppData();
  } catch {
    return defaultAppData();
  }
}

/** Persist AppData to localStorage. Silently ignores write errors (e.g. storage quota). */
export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage quota exceeded or private-mode restrictions — no-op
  }
}

/** Clear all app data from localStorage */
export function clearAppData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // No-op
  }
}
