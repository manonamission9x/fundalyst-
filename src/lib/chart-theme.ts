/**
 * Premium chart configuration for Fundalyst.
 * Colors derived from CSS custom properties at runtime.
 * Styled to feel comparable to Bloomberg / Financial Times.
 */

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Chart color palette — dynamically read from CSS tokens */
export function getChartColors() {
  return {
    primary: cssVar('--primary', '#6F7D8C'),
    primaryLight: cssVar('--primary-hover', '#8292A2'),
    green: cssVar('--green', '#3D9B6D'),
    greenLight: cssVar('--green-strong', '#4AAD7D'),
    red: cssVar('--red', '#C96A6A'),
    redLight: cssVar('--red-strong', '#D47A7A'),
    amber: cssVar('--caution', '#B87A4A'),
    amberLight: cssVar('--caution', '#B87A4A'),
    purple: '#7A7EA8',
    teal: '#3A8B8B',
    pink: '#C07A98',
    orange: '#C08050',
    blue: '#5A7CA8',
    muted: cssVar('--text-muted', '#6E6E74'),
    grid: cssVar('--border', '#27272A'),
    text: cssVar('--text', '#E8E8EA'),
    textSecondary: cssVar('--text-secondary', '#B0B0B4'),
    textMuted: cssVar('--text-muted', '#6E6E74'),
    tooltipBg: cssVar('--bg-elevated', '#141416'),
    tooltipBorder: cssVar('--border', '#27272A'),
  };
}

/** Ordered series colors for multi-line charts */
export function getSeriesColors(): string[] {
  const c = getChartColors();
  return [
    c.primary,
    c.green,
    c.amber,
    c.red,
    '#8B7EC8',
    '#3A9B9B',
    '#5A8CC8',
    '#C88A50',
  ];
}

/** Base chart grid style — subtle solid lines */
export function getChartGrid() {
  const c = getChartColors();
  return {
    stroke: c.grid,
    strokeDasharray: '2 3' as const,
    strokeOpacity: 0.4,
  };
}

/** X/Y axis tick style — compact mono */
export function getAxisTick() {
  const c = getChartColors();
  return {
    fill: c.textMuted,
    fontFamily: cssVar('--font-ibm-plex-mono', 'IBM Plex Mono, monospace'),
    fontSize: 10,
  };
}

/** Premium tooltip style — dark, elevated, sharp */
export function getTooltipStyle() {
  const c = getChartColors();
  return {
    contentStyle: {
      background: c.tooltipBg,
      border: `1px solid ${c.tooltipBorder}`,
      borderRadius: 4,
      fontSize: 12,
      boxShadow: 'none' as const,
      padding: '8px 12px',
    },
    labelStyle: {
      color: c.text,
      fontWeight: 600,
      fontSize: 12,
      fontFamily: cssVar('--font-inter', 'Inter, sans-serif'),
      marginBottom: 3,
      letterSpacing: '0.01em',
    },
    itemStyle: {
      color: c.textSecondary,
      fontSize: 11,
      fontFamily: cssVar('--font-ibm-plex-mono', 'IBM Plex Mono, monospace'),
      padding: '1px 0',
    },
  };
}

/** Format a number as Indian rupees for charts */
export { fmtINR } from '@/lib/format';

/** Format a percentage */
export { fmtPct } from '@/lib/format';

/** Get color for a change value */
export function changeColor(v: number): string {
  const c = getChartColors();
  if (v > 0) return c.green;
  if (v < 0) return c.red;
  return c.muted;
}

/** Trend arrow */
export function trendArrow(v: number): string {
  if (v > 0) return '↑';
  if (v < 0) return '↓';
  return '→';
}
