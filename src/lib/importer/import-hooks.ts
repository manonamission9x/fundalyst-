import { useEffect, useRef, useState } from 'react';
import { useImporterStore } from '@/store/importer-store';
import { useGlobalDataStore, generateDatasetId } from '@/store/global-data-store';
import { getLatestValue } from '@/lib/importer/tool-validation';
import type { FundalystDataset, CanonicalFact, SourceType } from '@/lib/importer/types';
import { canonicalDisplayName } from '@/lib/importer/metric-aliases';

/**
 * Hook that pre-fills a tool's store from the global active dataset.
 * Uses refs for setter/extract to avoid infinite render loops caused by
 * inline function references changing every render.
 */
export function useGlobalImportFill<T>(
  setter: (values: T) => void,
  extract: (dataset: FundalystDataset) => T | null
): { dataSource: SourceType | 'none'; companyName?: string; lastFilledId: string | null } {
  const activeDataset = useGlobalDataStore((s) => {
    if (!s.activeDatasetId && s.datasets.length === 0) return null;
    const active = s.datasets.find((d) => d.id === s.activeDatasetId);
    return active || s.datasets[0] || null;
  });
  const lastFilledRef = useRef<string | null>(null);
  const setterRef = useRef(setter);
  const extractRef = useRef(extract);
  // Keep refs current without triggering re-renders
  setterRef.current = setter;
  extractRef.current = extract;

  const [state, setState] = useState<{ dataSource: SourceType | 'none'; companyName?: string; lastFilledId: string | null }>({
    dataSource: 'none',
    lastFilledId: null,
  });

  useEffect(() => {
    if (!activeDataset) {
      setState({ dataSource: 'none', lastFilledId: null });
      return;
    }
    // Only fill if dataset changed (new ID or first fill)
    if (activeDataset.id === lastFilledRef.current) {
      // Still update state if company name changed
      setState({
        dataSource: activeDataset.sourceType,
        companyName: activeDataset.companyName,
        lastFilledId: activeDataset.id,
      });
      return;
    }

    const values = extractRef.current(activeDataset);
    if (values !== null && values !== undefined) {
      const hasData = typeof values === 'string'
        ? values.trim().length > 0
        : Object.values(values as any).some((v) => v !== null && v !== '' && v !== undefined);
      if (hasData) {
        setterRef.current(values);
        lastFilledRef.current = activeDataset.id;
      }
    }

    setState({
      dataSource: activeDataset.sourceType,
      companyName: activeDataset.companyName,
      lastFilledId: activeDataset.id,
    });
    // Only depend on activeDataset identity — setter/extract via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDataset]);

  return state;
}

/**
 * @deprecated Use useGlobalImportFill which reacts to dataset changes.
 * Old hook that fires only once on mount.
 */
export function useImportFill<T>(
  setter: (values: T) => void,
  extract: (dataset: FundalystDataset) => T | null
) {
  const lastDataset = useImporterStore((s) => s.lastDataset);
  const filledRef = useRef(false);
  const setterRef = useRef(setter);
  const extractRef = useRef(extract);
  setterRef.current = setter;
  extractRef.current = extract;

  useEffect(() => {
    if (!lastDataset || filledRef.current) return;
    const values = extractRef.current(lastDataset);
    if (values === null || values === undefined) return;
    const hasData = typeof values === 'string'
      ? values.trim().length > 0
      : Object.values(values as any).some((v) => v !== null && v !== '' && v !== undefined);
    if (hasData) {
      setterRef.current(values);
      filledRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastDataset]);
}

// ── Extract Functions ──

/**
 * Extract WC inputs from dataset.
 */
export function extractWCInputs(dataset: FundalystDataset): Record<string, number | ''> | null {
  const revenue = getLatestValue(dataset, 'revenue');
  const cogs = getLatestValue(dataset, 'cogs');
  const receivables = getLatestValue(dataset, 'receivables');
  const inventory = getLatestValue(dataset, 'inventory');
  const payables = getLatestValue(dataset, 'payables');
  const cash = getLatestValue(dataset, 'cash');

  if (revenue === null && receivables === null && inventory === null) return null;

  return {
    revenue: revenue ?? '',
    cogs: cogs ?? '',
    receivables: receivables ?? '',
    inventory: inventory ?? '',
    payables: payables ?? '',
    cash: cash ?? '',
  };
}

/**
 * Extract Ratios inputs from dataset.
 */
export function extractRatiosInputs(dataset: FundalystDataset): Record<string, number | '' | null> | null {
  const rev = getLatestValue(dataset, 'revenue');
  const cogs = getLatestValue(dataset, 'cogs');
  const np = getLatestValue(dataset, 'netProfit');
  const ta = getLatestValue(dataset, 'totalAssets');
  const eq = getLatestValue(dataset, 'equity');
  const debt = getLatestValue(dataset, 'totalDebt');
  const ca = getLatestValue(dataset, 'currentAssets');
  const cl = getLatestValue(dataset, 'currentLiabilities');
  const inv = getLatestValue(dataset, 'inventory');
  const int = getLatestValue(dataset, 'interestExpense');
  const ebit = getLatestValue(dataset, 'ebit');

  if (rev === null && ta === null && ca === null) return null;

  return {
    revenue: rev ?? null,
    cogs: cogs ?? null,
    netProfit: np ?? null,
    totalAssets: ta ?? null,
    totalEquity: eq ?? null,
    totalDebt: debt ?? null,
    currentAssets: ca ?? null,
    currentLiab: cl ?? null,
    inventory: inv ?? null,
    interest: int ?? null,
    ebit: ebit ?? null,
  };
}

/**
 * Extract DCF inputs from dataset.
 */
export function extractDCFInputs(dataset: FundalystDataset): Record<string, number | ''> | null {
  const fcf = getLatestValue(dataset, 'freeCashFlow') || getLatestValue(dataset, 'operatingCashFlow');
  const shares = getLatestValue(dataset, 'sharesOutstanding');
  const debt = getLatestValue(dataset, 'totalDebt');
  const cash = getLatestValue(dataset, 'cash');
  const price = getLatestValue(dataset, 'price');
  const revenue = getLatestValue(dataset, 'revenue');
  const netProfit = getLatestValue(dataset, 'netProfit');
  const ebit = getLatestValue(dataset, 'ebit');

  // If no financial data at all, skip
  if (fcf === null && shares === null && debt === null && revenue === null && netProfit === null && ebit === null) return null;

  const netDebt = (debt !== null ? debt : 0) - (cash !== null ? cash : 0);

  // Use net profit or ebit as rough FCF proxy if FCF not available
  const fcfValue = fcf ?? (netProfit !== null ? netProfit : ebit);

  return {
    fcf: fcfValue ?? '',
    growth: '',
    years: 5,
    discount: '',
    terminal: '',
    netDebt: netDebt > 0 ? netDebt : '',
    shares: shares ?? '',
    price: price ?? '',
  };
}

/**
 * Extract Filing textarea content from dataset.
 * Groups facts by period, produces "Label: value" lines for each period.
 */
export function extractFilingInputs(
  dataset: FundalystDataset
): { labelA: string; labelB: string; periodA: string; periodB: string } | null {
  const byPeriod = new Map<string, CanonicalFact[]>();
  for (const fact of dataset.facts) {
    if (fact.metric === 'unknown') continue;
    const existing = byPeriod.get(fact.periodLabel) || [];
    existing.push(fact);
    byPeriod.set(fact.periodLabel, existing);
  }

  const periods = [...byPeriod.keys()];
  if (periods.length < 2) return null;

  const [p0, p1] = periods;
  const facts0 = byPeriod.get(p0)!;
  const facts1 = byPeriod.get(p1)!;

  const periodA = facts0.map((f) => `${f.labelOriginal}: ${f.value}`).join('\n');
  const periodB = facts1.map((f) => `${f.labelOriginal}: ${f.value}`).join('\n');

  return {
    labelA: p0,
    labelB: p1,
    periodA,
    periodB,
  };
}

/**
 * Extract Trends CSV from dataset.
 */
export function extractTrendsCSV(dataset: FundalystDataset): string | null {
  const byMetric = new Map<string, Map<string, number>>();
  for (const fact of dataset.facts) {
    if (fact.metric === 'unknown') continue;
    if (!byMetric.has(fact.metric)) byMetric.set(fact.metric, new Map());
    byMetric.get(fact.metric)!.set(fact.periodLabel, fact.value);
  }

  const allPeriods = new Set<string>();
  for (const periods of byMetric.values()) {
    for (const p of periods.keys()) allPeriods.add(p);
  }

  const sortedPeriods = [...allPeriods].sort();
  if (sortedPeriods.length < 2) return null;

  const header = 'Metric, ' + sortedPeriods.join(', ');
  const lines = [header];

  for (const [metricKey, periods] of byMetric) {
    const name = canonicalDisplayName(metricKey);
    const values = sortedPeriods.map((p) => periods.get(p) ?? '');
    lines.push(name + ', ' + values.join(', '));
  }

  return lines.join('\n');
}

/**
 * Extract YoY inputs from dataset (same as trends but with years input).
 */
export function extractYoYInputs(
  dataset: FundalystDataset
): { years: string; csv: string } | null {
  const csv = extractTrendsCSV(dataset);
  if (!csv) return null;

  const firstLine = csv.split('\n')[0];
  const periods = firstLine.split(', ').slice(1);
  const years = periods.join(', ');

  return { years, csv };
}

/**
 * Confirm an import and push it into the global data store.
 */
export function confirmAndPushToGlobal(
  dataset: FundalystDataset
): void {
  const fullDataset: FundalystDataset = {
    ...dataset,
    id: dataset.id || generateDatasetId(),
    createdAt: dataset.createdAt || new Date().toISOString(),
  };
  useGlobalDataStore.getState().addDataset(fullDataset);
}

/**
 * Get human-readable data source label.
 */
export function getDataSourceLabel(sourceType: SourceType | 'none' | undefined, companyName?: string): string {
  if (!sourceType || sourceType === 'none') return 'Manual mode';
  if (sourceType === 'sample') return 'Using sample data';
  if (sourceType === 'manual') return 'Manual mode';
  if (companyName) return `Using imported data: ${companyName}`;
  return 'Using imported data';
}

/**
 * Get data source badge color.
 */
export function getDataSourceColor(sourceType: SourceType | 'none' | undefined): 'good' | 'muted' | 'warn' {
  if (!sourceType || sourceType === 'none' || sourceType === 'manual') return 'muted';
  if (sourceType === 'sample') return 'warn';
  return 'good';
}
