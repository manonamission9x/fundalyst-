/**
 * Value extractor and confidence scorer for financial screenshots.
 *
 * Takes detected table structures and:
 *   1. Maps recognized labels to canonical metrics (via metric-aliases)
 *   2. Scores confidence per value based on OCR quality, metric match, and plausibility
 *   3. Handles multi-period extraction from single-column tables
 *   4. Detects the statement type (P&L, Balance Sheet, Cash Flow)
 */

import { findBestMetricMatch, canonicalDisplayName } from '../metric-aliases';
import { normalizeValue, convertToOnes } from '../normalizer';
import type { DetectedTable, DetectedRow } from './table-finder';
import type { CanonicalFact, StatementType, Currency, Unit } from '../types';

export interface ExtractedValue {
  metric: string;
  label: string;
  value: number | null;
  periodLabel: string;
  confidence: number;
  /** Whether this value was explicitly present vs inferred */
  isEstimated: boolean;
  /** The raw text that was parsed */
  rawText: string;
  /** Whether the source text contained percentage notation */
  isPercentage: boolean;
}

export interface ExtractionResult {
  facts: CanonicalFact[];
  /** Period labels detected */
  periods: string[];
  /** Statement type (income, balance, cash flow) */
  statementType: StatementType;
  /** Overall confidence for this extraction */
  confidence: number;
  /** Warnings about specific values */
  warnings: string[];
  /** Per-value confidence details for the UI */
  valueDetails: ExtractedValue[];
  /** Suggested company name if detectable */
  companyName?: string;
  /** Detected currency */
  currency: Currency;
  /** Detected unit (crores, lakhs, etc.) */
  unit: Unit;
}

/** Thresholds for value plausibility */
const PLAUSIBILITY_RANGES: Record<string, { min: number; max: number }> = {
  revenue: { min: 1e5, max: 1e13 },
  netProfit: { min: -1e12, max: 1e12 },
  ebit: { min: -1e12, max: 1e12 },
  ebitda: { min: -1e12, max: 1e12 },
  totalAssets: { min: 1e5, max: 1e13 },
  totalDebt: { min: 0, max: 1e13 },
  equity: { min: -1e12, max: 1e13 },
  currentAssets: { min: 0, max: 1e13 },
  currentLiabilities: { min: 0, max: 1e13 },
  inventory: { min: 0, max: 1e12 },
  receivables: { min: 0, max: 1e12 },
  payables: { min: 0, max: 1e12 },
  cash: { min: 0, max: 1e12 },
  operatingCashFlow: { min: -1e12, max: 1e12 },
  capex: { min: -1e12, max: 1e11 },
  sharesOutstanding: { min: 1e4, max: 1e12 },
  eps: { min: -1e5, max: 1e5 },
  interestExpense: { min: 0, max: 1e11 },
};

/** Detect statement type from recognized metrics */
function detectStatementType(
  metrics: string[],
): StatementType {
  const set = new Set(metrics);

  const hasRevenue = set.has('revenue') || set.has('totalIncome');
  const hasCosts = set.has('cogs') || set.has('expenses');
  const hasProfit = set.has('netProfit') || set.has('ebit') || set.has('ebitda');
  const hasBalance = set.has('totalAssets') || set.has('totalDebt') || set.has('equity');
  const hasCurrent = set.has('currentAssets') || set.has('currentLiabilities');
  const hasCashFlow = set.has('operatingCashFlow') || set.has('capex');
  const hasCash = set.has('cash');

  if (hasCashFlow && (hasCash || hasRevenue)) return 'cash_flow';
  if (hasBalance || hasCurrent) return 'balance_sheet';
  if (hasRevenue || hasCosts || hasProfit) return 'income_statement';

  return 'unknown';
}

/**
 * Score OCR confidence based on OCR-level metrics.
 * This is a placeholder that gets populated from Tesseract's per-word confidence.
 */
function scoreOcrConfidence(rawText: string): number {
  // Heuristics based on raw text quality
  const words = rawText.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  // Count non-alphanumeric artifacts (OCR noise)
  const artifacts = words.filter(
    (w) => /[^a-zA-Z0-9₹.,%/\-()\s]/.test(w) && w.length > 1,
  ).length;

  const artifactRatio = artifacts / words.length;

  // Baseline: 0.8, penalized by artifacts
  let score = 0.8 - artifactRatio * 2;
  return Math.max(0.15, Math.min(0.95, score));
}

/**
 * Score the plausibility of a value for a given metric.
 * Returns 0-1 where 1 = very plausible.
 */
function scorePlausibility(metric: string, value: number): number {
  const range = PLAUSIBILITY_RANGES[metric];
  if (!range) return 0.7; // Unknown metric — neutral

  if (value >= range.min && value <= range.max) {
    // Within range — score based on how close to midpoint
    const mid = (range.min + range.max) / 2;
    const halfRange = (range.max - range.min) / 2;
    const distance = Math.abs(value - mid) / halfRange;
    return 0.7 + 0.3 * (1 - Math.min(distance, 1));
  }

  return 0.2; // Outside plausible range
}

/**
 * Try to detect the unit (crores/lakhs/etc.) from metric label context.
 */
function detectUnitFromLabel(
  label: string,
): Unit {
  const lower = label.toLowerCase();
  if (/cr\.?$|crore/i.test(lower)) return 'crores';
  if (/lakhs?$|lacs?$/i.test(lower)) return 'lakhs';
  if (/mn$|million/i.test(lower)) return 'millions';
  if (/bn$|billion/i.test(lower)) return 'billions';
  if (/thousand/i.test(lower)) return 'thousands';
  return 'ones';
}

/**
 * Main extraction function.
 * Takes detected table structures and produces structured financial data.
 */
export function extractValues(
  tables: DetectedTable[],
): ExtractionResult {
  const warnings: string[] = [];
  const extracted: ExtractedValue[] = [];
  const allMetrics = new Set<string>();
  const ocrConfidence =
    tables.length > 0
      ? Math.min(...tables.map((t) => t.confidence))
      : 0.5;

  for (const table of tables) {
    for (const row of table.rows) {
      if (row.isHeader) continue;

      // First cell should be the label
      const labelCell = row.cells[0];
      if (!labelCell) continue;
      const labelText = labelCell.text;

      // Try to match the label to a canonical metric
      const match = findBestMetricMatch(labelText);
      if (!match) {
        warnings.push(
          `Unrecognized label: "${labelText}" — will need manual mapping`,
        );
        continue;
      }

      allMetrics.add(match.canonical);

      // Process value cells (period 1, period 2, etc.)
      const valueCells = row.cells.slice(1);

      if (valueCells.length === 0) {
        // Single column — treat as single period
        let value: number | null = null;
        let isPercent = false;

        if (labelCell.numericValue !== null) {
          value = labelCell.numericValue;
          isPercent = labelCell.isPercent;
        } else if (row.cells.length === 1) {
          // Label with no value — section header
          continue;
        }

        const periodLabel = table.periods[0] || 'Period 1';
        const plausibility = value !== null
          ? scorePlausibility(match.canonical, value)
          : 0;
        const confidence =
          match.confidence * 0.4 +
          ocrConfidence * 0.3 +
          plausibility * 0.3;

        extracted.push({
          metric: match.canonical,
          label: labelText,
          value,
          periodLabel,
          confidence: Math.round(confidence * 100) / 100,
          isEstimated: false,
          rawText: labelText,
          isPercentage: isPercent,
        });
      } else {
        // Multi-period: process each value column
        for (let ci = 0; ci < valueCells.length; ci++) {
          const cell = valueCells[ci];
          const periodLabel =
            table.periods[ci] || `Period ${ci + 1}`;

          let value: number | null = cell.numericValue;

          // If OCR didn't parse it, try parsing the raw text
          if (value === null && cell.text) {
            const parsed = normalizeValue(cell.text);
            if (parsed.value !== null) {
              value = convertToOnes(parsed.value, parsed.detectedUnit);
            }
          }

          const plausibility = value !== null
            ? scorePlausibility(match.canonical, value)
            : 0;
          const confidence =
            match.confidence * 0.35 +
            ocrConfidence * 0.25 +
            plausibility * 0.25 +
            0.15; // baseline

          extracted.push({
            metric: match.canonical,
            label: labelText,
            value,
            periodLabel,
            confidence: Math.round(confidence * 100) / 100,
            isEstimated: false,
            rawText: cell.text,
            isPercentage: cell.isPercent,
          });
        }
      }
    }
  }

  // Detect statement type
  const statementType = detectStatementType([...allMetrics]);

  // Detect unit from labels
  const unit: Unit = 'crores'; // Default for Indian financial statements

  // Convert to canonical facts
  const facts: CanonicalFact[] = extracted
    .filter((v) => v.value !== null)
    .map((v, i) => ({
      company: undefined,
      sourceType: 'ocr' as const,
      statement: statementType,
      metric: v.metric,
      labelOriginal: v.label,
      value: v.value!,
      periodLabel: v.periodLabel,
      currency: 'INR' as Currency,
      unit,
      confidence: v.confidence,
      sourceRow: i,
      sourceColumn: 0,
      sourceTableId: tables[0]?.id,
    }));

  // Overall confidence
  const confidence =
    facts.length > 0
      ? facts.reduce((s, f) => s + f.confidence, 0) / facts.length
      : 0;

  // Detect currency from context
  const currency: Currency = 'INR'; // Default for Indian financial analysis

  return {
    facts,
    periods: [...new Set(extracted.map((v) => v.periodLabel))],
    statementType,
    confidence: Math.round(confidence * 100) / 100,
    warnings,
    valueDetails: extracted,
    currency,
    unit,
  };
}
