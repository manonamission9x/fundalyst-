'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { parseLines, computeDiff, generateRiskFlags, fmtINR, fmtChangeTrend } from '@/lib/calculations';
import { downloadCSV } from '@/lib/helpers';
import { useFilingStore, useAnalysisStore } from '@/store';
import { useToast } from '@/components/shared/ToastProvider';
import {
  PageHeader, Card, Toolbar, NextLinks, Disclaimer,
  EmptyState, InsightCard, WarningCard, SectionTitle,
  DataQualityBar, CalcTimestamp, TrustBadge,
  DataSourceBadge,
} from '@/components/ui';
import { SpreadsheetInput } from '@/components/input';
import type { SpreadsheetRow } from '@/components/input';
import { useActiveDataset, getPeriods, datasetToSpreadsheetRows } from '@/store/financial-model-selectors';
import { writeSpreadsheetToModel } from '@/store/canonical-helpers';
import { useGlobalImportFill, extractFilingInputs } from '@/lib/importer/import-hooks';
import { useGlobalDataStore } from '@/store/global-data-store';

import { usePageTitle } from '@/lib/use-page-title';
import CalculationTracePanel from '@/components/shared/CalculationTrace';
import { findRow, makeTraceSource, type CalculationTrace } from '@/lib/calculation-trace';

const DEFAULT_FILING_ROWS: SpreadsheetRow[] = [
  { metric: 'Revenue', values: ['1000', '1150', '1240', '1380'] },
  { metric: 'Gross Profit', values: ['400', '470', '500', '550'] },
  { metric: 'EBITDA', values: ['220', '250', '270', '300'] },
  { metric: 'Net Profit', values: ['90', '105', '115', '130'] },
  { metric: 'Total Debt', values: ['250', '230', '200', '180'] },
  { metric: 'Cash & Equivalents', values: ['50', '80', '100', '140'] },
];

export default function FilingPage() {
  const showToast = useToast();
  usePageTitle('Filing Comparison');
  const {
    diffs, flags, showResults,
    setDiffs, setFlags, setShowResults, clear,
  } = useFilingStore();
  const { setFiling } = useAnalysisStore();
  const [clearVersion, setClearVersion] = useState(0);
  const clearedRef = useRef(false);
  const [cleared, setCleared] = useState(false);
  const [loading, setLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [isSampleLoaded, setIsSampleLoaded] = useState(false);

  // Spreadsheet state (source of truth for data entry)
  const [sheetRows, setSheetRows] = useState<SpreadsheetRow[]>([]);
  const [sheetPeriods, setSheetPeriods] = useState<string[]>([]);

  // Pre-fill from imported data (kept for compatibility)
  const dataInfo = useGlobalImportFill(
    (vals) => {
      // Convert imported vals into spreadsheet rows
      if (vals.periodA || vals.periodB) {
        const pA = parseLines(vals.periodA || '');
        const pB = parseLines(vals.periodB || '');
        const allMetrics = [...new Set([
          ...pA.map((l) => l.label),
          ...pB.map((l) => l.label),
        ])];
        const labelA = vals.labelA || 'Earlier';
        const labelB = vals.labelB || 'Latest';
        setSheetPeriods([labelA, labelB]);
        setSheetRows(
          allMetrics.map((m) => {
            const a = pA.find((l) => l.label === m);
            const b = pB.find((l) => l.label === m);
            return { metric: m, values: [a?.value ?? '', b?.value ?? ''] };
          }),
        );
      }
    },
    extractFilingInputs,
  );

  // ── Pre-fill from canonical model (if data exists in global store) ──
  const activeDataset = useActiveDataset();

  // ── Load data on mount: canonical model > demo data (only once) ──
  const autoDemoRef = useRef(false);
  const clearCountRef = useRef(0);
  useEffect(() => {
    if (clearedRef.current) {
      clearCountRef.current = clearVersion;
      return;
    }
    if (autoDemoRef.current) {
      // Block re-fill after clear
      if (clearCountRef.current !== clearVersion) {
        clearCountRef.current = clearVersion;
        return;
      }
      return;
    }
    autoDemoRef.current = true;
    clearCountRef.current = clearVersion;

    // Priority 1: pre-fill from canonical model
    if (activeDataset && activeDataset.facts.length >= 4) {
      const periods = getPeriods(activeDataset);
      if (periods.length >= 2) {
        const rows = datasetToSpreadsheetRows(activeDataset);
        const timer = setTimeout(() => {
          setSheetPeriods(periods);
          setSheetRows(rows.map((r) => ({ metric: r.metric, values: r.values })));
        }, 0);
        return () => clearTimeout(timer);
      }
    }

    // Priority 2: demo data (first visit) — only if spreadsheet hasn't been populated yet
    if (sheetRows.length === 0 || !sheetRows.some(r => r.values.some(v => v.trim()))) {
      // Defer to let SpreadsheetInput mount first, then override with demo data
      const timer = setTimeout(() => {
        setSheetPeriods(['Q1', 'Q2', 'Q3', 'Q4']);
        setSheetRows([
          { metric: 'Revenue', values: ['1000', '1150', '1240', '1380'] },
          { metric: 'Gross Profit', values: ['400', '470', '500', '550'] },
          { metric: 'EBITDA', values: ['220', '250', '270', '300'] },
          { metric: 'Net Profit', values: ['90', '105', '115', '130'] },
          { metric: 'Total Debt', values: ['250', '230', '200', '180'] },
          { metric: 'Cash & Equivalents', values: ['50', '80', '100', '140'] },
        ]);
        setIsSampleLoaded(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeDataset]);

  // ── Run comparison ──
  function runCompare(rows: SpreadsheetRow[], periods: string[]) {
    if (rows.length < 2 || periods.length < 2) {
      showToast('Need at least 2 metrics and 2 periods.');
      return;
    }

    setLoading(true);

    // Read the latest dataset directly from the store — not the closure snapshot
    const latestDataset = useGlobalDataStore.getState().getActiveDataset();

    // Step 1: Write spreadsheet data to the canonical model
    writeSpreadsheetToModel(rows, periods, latestDataset?.companyName || 'Unnamed Company');

    // Step 2: Convert spreadsheet rows to period text format for existing computeDiff
    const periodA = rows
      .filter((r) => r.values[0]?.trim())
      .map((r) => `${r.metric}: ${r.values[0]}`)
      .join('\n');
    const periodB = rows
      .filter((r) => r.values[1]?.trim())
      .map((r) => `${r.metric}: ${r.values[1]}`)
      .join('\n');

    const pA = parseLines(periodA);
    const pB = parseLines(periodB);

    if (pA.length === 0 || pB.length === 0) {
      showToast('Add data for at least one metric in each period.');
      setLoading(false);
      return;
    }

    const result = computeDiff(pA, pB);
    setDiffs(result);
    setShowResults(true);

    const flagList = generateRiskFlags(result);
    setFlags(flagList);
    setFiling({
      labels: rows.length.toString() + ' items',
      diffs: result,
      flags: flagList,
    });

    setTimeout(() => {
      setLoading(false);
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
    showToast('Comparison complete');
  }

  function handleCompare() {
    runCompare(sheetRows, sheetPeriods);
  }

  function handleClear() {
    clearedRef.current = true;
    setCleared(true);
    setClearVersion(v => v + 1);
    clear();
    setSheetRows([]);
    setSheetPeriods([]);
  }

  function handleExportCSV() {
    downloadCSV('filing-comparison.csv', [
      ['Line item', sheetPeriods[0] || 'Earlier', sheetPeriods[1] || 'Latest', 'Change %'],
      ...diffs.map((d) => [d.label, d.a ?? '', d.b ?? '', d.pct !== null ? d.pct.toFixed(1) + '%' : '']),
    ]);
    showToast('CSV downloaded');
  }

  // ── Computed insights ──

  // Executive summary: overall health assessment
  const execSummary = useMemo(() => {
    if (diffs.length === 0) return null;

    const revDiff = diffs.find((d) => /revenue|sales/i.test(d.label));
    const profitDiff = diffs.find((d) => /net profit|net income|pat/i.test(d.label));
    const debtDiff = diffs.find((d) => /total debt|borrowings/i.test(d.label) && !/equity/i.test(d.label));

    const parts: string[] = [];

    if (revDiff && revDiff.pct !== null) {
      const t = fmtChangeTrend(revDiff.pct);
      parts.push(`Revenue ${t.text}`);
    }
    if (profitDiff && profitDiff.pct !== null) {
      const t = fmtChangeTrend(profitDiff.pct);
      parts.push(`Net profit ${t.text}`);
    }
    if (debtDiff && debtDiff.pct !== null) {
      const t = fmtChangeTrend(debtDiff.pct);
      parts.push(`Debt ${t.text}`);
    }

    const healthFlags = flags.filter((f) => f.level === 'danger');
    const warningFlags = flags.filter((f) => f.level === 'warn');

    const healthStatus =
      healthFlags.length > 0
        ? '⚠ Needs attention — red flags detected'
        : warningFlags.length > 0
          ? '◐ Some concerns — review caution flags'
          : '✓ Business appears stable';

    return {
      summary: parts.length > 0 ? parts.join(' · ') : 'No significant directional changes detected',
      health: healthStatus,
      flagCount: healthFlags.length + warningFlags.length,
    };
  }, [diffs, flags]);

  // Top changes — sorted by absolute magnitude
  const sortedChanges = useMemo(
    () =>
      diffs
        .filter((d) => d.pct !== null && d.dir !== 'flat')
        .sort((a, b) => Math.abs(b.pct ?? 0) - Math.abs(a.pct ?? 0)),
    [diffs],
  );

  const topChanges = sortedChanges.slice(0, 5);

  // Key metrics card data — important items for at-a-glance
  const keyMetrics = useMemo(() => {
    const watchList = [
      /revenue|sales/i,
      /net profit|net income|pat/i,
      /ebitda/i,
      /total debt|borrowings/i,
      /cash.*equiv/i,
      /equity/i,
      /ebitda margin/i,
      /net profit margin/i,
      /debt.*equity/i,
    ];
    return watchList
      .map((pattern) => diffs.find((d) => pattern.test(d.label)))
      .filter(Boolean)
      .slice(0, 6) as typeof diffs;
  }, [diffs]);

  const spreadsheetInitialPeriods = useMemo(
    () => (sheetPeriods.length >= 2 ? sheetPeriods : ['Period 1', 'Period 2']),
    [sheetPeriods],
  );
  const spreadsheetInitialData = useMemo(
    () => (cleared ? [] : sheetRows.length > 0 ? sheetRows : DEFAULT_FILING_ROWS),
    [cleared, sheetRows],
  );

  return (
    <div>
      <PageHeader
        title="Filing Comparison"
        subtitle="Enter financial data in the spreadsheet, then see what changed — instantly."
        answer="What this helps you answer: Is revenue growing? Are margins compressing? Is debt rising?"
      />

      <DataQualityBar source={dataInfo.companyName || undefined} />
      <div className="flex items-center gap-2 mb-2 mt-1">
        <DataSourceBadge variant={isSampleLoaded ? 'sample' : dataInfo.dataSource === 'manual' ? 'manual' : dataInfo.dataSource && dataInfo.dataSource !== 'none' ? 'imported' : 'none'} />
      </div>

      {/* ── Spreadsheet Input (periods entered directly in headers) ── */}
      <SectionTitle>Enter financial data</SectionTitle>
      <Card>
        <div className="card-body p-2">
          <SpreadsheetInput
            initialPeriods={spreadsheetInitialPeriods}
            initialData={spreadsheetInitialData}
            resetKey={clearVersion}
            onDataChange={(rows, periods) => {
              setSheetRows(rows);
              setSheetPeriods(periods);
            }}
          />
        </div>
        <Toolbar
          onClear={handleClear}
          onAction={handleCompare}
          actionLabel={loading ? 'Comparing...' : 'Compare periods'}
          hint="Tab to navigate · Paste from Excel"
        />
      </Card>

      {/* ── Results — Insight First ── */}
      {showResults && diffs.length > 0 && (
        <div ref={resultsRef}>
          <SectionTitle>Results — what changed</SectionTitle>

          {/* 1. Executive Summary */}
          {execSummary && (
            <Card className="mb-4" accent>
              <div className="card-body">
                <div className="flex items-center justify-between mb-2">
                  <span className="stat-label">Executive Summary</span>
                  <span className={`trust-badge${execSummary.flagCount > 0 ? '' : ' good'}`}>
                    {execSummary.health}
                  </span>
                </div>
                <div className="stat-value text-lg">
                  {execSummary.summary}
                </div>
              </div>
            </Card>
          )}

          {/* 2. Key Metrics At a Glance — using MetricGrid */}
          {keyMetrics.length > 0 && (
            <div className="metric-grid mb-4">
              {keyMetrics.map((d, i) => {
                const changeTxt = fmtChangeTrend(d.pct);
                const cls = d.dir === 'up' ? 'good' : d.dir === 'down' ? 'warn' : '';
                return (
                  <div key={i} className={`metric-cell ${cls}`}>
                    <div className="metric-label">{d.label}</div>
                    <div className="metric-value">
                      {d.b !== null ? (d.isPct ? d.b + '%' : fmtINR(d.b)) : '—'}
                    </div>
                    <div className={`stat-context ${changeTxt.dir === 'up' ? 'trend-up-context' : changeTxt.dir === 'down' ? 'trend-down-context' : ''}`}>
                      {changeTxt.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Key Changes (top 5 by magnitude) */}
          {topChanges.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              <span className="section-title">Key changes</span>
              {topChanges.map((d, i) => {
                const isPositive = d.dir === 'up'
                  ? !/debt|debt.*equity|pledge|liab/i.test(d.label)
                  : /debt|debt.*equity|pledge/i.test(d.label);
                const insightType = isPositive ? 'positive' as const : 'warning' as const;
                const directionLabel = d.dir === 'up' ? 'increased' : 'decreased';
                return (
                  <InsightCard
                    key={i}
                    type={insightType}
                    title={`${d.label} ${directionLabel} ${Math.abs(d.pct ?? 0).toFixed(1)}%`}
                    text={`From ${d.a !== null ? (d.isPct ? d.a + '%' : fmtINR(d.a)) : '—'} to ${d.b !== null ? (d.isPct ? d.b + '%' : fmtINR(d.b)) : '—'}`}
                    formula={d.isPct ? 'Percentage-point metric' : undefined}
                  />
                );
              })}
            </div>
          )}

          {/* 4. Risk Flags */}
          {flags.length > 0 && (
            <Card className="mb-4">
              <div className="card-header">
                <span className="card-label">Risk flags</span>
                <span className="text-muted text-2xs">{flags.length} flag{flags.length > 1 ? 's' : ''}</span>
              </div>
              <div className="card-body flex flex-col gap-2">
                {flags.map((f, i) => (
                  <WarningCard key={i} level={f.level === 'danger' ? 'danger' : 'caution'} label={f.label} text={f.text} />
                ))}
              </div>
            </Card>
          )}

          {/* 5. Full Data Table (expandable) */}
          <details className="mb-4">
            <summary className="details-summary">
              <span className="section-title">
                Full line-by-line comparison — click to expand
              </span>
            </summary>
            <Card label={`${sheetPeriods[0] || 'Earlier'} vs ${sheetPeriods[1] || 'Latest'}`}>
              <table className="diff-table">
                <thead>
                  <tr>
                    <th>Line item</th>
                    <th>{sheetPeriods[0] || 'Earlier'}</th>
                    <th>{sheetPeriods[1] || 'Latest'}</th>
                    <th>Change</th>
                    <th>Magnitude</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const maxAbs = Math.max(0.01, ...diffs.map(d => Math.abs(d.pct ?? 0)));
                    return diffs.map((d, i) => {
                      const absPct = Math.abs(d.pct ?? 0);
                      const barW = (absPct / maxAbs) * 100;
                      return (
                        <tr key={i}>
                          <td>{d.label}</td>
                          <td>{d.a !== null ? (d.isPct ? d.a + '%' : fmtINR(d.a)) : '—'}</td>
                          <td>{d.b !== null ? (d.isPct ? d.b + '%' : fmtINR(d.b)) : '—'}</td>
                          <td className={d.dir === 'up' ? 'change-up' : d.dir === 'down' ? 'change-down' : 'change-flat'}>
                            {d.dir === 'up' ? '↑' : d.dir === 'down' ? '↓' : '→'} {d.pct !== null ? Math.abs(d.pct).toFixed(1) + '%' : '—'}
                          </td>
                          <td className="change-mag-cell">
                            {d.pct !== null && (
                              <div className="change-bar-wrap">
                                <div
                                  className={`change-bar ${d.dir === 'up' ? 'change-bar-up' : 'change-bar-down'}`}
                                  style={{ width: `${Math.max(4, barW)}%` }}
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </Card>
          </details>

          {/* ── Actions ── */}
          {diffs.length > 0 && (
            <CalculationTracePanel traces={(() => {
              const traceItems: CalculationTrace[] = keyMetrics.slice(0, 6).map((d) => ({
                label: d.label,
                value: `${d.b !== null ? (d.isPct ? d.b + '%' : fmtINR(d.b)) : '—'} (${d.dir === 'up' ? '↑' : d.dir === 'down' ? '↓' : '→'} ${d.pct !== null ? Math.abs(d.pct).toFixed(1) + '%' : '—'})`,
                formula: d.isPct ? 'Percentage-point change' : 'Value change',
                sources: [
                  makeTraceSource(d.label, activeDataset, [d.label.toLowerCase().replace(/[^a-z]/g, '')], findRow(sheetRows, [d.label])),
                ],
              }));
              return traceItems;
            })()} />
          )}

          <div className="flex items-center gap-3 mb-4">
            <button type="button" className="btn-primary btn-sm" onClick={handleExportCSV}>
              Download CSV
            </button>
          </div>

          <CalcTimestamp />
          <div className="flex gap-2 flex-wrap mt-2">
            <TrustBadge label={`Values from: ${isSampleLoaded ? 'Sample data' : dataInfo.companyName || 'User entry'}`} variant="source" />
            <TrustBadge label="₹ Indian Market" />
          </div>
          <NextLinks links={[
            { label: 'Plot trends over time', href: '/research/trends' },
            { label: 'Estimate intrinsic value', href: '/tools/dcf' },
          ]} />
          <Disclaimer extra="Pct change = ((B−A)/|A|)×100 · Paste tabular data from Excel or Sheets" />
        </div>
      )}

      {/* ── Empty state ── */}
      {!showResults && (
        <EmptyState
          title="Filing Comparison"
          desc="Enter metrics and periods in the spreadsheet above, or import a file. The tool highlights revenue growth, margin changes, and debt shifts automatically."
          action={{ label: 'Import data', href: '/import' }}
        />
      )}
    </div>
  );
}
