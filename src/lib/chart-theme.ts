/**
 * Shared chart configuration for Fundalyst.
 *
 * Defines consistent colors, tooltip styles, axis styles,
 * and helper functions for all Recharts visualizations.
 * Uses CSS custom property values at runtime.
 */

/** Chart color palette — muted, professional, colorblind-safe */
export const CHART_COLORS = {
  primary: '#4F6EF7',
  green: '#2ECC71',
  red: '#E5484D',
  amber: '#F0B429',
  purple: '#8B5CF6',
  teal: '#14B8A6',
  pink: '#EC4899',
  orange: '#F97316',
  blue: '#3498DB',
  muted: '#63657A',
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

/** Base chart grid style */
export const chartGrid = {
  stroke: '#2A2D42',
  strokeDasharray: '3 3',
};

/** X/Y axis tick style */
export const axisTick = {
  fill: '#63657A',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: 10,
};

/** Tooltip content style */
export const tooltipStyle = {
  contentStyle: {
    background: '#1C1E2E',
    border: '1px solid #2A2D42',
    borderRadius: 4,
    fontSize: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  },
  labelStyle: {
    color: '#F0EFEA',
    fontWeight: 600,
    fontSize: 12,
    fontFamily: 'IBM Plex Sans, sans-serif',
    marginBottom: 4,
  },
  itemStyle: {
    color: '#C8C9D4',
    fontSize: 12,
    fontFamily: 'IBM Plex Mono, monospace',
  },
};

/** Format a number as Indian rupees */
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

/** Get color for a change value: green for positive, red for negative */
export function changeColor(v: number): string {
  if (v > 0) return CHART_COLORS.green;
  if (v < 0) return CHART_COLORS.red;
  return CHART_COLORS.muted;
}

/** Trend arrow component as SVG string */
export function trendArrow(v: number): string {
  if (v > 0) return '↑';
  if (v < 0) return '↓';
  return '→';
}
