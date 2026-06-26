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
