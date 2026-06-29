// ── Canonical Financial Data Types for Smart Importer ──

export type SourceType = 'csv' | 'xlsx' | 'xbrl' | 'pdf-text' | 'ocr' | 'manual' | 'sample';
export type StatementType = 'income_statement' | 'balance_sheet' | 'cash_flow' | 'market_data' | 'quarterly_results' | 'mixed' | 'unknown';
export type Currency = 'INR' | 'USD' | 'GBP' | 'EUR' | 'UNKNOWN';
export type Unit = 'ones' | 'thousands' | 'lakhs' | 'crores' | 'millions' | 'billions';

/** A single parsed, cleaned, and mapped fact from the source file */
export interface CanonicalFact {
  company?: string;
  sourceType: SourceType;
  statement: StatementType;
  /** Primary canonical metric key (e.g. "revenue", "netProfit") */
  metric: string;
  /** @deprecated Use `metric` — kept for backward compat with new parsers */
  canonicalMetric?: string;
  labelOriginal: string;
  value: number;
  /** Original unnormalized value from the source before normalization */
  rawValue?: string | number;
  /** True if user manually edited this value after import */
  userOverridden?: boolean;
  periodLabel: string;
  periodEnd?: string;
  fiscalYear?: string;
  currency: Currency;
  unit: Unit;
  confidence: number;
  sourceRow: number;
  sourceColumn: number;
  sourceTableId?: string;
}

/** A table extracted from the source (e.g. from PDF/OCR) */
export interface ImportedTable {
  id: string;
  sourceName: string;
  statement?: StatementType;
  rows: string[][];
  cleanedRows: string[][];
  confidence: number;
}

/** Full dataset produced by the Smart Importer */
export interface FundalystDataset {
  id: string;
  sourceType: SourceType;
  companyName?: string;
  currency: Currency;
  unit: Unit;
  periods: string[];
  facts: CanonicalFact[];
  tables?: ImportedTable[];
  warnings: string[];
  missingFields: string[];
  confidence: number;
  createdAt: string;
  matchedTemplate?: string;
  templateConfidence?: number;
  detectedStatementType?: StatementType;
  isConsolidated?: boolean;
  periodType?: 'annual' | 'quarterly' | 'ttm' | 'unknown';
}

/** Reference template for known financial statement formats */
export interface ReferenceTemplate {
  id: string;
  name: string;
  country?: string;
  market?: string;
  statementType: StatementType;
  expectedSections: string[];
  requiredMetrics: string[];
  optionalMetrics: string[];
  aliases: Record<string, string[]>;
  rejectKeywords: string[];
  periodPatterns: string[];
}

/** A single row parsed from the source file as a string matrix */
export interface RawRow {
  rowIndex: number;
  cells: string[];
}

/** Describes what the detector found in the file */
export interface FileMetadata {
  company: string | null;
  currency: Currency;
  unit: Unit;
  periods: string[];
  statementTypes: StatementType[];
  headerRowIndex: number;
  metricColIndex: number;
  valueColIndices: number[];
  periodLabels: string[];
  confidence: number;
}

/** A proposed mapping from original label to canonical metric */
export interface MetricMapping {
  originalLabel: string;
  canonicalMetric: string;
  statement: StatementType;
  confidence: number;
  userConfirmed: boolean;
  userOverride?: string;
  ignored: boolean;
  value?: number;
  periodLabel?: string;
}

/** The complete review state before confirmation */
export interface ImportReviewState {
  fileName: string;
  sourceType: SourceType;
  metadata: FileMetadata;
  rawFacts: CanonicalFact[];
  mappings: MetricMapping[];
  dataset: FundalystDataset | null;
  warnings: string[];
  matchedTemplate?: string;
  templateConfidence?: number;
}

/** Tool readiness info */
export interface ToolReadiness {
  toolId: string;
  toolName: string;
  ready: boolean;
  requiredMetrics: string[];
  presentMetrics: string[];
  missingMetrics: string[];
  dataSource: 'imported' | 'sample' | 'manual' | 'none';
  companyName?: string;
}

/** Thresholds for various confidence checks */
export const CONFIDENCE = {
  EXACT: 1.0,
  CASE_INSENSITIVE: 0.95,
  CONTAINS: 0.85,
  FUZZY_HIGH: 0.75,
  FUZZY_MED: 0.6,
  GUESS: 0.4,
} as const;

/** Validation check result */
export interface ValidationCheck {
  label: string;
  passed: boolean;
  message: string;
}

/** Tool metric requirements */
export const TOOL_METRICS: Record<string, { required: string[]; optional: string[]; name: string }> = {
  filing: {
    name: 'Filing Comparison',
    required: [],
    optional: [],
  },
  trends: {
    name: 'Trend Charts',
    required: [],
    optional: [],
  },
  dcf: {
    name: 'DCF Valuation',
    required: ['freeCashFlow', 'sharesOutstanding'],
    optional: ['operatingCashFlow', 'capex', 'totalDebt', 'cash', 'price'],
  },
  wc: {
    name: 'Cash Efficiency',
    required: ['revenue', 'receivables', 'inventory', 'payables'],
    optional: ['cogs', 'cash'],
  },
  ratios: {
    name: 'Financial Ratios',
    required: ['revenue', 'currentAssets', 'currentLiabilities', 'totalDebt', 'totalAssets', 'equity'],
    optional: ['cogs', 'netProfit', 'inventory', 'interestExpense', 'ebit'],
  },
  peer: {
    name: 'Peer Comparison',
    required: [],
    optional: ['revenue', 'netProfit', 'totalAssets', 'totalDebt'],
  },
  growth: {
    name: 'Growth Rates',
    required: [],
    optional: [],
  },
};
