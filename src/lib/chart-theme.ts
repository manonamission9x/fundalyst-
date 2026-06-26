/**
 * Premium chart configuration for Fundalyst.
 * Defines consistent colors, tooltip styles, axis styles,
 * and helper functions for all Recharts visualizations.
 * Styled to feel comparable to Bloomberg / TradingView.
 */

/** Chart color palette — muted, professional, colorblind-safe */
export const CHART_COLORS = {
  primary: '#7B8DA0',
  primaryLight: '#6B86FF',
  green: '#2ECC71',
  greenLight: '#34D47E',
  red: '#E5484D',
  redLight: '#F05A60',
  amber: '#F0B429',
  amberLight: '#F5C344',
  purple: '#8B5CF6',
  teal: '#14B8A6',
  pink: '#EC4899',
  orange: '#F97316',
  blue: '#3498DB',
  muted: '#63657A',
  grid: '#2A2D42',
  text: '#F0EFEA',
  textSecondary: '#C8C9D4',
  textMuted: '#63657A',
  tooltipBg: '#1C1E2E',
  tooltipBorder: '#2A2D42',
};

/** Ordered series colors for multi-line charts */
export const SERIES_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.green,
  CHART_COLORS.amber,
  CHART_COLORS.red,
  CHART_COLORS.purple,
  CHART_COLORS.teal,
  CHART_COLORS.pink,
  CHART_COLORS.orange,
];

/** Base chart grid style — subtle dashed lines */
export const chartGrid = {
  stroke: CHART_COLORS.grid,
  strokeDasharray: '3 3',
  strokeOpacity: 0.5,
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
    borderRadius: 6,
    fontSize: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    padding: '10px 14px',
  },
  labelStyle: {
    color: CHART_COLORS.text,
    fontWeight: 600,
    fontSize: 12,
    fontFamily: 'IBM Plex Sans, sans-serif',
    marginBottom: 4,
    letterSpacing: '0.01em',
  },
  itemStyle: {
    color: CHART_COLORS.textSecondary,
    fontSize: 11,
    fontFamily: 'IBM Plex Mono, monospace',
    padding: '2px 0',
  },
};

/** Format a number as Indian rupees for charts */
export function fmtINR(v: number): string {
  if (v >= 1e7) return '₹' + (v / 1e7).toFixed(1) + 'Cr';
  if (v >= 1e5) return '₹' + (v / 1e5).toFixed(1) + 'L';
  return '₹' + v.toLocaleString('en-IN');
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
