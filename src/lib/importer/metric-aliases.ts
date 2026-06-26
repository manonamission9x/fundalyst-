import { CONFIDENCE } from './types';

/** A single alias entry */
interface AliasEntry {
  patterns: string[];
  canonical: string;
  statement: 'income_statement' | 'balance_sheet' | 'cash_flow' | 'market_data' | 'unknown';
}

/** All known metric aliases grouped by canonical metric */
const ALIASES: AliasEntry[] = [
  // ── Revenue ──
  {
    patterns: ['revenue from operations', 'revenue', 'net sales', 'sales', 'total revenue', 'income from operations', 'operating income', 'total income from operations', 'revenue (net)', 'revenue from operation', 'revenue from ops', 'operating revenue', 'gross revenue', 'turnover', 'total turnover', 'net revenue'],
    canonical: 'revenue',
    statement: 'income_statement',
  },
  // ── Total Income ──
  {
    patterns: ['total income', 'total revenue and other income', 'total revenue & other income', 'other income', 'total other income', 'income from operations and other income'],
    canonical: 'totalIncome',
    statement: 'income_statement',
  },
  // ── Net Profit ──
  {
    patterns: ['net profit', 'profit after tax', 'pat', 'profit for the period', 'net income', 'net profit after tax', 'profit/(loss) for the period', 'profit / (loss) for the period', 'profit for period', 'net profit/(loss)', 'net profit / (loss)', 'profit attributable to owners', 'net profit after taxes', 'net profit attributable'],
    canonical: 'netProfit',
    statement: 'income_statement',
  },
  // ── EBIT ──
  {
    patterns: ['ebit', 'operating profit', 'profit before interest and tax', 'pb', 'pb1', 'profit before interest & tax', 'earnings before interest & taxes', 'earnings before interest and taxes', 'profit before interest and taxation', 'operating profit / (loss)'],
    canonical: 'ebit',
    statement: 'income_statement',
  },
  // ── EBITDA ──
  {
    patterns: ['ebitda', 'earnings before interest taxes depreciation amortization', 'operating profit before depreciation', 'ebitda (calculated)', 'adj ebitda', 'adjusted ebitda'],
    canonical: 'ebitda',
    statement: 'income_statement',
  },
  // ── Interest Expense ──
  {
    patterns: ['interest expense', 'finance cost', 'finance costs', 'interest cost', 'financial charges', 'interest and finance charges', 'interest & finance charges', 'interest expenses', 'finance expenses', 'interest paid', 'borrowing cost', 'borrowing costs'],
    canonical: 'interestExpense',
    statement: 'income_statement',
  },
  // ── COGS ──
  {
    patterns: ['cost of goods sold', 'cost of materials consumed', 'purchases', 'cost of sales', 'cost of revenue', 'raw materials consumed', 'raw material consumed', 'material cost', 'material consumed', 'cost of material consumed', 'purchase of stock in trade', 'purchases of stock-in-trade', 'cost of raw materials', 'cost of materials'],
    canonical: 'cogs',
    statement: 'income_statement',
  },
  // ── Gross Profit ──
  {
    patterns: ['gross profit', 'gross profit / (loss)', 'gross margin', 'gross profit/(loss)'],
    canonical: 'grossProfit',
    statement: 'income_statement',
  },
  // ── Depreciation ──
  {
    patterns: ['depreciation', 'depreciation and amortisation', 'depreciation and amortization', 'depreciation & amortisation', 'depreciation & amortization', 'depreciation expense', 'depreciation & amortisation expense', 'depreciation, amortisation', 'depreciation and amortisation expense', 'amortisation', 'amortization'],
    canonical: 'depreciation',
    statement: 'income_statement',
  },
  // ── Tax ──
  {
    patterns: ['tax expense', 'income tax', 'tax', 'current tax', 'deferred tax', 'tax charge', 'provision for tax', 'provision for taxation', 'income tax expense', 'tax provision'],
    canonical: 'tax',
    statement: 'income_statement',
  },
  // ── Operating Cash Flow ──
  {
    patterns: ['cash flow from operating activities', 'net cash from operating activities', 'cfo', 'net cash flow from operating activities', 'cash from operations', 'cash generated from operations', 'cash from operating activities', 'operating cash flow', 'net cash generated from operating activities', 'cash flow from operations', 'cash flow from operating activity', 'net cash provided by operating activities'],
    canonical: 'operatingCashFlow',
    statement: 'cash_flow',
  },
  // ── Investing Cash Flow ──
  {
    patterns: ['cash flow from investing activities', 'net cash from investing activities', 'cash from investing activities', 'net cash used in investing activities', 'cash flow from investing activity', 'investing cash flow', 'cash from investments'],
    canonical: 'investingCashFlow',
    statement: 'cash_flow',
  },
  // ── Financing Cash Flow ──
  {
    patterns: ['cash flow from financing activities', 'net cash from financing activities', 'cash from financing activities', 'net cash used in financing activities', 'cash flow from financing activity', 'financing cash flow', 'cash from financing'],
    canonical: 'financingCashFlow',
    statement: 'cash_flow',
  },
  // ── Capex ──
  {
    patterns: ['capital expenditure', 'purchase of fixed assets', 'purchase of property plant and equipment', 'capex', 'purchase of property, plant and equipment', 'acquisition of fixed assets', 'additions to fixed assets', 'capital expenditure on fixed assets'],
    canonical: 'capex',
    statement: 'cash_flow',
  },
  // ── Current Assets ──
  {
    patterns: ['current assets', 'total current assets', 'current assets total', 'total current assets (ca)', 'sum of current assets'],
    canonical: 'currentAssets',
    statement: 'balance_sheet',
  },
  // ── Current Liabilities ──
  {
    patterns: ['current liabilities', 'total current liabilities', 'current liabilities total', 'total current liabilities (cl)', 'sum of current liabilities', 'current liabilities and provisions'],
    canonical: 'currentLiabilities',
    statement: 'balance_sheet',
  },
  // ── Inventory ──
  {
    patterns: ['inventory', 'inventories', 'stock in trade', 'stock-in-trade', 'closing stock', 'finished goods', 'raw materials inventory', 'total inventories', 'work in progress', 'wip', 'stock'],
    canonical: 'inventory',
    statement: 'balance_sheet',
  },
  // ── Receivables ──
  {
    patterns: ['trade receivables', 'accounts receivable', 'receivables', 'trade debtors', 'debtors', 'sundry debtors', 'trade receivable', 'accounts receivables', 'sundry debtors & advances'],
    canonical: 'receivables',
    statement: 'balance_sheet',
  },
  // ── Payables ──
  {
    patterns: ['trade payables', 'accounts payable', 'payables', 'trade creditors', 'creditors', 'sundry creditors', 'trade payable', 'accounts payables', 'sundry creditors & advances', 'trade and other payables'],
    canonical: 'payables',
    statement: 'balance_sheet',
  },
  // ── Total Debt ──
  {
    patterns: ['borrowings', 'total borrowings', 'debt', 'short term borrowings', 'long term borrowings', 'current borrowings', 'non-current borrowings', 'non current borrowings', 'total debt', 'short-term borrowings', 'long-term borrowings', 'borrowings (short term)', 'borrowings (long term)', 'loans and advances', 'secured loans', 'unsecured loans', 'loan funds'],
    canonical: 'totalDebt',
    statement: 'balance_sheet',
  },
  // ── Cash & Equivalents ──
  {
    patterns: ['cash', 'cash and cash equivalents', 'bank balances', 'cash and bank', 'cash & cash equivalents', 'cash & bank', 'cash on hand and at bank', 'cash on hand', 'bank balance', 'cash equivalents', 'cash and bank balances'],
    canonical: 'cash',
    statement: 'balance_sheet',
  },
  // ── Total Equity ──
  {
    patterns: ['total equity', 'shareholders equity', 'shareholder equity', 'shareholders funds', 'shareholders fund', 'net worth', 'equity', 'equity share capital', 'share capital', 'total shareholders equity', 'equity attributable to owners', 'shareholder\'s funds', "shareholders' funds", 'total equity & reserves', 'equity and reserves', 'total equity and reserves', 'equity & reserves', 'reserves and surplus', 'reserves & surplus', 'total shareholders fund'],
    canonical: 'equity',
    statement: 'balance_sheet',
  },
  // ── Total Assets ──
  {
    patterns: ['total assets', 'assets', 'total assets (ta)', 'sum of assets', 'total assets (including intangible)', 'total assets (net)', 'non-current assets', 'non current assets', 'fixed assets', 'total fixed assets', 'intangible assets', 'property plant and equipment', 'ppe', 'property, plant and equipment'],
    canonical: 'totalAssets',
    statement: 'balance_sheet',
  },
  // ── Shares Outstanding ──
  {
    patterns: ['shares outstanding', 'number of shares', 'equity shares', 'equity shares capital (nos)', 'no of shares', 'total shares outstanding', 'outstanding shares', 'paid up shares', 'paid up equity shares', 'equity share capital (in crores)', 'no. of shares', 'number of equity shares'],
    canonical: 'sharesOutstanding',
    statement: 'market_data',
  },
  // ── EPS ──
  {
    patterns: ['eps', 'earnings per share', 'basic eps', 'diluted eps', 'eps (basic)', 'eps (diluted)', 'earnings per share (basic)', 'earnings per share (diluted)'],
    canonical: 'eps',
    statement: 'market_data',
  },
  // ── Market Cap ──
  {
    patterns: ['market cap', 'market capitalisation', 'market capitalization', 'mcap', 'market value', 'market cap (in crores)'],
    canonical: 'marketCap',
    statement: 'market_data',
  },
  // ── Free Cash Flow ──
  {
    patterns: ['free cash flow', 'fcf', 'free cash flow to firm', 'fcff', 'free cash flow (fcf)'],
    canonical: 'freeCashFlow',
    statement: 'cash_flow',
  },
  // ── Total Current Assets / Liabilities ──
  {
    patterns: ['net current assets', 'working capital', 'net working capital', 'total working capital'],
    canonical: 'workingCapital',
    statement: 'balance_sheet',
  },
  // ── Profit Before Tax ──
  {
    patterns: ['profit before tax', 'profit before taxation', 'pbt', 'profit / (loss) before tax', 'profit/(loss) before tax'],
    canonical: 'profitBeforeTax',
    statement: 'income_statement',
  },
  // ── Other comprehensive income / extraordinary items ──
  {
    patterns: ['other comprehensive income', 'extraordinary items', 'exceptional items', 'prior period adjustments', 'exceptional and extraordinary items'],
    canonical: 'extraordinaryItems',
    statement: 'income_statement',
  },
  // ── Total non-current liabilities ──
  {
    patterns: ['non-current liabilities', 'non current liabilities', 'long term liabilities', 'long-term liabilities'],
    canonical: 'nonCurrentLiabilities',
    statement: 'balance_sheet',
  },
  // ── Provisions ──
  {
    patterns: ['provisions', 'employee benefit expenses', 'employee expenses', 'employee cost', 'depreciation and amortisation expense'],
    canonical: 'expenses',
    statement: 'income_statement',
  },
  // ── Gross Block / Net Block ──
  {
    patterns: ['gross block', 'net block', 'fixed assets (gross)', 'fixed assets (net)', 'tangible assets', 'total tangible assets', 'net fixed assets'],
    canonical: 'fixedAssets',
    statement: 'balance_sheet',
  },
];

/** Build a flat map from lowercase pattern → canonical metric + statement for fast lookup */
const EXACT_MAP = new Map<string, { canonical: string; statement: string }>();
ALIASES.forEach((entry) => {
  entry.patterns.forEach((p) => {
    EXACT_MAP.set(p.toLowerCase().trim(), { canonical: entry.canonical, statement: entry.statement });
  });
});

/** Score how well a label matches a canonical metric (returns 0-1) */
export function scoreMetricMatch(label: string, canonicalKey: string): number {
  const lower = label.toLowerCase().trim();

  // Find all aliases for this canonical key
  const entry = ALIASES.find((a) => a.canonical === canonicalKey);
  if (!entry) return 0;

  for (const pattern of entry.patterns) {
    const pLower = pattern.toLowerCase().trim();
    // Exact match
    if (pLower === lower) return CONFIDENCE.EXACT;
    // Case-insensitive exact
    if (pLower === lower) return CONFIDENCE.CASE_INSENSITIVE;
    // Pattern contains the label or vice versa
    if (lower.includes(pLower) || pLower.includes(lower)) return CONFIDENCE.CONTAINS;
  }

  // Partial word matching: check if any word in the label matches
  const labelWords = lower.split(/[\s,()/&]+/).filter(Boolean);
  const patternWords = entry.patterns.flatMap((p) => p.toLowerCase().split(/[\s,()/&]+/).filter(Boolean));
  const uniquePatternWords = [...new Set(patternWords)];
  const skipWords = new Set(['the', 'and', 'for', 'from', 'to', 'of', 'in', 'by', 'on', 'at', 'is', 'its', 'as', 'a', 'an']);

  let matches = 0;
  let total = 0;
  for (const pw of uniquePatternWords) {
    if (skipWords.has(pw)) continue;
    total++;
    if (labelWords.some((lw) => lw === pw || lw.startsWith(pw) || pw.startsWith(lw))) {
      matches++;
    }
  }

  if (total === 0) return 0;
  const ratio = matches / total;
  if (ratio >= 0.8) return CONFIDENCE.FUZZY_HIGH;
  if (ratio >= 0.5) return CONFIDENCE.FUZZY_MED;
  if (ratio >= 0.3) return CONFIDENCE.GUESS;
  return 0;
}

/** Find the best canonical metric for a given label. Returns { canonical, statement, confidence } */
export function findBestMetricMatch(
  label: string
): { canonical: string; statement: string; confidence: number } | null {
  const lower = label.toLowerCase().trim();
  if (!lower) return null;

  // 1. Check exact match in map
  const exact = EXACT_MAP.get(lower);
  if (exact) return { ...exact, confidence: CONFIDENCE.EXACT };

  // 2. Check exact after removing common prefixes
  const cleaned = lower.replace(/^(total|net|gross|less:)\s*/i, '').trim();
  if (cleaned !== lower) {
    const cleanedMatch = EXACT_MAP.get(cleaned);
    if (cleanedMatch) return { ...cleanedMatch, confidence: CONFIDENCE.CASE_INSENSITIVE };
  }

  // 3. Check contains (pattern in label)
  for (const [pattern, info] of EXACT_MAP) {
    if (lower.includes(pattern)) {
      return { ...info, confidence: CONFIDENCE.CONTAINS };
    }
  }

  // 4. Score against all canonical metrics, pick best
  let bestScore = 0;
  let bestMatch: { canonical: string; statement: string } | null = null;

  for (const entry of ALIASES) {
    const score = scoreMetricMatch(label, entry.canonical);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { canonical: entry.canonical, statement: entry.statement };
    }
  }

  if (bestMatch && bestScore >= CONFIDENCE.GUESS) {
    return { ...bestMatch, confidence: Math.round(bestScore * 100) / 100 };
  }

  return null;
}

/** Get all known canonical metric keys */
export function getAllCanonicalMetrics(): string[] {
  return [...new Set(ALIASES.map((a) => a.canonical))];
}

/** Get the display name for a canonical metric */
export function canonicalDisplayName(key: string): string {
  const map: Record<string, string> = {
    revenue: 'Revenue',
    totalIncome: 'Total Income',
    netProfit: 'Net Profit',
    ebit: 'EBIT',
    ebitda: 'EBITDA',
    interestExpense: 'Interest Expense',
    cogs: 'COGS',
    grossProfit: 'Gross Profit',
    depreciation: 'Depreciation',
    tax: 'Tax',
    operatingCashFlow: 'Operating Cash Flow',
    investingCashFlow: 'Investing Cash Flow',
    financingCashFlow: 'Financing Cash Flow',
    capex: 'Capex',
    freeCashFlow: 'Free Cash Flow',
    currentAssets: 'Current Assets',
    currentLiabilities: 'Current Liabilities',
    inventory: 'Inventory',
    receivables: 'Receivables',
    payables: 'Payables',
    totalDebt: 'Total Debt',
    cash: 'Cash & Equivalents',
    equity: 'Shareholders Equity',
    totalAssets: 'Total Assets',
    sharesOutstanding: 'Shares Outstanding',
    eps: 'EPS',
    marketCap: 'Market Cap',
    workingCapital: 'Working Capital',
    profitBeforeTax: 'PBT',
    extraordinaryItems: 'Extraordinary Items',
    nonCurrentLiabilities: 'Non-Current Liabilities',
    expenses: 'Operating Expenses',
    fixedAssets: 'Fixed Assets',
  };
  return map[key] || key.replace(/([A-Z])/g, ' $1').trim();
}
