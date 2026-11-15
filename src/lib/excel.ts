/**
 * excel.ts
 * Read and write .xlsx files in the browser. The spreadsheet libraries are loaded on demand,
 * so they add nothing to the first page load.
 */

import type { AppData } from '../types';
import { appDataToTables, toGrid, type SheetTable } from './spreadsheet';
import { defaultAppData } from './storage';

const COLUMN_WIDTH: Record<string, number[]> = {
  Pengaturan: [24, 18],
  Kategori: [16, 26, 10, 14],
  Transaksi: [16, 14, 14, 22, 16, 16, 36],
  Target: [16, 26, 16, 16, 14],
  Petunjuk: [100],
};

/** Local calendar date as YYYY-MM-DD (not UTC, so it matches the user's "today"). */
function localIsoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Write tables to an .xlsx file: bold header row, frozen header, fixed column widths. */
async function tablesToBlob(tables: SheetTable[]): Promise<Blob> {
  const { default: writeXlsxFile } = await import('write-excel-file/universal');
  return writeXlsxFile(
    tables.map((table) => ({
      sheet: table.name,
      stickyRowsCount: 1,
      columns: (COLUMN_WIDTH[table.name] ?? []).map((width) => ({ width })),
      data: table.rows.map((row, rowIndex) =>
        row.map((cell) => (rowIndex === 0 ? { value: String(cell ?? ''), fontWeight: 'bold' as const } : cell))
      ),
    }))
  ).toBlob();
}

/** Build an .xlsx file from the app data. */
export async function buildExcelBlob(data: AppData): Promise<Blob> {
  return tablesToBlob(appDataToTables(data));
}

const TEMPLATE_GUIDE: string[] = [
  'Petunjuk Pengisian Template Smart Budget',
  'Isi tab Pengaturan, Kategori, Transaksi, dan Target. Tab ini (Petunjuk) tidak ikut diimpor.',
  'Baris pertama setiap tab adalah judul kolom. Jangan diubah nama kolom dan nama tab-nya.',
  'Hapus baris contoh, lalu isi dengan data Anda sendiri. Tab Transaksi dan Target boleh dikosongkan (sisakan judul kolom).',
  'Pengaturan: ubah nilai pada baris "pendapatan_bulanan" (angka saja, contoh 10000000). Baris "versi" jangan diubah.',
  'Kategori: Persen berupa angka 0-100. Kelompok diisi Kebutuhan, Keinginan, Tabungan, atau Kustom.',
  'Transaksi: Tanggal ditulis YYYY-MM-DD (contoh 2026-11-15). Jenis diisi Pemasukan atau Pengeluaran.',
  'Transaksi pengeluaran wajib mengisi kolom Kategori dengan nama kategori yang ada di tab Kategori. Pemasukan boleh dikosongkan.',
  'Jumlah ditulis sebagai angka tanpa titik atau simbol Rp (contoh 500000).',
  'Target: Tenggat ditulis YYYY-MM-DD, atau dikosongkan jika tidak ada tenggat.',
  'Kolom ID boleh dikosongkan, aplikasi akan membuatkannya otomatis.',
  'Setelah selesai, simpan file lalu pilih "Impor dari Excel" di Pengaturan. Impor akan mengganti seluruh data saat ini.',
];

/** Build a ready-to-fill .xlsx template with the exact tab and column layout the importer expects. */
export async function buildTemplateBlob(): Promise<Blob> {
  const base = defaultAppData();
  const [needs, wants] = base.budget.categories;
  const example: AppData = {
    ...base,
    budget: { ...base.budget, monthlyIncome: 10000000 },
    transactions: [
      { id: 'contoh-1', date: localIsoDate(-2), type: 'income', amount: 10000000, categoryId: 'income', note: 'Gaji bulanan (contoh)' },
      { id: 'contoh-2', date: localIsoDate(-1), type: 'expense', amount: 500000, categoryId: needs.id, note: 'Belanja kebutuhan (contoh)' },
      { id: 'contoh-3', date: localIsoDate(0), type: 'expense', amount: 150000, categoryId: wants.id, note: 'Makan di luar (contoh)' },
    ],
    goals: [
      { id: 'contoh-target', name: 'Dana Darurat (contoh)', targetAmount: 30000000, savedAmount: 5000000, deadline: localIsoDate(365) },
    ],
  };
  const guide: SheetTable = { name: 'Petunjuk', rows: TEMPLATE_GUIDE.map((line) => [line]) };
  return tablesToBlob([guide, ...appDataToTables(example)]);
}

function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** Trigger a browser download of the app data as an .xlsx file. */
export async function downloadExcel(data: AppData): Promise<void> {
  saveBlob(await buildExcelBlob(data), `smart-budget-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/** Trigger a browser download of the empty import template. */
export async function downloadExcelTemplate(): Promise<void> {
  saveBlob(await buildTemplateBlob(), 'smart-budget-template.xlsx');
}

/** Read every tab of an .xlsx file. Throws when the file is not a valid workbook. */
export async function readExcelTables(file: Blob): Promise<SheetTable[]> {
  const { default: readXlsxFile } = await import('read-excel-file/universal');
  const sheets = await readXlsxFile(file);
  return sheets.map((s) => ({ name: s.sheet, rows: toGrid(s.data as unknown[][]) }));
}
