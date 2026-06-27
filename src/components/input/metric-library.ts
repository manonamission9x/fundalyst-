/**
 * Fundalyst — Categorized Metric Library
 *
 * Professional financial metrics organized by statement category.
 * Used by SpreadsheetInput for auto-suggest and row insertion.
 */

export interface MetricEntry {
  label: string;
  category: 'Income Statement' | 'Balance Sheet' | 'Cash Flow' | 'Ratios';
  isPct?: boolean; // true if this metric is a percentage/ratio
}

export const METRIC_LIBRARY: MetricEntry[] = [
  // ── Income Statement ──
  { label: 'Revenue', category: 'Income Statement' },
  { label: 'Gross Profit', category: 'Income Statement' },
  { label: 'Cost of Goods Sold', category: 'Income Statement' },
  { label: 'Operating Expenses', category: 'Income Statement' },
  { label: 'Employee Expenses', category: 'Income Statement' },
  { label: 'Selling & Marketing Expenses', category: 'Income Statement' },
  { label: 'R&D Expenses', category: 'Income Statement' },
  { label: 'EBITDA', category: 'Income Statement' },
  { label: 'Depreciation & Amortization', category: 'Income Statement' },
  { label: 'EBIT', category: 'Income Statement' },
  { label: 'Other Income', category: 'Income Statement' },
  { label: 'Interest Expense', category: 'Income Statement' },
  { label: 'Exceptional Items', category: 'Income Statement' },
  { label: 'Profit Before Tax', category: 'Income Statement' },
  { label: 'Tax Expense', category: 'Income Statement' },
  { label: 'Net Profit', category: 'Income Statement' },
  { label: 'Minority Interest', category: 'Income Statement' },
  { label: 'Profit After Tax (PAT)', category: 'Income Statement' },
  { label: 'Operating Profit', category: 'Income Statement' },
  { label: 'Gross Margin', category: 'Income Statement', isPct: true },
  { label: 'EBITDA Margin', category: 'Income Statement', isPct: true },
  { label: 'Net Profit Margin', category: 'Income Statement', isPct: true },
  { label: 'Operating Margin', category: 'Income Statement', isPct: true },

  // ── Balance Sheet ──
  { label: 'Total Assets', category: 'Balance Sheet' },
  { label: 'Current Assets', category: 'Balance Sheet' },
  { label: 'Non-Current Assets', category: 'Balance Sheet' },
  { label: 'Cash & Equivalents', category: 'Balance Sheet' },
  { label: 'Trade Receivables', category: 'Balance Sheet' },
  { label: 'Inventory', category: 'Balance Sheet' },
  { label: 'Investments', category: 'Balance Sheet' },
  { label: 'Property, Plant & Equipment', category: 'Balance Sheet' },
  { label: 'Intangible Assets', category: 'Balance Sheet' },
  { label: 'Goodwill', category: 'Balance Sheet' },
  { label: 'Total Liabilities', category: 'Balance Sheet' },
  { label: 'Current Liabilities', category: 'Balance Sheet' },
  { label: 'Non-Current Liabilities', category: 'Balance Sheet' },
  { label: 'Trade Payables', category: 'Balance Sheet' },
  { label: 'Short-Term Debt', category: 'Balance Sheet' },
  { label: 'Long-Term Debt', category: 'Balance Sheet' },
  { label: 'Total Debt', category: 'Balance Sheet' },
  { label: 'Total Equity', category: 'Balance Sheet' },
  { label: 'Share Capital', category: 'Balance Sheet' },
  { label: 'Reserves & Surplus', category: 'Balance Sheet' },
  { label: 'Retained Earnings', category: 'Balance Sheet' },
  { label: 'Book Value', category: 'Balance Sheet' },
  { label: 'Net Worth', category: 'Balance Sheet' },
  { label: 'Deferred Tax Liabilities', category: 'Balance Sheet' },
  { label: 'Contingent Liabilities', category: 'Balance Sheet' },
  { label: 'Gross Block', category: 'Balance Sheet' },
  { label: 'Net Block', category: 'Balance Sheet' },
  { label: 'Capital Work in Progress', category: 'Balance Sheet' },

  // ── Cash Flow ──
  { label: 'Operating Cash Flow', category: 'Cash Flow' },
  { label: 'Investing Cash Flow', category: 'Cash Flow' },
  { label: 'Financing Cash Flow', category: 'Cash Flow' },
  { label: 'Free Cash Flow', category: 'Cash Flow' },
  { label: 'Capital Expenditure', category: 'Cash Flow' },
  { label: 'Dividends Paid', category: 'Cash Flow' },
  { label: 'Share Buybacks', category: 'Cash Flow' },
  { label: 'Debt Repayment', category: 'Cash Flow' },
  { label: 'New Borrowings', category: 'Cash Flow' },
  { label: 'Change in Working Capital', category: 'Cash Flow' },

  // ── Ratios ──
  { label: 'Current Ratio', category: 'Ratios', isPct: true },
  { label: 'Quick Ratio', category: 'Ratios', isPct: true },
  { label: 'Debt/Equity', category: 'Ratios', isPct: true },
  { label: 'Debt/Assets', category: 'Ratios', isPct: true },
  { label: 'Interest Coverage', category: 'Ratios', isPct: true },
  { label: 'Return on Equity (ROE)', category: 'Ratios', isPct: true },
  { label: 'Return on Capital (ROCE)', category: 'Ratios', isPct: true },
  { label: 'Return on Assets (ROA)', category: 'Ratios', isPct: true },
  { label: 'Asset Turnover', category: 'Ratios', isPct: true },
  { label: 'Inventory Turnover', category: 'Ratios', isPct: true },
  { label: 'Receivables Turnover', category: 'Ratios', isPct: true },
  { label: 'Days Sales Outstanding', category: 'Ratios', isPct: true },
  { label: 'Days Inventory Outstanding', category: 'Ratios', isPct: true },
  { label: 'Days Payable Outstanding', category: 'Ratios', isPct: true },
  { label: 'Cash Conversion Cycle', category: 'Ratios', isPct: true },
  { label: 'Earnings Per Share (EPS)', category: 'Ratios' },
  { label: 'Book Value Per Share', category: 'Ratios' },
  { label: 'Price/Earnings (P/E)', category: 'Ratios', isPct: true },
  { label: 'Price/Book (P/B)', category: 'Ratios', isPct: true },
  { label: 'Dividend Yield', category: 'Ratios', isPct: true },
  { label: 'Piotroski F-Score', category: 'Ratios' },
  { label: 'Altman Z-Score', category: 'Ratios' },
  { label: 'Promoter Holding', category: 'Ratios', isPct: true },
  { label: 'FII Holding', category: 'Ratios', isPct: true },
  { label: 'DII Holding', category: 'Ratios', isPct: true },
  { label: 'Public Holding', category: 'Ratios', isPct: true },
];

export const METRIC_LABELS = METRIC_LIBRARY.map((m) => m.label);

/** Categorize a metric — or return 'Other' if unknown */
export function getMetricCategory(label: string): string {
  const found = METRIC_LIBRARY.find(
    (m) => m.label.toLowerCase() === label.toLowerCase(),
  );
  return found?.category ?? 'Other';
}

/** Check if a metric is a percentage-type */
export function isMetricPct(label: string): boolean {
  const found = METRIC_LIBRARY.find(
    (m) => m.label.toLowerCase() === label.toLowerCase(),
  );
  return found?.isPct ?? false;
}
