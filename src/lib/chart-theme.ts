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
    primary: cssVar('--primary', '#C8962E'),
    primaryLight: cssVar('--primary-hover', '#DCA93C'),
    green: cssVar('--green', '#3DA06D'),
    greenLight: cssVar('--green-strong', '#4AB07D'),
    red: cssVar('--red', '#CC5A5A'),
    redLight: cssVar('--red-strong', '#D86A6A'),
    amber: cssVar('--caution', '#C2703D'),
    amberLight: cssVar('--caution', '#C2703D'),
    purple: '#8B7EC8',
    teal: '#3A9B9B',
    pink: '#C87EA0',
    orange: '#C88A50',
    blue: '#5A8CC8',
    muted: cssVar('--text-muted', '#76756E'),
    grid: cssVar('--border', '#29292B'),
    text: cssVar('--text', '#EDEDE8'),
    textSecondary: cssVar('--text-secondary', '#B6B5AE'),
    textMuted: cssVar('--text-muted', '#76756E'),
    tooltipBg: cssVar('--bg-elevated', '#161617'),
    tooltipBorder: cssVar('--border', '#29292B'),
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
