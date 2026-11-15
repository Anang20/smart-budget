/**
 * formatting.ts
 * Pure helpers for display formatting.
 */

/** Format a number as Indonesian Rupiah */
export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format a percentage with up to 2 decimal places */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value) + '%';
}

/** Format an ISO date string (YYYY-MM-DD) to Indonesian locale */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Return current date as YYYY-MM-DD */
export function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Return YYYY-MM from an ISO date string */
export function yearMonth(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** Return current YYYY-MM */
export function currentYearMonth(): string {
  return todayISO().slice(0, 7);
}

/** Return display label for a YYYY-MM string, e.g. "November 2026" */
export function labelYearMonth(ym: string): string {
  const [year, month] = ym.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

/** Compact number for chart axes, e.g. 1.500.000 -> "1,5 jt" */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/** Return the YYYY-MM that is `delta` months away from `ym` */
export function shiftYearMonth(ym: string, delta: number): string {
  const [year, month] = ym.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Short month label for chart axes, e.g. "Nov" */
export function shortLabelYearMonth(ym: string): string {
  const [year, month] = ym.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'short' });
}
