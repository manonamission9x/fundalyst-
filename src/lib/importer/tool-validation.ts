import type { FundalystDataset, CanonicalFact, ValidationCheck } from './types';
import { canonicalDisplayName } from './metric-aliases';

/** Required metrics for each tool and what to suggest if missing */
export const TOOL_REQUIREMENTS: Record<string, { required: string[]; label: string }> = {
  filing: {
    required: ['revenue', 'netProfit', 'totalDebt'],
    label: 'Filing comparison',
  },
  trends: {
    required: [],
    label: 'Trend charts',
  },
  growth: {
    required: [],
    label: 'Growth rates',
  },
  wc: {
    required: ['revenue', 'receivables', 'inventory', 'payables'],
    label: 'Working capital',
  },
  ratios: {
    required: ['currentAssets', 'currentLiabilities', 'totalDebt', 'equity', 'netProfit', 'totalAssets', 'interestExpense', 'ebit', 'revenue'],
    label: 'Financial ratios',
  },
  dcf: {
    required: ['freeCashFlow', 'sharesOutstanding'],
    label: 'DCF valuation',
  },
  peer: {
    required: [],
    label: 'Peer comparison',
  },
};

/** Result of validating a dataset against a tool's requirements */
export interface ValidationResult {
  canRun: boolean;
  missingCritical: string[];
  present: string[];
  message: string | null;
}

/**
 * Check if a dataset has the required metrics for a given tool.
 */
export function validateToolDataset(
  dataset: FundalystDataset | null,
  toolKey: string
): ValidationResult {
  if (!dataset || dataset.facts.length === 0) {
    return {
      canRun: false,
      missingCritical: [],
      present: [],
      message: 'No imported data found. Upload a file via the Import page first.',
    };
  }

  const reqs = TOOL_REQUIREMENTS[toolKey];
  if (!reqs) {
    return { canRun: true, missingCritical: [], present: [], message: null };
  }

  const presentMetrics = new Set(dataset.facts.map((f) => f.metric));
  const present: string[] = [];
  const missingCritical: string[] = [];

  for (const metric of reqs.required) {
    if (presentMetrics.has(metric)) {
      present.push(metric);
    } else {
      missingCritical.push(metric);
    }
  }

  if (missingCritical.length === 0) {
    return { canRun: true, missingCritical: [], present, message: null };
  }

  const missingNames = missingCritical.map(canonicalDisplayName).join(', ');
  const message = `This file is missing ${missingNames}, so ${reqs.label} may be incomplete. Add these manually or upload a more complete financial statement.`;

  return {
    canRun: missingCritical.length < reqs.required.length / 2,
    missingCritical,
    present,
    message,
  };
}

/**
 * Extract facts for specific metrics from a dataset.
 */
export function extractFacts(
  dataset: FundalystDataset | null,
  metricKeys: string[]
): { facts: CanonicalFact[]; missing: string[] } {
  if (!dataset) return { facts: [], missing: metricKeys };

  const facts: CanonicalFact[] = [];
  const found = new Set<string>();

  for (const fact of dataset.facts) {
    if (metricKeys.includes(fact.metric) && !found.has(fact.metric)) {
      facts.push(fact);
      found.add(fact.metric);
    }
  }

  return {
    facts,
    missing: metricKeys.filter((k) => !found.has(k)),
  };
}

/**
 * Get the latest value for a given metric from the dataset.
 * Periods are sorted chronologically before selecting the latest.
 */
export function getLatestValue(
  dataset: FundalystDataset | null,
  metricKey: string
): number | null {
  if (!dataset) return null;
  const facts = dataset.facts.filter(
    (f) => f.metric === metricKey && f.value !== null && f.value !== undefined
  );
  if (facts.length === 0) return null;
  // Sort by period for deterministic ordering
  const sorted = [...facts].sort((a, b) => {
    if (a.periodLabel < b.periodLabel) return -1;
    if (a.periodLabel > b.periodLabel) return 1;
    return 0;
  });
  // Return the last (most recent) period
  return sorted[sorted.length - 1].value;
}

/**
 * These do not block the user — they show warnings if checks fail.
 */
export function runValidationChecks(dataset: FundalystDataset): ValidationCheck[] {
  const checks: ValidationCheck[] = [];
  if (!dataset || dataset.facts.length === 0) return checks;

  const byMetric = new Map<string, number>();
  for (const f of dataset.facts) {
    if (!byMetric.has(f.metric)) byMetric.set(f.metric, 0);
  }
  // Use last period value for each metric
  for (const f of dataset.facts) {
    byMetric.set(f.metric, f.value);
  }

  const g = (key: string) => byMetric.get(key);

  // 1. Balance sheet check: Total assets ≈ Total equity + Total liabilities
  const ta = g('totalAssets');
  const eq = g('equity');
  const td = g('totalDebt');
  const cl = g('currentLiabilities');
  if (ta !== undefined && eq !== undefined) {
    const totalLiabs = (td || 0) + (cl || 0);
    const diff = Math.abs(ta - (eq + totalLiabs));
    const ratio = ta > 0 ? diff / ta : 0;
    if (ratio > 0.15) {
      checks.push({
        label: 'Balance Sheet Reconciliation',
        passed: false,
        message: `Total assets (${fmt(ta)}) do not closely match equity (${fmt(eq)}) plus liabilities (${fmt(totalLiabs)}). The balance sheet may be incomplete.`,
      });
    } else {
      checks.push({
        label: 'Balance Sheet Reconciliation',
        passed: true,
        message: 'Total assets approximately match equity plus liabilities.',
      });
    }
  }

  // 2. Profit check: Total income - total expenses ≈ Profit before tax
  const rev = g('revenue');
  const np = g('netProfit');
  const cogs = g('cogs');
  const interest = g('interestExpense');
  const depr = g('depreciation');
  if (rev !== undefined && np !== undefined) {
    const estExpenses = (cogs || 0) + (interest || 0) + (depr || 0);
    const estPbt = rev - estExpenses;
    const pbtDiff = Math.abs(Math.abs(estPbt) - Math.abs(np));
    const pbtRatio = rev > 0 ? pbtDiff / rev : 0;
    if (pbtRatio > 0.2 && estExpenses > 0) {
      checks.push({
        label: 'Profit Calculation Check',
        passed: false,
        message: `Revenue minus estimated expenses (${fmt(estPbt)}) does not closely match net profit (${fmt(np)}). Some expense items may be missing.`,
      });
    } else {
      checks.push({
        label: 'Profit Calculation Check',
        passed: true,
        message: 'Revenue minus expenses approximately reconciles with net profit.',
      });
    }
  }

  // 3. Cash flow check: Opening + net change ≈ Closing
  const ocf = g('operatingCashFlow');
  const icf = g('investingCashFlow');
  const fcf = g('financingCashFlow');
  const cash = g('cash');
  if (ocf !== undefined && icf !== undefined && cash !== undefined) {
    // Can't check opening balance without it, just note it
    checks.push({
      label: 'Cash Flow Data',
      passed: true,
      message: `Operating cash flow: ${fmt(ocf)}. Investing: ${fmt(icf)}. ` + (fcf !== undefined ? `Financing: ${fmt(fcf)}. ` : '') + `Current cash: ${fmt(cash)}.`,
    });
  }

  // 4. DCF readiness check
  const dcfFcf = g('freeCashFlow');
  const shares = g('sharesOutstanding');
  if (dcfFcf === undefined && ocf !== undefined) {
    checks.push({
      label: 'DCF Free Cash Flow',
      passed: false,
      message: 'Free cash flow not found. DCF can estimate FCF from operating cash flow minus capex, but values may be approximate.',
    });
  }
  if (shares === undefined) {
    checks.push({
      label: 'DCF Shares Outstanding',
      passed: false,
      message: 'Shares outstanding not found. DCF valuation requires a share count.',
    });
  }

  // 5. Current ratio inputs check
  const ca = g('currentAssets');
  if (ca === undefined) {
    checks.push({
      label: 'Current Ratio Inputs',
      passed: false,
      message: 'Current assets not found. Liquidity ratios will be unavailable.',
    });
  }

  return checks;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_00_00_000) return '₹' + (n / 1_00_00_000).toFixed(1) + 'Cr';
  if (Math.abs(n) >= 1_000) return '₹' + (n / 1_000).toFixed(0) + 'K';
  return '₹' + n.toFixed(0);
}
