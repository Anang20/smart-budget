/**
 * spreadsheet.ts
 * Pure conversion between AppData and spreadsheet tables (shared by Excel and Google Sheets).
 *
 * The workbook has four tabs: Pengaturan, Kategori, Transaksi, Target.
 * Each tab is a header row followed by data rows, so it stays easy to read and edit by hand.
 * Importing validates every row and reports the first problem with its tab and row number.
 */

import type { AppData, BudgetCategory, Goal, Transaction } from '../types';
import { CURRENT_VERSION } from './storage';
import { validateImportData } from './validation';
import { createId } from './utils';

export type CellValue = string | number | boolean | null;
export type Grid = CellValue[][];

/** One spreadsheet tab. `rows` includes the header row. */
export interface SheetTable {
  name: string;
  rows: Grid;
}

export const SHEET = {
  settings: 'Pengaturan',
  categories: 'Kategori',
  transactions: 'Transaksi',
  goals: 'Target',
} as const;

const HEADERS = {
  settings: ['Kunci', 'Nilai'],
  categories: ['ID', 'Nama', 'Persen', 'Kelompok'],
  transactions: ['ID', 'Tanggal', 'Jenis', 'Kategori', 'Kategori ID', 'Jumlah', 'Catatan'],
  goals: ['ID', 'Nama', 'Target', 'Terkumpul', 'Tenggat'],
} as const;

const SETTING_VERSION = 'versi';
const SETTING_INCOME = 'pendapatan_bulanan';

const GROUP_LABEL: Record<BudgetCategory['group'], string> = {
  needs: 'Kebutuhan',
  wants: 'Keinginan',
  savings: 'Tabungan',
  custom: 'Kustom',
};

const TYPE_LABEL: Record<Transaction['type'], string> = {
  income: 'Pemasukan',
  expense: 'Pengeluaran',
};

// ─── Export ───────────────────────────────────────────────────────────────────

export function appDataToTables(data: AppData): SheetTable[] {
  const categoryName = new Map(data.budget.categories.map((c) => [c.id, c.name]));

  return [
    {
      name: SHEET.settings,
      rows: [
        [...HEADERS.settings],
        [SETTING_VERSION, CURRENT_VERSION],
        [SETTING_INCOME, data.budget.monthlyIncome],
      ],
    },
    {
      name: SHEET.categories,
      rows: [
        [...HEADERS.categories],
        ...data.budget.categories.map((c): CellValue[] => [c.id, c.name, c.percentage, GROUP_LABEL[c.group]]),
      ],
    },
    {
      name: SHEET.transactions,
      rows: [
        [...HEADERS.transactions],
        ...data.transactions.map((t): CellValue[] => [
          t.id,
          t.date,
          TYPE_LABEL[t.type],
          t.type === 'income' ? '' : categoryName.get(t.categoryId) ?? '',
          t.categoryId,
          t.amount,
          t.note,
        ]),
      ],
    },
    {
      name: SHEET.goals,
      rows: [
        [...HEADERS.goals],
        ...data.goals.map((g): CellValue[] => [g.id, g.name, g.targetAmount, g.savedAmount, g.deadline]),
      ],
    },
  ];
}

// ─── Cell helpers ─────────────────────────────────────────────────────────────

/** "Jumlah (Rp)" -> "jumlahrp": header matching ignores case, spaces and punctuation */
function normalizeKey(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function asText(value: unknown): string {
  if (isBlank(value)) return '';
  return String(value).trim();
}

/** Accepts numbers and common text forms: "1500000", "1.500.000", "Rp 1.500.000,50", "12,5" */
function asNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  let text = value.replace(/rp/gi, '').replace(/\s/g, '');
  if (text === '') return null;
  if (text.includes('.') && text.includes(',')) {
    text = text.replace(/\./g, '').replace(',', '.'); // 1.500.000,50
  } else if ((text.match(/\./g) ?? []).length > 1) {
    text = text.replace(/\./g, ''); // 1.500.000
  } else {
    text = text.replace(',', '.'); // 12,5
  }
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  return Number(text);
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Returns YYYY-MM-DD for ISO text, DD/MM/YYYY text, an Excel serial number, or a Date; otherwise null. */
function asIsoDate(value: unknown): string | null {
  let iso: string | null = null;

  if (value instanceof Date && !isNaN(value.getTime())) {
    iso = `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
  } else if (typeof value === 'number' && value > 20000 && value < 80000) {
    // Excel / Google serial date (days since 1899-12-30)
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    iso = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  } else if (typeof value === 'string') {
    const text = value.trim();
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(text);
    const dmyMatch = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
    if (isoMatch) iso = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    else if (dmyMatch) iso = `${dmyMatch[3]}-${pad2(Number(dmyMatch[2]))}-${pad2(Number(dmyMatch[1]))}`;
  }

  if (iso === null) return null;
  // Reject impossible dates such as 2026-02-31
  const [y, m, d] = iso.split('-').map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  const valid = check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d;
  return valid ? iso : null;
}

class ImportError extends Error {}

/** Index of each wanted column (by normalized header), so column order in the file does not matter. */
function columnIndex(table: SheetTable, headers: readonly string[], required: readonly string[]): Record<string, number> {
  const headerRow = table.rows[0] ?? [];
  const positions = new Map(headerRow.map((cell, i) => [normalizeKey(cell), i]));
  const result: Record<string, number> = {};
  for (const header of headers) {
    const idx = positions.get(normalizeKey(header));
    if (idx !== undefined) result[normalizeKey(header)] = idx;
  }
  for (const header of required) {
    if (result[normalizeKey(header)] === undefined) {
      throw new ImportError(`Tab "${table.name}": kolom "${header}" tidak ditemukan.`);
    }
  }
  return result;
}

function dataRows(table: SheetTable): { cells: unknown[]; rowNumber: number }[] {
  return table.rows
    .slice(1)
    .map((cells, i) => ({ cells: cells as unknown[], rowNumber: i + 2 }))
    .filter(({ cells }) => cells.some((c) => !isBlank(c)));
}

function findTable(tables: SheetTable[], name: string): SheetTable | undefined {
  return tables.find((t) => normalizeKey(t.name) === normalizeKey(name));
}

function uniqueId(raw: unknown, used: Set<string>): string {
  let id = asText(raw);
  if (id === '' || used.has(id)) id = createId();
  used.add(id);
  return id;
}

// ─── Import ───────────────────────────────────────────────────────────────────

function parseSettings(table: SheetTable): { income: number } {
  const col = columnIndex(table, HEADERS.settings, HEADERS.settings);
  const kc = col[normalizeKey('Kunci')];
  const vc = col[normalizeKey('Nilai')];
  let income: number | null = null;
  for (const { cells, rowNumber } of dataRows(table)) {
    if (normalizeKey(cells[kc]) === normalizeKey(SETTING_INCOME)) {
      income = asNumber(cells[vc]);
      if (income === null || income < 0) {
        throw new ImportError(`Tab "${table.name}" baris ${rowNumber}: pendapatan bulanan harus berupa angka 0 atau lebih.`);
      }
    }
  }
  if (income === null) {
    throw new ImportError(`Tab "${table.name}": baris "${SETTING_INCOME}" tidak ditemukan.`);
  }
  return { income };
}

function parseCategories(table: SheetTable): BudgetCategory[] {
  const col = columnIndex(table, HEADERS.categories, ['Nama', 'Persen']);
  const c = (h: string) => col[normalizeKey(h)];
  const groupByLabel = new Map<string, BudgetCategory['group']>();
  (Object.keys(GROUP_LABEL) as BudgetCategory['group'][]).forEach((g) => {
    groupByLabel.set(normalizeKey(GROUP_LABEL[g]), g);
    groupByLabel.set(normalizeKey(g), g);
  });

  const used = new Set<string>();
  return dataRows(table).map(({ cells, rowNumber }) => {
    const name = asText(cells[c('Nama')]);
    if (name === '') throw new ImportError(`Tab "${table.name}" baris ${rowNumber}: nama kategori kosong.`);
    const pct = asNumber(cells[c('Persen')]);
    if (pct === null || pct < 0 || pct > 100) {
      throw new ImportError(`Tab "${table.name}" baris ${rowNumber}: persen harus antara 0 dan 100.`);
    }
    const group = c('Kelompok') === undefined ? 'custom' : groupByLabel.get(normalizeKey(cells[c('Kelompok')])) ?? 'custom';
    return {
      id: uniqueId(c('ID') === undefined ? '' : cells[c('ID')], used),
      name,
      percentage: pct,
      group,
    };
  });
}

function parseTransactions(table: SheetTable | undefined, categories: BudgetCategory[]): Transaction[] {
  if (!table) return [];
  const col = columnIndex(table, HEADERS.transactions, ['Tanggal', 'Jenis', 'Jumlah']);
  const c = (h: string) => col[normalizeKey(h)];
  const categoryIds = new Set(categories.map((cat) => cat.id));
  const idByName = new Map(categories.map((cat) => [normalizeKey(cat.name), cat.id]));

  const used = new Set<string>();
  return dataRows(table).map(({ cells, rowNumber }) => {
    const where = `Tab "${table.name}" baris ${rowNumber}`;
    const date = asIsoDate(cells[c('Tanggal')]);
    if (date === null) throw new ImportError(`${where}: tanggal tidak valid (pakai format YYYY-MM-DD).`);

    const typeKey = normalizeKey(cells[c('Jenis')]);
    const type: Transaction['type'] | null =
      typeKey === 'pemasukan' || typeKey === 'income' ? 'income' : typeKey === 'pengeluaran' || typeKey === 'expense' ? 'expense' : null;
    if (type === null) throw new ImportError(`${where}: jenis harus "Pemasukan" atau "Pengeluaran".`);

    const amount = asNumber(cells[c('Jumlah')]);
    if (amount === null || amount < 0) throw new ImportError(`${where}: jumlah harus berupa angka 0 atau lebih.`);

    let categoryId = 'income';
    if (type === 'expense') {
      const byId = c('Kategori ID') === undefined ? '' : asText(cells[c('Kategori ID')]);
      const byName = c('Kategori') === undefined ? '' : normalizeKey(cells[c('Kategori')]);
      const resolved = categoryIds.has(byId) ? byId : idByName.get(byName);
      if (!resolved) throw new ImportError(`${where}: kategori pengeluaran tidak dikenal. Samakan dengan tab "${SHEET.categories}".`);
      categoryId = resolved;
    }

    return {
      id: uniqueId(c('ID') === undefined ? '' : cells[c('ID')], used),
      date,
      type,
      amount,
      categoryId,
      note: c('Catatan') === undefined ? '' : asText(cells[c('Catatan')]),
    };
  });
}

function parseGoals(table: SheetTable | undefined): Goal[] {
  if (!table) return [];
  const col = columnIndex(table, HEADERS.goals, ['Nama', 'Target']);
  const c = (h: string) => col[normalizeKey(h)];

  const used = new Set<string>();
  return dataRows(table).map(({ cells, rowNumber }) => {
    const where = `Tab "${table.name}" baris ${rowNumber}`;
    const name = asText(cells[c('Nama')]);
    if (name === '') throw new ImportError(`${where}: nama target kosong.`);
    const target = asNumber(cells[c('Target')]);
    if (target === null || target <= 0) throw new ImportError(`${where}: target harus berupa angka lebih dari 0.`);
    const saved = c('Terkumpul') === undefined || isBlank(cells[c('Terkumpul')]) ? 0 : asNumber(cells[c('Terkumpul')]);
    if (saved === null || saved < 0) throw new ImportError(`${where}: jumlah terkumpul harus berupa angka 0 atau lebih.`);
    let deadline = '';
    if (c('Tenggat') !== undefined && !isBlank(cells[c('Tenggat')])) {
      const parsed = asIsoDate(cells[c('Tenggat')]);
      if (parsed === null) throw new ImportError(`${where}: tenggat tidak valid (pakai format YYYY-MM-DD).`);
      deadline = parsed;
    }
    return {
      id: uniqueId(c('ID') === undefined ? '' : cells[c('ID')], used),
      name,
      targetAmount: target,
      savedAmount: saved,
      deadline,
    };
  });
}

/**
 * Convert spreadsheet tabs back to AppData.
 * Tabs "Pengaturan" and "Kategori" are required; "Transaksi" and "Target" may be missing (treated as empty).
 */
export function tablesToAppData(tables: SheetTable[]): { data: AppData | null; error: string } {
  try {
    const settings = findTable(tables, SHEET.settings);
    const categoriesTable = findTable(tables, SHEET.categories);
    if (!settings || !categoriesTable) {
      return {
        data: null,
        error: `Tab "${SHEET.settings}" dan "${SHEET.categories}" harus ada. Gunakan file hasil ekspor aplikasi ini.`,
      };
    }

    const { income } = parseSettings(settings);
    const categories = parseCategories(categoriesTable);
    const transactions = parseTransactions(findTable(tables, SHEET.transactions), categories);
    const goals = parseGoals(findTable(tables, SHEET.goals));

    // Final safety net: the same validator that guards JSON imports.
    return validateImportData({
      version: CURRENT_VERSION,
      budget: { monthlyIncome: income, categories },
      transactions,
      goals,
    });
  } catch (err) {
    if (err instanceof ImportError) return { data: null, error: err.message };
    return { data: null, error: 'Isi file tidak bisa dibaca.' };
  }
}

/** Raw cells from a spreadsheet library may be Dates or other types; keep only what the parser understands. */
export function toGrid(rows: unknown[][]): Grid {
  return rows.map((row) =>
    row.map((cell): CellValue => {
      if (cell === null || cell === undefined) return null;
      if (typeof cell === 'string' || typeof cell === 'number' || typeof cell === 'boolean') return cell;
      if (cell instanceof Date) return asIsoDate(cell);
      return String(cell);
    })
  );
}
