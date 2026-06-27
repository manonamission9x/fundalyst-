/**
 * Premium chart configuration for Fundalyst.
 * Colors aligned with Design System v2 — warm monochrome + cool indigo accent.
 * Styled to feel comparable to Bloomberg / Financial Times.
 */

/** Chart color palette — mapped to CSS custom properties for consistency */
export const CHART_COLORS = {
  primary: '#7BA1D0',
  primaryLight: '#6B86FF',
  green: '#3DA06D',
  greenLight: '#4AB07D',
  red: '#CC5A5A',
  redLight: '#D86A6A',
  amber: '#B08C40',
  amberLight: '#C4A050',
  purple: '#8B7EC8',
  teal: '#3A9B9B',
  pink: '#C87EA0',
  orange: '#C88A50',
  blue: '#5A8CC8',
  muted: '#6A6C72',
  grid: '#2E2E32',
  text: '#EEEEF2',
  textSecondary: '#B0B2B8',
  textMuted: '#6A6C72',
  tooltipBg: '#1B1B1E',
  tooltipBorder: '#2E2E32',
};

/** Ordered series colors for multi-line charts */
export const SERIES_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.green,
  CHART_COLORS.amber,
  CHART_COLORS.red,
  CHART_COLORS.purple,
  CHART_COLORS.teal,
  CHART_COLORS.blue,
  CHART_COLORS.orange,
];

/** Base chart grid style — subtle solid lines */
export const chartGrid = {
  stroke: CHART_COLORS.grid,
  strokeDasharray: '2 3',
  strokeOpacity: 0.4,
};

/** X/Y axis tick style — compact mono */
export const axisTick = {
  fill: CHART_COLORS.textMuted,
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: 10,
};

/** Premium tooltip style — dark, elevated, sharp */
export const tooltipStyle = {
  contentStyle: {
    background: CHART_COLORS.tooltipBg,
    border: `1px solid ${CHART_COLORS.tooltipBorder}`,
    borderRadius: 4,
    fontSize: 12,
    boxShadow: 'none',
    padding: '8px 12px',
  },
  labelStyle: {
    color: CHART_COLORS.text,
    fontWeight: 600,
    fontSize: 12,
    fontFamily: 'IBM Plex Sans, sans-serif',
    marginBottom: 3,
    letterSpacing: '0.01em',
  },
  itemStyle: {
    color: CHART_COLORS.textSecondary,
    fontSize: 11,
    fontFamily: 'IBM Plex Mono, monospace',
    padding: '1px 0',
  },
};

/** Format a number as Indian rupees for charts */
export function fmtINR(v: number): string {
  if (v >= 1e7) return '₹' + (v / 1e7).toFixed(1) + 'Cr';
  if (v >= 1e5) return '₹' + (v / 1e5).toFixed(1) + 'L';
  if (v >= 1000) return '₹' + (v / 1000).toFixed(1) + 'K';
  return '₹' + v.toFixed(0);
}

/** Format a percentage */
export function fmtPct(v: number): string {
  const sign = v > 0 ? '+' : '';
  return sign + v.toFixed(1) + '%';
}

/** Get color for a change value */
export function changeColor(v: number): string {
  if (v > 0) return CHART_COLORS.green;
  if (v < 0) return CHART_COLORS.red;
  return CHART_COLORS.muted;
}

/** Trend arrow */
export function trendArrow(v: number): string {
  if (v > 0) return '↑';
  if (v < 0) return '↓';
  return '→';
}
