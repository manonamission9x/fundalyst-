'use client';

import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { fmtNum, computeInstitutionalAnalytics } from '@/lib/calculations';
import { usePeerStore } from '@/store';
import { usePageTitle } from '@/lib/use-page-title';
import { useToast } from '@/components/shared/ToastProvider';
import { downloadCSV, readFile } from '@/lib/helpers';
import {
  PageHeader,
  Card,
  UploadBar,
  Toolbar,
  InsightCard,
  EmptyState,
  Disclaimer,
  NextLinks,
  DataQualityBar,
  CalcTimestamp,
  TrustBadge,
  DataSourceBadge,
} from '@/components/ui';
import ToolSpreadsheet from '@/components/input/ToolSpreadsheet';
import type { SpreadsheetRow } from '@/components/input/SpreadsheetInput';
import { useGlobalDataStore } from '@/store/global-data-store';
import type { PeerRow, InstitutionalInputs } from '@/types/financial';
import ProvenanceBadge from '@/components/shared/ProvenanceBadge';
import CalculationTracePanel from '@/components/shared/CalculationTrace';
import MissingMetricsNotice from '@/components/shared/MissingMetricsNotice';
import { useModelData } from '@/store/use-model-data';
import { useActiveDataset } from '@/store/financial-model-selectors';
import { extractPeersFromModel } from '@/store/financial-model-selectors';
import { makeTraceSource, type CalculationTrace } from '@/lib/calculation-trace';

const LABELS = ['Revenue', 'Profit', 'Assets', 'Debt'];
const LABEL_METRIC_KEYS: Record<string, string[]> = {
  Revenue: ['revenue'],
  Profit: ['netProfit'],
  Assets: ['totalAssets'],
  Debt: ['totalDebt'],
};

const LOWER_IS_BETTER = [false, false, false, true]; // Revenue, Profit, Assets, Debt

function bestOrWorst(rows: PeerRow[], ci: number): { value: number; isUnique: boolean } | null {
  const n = rows.map((r) => r.vals[ci]).filter((v) => !isNaN(v));
  if (n.length === 0) return null;
  const target = LOWER_IS_BETTER[ci] ? Math.min(...n) : Math.max(...n);
  const count = n.filter((v) => v === target).length;
  return { value: target, isUnique: count === 1 };
}

function worst(rows: PeerRow[], ci: number): { value: number; isUnique: boolean } | null {
  const n = rows.map((r) => r.vals[ci]).filter((v) => !isNaN(v));
  if (n.length === 0) return null;
  const target = LOWER_IS_BETTER[ci] ? Math.max(...n) : Math.min(...n);
  const count = n.filter((v) => v === target).length;
  return { value: target, isUnique: count === 1 };
}

function findBestRow(rows: PeerRow[], ci: number, preferMax: boolean): PeerRow | null {
  const valid = rows.filter((r) => !isNaN(r.vals[ci]));
  if (valid.length === 0) return null;
  return preferMax
    ? valid.reduce((a, b) => (a.vals[ci] > b.vals[ci] ? a : b))
    : valid.reduce((a, b) => (a.vals[ci] < b.vals[ci] ? a : b));
}

/** Convert spreadsheet rows (metrics) + periods (companies) → PeerRow[] */
function sheetToPeerRows(rows: SpreadsheetRow[], periods: string[]): PeerRow[] {
  return periods.map((company, ci) => ({
    name: company,
    vals: rows.map((r) => {
      const v = r.values[ci]?.trim();
      return v ? parseFloat(v) || 0 : NaN;
    }),
  }));
}

export default function PeerPage() {
  usePageTitle('Peer Comparison');
  const showToast = useToast();
  const { clear: clearStore } = usePeerStore();
  const dsCount = useGlobalDataStore((s) => s.datasets.length);
  const activeDataset = useActiveDataset();

  const modelData = useModelData((ds) => extractPeersFromModel(ds));

  const [clearVersion, setClearVersion] = useState(0);
  const clearedRef = useRef(false);
  const [cleared, setCleared] = useState(false);
  const [sheetRows, setSheetRows] = useState<SpreadsheetRow[]>([]);
  const [sheetPeriods, setSheetPeriods] = useState<string[]>([]);
  const [peerResults, setPeerResults] = useState<PeerRow[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSampleLoaded, setIsSampleLoaded] = useState(false);
  const prefilledRef = useRef(false);

  // Pre-fill from imported dataset
  useEffect(() => {
    if (clearedRef.current) return;
    if (prefilledRef.current) return;
    if (!modelData.data || sheetRows.length > 0) return;
    const { companyName, revenue, netProfit, totalAssets, totalDebt } = modelData.data;
    if (revenue !== null && netProfit !== null && totalAssets !== null && totalDebt !== null) {
      const timer = setTimeout(() => {
        const companies = [companyName];
        setSheetPeriods(companies);
        setSheetRows(LABELS.map((label, li) => {
          const vals: Record<number, number | null> = {
            0: revenue,
            1: netProfit,
            2: totalAssets,
            3: totalDebt,
          };
          return { metric: label, values: [vals[li] !== null ? String(vals[li]) : ''] };
        }));
        // Auto-run comparison
        const parsed: PeerRow[] = [{
          name: companyName,
          vals: [revenue ?? NaN, netProfit ?? NaN, totalAssets ?? NaN, totalDebt ?? NaN],
        }];
        setPeerResults(parsed);
        setShowResults(false); // needs at least 2 companies
        prefilledRef.current = true;
        showToast(`Pre-filled from imported data: ${companyName}`);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [modelData.data, sheetRows.length]);

  // Compute institutional analytics when active dataset has enough data
  const institutionalAnalyticsResult = useMemo(() => {
    if (!activeDataset || activeDataset.facts.length === 0) return null;
    const { revenue, netProfit, totalAssets, totalDebt, price, sharesOutstanding } =
      extractPeersFromModel(activeDataset);
    if (revenue !== null && netProfit !== null && totalAssets !== null &&
        totalDebt !== null && price !== null && sharesOutstanding !== null) {
      const inputs: InstitutionalInputs = {
        enterpriseValue: null,
        ebitda: null,
        ebit: null,
        revenue,
        netProfit,
        totalEquity: null,
        totalDebt,
        cash: null,
        freeCashFlow: null,
        totalAssets,
        taxRate: null,
        investedCapital: null,
        sharesOutstanding,
        price,
      };
      return computeInstitutionalAnalytics(inputs);
    }
    return null;
  }, [activeDataset]);

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFile(file);
      const lines = text.split('\n').filter(Boolean);
      const parsed = lines.map((l) => { const cols = l.split(',').map((s) => s.trim()); return { name: cols[0], vals: cols.slice(1).map(Number) }; });
      setPeerResults(parsed);
      setShowResults(true);

      // Also populate spreadsheet
      const companies = parsed.map((r) => r.name);
      setSheetPeriods(companies);
      setSheetRows(LABELS.map((label, li) => ({
        metric: label,
        values: companies.map((_, ci) => !isNaN(parsed[ci]?.vals[li]) ? String(parsed[ci].vals[li]) : ''),
      })));
      showToast('Loaded ' + lines.length + ' companies');
    } catch (err: unknown) {
      showToast('Error reading file: ' + (err instanceof Error ? err.message : 'unknown'));
    }
    e.target.value = '';
  }

  const handleSheetChange = useCallback((newRows: SpreadsheetRow[], periods: string[]) => {
    setSheetRows(newRows);
    setSheetPeriods(periods);
  }, []);

  function runCompare() {
    if (sheetPeriods.length < 2) {
      showToast('Need at least 2 companies to compare.');
      return;
    }
    const parsed = sheetToPeerRows(sheetRows, sheetPeriods);
    setPeerResults(parsed);
    setShowResults(true);
    showToast('Compared ' + sheetPeriods.length + ' companies');
  }

  function loadSample() {
    const sample = `Tata Motors, 420000, 28500, 345000, 105000
Reliance, 900000, 74500, 1620000, 280000
HDFC Bank, 185000, 45200, 3650000, 85000
Infosys, 156000, 28700, 172000, 24000`;
    const lines = sample.split('\n').filter(Boolean);
    const parsed = lines.map((l) => { const cols = l.split(',').map((s) => s.trim()); return { name: cols[0], vals: cols.slice(1).map(Number) }; });
    const companies = parsed.map((r) => r.name);
    setSheetPeriods(companies);
    setSheetRows(LABELS.map((label, li) => ({
      metric: label,
      values: companies.map((_, ci) => String(parsed[ci].vals[li])),
    })));
    setPeerResults(parsed);
    setShowResults(true);
    setIsSampleLoaded(true);
    showToast('Loaded 4 sample companies');
  }

  function handleClear() { clearedRef.current = true; setCleared(true); setClearVersion(v => v + 1); clearStore(); setSheetRows([]); setSheetPeriods([]); setPeerResults([]); setShowResults(false); setIsSampleLoaded(false); prefilledRef.current = false; }

  // ── Data source label ──
  const dataSourceLabel = isSampleLoaded
    ? 'Sample data'
    : (activeDataset && activeDataset.facts.length > 0)
      ? `Imported data: ${activeDataset.companyName || 'Company'}`
      : 'User entry';

  // ── Provenance kind ──
  const provenanceKind = isSampleLoaded ? 'default' as const
    : (activeDataset && activeDataset.facts.length > 0) ? 'imported' as const
    : 'manual' as const;

  // ── Missing metrics ──
  const requiredPeerMetrics = ['revenue', 'netProfit', 'totalAssets', 'totalDebt'];
  const presentPeerMetrics = activeDataset
    ? requiredPeerMetrics.filter((m) =>
        activeDataset.facts.some((f) => f.metric === m || f.canonicalMetric === m))
    : [];
  const missingPeerMetrics = requiredPeerMetrics.filter((m) => !presentPeerMetrics.includes(m));

  // ── Build trace items ──
  const traceItems: CalculationTrace[] = showResults && peerResults.length > 0
    ? LABELS.map((label, li) => {
        const metricKeys = LABEL_METRIC_KEYS[label] || [label.toLowerCase()];
        const sources = peerResults.map((r, ri) => {
          const cellValue = isNaN(r.vals[li]) ? '—' : String(r.vals[li]);
          const row = sheetRows.find((sr) => sr.metric === label);
          const singleRow = row ? { metric: label, values: [row.values[ri] || ''] } : undefined;
          const traceSource = makeTraceSource(
            r.name,
            activeDataset,
            metricKeys,
            singleRow,
            cellValue,
          );
          return traceSource;
        });
        return {
          label,
          value: '',
          formula: 'Per-company values',
          sources,
        };
      })
    : [];

  // ── Insight helpers ──
  const bestRevenue = findBestRow(peerResults, 0, true);
  const bestProfit = findBestRow(peerResults, 1, true);
  const lowestDebt = findBestRow(peerResults, 3, false);
  const strongestOverall = peerResults.length > 0
    ? peerResults.filter((r) => !isNaN(r.vals[0]) && !isNaN(r.vals[1]) && !isNaN(r.vals[3]))
        .reduce((a, b) => {
          const scoreA = a.vals[0] + a.vals[1] - a.vals[3];
          const scoreB = b.vals[0] + b.vals[1] - b.vals[3];
          return scoreA > scoreB ? a : b;
        }, peerResults[0])
    : null;

  return (
    <div>
      <PageHeader
        title="Peer Comparison"
        subtitle="Compare companies side by side and instantly spot leaders and laggards — revenue, profit, assets, and debt."
        answer="Which company is the strongest? Who is lagging?"
      />

      <DataQualityBar source={dsCount > 0 ? `${dsCount} dataset(s) loaded` : undefined} metrics={dsCount} />
      <div className="flex items-center gap-2 mb-2 mt-1">
        <DataSourceBadge variant={isSampleLoaded ? 'sample' : dsCount > 0 ? 'imported' : 'none'} />
        <ProvenanceBadge kind={provenanceKind} showLabel />
      </div>

      {/* Missing metrics notice */}
      {activeDataset && missingPeerMetrics.length > 0 && (
        <MissingMetricsNotice
          toolName="peer"
          missingMetrics={missingPeerMetrics}
          presentMetrics={presentPeerMetrics}
        />
      )}

      <UploadBar onUpload={handleCsvFile} hint="Company, Revenue, Profit, Assets, Debt" />

      <div className="flex items-center gap-2 mb-2">
        <button type="button" className="btn-ghost btn-sm" onClick={loadSample}>
          Try with example data
        </button>
        <span className="text-muted text-2xs">Or type company names as column headers</span>
      </div>

      <Card label="Peer Data">
        <div className="card-body">
          <ToolSpreadsheet
            tool="peer"
            multiColumn
            initialPeriods={sheetPeriods.length >= 2 ? sheetPeriods : (cleared ? ['', ''] : ['Company A', 'Company B', 'Company C'])}
            resetKey={clearVersion}
            initialData={
              sheetRows.length > 0
                ? sheetRows
                : LABELS.map((label) => ({ metric: label, values: ['', '', ''] }))
            }
            onDataChange={handleSheetChange}
            hint="Each column = one company. Each row = one financial metric. Tab to navigate."
          />
          <Toolbar onClear={handleClear} onAction={runCompare} actionLabel="Compare" />
        </div>
      </Card>

      {showResults && peerResults.length > 0 && (
        <>
          <Card label="Results" className="mt-4">
            <table className="diff-table">
              <thead>
                <tr>
                  <th>Company</th>
                  {LABELS.map((l, i) => <th key={i}>{l}</th>)}
                  <th>Comparison</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const maxPerCol = LABELS.map((_, j) => {
                    const vals = peerResults.map(r => r.vals[j]).filter(v => !isNaN(v));
                    return vals.length > 0 ? Math.max(...vals) : 1;
                  });
                  return peerResults.map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.name}</strong></td>
                      {r.vals.map((v, j) => {
                        const b = bestOrWorst(peerResults, j);
                        const w = worst(peerResults, j);
                        const isBest = b && v === b.value && b.isUnique;
                        const isWorst = w && v === w.value && w.isUnique;
                        return <td key={j} className={isBest ? 'good' : isWorst ? 'warn' : ''}>{isNaN(v) ? '—' : fmtNum(v)}</td>;
                      })}
                      <td className="change-mag-cell">
                        <div className="peer-bars">
                          {r.vals.map((v, j) => {
                            if (isNaN(v) || maxPerCol[j] <= 0) return null;
                            const pct = (v / maxPerCol[j]) * 100;
                            const isBest = bestOrWorst(peerResults, j) && v === bestOrWorst(peerResults, j)!.value && bestOrWorst(peerResults, j)!.isUnique;
                            return (
                              <div key={j} className="peer-bar-row">
                                <span className="peer-bar-label">{LABELS[j][0]}</span>
                                <div className="change-bar-wrap">
                                  <div className={`change-bar ${isBest ? 'change-bar-up' : 'change-bar-down'}`} style={{ width: `${Math.max(4, pct)}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
            <div className="flex justify-center py-3">
              <button className="btn-secondary btn-sm" onClick={() => {
                const hdrs = ['Company', ...LABELS];
                const data = peerResults.map((r) => [r.name, ...r.vals.map((v) => (isNaN(v) ? '' : v))]);
                downloadCSV('peer_comparison.csv', [hdrs, ...data]);
              }}>Download CSV</button>
            </div>
          </Card>

          {/* Institutional Metrics Card */}
          {institutionalAnalyticsResult && (institutionalAnalyticsResult.valuation.length > 0 || institutionalAnalyticsResult.profitability.length > 0) && (
            <Card label="Institutional Metrics" className="mt-4">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-3">
                  <ProvenanceBadge kind="imported" label="From imported dataset" />
                  <span className="text-xs text-muted">
                    Computed from primary company data
                  </span>
                </div>
                {institutionalAnalyticsResult.valuation.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold mb-2">Valuation Multiples</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {institutionalAnalyticsResult.valuation.map((m) => (
                        <div key={m.label} className={`metric-chip ${m.cls}`}>
                          <span className="metric-chip-label">{m.label}</span>
                          <span className="metric-chip-value">{m.formatted}</span>
                          <span className="metric-chip-desc text-xs text-muted">{m.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {institutionalAnalyticsResult.profitability.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Profitability Metrics</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {institutionalAnalyticsResult.profitability.map((m) => (
                        <div key={m.label} className={`metric-chip ${m.cls}`}>
                          <span className="metric-chip-label">{m.label}</span>
                          <span className="metric-chip-value">{m.formatted}</span>
                          <span className="metric-chip-desc text-xs text-muted">{m.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          <div className="flex flex-col gap-3 mt-4">
            {bestRevenue && <InsightCard type="positive" title="Highest Revenue" text={`${bestRevenue.name} leads with ${fmtNum(bestRevenue.vals[0])} in revenue.`} />}
            {bestProfit && <InsightCard type="positive" title="Highest Profit" text={`${bestProfit.name} leads with ${fmtNum(bestProfit.vals[1])} in profit.`} />}
            {lowestDebt && <InsightCard type="info" title="Lowest Debt" text={`${lowestDebt.name} carries the least debt at ${fmtNum(lowestDebt.vals[3])}.`} />}
            {strongestOverall && <InsightCard type="positive" title="Strongest Overall" text={`${strongestOverall.name} ranks highest on a combined score.`} formula="Score = Revenue + Profit − Debt" />}
          </div>

          <div className="mt-4">
            <NextLinks links={[{ label: 'Cash efficiency', href: '/tools/wc' }, { label: 'Estimate value', href: '/tools/dcf' }]} />
            <CalcTimestamp />
            <CalculationTracePanel traces={traceItems} />
            <div className="flex gap-2 flex-wrap mt-2">
              <TrustBadge label={`Values from: ${dataSourceLabel}`} variant="source" />
              <ProvenanceBadge kind={provenanceKind} />
              <TrustBadge label="₹ Indian Market" />
            </div>
            <Disclaimer />
          </div>
        </>
      )}

      {!showResults && (
        <EmptyState title="Peer Comparison" desc="Type company names as column headers and enter financial data in the spreadsheet, or import a file, then click Compare. Try sample companies to see how the tool works." action={{ label: 'Import data', href: '/import' }} />
      )}
    </div>
  );
}
