/**
 * Financial Model Selectors
 *
 * A layer that extracts data from the canonical FundalystDataset
 * into the format each tool needs. Tools read, they don't store.
 *
 * This is the single source of truth for all tool data.
 * The only per-tool state is user assumptions (e.g. DCF growth rate).
 */

import { useGlobalDataStore } from './global-data-store';
import type { FundalystDataset, CanonicalFact } from '@/lib/importer/types';
import { findBestMetricMatch } from '@/lib/importer/metric-aliases';

// ── Utilities ──

/** Get the active dataset from the store */
export function getActiveDataset(): FundalystDataset | null {
  return useGlobalDataStore.getState().getActiveDataset();
}

/** Hook: get the active dataset */
export function useActiveDataset(): FundalystDataset | null {
  return useGlobalDataStore((s) => {
    if (!s.activeDatasetId && s.datasets.length === 0) return null;
    return s.datasets.find((d) => d.id === s.activeDatasetId) || s.datasets[0] || null;
  });
}

/** Get all unique periods across all facts, sorted by first occurrence order */
export function getPeriods(dataset: FundalystDataset): string[] {
  const ordered: string[] = [];
  for (const f of dataset.facts) {
    if (f.periodLabel && !ordered.includes(f.periodLabel)) {
      ordered.push(f.periodLabel);
    }
  }
  return ordered;
}

/** Get all unique statements detected in the dataset */
export function getStatementTypes(dataset: FundalystDataset): string[] {
  const seen = new Set<string>();
  for (const f of dataset.facts) {
    if (f.statement) seen.add(f.statement);
  }
  return [...seen];
}

/** Find the best value for a metric across all periods */
export function getMetricValue(
  dataset: FundalystDataset,
  canonicalMetric: string,
  period?: string,
): CanonicalFact | null {
  let candidates = dataset.facts.filter(
    (f) => f.metric === canonicalMetric || f.canonicalMetric === canonicalMetric,
  );

  if (period) {
    candidates = candidates.filter((f) => f.periodLabel === period);
  }

  if (candidates.length === 0) return null;

  // Return highest confidence
  return candidates.reduce((best, c) => (c.confidence > best.confidence ? c : best));
}

/** Get all facts for a specific statement type */
export function getStatementFacts(
  dataset: FundalystDataset,
  statementType: string,
): CanonicalFact[] {
  return dataset.facts.filter((f) => f.statement === statementType);
}

/** Get all facts for a specific period */
export function getPeriodFacts(
  dataset: FundalystDataset,
  period: string,
): CanonicalFact[] {
  return dataset.facts.filter((f) => f.periodLabel === period);
}

/** Get the most recent period with data */
export function getLatestPeriod(dataset: FundalystDataset): string | null {
  const periods = getPeriods(dataset);
  return periods.length > 0 ? periods[periods.length - 1] : null;
}

/** Get the previous period (for comparisons) */
export function getPreviousPeriod(dataset: FundalystDataset): string | null {
  const periods = getPeriods(dataset);
  return periods.length >= 2 ? periods[periods.length - 2] : null;
}

/**
 * Try to find a metric value using flexible matching.
 * Checks the canonical key, then tries common aliases.
 */
export function findMetricFlexibly(
  dataset: FundalystDataset,
  searchTerm: string,
  period?: string,
): CanonicalFact | null {
  // Direct match first: use fuzzy matching against known canonical keys
  const bestMatch = findBestMetricMatch(searchTerm);
  if (bestMatch && bestMatch.confidence > 0.7) {
    const result = getMetricValue(dataset, bestMatch.canonical, period);
    if (result) return result;
  }

  // Fuzzy: search by original label
  const lower = searchTerm.toLowerCase();
  let candidates = dataset.facts.filter(
    (f) =>
      f.labelOriginal.toLowerCase().includes(lower) ||
      f.metric.toLowerCase().includes(lower),
  );

  if (period) {
    candidates = candidates.filter((f) => f.periodLabel === period);
  }

  return candidates.length > 0
    ? candidates.reduce((best, c) => (c.confidence > best.confidence ? c : best))
    : null;
}

// ── Tool-Specific Selectors ──

/** Extract Filing Comparison data: two periods → { labelA, labelB, factsA, factsB } */
export function extractFilingData(dataset: FundalystDataset): {
  labelA: string;
  labelB: string;
  factsA: CanonicalFact[];
  factsB: CanonicalFact[];
} | null {
  const periods = getPeriods(dataset);
  if (periods.length < 2) return null;

  const labelB = periods[periods.length - 1];
  const labelA = periods[periods.length - 2];

  return {
    labelA,
    labelB,
    factsA: getPeriodFacts(dataset, labelA),
    factsB: getPeriodFacts(dataset, labelB),
  };
}

/** Extract DCF inputs from the canonical model */
export function extractDCFInputsFromModel(dataset: FundalystDataset): {
  fcf: number | null;
  shares: number | null;
  netDebt: number | null;
  revenue: number | null;
  price: number | null;
} {
  const latest = getLatestPeriod(dataset);

  return {
    fcf: findMetricFlexibly(dataset, 'freeCashFlow', latest ?? undefined)?.value ?? null,
    shares: findMetricFlexibly(dataset, 'sharesOutstanding', latest ?? undefined)?.value ?? null,
    netDebt: findMetricFlexibly(dataset, 'netDebt', latest ?? undefined)?.value ?? null,
    revenue: findMetricFlexibly(dataset, 'revenue', latest ?? undefined)?.value ?? null,
    price: findMetricFlexibly(dataset, 'price', latest ?? undefined)?.value ?? null,
  };
}

/** Extract Ratio Analysis inputs from the canonical model */
export function extractRatiosFromModel(dataset: FundalystDataset): Record<string, number | null> {
  const latest = getLatestPeriod(dataset);
  const p = latest ?? undefined;

  return {
    revenue: findMetricFlexibly(dataset, 'revenue', p)?.value ?? null,
    cogs: findMetricFlexibly(dataset, 'cogs', p)?.value ?? null,
    netProfit: findMetricFlexibly(dataset, 'netProfit', p)?.value ?? null,
    totalAssets: findMetricFlexibly(dataset, 'totalAssets', p)?.value ?? null,
    totalEquity: findMetricFlexibly(dataset, 'equity', p)?.value ?? null,
    totalDebt: findMetricFlexibly(dataset, 'totalDebt', p)?.value ?? null,
    currentAssets: findMetricFlexibly(dataset, 'currentAssets', p)?.value ?? null,
    currentLiab: findMetricFlexibly(dataset, 'currentLiabilities', p)?.value ?? null,
    inventory: findMetricFlexibly(dataset, 'inventory', p)?.value ?? null,
    interest: findMetricFlexibly(dataset, 'interestExpense', p)?.value ?? null,
    ebit: findMetricFlexibly(dataset, 'ebit', p)?.value ?? null,
  };
}

/** Extract WC inputs from the canonical model */
export function extractWCFromModel(dataset: FundalystDataset): Record<string, number | null> {
  const latest = getLatestPeriod(dataset);
  const p = latest ?? undefined;

  return {
    revenue: findMetricFlexibly(dataset, 'revenue', p)?.value ?? null,
    cogs: findMetricFlexibly(dataset, 'cogs', p)?.value ?? null,
    receivables: findMetricFlexibly(dataset, 'receivables', p)?.value ?? null,
    inventory: findMetricFlexibly(dataset, 'inventory', p)?.value ?? null,
    payables: findMetricFlexibly(dataset, 'payables', p)?.value ?? null,
    cash: findMetricFlexibly(dataset, 'cash', p)?.value ?? null,
  };
}

/** Extract Peer data: primary company values from the canonical model */
export function extractPeersFromModel(dataset: FundalystDataset): {
  companyName: string;
  revenue: number | null;
  netProfit: number | null;
  totalAssets: number | null;
  totalDebt: number | null;
  price: number | null;
  sharesOutstanding: number | null;
} {
  const latest = getLatestPeriod(dataset);
  const p = latest ?? undefined;
  return {
    companyName: dataset.companyName || 'Company',
    revenue: findMetricFlexibly(dataset, 'revenue', p)?.value ?? null,
    netProfit: findMetricFlexibly(dataset, 'netProfit', p)?.value ?? null,
    totalAssets: findMetricFlexibly(dataset, 'totalAssets', p)?.value ?? null,
    totalDebt: findMetricFlexibly(dataset, 'totalDebt', p)?.value ?? null,
    price: findMetricFlexibly(dataset, 'price', p)?.value ?? null,
    sharesOutstanding: findMetricFlexibly(dataset, 'sharesOutstanding', p)?.value ?? null,
  };
}

/** Extract Trend data: metric values across all periods */
export function extractTrendData(dataset: FundalystDataset): {
  periods: string[];
  metrics: Record<string, (number | null)[]>;
} {
  const periods = getPeriods(dataset);
  const metrics: Record<string, (number | null)[]> = {};

  // Group facts by metric
  const byMetric: Record<string, CanonicalFact[]> = {};
  for (const f of dataset.facts) {
    if (!byMetric[f.metric]) byMetric[f.metric] = [];
    byMetric[f.metric].push(f);
  }

  // For each metric, create an array matching period order
  for (const [metric, facts] of Object.entries(byMetric)) {
    metrics[metric] = periods.map((p) => {
      const f = facts.find((ff) => ff.periodLabel === p);
      return f?.value ?? null;
    });
  }

  return { periods, metrics };
}

/** Convert canonical facts to SpreadsheetInput format */
export function datasetToSpreadsheetRows(
  dataset: FundalystDataset,
): { metric: string; values: string[]; confidence: number }[] {
  const periods = getPeriods(dataset);

  // Group facts by metric
  const byMetric: Record<string, CanonicalFact[]> = {};
  for (const f of dataset.facts) {
    const key = f.metric;
    if (!byMetric[key]) byMetric[key] = [];
    byMetric[key].push(f);
  }

  return Object.entries(byMetric).map(([metric, facts]) => {
    // One value per period (empty if not present)
    const values = periods.map(
      (p) => {
        const f = facts.find((ff) => ff.periodLabel === p);
        return f ? String(f.value) : '';
      },
    );
    // Average confidence
    const avgConf = facts.reduce((s, f) => s + f.confidence, 0) / facts.length;
    return { metric, values, confidence: avgConf };
  });
}
