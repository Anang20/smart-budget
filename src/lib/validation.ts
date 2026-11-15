/**
 * validation.ts
 * Input validation helpers and JSON import validation.
 * Returns Indonesian error messages.
 */

import type { AppData, BudgetCategory, Goal, Transaction } from '../types';
import { CURRENT_VERSION } from './storage';

// ─── Numeric input validation ─────────────────────────────────────────────────

export interface ValidationResult {
  isValid: boolean;
  error: string;
}

export function validatePositiveNumber(value: string, label: string): ValidationResult {
  if (value.trim() === '') {
    return { isValid: false, error: `${label} tidak boleh kosong.` };
  }
  const num = Number(value.replace(/,/g, '.'));
  if (isNaN(num)) {
    return { isValid: false, error: `${label} harus berupa angka.` };
  }
  if (num < 0) {
    return { isValid: false, error: `${label} tidak boleh negatif.` };
  }
  return { isValid: true, error: '' };
}

export function validatePositiveInt(value: string, label: string): ValidationResult {
  const base = validatePositiveNumber(value, label);
  if (!base.isValid) return base;
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return { isValid: false, error: `${label} harus berupa bilangan bulat positif.` };
  }
  return { isValid: true, error: '' };
}

export function validatePercentage(value: string, label: string): ValidationResult {
  const base = validatePositiveNumber(value, label);
  if (!base.isValid) return base;
  const num = Number(value);
  if (num < 0 || num > 100) {
    return { isValid: false, error: `${label} harus antara 0 dan 100.` };
  }
  return { isValid: true, error: '' };
}

// ─── JSON import validation ───────────────────────────────────────────────────

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v);
}

function isValidCategory(c: unknown): c is BudgetCategory {
  if (typeof c !== 'object' || c === null) return false;
  const obj = c as Record<string, unknown>;
  return (
    isString(obj['id']) &&
    isString(obj['name']) &&
    isNumber(obj['percentage']) &&
    ['needs', 'wants', 'savings', 'custom'].includes(obj['group'] as string)
  );
}

function isValidTransaction(t: unknown): t is Transaction {
  if (typeof t !== 'object' || t === null) return false;
  const obj = t as Record<string, unknown>;
  return (
    isString(obj['id']) &&
    isString(obj['date']) &&
    /^\d{4}-\d{2}-\d{2}$/.test(obj['date'] as string) &&
    ['income', 'expense'].includes(obj['type'] as string) &&
    isNumber(obj['amount']) &&
    (obj['amount'] as number) >= 0 &&
    isString(obj['categoryId']) &&
    isString(obj['note'])
  );
}

function isValidGoal(g: unknown): g is Goal {
  if (typeof g !== 'object' || g === null) return false;
  const obj = g as Record<string, unknown>;
  return (
    isString(obj['id']) &&
    isString(obj['name']) &&
    isNumber(obj['targetAmount']) &&
    (obj['targetAmount'] as number) > 0 &&
    isNumber(obj['savedAmount']) &&
    (obj['savedAmount'] as number) >= 0 &&
    isString(obj['deadline']) &&
    /^(\d{4}-\d{2}-\d{2})?$/.test(obj['deadline'] as string)
  );
}

/**
 * Validate a parsed JSON object as AppData.
 * Files exported by the previous version (v1, without goals) are still accepted.
 * Returns the validated data or null with an error message.
 */
export function validateImportData(raw: unknown): { data: AppData | null; error: string } {
  if (typeof raw !== 'object' || raw === null) {
    return { data: null, error: 'Format file tidak valid: bukan objek JSON.' };
  }

  const obj = raw as Record<string, unknown>;

  if (obj['version'] !== 1 && obj['version'] !== CURRENT_VERSION) {
    return {
      data: null,
      error: `Versi data tidak didukung. Diharapkan versi 1 atau ${CURRENT_VERSION}.`,
    };
  }

  if (typeof obj['budget'] !== 'object' || obj['budget'] === null) {
    return { data: null, error: 'Data anggaran tidak ditemukan atau tidak valid.' };
  }

  const budget = obj['budget'] as Record<string, unknown>;

  if (!isNumber(budget['monthlyIncome']) || (budget['monthlyIncome'] as number) < 0) {
    return { data: null, error: 'Pendapatan bulanan tidak valid.' };
  }

  if (!Array.isArray(budget['categories']) || !budget['categories'].every(isValidCategory)) {
    return { data: null, error: 'Daftar kategori anggaran tidak valid.' };
  }

  if (!Array.isArray(obj['transactions']) || !obj['transactions'].every(isValidTransaction)) {
    return { data: null, error: 'Daftar transaksi tidak valid.' };
  }

  const rawGoals = obj['goals'] === undefined ? [] : obj['goals'];
  if (!Array.isArray(rawGoals) || !rawGoals.every(isValidGoal)) {
    return { data: null, error: 'Daftar target keuangan tidak valid.' };
  }

  const data: AppData = {
    version: CURRENT_VERSION,
    budget: {
      monthlyIncome: budget['monthlyIncome'] as number,
      categories: budget['categories'] as BudgetCategory[],
    },
    transactions: obj['transactions'] as Transaction[],
    goals: rawGoals as Goal[],
  };

  return { data, error: '' };
}
