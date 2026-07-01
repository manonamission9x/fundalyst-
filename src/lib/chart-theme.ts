/**
 * Chart configuration for Fundalyst — Design System v5 "Ledger".
 *
 * Colors are returned as CSS-variable references (`var(--token)`) and resolved
 * by the browser, so charts inherit the active theme and this file contains
 * zero hardcoded color values.
 *
 * Color discipline (v5 §4) — do not deviate per-instance:
 *   - Magnitude / part-to-whole within one unit (FCF / PV / TV components,
 *     EV bridge, "these sum to a total") -> ink-weight system, inkWeight().
 *     Never categorical color.
 *   - Gain / loss / judgment (YoY, margin of safety) -> green / red, ALWAYS
 *     paired with a direction arrow (color-blind rule).
 *   - Warning / risk severity -> --caution only, never decorative.
 *   - Multi-series comparison (peer / multiple companies) -> the one legitimate
 *     categorical case: getSeriesColors(), capped at 4, rest folded to "Other".
 * One y-axis always. Static render (isAnimationActive={false}). Every chart
 * gets a hover tooltip.
 */

const V = (name: string): string => `var(${name})`;

/** Chart color palette — CSS-variable references, resolved by the browser. */
export function getChartColors() {
  return {
    text: V('--text'),
    textSecondary: V('--text-secondary'),
    textMuted: V('--text-muted'),
    grid: V('--border'),
    tooltipBg: V('--bg-elevated'),
    tooltipBorder: V('--border'),
    green: V('--green'),
    greenStrong: V('--green-strong'),
    red: V('--red'),
    redStrong: V('--red-strong'),
    caution: V('--caution'),
    primary: V('--primary'),
  };
}

/**
 * Ink-weight fill for magnitude / part-to-whole data (§1/§4).
 * weight 100 = solid ink, 60 = half, 30 = reserved for a real third segment.
 */
export function inkWeight(weight: 100 | 60 | 30 = 100): { fill: string; fillOpacity: number } {
  const opacity = weight === 100 ? 1 : weight === 60 ? 0.5 : 0.3;
  return { fill: V('--text'), fillOpacity: opacity };
}

/**
 * Categorical series palette — multi-series comparison ONLY (peer / multi-company).
 * Capped at 4; callers fold anything beyond into an "Other" series (the muted 4th).
 */
export function getSeriesColors(): string[] {
  return [V('--green'), V('--primary'), V('--caution'), V('--text-muted')];
}

/** Base chart grid style — subtle dashed lines. */
export function getChartGrid() {
  return {
    stroke: V('--border'),
    strokeDasharray: '2 3' as const,
    strokeOpacity: 0.4,
  };
}

/** X/Y axis tick style — compact mono. */
export function getAxisTick() {
  return {
    fill: V('--text-muted'),
    fontFamily: V('--font-mono'),
    fontSize: 10,
  };
}

/** Tooltip style — elevated surface, sharp, token-derived. */
export function getTooltipStyle() {
  return {
    contentStyle: {
      background: V('--bg-elevated'),
      border: `1px solid ${V('--border')}`,
      borderRadius: 8,
      fontSize: 12,
      boxShadow: 'none' as const,
      padding: '8px 12px',
    },
    labelStyle: {
      color: V('--text'),
      fontWeight: 600,
      fontSize: 12,
      fontFamily: V('--font-inter'),
      marginBottom: 3,
      letterSpacing: '0.01em',
    },
    itemStyle: {
      color: V('--text-secondary'),
      fontSize: 11,
      fontFamily: V('--font-mono'),
      padding: '1px 0',
    },
  };
}

/** Format a number as Indian rupees for charts */
export { fmtINR } from '@/lib/format';

/** Format a percentage */
export { fmtPct } from '@/lib/format';

/** Color for a gain/loss value — must be paired with a direction arrow in the UI. */
export function changeColor(v: number): string {
  if (v > 0) return V('--green');
  if (v < 0) return V('--red');
  return V('--text-muted');
}

/**
 * Typographic trend mark for plain-text / Markdown contexts (memos, labels).
 * In JSX / rendered UI, use Phosphor CaretUp / CaretDown instead (§3).
 */
export function trendArrow(v: number): string {
  if (v > 0) return '↑';
  if (v < 0) return '↓';
  return '→';
}
