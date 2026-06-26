/**
 * Reference Format Engine
 *
 * Stores structured templates for known Indian financial statement formats
 * and provides matching/confidence scoring for uploaded file data.
 *
 * Templates cover:
 *   - Profit & Loss / Income Statement (Indian Schedule III)
 *   - Balance Sheet (Equity & Liabilities / Assets)
 *   - Cash Flow Statement (Ind AS / old format)
 *   - Quarterly Results (NSE/BSE filing style)
 */

import type {
  ReferenceTemplate,
  StatementType,
  CanonicalFact,
  RawRow,
} from './types';

// ────────────────────────────────────────────────────────────────────────
// Reference Templates
// ────────────────────────────────────────────────────────────────────────

const TEMPLATES: ReferenceTemplate[] = [
  // ── Profit & Loss / Income Statement (Indian) ──
  {
    id: 'in-pl-schedule-iii',
    name: 'Indian P&L (Schedule III)',
    country: 'IN',
    market: 'NSE/BSE',
    statementType: 'income_statement',
    expectedSections: [
      'Revenue from Operations',
      'Other Income',
      'Total Income',
      'Expenses',
      'Cost of Materials Consumed',
      'Purchases of Stock-in-Trade',
      'Employee Benefits Expense',
      'Finance Costs',
      'Depreciation and Amortisation',
      'Other Expenses',
      'Total Expenses',
      'Profit Before Exceptional Items and Tax',
      'Exceptional Items',
      'Profit Before Tax',
      'Tax Expense',
      'Profit After Tax',
      'Other Comprehensive Income',
      'Total Comprehensive Income',
      'Earnings Per Share',
    ],
    requiredMetrics: [
      'revenue',
      'netProfit',
    ],
    optionalMetrics: [
      'totalIncome',
      'ebit',
      'ebitda',
      'interestExpense',
      'cogs',
      'grossProfit',
      'depreciation',
      'tax',
      'profitBeforeTax',
      'extraordinaryItems',
      'expenses',
      'eps',
      'sharesOutstanding',
    ],
    aliases: {
      revenue: [
        'Revenue from Operations',
        'Revenue from operations',
        'Total Revenue',
        'Revenue',
        'Operating Revenue',
        'Income from Operations',
        'Sales',
        'Turnover',
        'Gross Revenue',
        'Net Sales',
        'Revenue (Net)',
        'Revenue from Operation',
        'Revenue from Ops',
        'Operating Income',
        'Total Income from Operations',
      ],
      netProfit: [
        'Net Profit',
        'Profit for the Year',
        'Profit After Tax',
        'Net Income',
        'PAT',
        'Profit for the Period',
        'Net Profit After Tax',
        'Profit/(Loss) for the Period',
        'Profit / (Loss) for the Period',
        'Net Profit/(Loss)',
        'Profit Attributable to Owners',
      ],
      totalIncome: [
        'Total Income',
        'Total Revenue and Other Income',
        'Total Revenue & Other Income',
        'Income from Operations and Other Income',
      ],
      ebit: [
        'EBIT',
        'Operating Profit',
        'Profit Before Interest and Tax',
        'PBIT',
        'Earnings Before Interest and Taxes',
      ],
      ebitda: [
        'EBITDA',
        'Earnings Before Interest Taxes Depreciation Amortisation',
        'Operating Profit Before Depreciation',
        'Adjusted EBITDA',
      ],
      interestExpense: [
        'Finance Cost',
        'Finance Costs',
        'Interest Expense',
        'Borrowing Cost',
        'Financial Charges',
      ],
      cogs: [
        'Cost of Materials Consumed',
        'Cost of Goods Sold',
        'Cost of Sales',
        'Raw Materials Consumed',
        'Purchase of Stock-in-Trade',
        'Material Cost',
      ],
      grossProfit: [
        'Gross Profit',
        'Gross Profit / (Loss)',
        'Gross Margin',
      ],
      depreciation: [
        'Depreciation and Amortisation',
        'Depreciation and Amortization',
        'Depreciation & Amortisation',
        'Depreciation Expense',
        'Depreciation',
      ],
      tax: [
        'Tax Expense',
        'Income Tax',
        'Current Tax',
        'Deferred Tax',
        'Provision for Tax',
        'Provision for Taxation',
        'Tax Charge',
      ],
      profitBeforeTax: [
        'Profit Before Tax',
        'PBT',
        'Profit Before Taxation',
        'Profit / (Loss) Before Tax',
        'Profit Before Exceptional Items and Tax',
      ],
      extraordinaryItems: [
        'Exceptional Items',
        'Extraordinary Items',
        'Exceptional and Extraordinary Items',
        'Prior Period Adjustments',
        'Other Comprehensive Income',
      ],
      expenses: [
        'Employee Benefits Expense',
        'Employee Cost',
        'Other Expenses',
        'Total Expenses',
        'Operating Expenses',
        'Administrative Expenses',
        'Selling Expenses',
        'Selling and Distribution Expenses',
      ],
      eps: [
        'Earnings Per Share',
        'Basic EPS',
        'Diluted EPS',
        'EPS (Basic)',
        'EPS (Diluted)',
      ],
    },
    rejectKeywords: [
      'address',
      'cin',
      'registered office',
      'corporate identity number',
      'directors',
      'auditor',
      'notes',
      'annexure',
      'board of directors',
      'management discussion',
      'ceo',
      'cfo',
      'company secretary',
      'signatory',
      'place',
      'date',
      'for and on behalf of',
      'as per our report',
      'chartered accountants',
      'members',
      'shareholders',
      'notice',
      'attendance',
    ],
    periodPatterns: [
      'FY',
      'Year Ended',
      'For the year ended',
      'For the period ended',
      'Year ended March',
      'Financial Year',
      'As at',
    ],
  },

  // ── Balance Sheet (Indian Schedule III) ──
  {
    id: 'in-bs-schedule-iii',
    name: 'Indian Balance Sheet (Schedule III)',
    country: 'IN',
    market: 'NSE/BSE',
    statementType: 'balance_sheet',
    expectedSections: [
      'EQUITY AND LIABILITIES',
      "Shareholders' Funds",
      'Share Capital',
      'Reserves and Surplus',
      'Money Received Against Share Warrants',
      'Non-Current Liabilities',
      'Long-Term Borrowings',
      'Deferred Tax Liabilities (Net)',
      'Other Non-Current Liabilities',
      'Long-Term Provisions',
      'Current Liabilities',
      'Short-Term Borrowings',
      'Trade Payables',
      'Other Current Liabilities',
      'Short-Term Provisions',
      'Total Equity and Liabilities',
      'ASSETS',
      'Non-Current Assets',
      'Property, Plant and Equipment',
      'Intangible Assets',
      'Capital Work-in-Progress',
      'Intangible Assets Under Development',
      'Financial Assets - Non-Current',
      'Deferred Tax Assets (Net)',
      'Other Non-Current Assets',
      'Current Assets',
      'Inventories',
      'Trade Receivables',
      'Cash and Cash Equivalents',
      'Bank Balances',
      'Short-Term Loans and Advances',
      'Other Current Assets',
      'Total Assets',
    ],
    requiredMetrics: [
      'totalAssets',
      'equity',
    ],
    optionalMetrics: [
      'currentAssets',
      'currentLiabilities',
      'totalDebt',
      'cash',
      'inventory',
      'receivables',
      'payables',
      'nonCurrentLiabilities',
      'fixedAssets',
      'workingCapital',
    ],
    aliases: {
      totalAssets: [
        'Total Assets',
        'Total',
        'Balance Sheet Total',
        'Assets',
        'Total Assets (TA)',
        'Sum of Assets',
        'Total Assets (Net)',
      ],
      equity: [
        'Total Equity',
        "Shareholders' Funds",
        "Shareholders' Equity",
        "Shareholder's Funds",
        'Net Worth',
        'Equity',
        'Equity Share Capital',
        'Share Capital',
        'Reserves and Surplus',
        'Reserves & Surplus',
        'Total Equity & Reserves',
        'Total Equity and Reserves',
        'Equity Attributable to Owners',
        'Total Shareholders Fund',
        'Total Shareholders Equity',
      ],
      currentAssets: [
        'Current Assets',
        'Total Current Assets',
        'Current Assets Total',
        'Total Current Assets (CA)',
        'Sum of Current Assets',
      ],
      currentLiabilities: [
        'Current Liabilities',
        'Total Current Liabilities',
        'Current Liabilities Total',
        'Total Current Liabilities (CL)',
        'Current Liabilities and Provisions',
      ],
      totalDebt: [
        'Borrowings',
        'Total Borrowings',
        'Debt',
        'Short-Term Borrowings',
        'Long-Term Borrowings',
        'Current Borrowings',
        'Non-Current Borrowings',
        'Total Debt',
        'Loan Funds',
        'Secured Loans',
        'Unsecured Loans',
      ],
      cash: [
        'Cash and Cash Equivalents',
        'Cash & Cash Equivalents',
        'Cash and Bank',
        'Cash & Bank',
        'Cash and Bank Balances',
        'Cash on Hand and at Bank',
        'Bank Balances',
        'Cash',
      ],
      inventory: [
        'Inventories',
        'Inventory',
        'Stock-in-Trade',
        'Stock in Trade',
        'Closing Stock',
        'Total Inventories',
        'Stock',
        'Work in Progress',
        'Finished Goods',
        'Raw Materials Inventory',
      ],
      receivables: [
        'Trade Receivables',
        'Trade Debtors',
        'Sundry Debtors',
        'Receivables',
        'Accounts Receivable',
        'Debtors',
      ],
      payables: [
        'Trade Payables',
        'Trade Creditors',
        'Sundry Creditors',
        'Payables',
        'Accounts Payable',
        'Creditors',
        'Trade and Other Payables',
      ],
      nonCurrentLiabilities: [
        'Non-Current Liabilities',
        'Non Current Liabilities',
        'Long-Term Liabilities',
        'Long Term Liabilities',
        'Non-Current Borrowings',
        'Deferred Tax Liabilities',
      ],
      fixedAssets: [
        'Fixed Assets',
        'Property, Plant and Equipment',
        'PPE',
        'Tangible Assets',
        'Net Block',
        'Gross Block',
        'Net Fixed Assets',
        'Total Tangible Assets',
      ],
      workingCapital: [
        'Net Current Assets',
        'Working Capital',
        'Net Working Capital',
        'Total Working Capital',
      ],
    },
    rejectKeywords: [
      'address',
      'cin',
      'registered office',
      'corporate identity number',
      'directors',
      'auditor',
      'notes',
      'annexure',
      'board of directors',
      'management discussion',
      'ceo',
      'cfo',
      'company secretary',
      'signatory',
      'place',
      'date',
      'for and on behalf of',
      'as per our report',
      'chartered accountants',
      'members',
      'shareholders',
      'notice',
      'attendance',
      'previous year',
      'current year',
      'as at march',
      'particulars',
      'note no',
      'note no.',
      'note',
    ],
    periodPatterns: [
      'FY',
      'As at',
      'As at March',
      'As on',
      'As of',
      'Year Ended',
      'Balance Sheet Date',
    ],
  },

  // ── Cash Flow Statement (Ind AS / Old format) ──
  {
    id: 'in-cf-ind-as',
    name: 'Indian Cash Flow (Ind AS)',
    country: 'IN',
    market: 'NSE/BSE',
    statementType: 'cash_flow',
    expectedSections: [
      'Cash Flow from Operating Activities',
      'Profit Before Tax',
      'Adjustments for',
      'Depreciation and Amortisation',
      'Finance Costs',
      'Interest Income',
      'Operating Profit Before Working Capital Changes',
      'Changes in Working Capital',
      'Cash Generated from Operations',
      'Direct Taxes Paid',
      'Net Cash Flow from Operating Activities',
      'Cash Flow from Investing Activities',
      'Purchase of Property, Plant and Equipment',
      'Sale of Property, Plant and Equipment',
      'Interest Received',
      'Net Cash Flow from Investing Activities',
      'Cash Flow from Financing Activities',
      'Proceeds from Borrowings',
      'Repayment of Borrowings',
      'Interest Paid',
      'Dividends Paid',
      'Net Cash Flow from Financing Activities',
      'Net Increase/Decrease in Cash',
      'Cash and Cash Equivalents at Beginning',
      'Cash and Cash Equivalents at End',
    ],
    requiredMetrics: [
      'operatingCashFlow',
    ],
    optionalMetrics: [
      'investingCashFlow',
      'financingCashFlow',
      'capex',
      'freeCashFlow',
      'cash',
      'interestExpense',
      'depreciation',
      'tax',
      'profitBeforeTax',
    ],
    aliases: {
      operatingCashFlow: [
        'Cash Flow from Operating Activities',
        'Net Cash from Operating Activities',
        'Net Cash Flow from Operating Activities',
        'Cash from Operations',
        'Cash Generated from Operations',
        'Cash from Operating Activities',
        'Operating Cash Flow',
        'Net Cash Generated from Operating Activities',
        'Cash Flow from Operations',
        'Net Cash Provided by Operating Activities',
        'CFO',
      ],
      investingCashFlow: [
        'Cash Flow from Investing Activities',
        'Net Cash from Investing Activities',
        'Cash from Investing Activities',
        'Net Cash Used in Investing Activities',
        'Investing Cash Flow',
        'Cash from Investments',
        'Net Cash Flow from Investing Activities',
      ],
      financingCashFlow: [
        'Cash Flow from Financing Activities',
        'Net Cash from Financing Activities',
        'Cash from Financing Activities',
        'Net Cash Used in Financing Activities',
        'Financing Cash Flow',
        'Cash from Financing',
        'Net Cash Flow from Financing Activities',
      ],
      capex: [
        'Capital Expenditure',
        'Purchase of Fixed Assets',
        'Purchase of Property, Plant and Equipment',
        'Purchase of Property Plant and Equipment',
        'Capex',
        'Acquisition of Fixed Assets',
        'Additions to Fixed Assets',
      ],
      freeCashFlow: [
        'Free Cash Flow',
        'FCF',
        'Free Cash Flow to Firm',
        'FCFF',
      ],
      cash: [
        'Cash and Cash Equivalents at End',
        'Cash and Cash Equivalents at Beginning',
        'Closing Cash',
        'Opening Cash',
        'Cash and Cash Equivalents',
        'Cash & Cash Equivalents',
      ],
      interestExpense: [
        'Finance Costs',
        'Interest Paid',
        'Interest Expense',
        'Finance Cost',
      ],
      depreciation: [
        'Depreciation and Amortisation',
        'Depreciation and Amortization',
        'Depreciation & Amortisation',
        'Depreciation',
        'Depreciation Expense',
      ],
      tax: [
        'Direct Taxes Paid',
        'Tax Paid',
        'Income Tax Paid',
        'Taxes Paid',
        'Tax Expense',
      ],
      profitBeforeTax: [
        'Profit Before Tax',
        'Profit Before Taxation',
        'PBT',
        'Profit / (Loss) Before Tax',
      ],
    },
    rejectKeywords: [
      'address',
      'cin',
      'registered office',
      'notes',
      'annexure',
      'board of directors',
      'ceo',
      'cfo',
      'signatory',
      'date',
      'place',
      'for and on behalf of',
      'as per our report',
      'members',
    ],
    periodPatterns: [
      'FY',
      'Year Ended',
      'For the year ended',
      'For the period ended',
    ],
  },

  // ── Quarterly Results (NSE/BSE filing style) ──
  {
    id: 'in-quarterly-nse-bse',
    name: 'Indian Quarterly Results (NSE/BSE)',
    country: 'IN',
    market: 'NSE/BSE',
    statementType: 'quarterly_results',
    expectedSections: [
      'Revenue from Operations',
      'Other Income',
      'Total Income',
      'Total Expenses',
      'Profit Before Tax',
      'Tax Expense',
      'Profit After Tax',
      'Other Comprehensive Income',
      'Total Comprehensive Income',
      'Paid-up Equity Share Capital',
      'Earnings Per Share',
      'Net Profit Margin',
      'Segment Revenue',
      'Segment Results',
      'Segment Assets',
      'Segment Liabilities',
    ],
    requiredMetrics: [
      'revenue',
      'netProfit',
      'eps',
    ],
    optionalMetrics: [
      'totalIncome',
      'ebit',
      'ebitda',
      'interestExpense',
      'depreciation',
      'tax',
      'profitBeforeTax',
      'extraordinaryItems',
      'expenses',
      'equity',
      'sharesOutstanding',
    ],
    aliases: {
      revenue: [
        'Revenue from Operations',
        'Total Revenue',
        'Revenue',
        'Net Sales',
        'Sales',
        'Turnover',
        'Operating Revenue',
        'Income from Operations',
        'Total Income from Operations',
        'Segment Revenue',
      ],
      netProfit: [
        'Net Profit',
        'Profit for the Period',
        'Profit After Tax',
        'Net Income',
        'PAT',
        'Profit / (Loss) for the Period',
        'Profit After Tax for the Period',
        'Net Profit After Tax',
      ],
      eps: [
        'Earnings Per Share',
        'Basic EPS',
        'Diluted EPS',
        'EPS (Basic)',
        'EPS (Diluted)',
        'EPS - Basic',
        'EPS - Diluted',
        'Face Value',
      ],
      totalIncome: [
        'Total Income',
        'Total Revenue and Other Income',
        'Total Revenue & Other Income',
      ],
      ebit: [
        'EBIT',
        'Operating Profit',
        'Profit Before Interest and Tax',
        'PBIT',
      ],
      ebitda: [
        'EBITDA',
        'Earnings Before Interest Taxes Depreciation Amortisation',
        'Operating Profit Before Depreciation',
      ],
      interestExpense: [
        'Finance Cost',
        'Finance Costs',
        'Interest Expense',
        'Borrowing Cost',
      ],
      depreciation: [
        'Depreciation and Amortisation',
        'Depreciation and Amortization',
        'Depreciation & Amortisation',
        'Depreciation',
        'Depreciation Expense',
      ],
      tax: [
        'Tax Expense',
        'Income Tax',
        'Current Tax',
        'Deferred Tax',
        'Provision for Tax',
        'Tax Charge',
      ],
      profitBeforeTax: [
        'Profit Before Tax',
        'PBT',
        'Profit Before Taxation',
        'Profit / (Loss) Before Tax',
      ],
      extraordinaryItems: [
        'Exceptional Items',
        'Extraordinary Items',
        'Exceptional and Extraordinary Items',
        'Other Comprehensive Income',
      ],
      expenses: [
        'Total Expenses',
        'Operating Expenses',
        'Cost of Sales',
        'Employee Cost',
        'Other Expenses',
        'Selling Expenses',
        'Selling and Distribution Expenses',
      ],
      equity: [
        'Paid-up Equity Share Capital',
        'Paid-Up Equity Share Capital',
        'Equity Share Capital',
        'Share Capital',
        'Paid-up Capital',
      ],
      sharesOutstanding: [
        'Number of Shares',
        'No of Shares',
        'No. of Shares',
        'Equity Shares',
        'Total Shares Outstanding',
        'Outstanding Shares',
        'Face Value',
      ],
    },
    rejectKeywords: [
      'address',
      'cin',
      'registered office',
      'corporate identity number',
      'directors',
      'auditor',
      'notes',
      'annexure',
      'board of directors',
      'management discussion',
      'ceo',
      'cfo',
      'company secretary',
      'signatory',
      'place',
      'date',
      'for and on behalf of',
      'as per our report',
      'chartered accountants',
      'members',
      'shareholders',
      'notice',
      'attendance',
      'press release',
      'stock exchange',
      'bse limited',
      'nse limited',
      'sub:',
      'submission',
      'reg',
      'pursuant to',
      'regulation',
    ],
    periodPatterns: [
      'Q1',
      'Q2',
      'Q3',
      'Q4',
      'Quarter Ended',
      'Quarterly',
      'Half Year Ended',
      'Nine Months Ended',
      'Current Quarter',
      'Previous Quarter',
      'Quarter ended March',
      'Quarter ended June',
      'Quarter ended September',
      'Quarter ended December',
      'Standalone',
      'Consolidated',
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────────────

/** Pre-compute the flat alias map for quick lookups */
function buildAliasMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const tmpl of TEMPLATES) {
    for (const [canonical, aliases] of Object.entries(tmpl.aliases)) {
      for (const alias of aliases) {
        const key = alias.toLowerCase().trim();
        // First match wins; if already set from another template, keep it
        if (!map[key]) {
          map[key] = canonical;
        }
      }
    }
  }
  return map;
}

const ALIAS_LOOKUP = buildAliasMap();

/** Pre-compute the union of all reject keywords (lowercased) */
const REJECT_KEYWORDS_SET: Set<string> = (() => {
  const set = new Set<string>();
  for (const tmpl of TEMPLATES) {
    for (const kw of tmpl.rejectKeywords) {
      set.add(kw.toLowerCase().trim());
    }
  }
  return set;
})();

/**
 * Normalize a label for matching: lowercase, trim, collapse whitespace.
 */
function normalizeLabel(label: string): string {
  return label.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if a row label should be rejected (contains corporate boilerplate).
 */
function isRejectLabel(label: string): boolean {
  const normalized = normalizeLabel(label);
  for (const kw of REJECT_KEYWORDS_SET) {
    if (normalized.includes(kw)) return true;
  }
  return false;
}

/**
 * Score how well a set of row labels matches a template's expected sections.
 * Returns a score from 0 to 1 where 1 = all expected sections found.
 */
function scoreSectionMatch(
  rowLabels: string[],
  template: ReferenceTemplate
): number {
  const normalizedLabels = rowLabels.map(normalizeLabel);
  let matches = 0;

  for (const section of template.expectedSections) {
    const sectionNorm = normalizeLabel(section);
    // Check if any row label contains (or is contained by) the expected section
    const found = normalizedLabels.some(
      (label) =>
        label.includes(sectionNorm) ||
        sectionNorm.includes(label) ||
        // Also check words overlap
        sectionNorm.split(/\s+/).some((word) => word.length > 3 && label.includes(word))
    );
    if (found) matches++;
  }

  if (template.expectedSections.length === 0) return 0;
  return matches / template.expectedSections.length;
}

/**
 * Score how many of the detected metrics match the template's required + optional metrics.
 * Returns a score from 0 to 1.
 */
function scoreMetricMatch(
  detectedMetrics: string[],
  template: ReferenceTemplate
): number {
  const metricSet = new Set(detectedMetrics.map((m) => m.toLowerCase().trim()));
  let requiredFound = 0;
  let optionalFound = 0;

  for (const req of template.requiredMetrics) {
    if (metricSet.has(req.toLowerCase().trim())) {
      requiredFound++;
    }
  }
  for (const opt of template.optionalMetrics) {
    if (metricSet.has(opt.toLowerCase().trim())) {
      optionalFound++;
    }
  }

  // Weight: required metrics count 2x, optional count 1x
  const requiredWeight =
    template.requiredMetrics.length > 0
      ? requiredFound / template.requiredMetrics.length
      : 1;
  const optionalWeight =
    template.optionalMetrics.length > 0
      ? optionalFound / template.optionalMetrics.length
      : 1;

  // Required metrics are 70% of the score, optional are 30%
  return requiredWeight * 0.7 + optionalWeight * 0.3;
}

// ────────────────────────────────────────────────────────────────────────
// Exported API
// ────────────────────────────────────────────────────────────────────────

/**
 * Find the best matching template for a set of parsed rows, detected metrics,
 * and row labels extracted from an uploaded file.
 *
 * @param rows       Raw rows from the file (used to inspect row content)
 * @param metrics    Detected canonical metric keys (e.g. ['revenue', 'netProfit'])
 * @param labels     Original row labels (the first column text values)
 * @returns          Best matching template (or null), confidence score (0-1),
 *                   and list of missing required fields
 */
export function matchTemplate(
  rows: RawRow[],
  metrics: string[],
  labels: string[]
): {
  template: ReferenceTemplate | null;
  score: number;
  missingFields: string[];
} {
  if (!rows || rows.length === 0 || !labels || labels.length === 0) {
    return { template: null, score: 0, missingFields: [] };
  }

  // Filter out reject keywords from labels to improve accuracy
  const cleanLabels = labels.filter((l) => !isRejectLabel(l));

  let bestTemplate: ReferenceTemplate | null = null;
  let bestScore = 0;

  for (const tmpl of TEMPLATES) {
    const sectionScore = scoreSectionMatch(cleanLabels, tmpl);
    const metricScore = scoreMetricMatch(metrics, tmpl);
    const totalScore = sectionScore * 0.4 + metricScore * 0.6;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestTemplate = tmpl;
    }
  }

  // Determine missing required fields for the best template
  let missingFields: string[] = [];
  if (bestTemplate) {
    const metricSet = new Set(metrics.map((m) => m.toLowerCase().trim()));
    missingFields = bestTemplate.requiredMetrics.filter(
      (req) => !metricSet.has(req.toLowerCase().trim())
    );
  }

  // Only return a template if the score exceeds a minimum threshold
  if (bestScore < 0.2) {
    return { template: null, score: bestScore, missingFields };
  }

  return {
    template: bestTemplate,
    score: Math.round(bestScore * 100) / 100,
    missingFields,
  };
}

/**
 * Get all known alias variations for a given canonical metric key.
 * Searches across all templates.
 *
 * @param metricKey  The canonical metric key (e.g. 'revenue', 'netProfit')
 * @returns          Array of known alias strings
 */
export function getAliasesForMetric(metricKey: string): string[] {
  const aliases = new Set<string>();
  const key = metricKey.toLowerCase().trim();

  for (const tmpl of TEMPLATES) {
    for (const [canonical, aliasList] of Object.entries(tmpl.aliases)) {
      if (canonical.toLowerCase().trim() === key) {
        for (const alias of aliasList) {
          aliases.add(alias);
        }
      }
    }
  }

  return [...aliases];
}

/**
 * Get the expected sections for a given statement type.
 *
 * @param statementType  The statement type key
 * @returns              Array of expected section header strings
 */
export function getExpectedSections(statementType: StatementType): string[] {
  const sections = new Set<string>();

  for (const tmpl of TEMPLATES) {
    if (tmpl.statementType === statementType) {
      for (const section of tmpl.expectedSections) {
        sections.add(section);
      }
    }
  }

  return [...sections];
}

/**
 * Get the union of all reject keywords across all templates.
 *
 * @returns  Array of unique reject keyword strings
 */
export function getRejectKeywords(): string[] {
  return [...REJECT_KEYWORDS_SET];
}

/**
 * Calculate statement-level confidence based on recognized facts.
 *
 * Examines the facts that belong to the given statement type and computes
 * a confidence score based on:
 *   - Proportion of required metrics present
 *   - Average fact confidence
 *   - Coverage of expected sections
 *
 * @param facts          Array of canonical facts from the imported dataset
 * @param statementType  The statement type to evaluate
 * @returns              Confidence score from 0 to 1
 */
export function calculateStatementConfidence(
  facts: CanonicalFact[],
  statementType: StatementType
): number {
  if (!facts || facts.length === 0) return 0;

  // Find relevant templates for this statement type
  const relevantTemplates = TEMPLATES.filter(
    (t) => t.statementType === statementType
  );
  if (relevantTemplates.length === 0) return 0;

  // Filter facts that match this statement type (or are untyped)
  const relevantFacts = facts.filter(
    (f) =>
      f.statement === statementType ||
      f.statement === 'unknown' ||
      (f as any).statement === statementType
  );

  if (relevantFacts.length === 0) return 0.1; // At least something exists

  // 1. Required metrics coverage (40% weight)
  const presentMetricKeys = new Set(
    relevantFacts
      .map((f) => (f as any).canonicalMetric || (f as any).metric)
      .filter(Boolean)
  );

  // Collect all required metrics from relevant templates
  const allRequired = new Set<string>();
  for (const tmpl of relevantTemplates) {
    for (const req of tmpl.requiredMetrics) {
      allRequired.add(req.toLowerCase().trim());
    }
  }

  let requiredFound = 0;
  for (const req of allRequired) {
    if (presentMetricKeys.has(req)) {
      requiredFound++;
    }
  }

  const requiredCoverage =
    allRequired.size > 0 ? requiredFound / allRequired.size : 1;

  // 2. Average fact confidence (30% weight)
  const avgFactConfidence =
    relevantFacts.reduce((sum, f) => sum + f.confidence, 0) /
    relevantFacts.length;

  // 3. Section name coverage from row labels (30% weight)
  const originalLabels = relevantFacts.map((f) =>
    normalizeLabel(f.labelOriginal)
  );
  const allExpectedSections = new Set<string>();
  for (const tmpl of relevantTemplates) {
    for (const sec of tmpl.expectedSections) {
      allExpectedSections.add(normalizeLabel(sec));
    }
  }

  let sectionMatches = 0;
  for (const section of allExpectedSections) {
    const found = originalLabels.some(
      (label) =>
        label.includes(section) || section.includes(label)
    );
    if (found) sectionMatches++;
  }

  const sectionCoverage =
    allExpectedSections.size > 0
      ? sectionMatches / allExpectedSections.size
      : 0.5;

  // Weighted composite score
  const score =
    requiredCoverage * 0.4 +
    avgFactConfidence * 0.3 +
    sectionCoverage * 0.3;

  return Math.round(Math.min(score, 1) * 100) / 100;
}

/**
 * Get all available templates.
 */
export function getAllTemplates(): ReferenceTemplate[] {
  return [...TEMPLATES];
}

/**
 * Get templates filtered by statement type.
 */
export function getTemplatesByType(
  statementType: StatementType
): ReferenceTemplate[] {
  return TEMPLATES.filter((t) => t.statementType === statementType);
}

/**
 * Get a template by its ID.
 */
export function getTemplateById(id: string): ReferenceTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/**
 * Look up the canonical metric key for a given label text.
 * Uses the per-template alias maps for comprehensive matching.
 *
 * @param label  The original label text from the file
 * @returns      The canonical metric key if found, or null
 */
export function lookupCanonicalMetric(label: string): string | null {
  const key = normalizeLabel(label);
  return ALIAS_LOOKUP[key] || null;
}

/**
 * Check if a row label should be excluded from matching.
 *
 * @param label  The original label text
 * @returns      True if the label matches a reject keyword
 */
export function shouldRejectLabel(label: string): boolean {
  return isRejectLabel(label);
}
