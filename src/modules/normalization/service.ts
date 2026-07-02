/**
 * Normalization module — raw extracted data → canonical financial facts.
 *
 * Phase 1: placeholder — schema only.
 * Phase 2+: Metric mapping, unit conversion, period alignment, validation.
 */

export interface NormalizedFact {
  metric: string;
  periodLabel: string;
  value: number;
  statement: "income_statement" | "balance_sheet" | "cash_flow" | "assumptions";
  confidence: number;
  sourceRow: number;
  sourceColumn: number;
  labelOriginal: string;
}

export interface NormalizationResult {
  companyName?: string;
  currency: string;
  unit: string;
  periods: string[];
  facts: NormalizedFact[];
  warnings: string[];
}
