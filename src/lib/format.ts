/**
 * Shared number formatting for Fundalyst.
 * Single source of truth for fmtINR, fmtPct, fmtNum.
 * Re-exported by chart-theme.ts, calculations.ts, memo-export.ts.
 */

/**
 * Format a number as Indian rupees (₹).
 * Handles null/undefined gracefully — returns '—'.
 */
export function fmtINR(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const v = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (v >= 1e7) return sign + '₹' + (v / 1e7).toFixed(1) + 'Cr';
  if (v >= 1e5) return sign + '₹' + (v / 1e5).toFixed(1) + 'L';
  if (v >= 1000) return sign + '₹' + (v / 1000).toFixed(1) + 'K';
  return sign + '₹' + v.toFixed(0);
}

/**
 * Format a number with compact notation (no currency symbol).
 */
export function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const v = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (v >= 1e7) return sign + (v / 1e7).toFixed(decimals) + 'Cr';
  if (v >= 1e5) return sign + (v / 1e5).toFixed(decimals) + 'L';
  if (v >= 1000) return sign + (v / 1000).toFixed(decimals) + 'K';
  return sign + v.toFixed(decimals);
}

/**
 * Format a percentage value (accepts 0-100, not 0-1).
 * Returns '—' for null/undefined.
 */
export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return sign + n.toFixed(1) + '%';
}
