// ── Financial Calculation Types ──

/** A parsed line item from a filing comparison textarea */
export interface LineItem {
  label: string;
  value: string; // raw string, may contain commas
}

/** A computed diff between two periods for one line item */
export interface DiffResult {
  label: string;
  a: number | null;
  b: number | null;
  pct: number | null;
  abs: number | null;
  dir: 'up' | 'down' | 'flat';
  isPct: boolean;
}

/** A risk flag generated from filing comparison */
export interface RiskFlag {
  level: 'danger' | 'warn';
  label: string;
  text: string;
}

/** Data emitted by FilingTool for cross-tool consumption */
export interface FilingAnalysis {
  labels: string;
  diffs: DiffResult[];
  flags: RiskFlag[];
}

/** A single year of projected DCF cash flow */
export interface ProjectedYear {
  year: number;
  fcf: number;
  df: number;
  pv: number;
}

/** Result of a DCF calculation */
export interface DCFResult {
  projected: ProjectedYear[];
  pvSum: number;
  tv: number;
  pvTv: number;
  ev: number;
  eq: number;
  iv: number;
  mos: number;
}

/** Row in the DCF sensitivity table */
export interface SensitivityRow {
  g: number; // terminal growth rate %
  cols: { d: number; iv: number }[];
}

/** Result of working capital calculation */
export interface WCResult {
  dso: number | null;
  dio: number | null;
  dpo: number | null;
  ccc: number;
  nwc: number;
}

/** Input values for ratio calculations */
export interface RatioInputs {
  revenue: number | null;
  cogs: number | null;
  netProfit: number | null;
  totalAssets: number | null;
  totalEquity: number | null;
  totalDebt: number | null;
  currentAssets: number | null;
  currentLiab: number | null;
  inventory: number | null;
  interest: number | null;
  ebit: number | null;
}

/** A single computed ratio */
export interface RatioResult {
  section: 'Liquidity' | 'Leverage' | 'Profitability' | 'Efficiency';
  label: string;
  value: string;
  cls: 'good' | 'warn' | '';
}

// ── Provenance Types ──

/** Describes where a value came from — used for every visible metric/assumption */
export type ProvenanceKind = 'imported' | 'manual' | 'default' | 'inferred' | 'unavailable';

export interface ProvenanceSource {
  kind: ProvenanceKind;
  label: string;
  value: string | number | null;
  period?: string;
  sourceLabel?: string;       // e.g. "FY24 Annual Report (PDF)"
  confidence?: number;
  overridden?: boolean;
  capturedAt?: string;
}

// ── Institutional Analytics Types ──

export interface InstitutionalInputs {
  enterpriseValue: number | null;
  ebitda: number | null;
  ebit: number | null;
  revenue: number | null;
  netProfit: number | null;
  totalEquity: number | null;
  totalDebt: number | null;
  cash: number | null;
  freeCashFlow: number | null;
  totalAssets: number | null;
  taxRate: number | null;        // % (e.g. 25 for 25%)
  investedCapital: number | null;
  sharesOutstanding: number | null;
  price: number | null;
}

export interface InstitutionalMetric {
  label: string;
  value: number | null;
  formatted: string;
  description: string;
  cls: 'good' | 'warn' | '';
}

export interface InstitutionalResult {
  valuation: InstitutionalMetric[];   // EV/EBITDA, EV/Sales, P/E, P/B, FCF Yield
  profitability: InstitutionalMetric[]; // ROIC, ROCE
  metadata: {
    enterpriseValue: number | null;
    evFormatted: string;
    computedAt: string;
  };
}

// ── Memo Export Types ──

export type MemoProvenanceKind = 'imported' | 'manual' | 'assumed' | 'computed';

export interface MemoProvenance {
  kind: MemoProvenanceKind;
  label: string;
  value: string | number;
}

export interface MemoSection {
  title: string;
  subsections: {
    heading: string;
    body: string;
    provenance?: MemoProvenance[];
  }[];
}

export interface MemoExport {
  id: string;
  title: string;
  companyName: string;
  generatedAt: string;
  analyst: string;
  projectName: string;
  sections: MemoSection[];
  metadata: {
    datasetId: string | null;
    datasetPeriods: string[];
    factCount: number;
    versionId?: string;
  };
}

/** A peer comparison row */
export interface PeerRow {
  name: string;
  vals: number[];
}

/** A trend chart row */
export interface TrendRow {
  label: string;
  vals: number[];
}

/** A YoY growth row */
export interface YoyRow {
  label: string;
  vals: number[];
  growth: (number | null)[];
}

/** Generic metric for display in MetricGrid */
export interface MetricItem {
  label: string;
  value: string;
  sub?: string;
  cls?: 'good' | 'warn' | '';
}

/** DCF tool input values */
export interface DCFInputs {
  fcf: number | '';
  growth: number | '';
  years: number | '';
  discount: number | '';
  terminal: number | '';
  netDebt: number | '';
  shares: number | '';
  price: number | '';
}

/** WC tool input values */
export interface WCInputs {
  revenue: number | '';
  cogs: number | '';
  receivables: number | '';
  inventory: number | '';
  payables: number | '';
  cash: number | '';
}

/** Peer tool state */
export interface PeerState {
  csv: string;
  rows: PeerRow[];
}

/** Trends tool state */
export interface TrendsState {
  csv: string;
  headers: string[];
  rows: TrendRow[];
}

/** YoY tool state */
export interface YoyState {
  years: string;
  csv: string;
  rows: YoyRow[];
}

/** Financial terms dictionary entry */
export interface TermEntry {
  label: string;
  desc: string;
}
