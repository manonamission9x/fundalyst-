'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { fmtNum } from '@/lib/calculations';
import { useToast } from '@/components/shared/ToastProvider';
import { downloadCSV, readFile } from '@/lib/helpers';
import { PageHeader, Card, UploadBar, Toolbar, NextLinks, Disclaimer, EmptyState, DataQualityBar, CalcTimestamp, TrustBadge, DataSourceBadge } from '@/components/ui';
import ToolSpreadsheet from '@/components/input/ToolSpreadsheet';
import type { SpreadsheetRow } from '@/components/input/SpreadsheetInput';
import dynamic from 'next/dynamic';
import { extractTrendData, useActiveDataset } from '@/store/financial-model-selectors';
import { useModelData } from '@/store/use-model-data';
import type { TrendRow } from '@/types/financial';
import { usePageTitle } from '@/lib/use-page-title';
import ProvenanceBadge from '@/components/shared/ProvenanceBadge';
import CalculationTracePanel from '@/components/shared/CalculationTrace';
import { findRow, type CalculationTrace } from '@/lib/calculation-trace';

const TrendsChart = dynamic(() => import('@/components/tools/trends/TrendsChart'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ width: '100%', height: 250 }} />,
});

const SAMPLE_TREND_PERIODS = ['FY22', 'FY23', 'FY24', 'FY25', 'FY26'];
const SAMPLE_TREND_ROWS: SpreadsheetRow[] = [
  { metric: 'Revenue', values: ['1000', '1150', '1240', '1380', '1530'] },
  { metric: 'Net Profit', values: ['160', '155', '142', '130', '119'] },
  { metric: 'Total Assets', values: ['2000', '2200', '2450', '2700', '3000'] },
];

export default function TrendsPage() {
  const showToast = useToast();
  usePageTitle('Trend Charts');
  const modelData = useModelData((ds) => extractTrendData(ds));
  const activeDataset = useActiveDataset();

  const [clearVersion, setClearVersion] = useState<number | undefined>(undefined);
  const clearedRef = useRef(false);
  const [cleared, setCleared] = useState(false);
  const [sheetRows, setSheetRows] = useState<SpreadsheetRow[]>([]);
  const [sheetPeriods, setSheetPeriods] = useState<string[]>([]);
  const [trendRows, setTrendRows] = useState<TrendRow[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSampleLoaded, setIsSampleLoaded] = useState(false);

  // Period labels: use imported periods when available, otherwise start empty.
  const defaultPeriods = useMemo(() => {
    if (activeDataset && modelData.data && modelData.data.periods.length >= 3) {
      return modelData.data.periods;
    }
    return ['', '', ''];
  }, [activeDataset, modelData.data]);
  const clearedPeriods = useMemo(() => ['', '', ''], []);

  // Spreadsheet rows: use imported metrics when available, otherwise start empty.
  const defaultRows = useMemo<SpreadsheetRow[]>(() => {
    if (activeDataset && modelData.data && modelData.data.periods.length > 0 && Object.keys(modelData.data.metrics).length > 0) {
      return Object.entries(modelData.data.metrics).map(([metric, vals]) => ({
        metric,
        values: vals.map((v) => (v !== null ? String(v) : '')),
      }));
    }
    return [];
  }, [activeDataset, modelData.data]);

  const loadedDatasetIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (clearedRef.current) return;
    if (!activeDataset?.id || loadedDatasetIdRef.current === activeDataset.id) return;
    if (!modelData.data || modelData.data.periods.length === 0 || defaultRows.length === 0) return;
    const timer = setTimeout(() => {
      const nextRows: TrendRow[] = defaultRows.map((r) => ({
        label: r.metric,
        vals: r.values.map((v) => {
          const n = parseFloat(v.replace(/,/g, ''));
          return isNaN(n) ? 0 : n;
        }),
      }));
      setClearVersion(v => (v ?? 0) + 1);
      setSheetPeriods(modelData.data.periods);
      setSheetRows(defaultRows);
      setTrendRows(nextRows);
      setShowResults(defaultRows.some((r) => r.values.some((v) => v.trim())));
      setIsSampleLoaded(false);
      loadedDatasetIdRef.current = activeDataset.id;
    }, 0);
    return () => clearTimeout(timer);
  }, [activeDataset?.id, defaultRows, modelData.data]);

  // Build trace items for the CalculationTracePanel
  const traceItems = useMemo<CalculationTrace[]>(() => {
    if (!showResults || trendRows.length === 0) return [];
    return trendRows.map((row) => {
      const sheetRow = findRow(sheetRows, [row.label]);
      void sheetRow; // used for provenance lookup
      return {
        label: row.label,
        value: row.vals.map((v) => (isNaN(v) ? '—' : fmtNum(v))).join(', '),
        formula: 'Direct values plotted across periods',
        sources: sheetPeriods.map((period, idx) => ({
          label: period,
          value: isNaN(row.vals[idx]) ? '—' : String(row.vals[idx]),
          source: activeDataset
            ? `${activeDataset.companyName || 'Imported dataset'} (trends)`
            : 'Manual input',
          period,
          originalLabel: row.label,
          confidence: activeDataset ? 0.95 : undefined,
          capturedAt: activeDataset?.createdAt,
        })),
      };
    });
  }, [showResults, trendRows, sheetRows, sheetPeriods, activeDataset]);

  const handleSheetChange = useCallback((newRows: SpreadsheetRow[], periods: string[]) => {
    setSheetRows(newRows);
    setSheetPeriods(periods);
    const hasValues = newRows.some((r) => r.values.some((v) => v.trim()));
    const trendData: TrendRow[] = newRows.map((r) => ({
      label: r.metric,
      vals: r.values.map((v) => {
        const n = parseFloat(v.replace(/,/g, ''));
        return isNaN(n) ? 0 : n;
      }),
    }));
    setTrendRows(trendData);
    setShowResults(hasValues);
  }, []);

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFile(file);
      const lines = text.split('\n').filter(Boolean);
      if (lines.length < 2) return;
      const periods = lines[0].split(',').slice(1).map((s) => s.trim());
      const dataRows = lines.slice(1).map((l) => {
        const cols = l.split(',').map((s) => s.trim());
        return { metric: cols[0], values: cols.slice(1) };
      });
      setSheetPeriods(periods);
      setSheetRows(dataRows);
      setTrendRows(dataRows.map((r) => ({ label: r.metric, vals: r.values.map((v) => parseFloat(v) || 0) })));
      setShowResults(true);
      setIsSampleLoaded(false);
      showToast('Loaded data');
    } catch (err: unknown) {
      showToast('Error reading file: ' + (err instanceof Error ? err.message : 'unknown'));
    }
    e.target.value = '';
  }

  function parse() {
    if (sheetRows.length === 0) {
      showToast('Add data to the spreadsheet first.');
      return;
    }
    if (!sheetRows.some((r) => r.values.some((v) => v.trim()))) {
      showToast('Add values to the spreadsheet first.');
      setShowResults(false);
      return;
    }
    const trendData: TrendRow[] = sheetRows.map((r) => ({
      label: r.metric,
      vals: r.values.map((v) => {
        const n = parseFloat(v.replace(/,/g, ''));
        return isNaN(n) ? 0 : n;
      }),
    }));
    setTrendRows(trendData);
    setShowResults(true);
  }

  function handleClear() {
    clearedRef.current = true;
    setCleared(true);
    setClearVersion(v => (v ?? 0) + 1);
    setSheetRows([]); setSheetPeriods([]); setTrendRows([]); setShowResults(false);
    setIsSampleLoaded(false);
  }

  function loadSample() {
    clearedRef.current = false;
    setCleared(false);
    setClearVersion(v => (v ?? 0) + 1);
    setSheetPeriods(SAMPLE_TREND_PERIODS);
    setSheetRows(SAMPLE_TREND_ROWS);
    setTrendRows(SAMPLE_TREND_ROWS.map((r) => ({ label: r.metric, vals: r.values.map((v) => parseFloat(v) || 0) })));
    setShowResults(true);
    setIsSampleLoaded(true);
    showToast('Loaded sample trend data');
  }

  return (
    <div>
      <PageHeader
        title="Trend Charts"
        subtitle="Track revenue, profit, costs, debt, and other metrics across periods."
        answer="What this helps you answer: Which metrics are improving? Which are declining?"
      />
      <DataQualityBar source={activeDataset?.companyName || undefined} />
      <div className="flex items-center gap-2 mb-2 mt-1">
        <DataSourceBadge variant={isSampleLoaded ? 'sample' : modelData.companyName ? 'imported' : 'none'} />
        {activeDataset && modelData.data && modelData.data.periods.length > 0 && (
          <ProvenanceBadge kind="imported" label="Imported data" />
        )}
        {(!activeDataset || !modelData.data || modelData.data.periods.length === 0) && (
          <ProvenanceBadge kind={isSampleLoaded ? 'default' : 'unavailable'} label={isSampleLoaded ? 'Sample data' : 'No data'} />
        )}
      </div>
      <UploadBar onUpload={handleCsvFile} hint="CSV: Metric, Period1, Period2, Period3, ..." />

      <Card label="Data">
        <div className="card-body">
          <ToolSpreadsheet
            tool="trends"
            multiColumn
            initialPeriods={sheetPeriods.length >= 3 ? sheetPeriods : (cleared ? clearedPeriods : defaultPeriods)}
            resetKey={clearVersion}
            initialData={
              cleared ? [] : (sheetRows.length > 0
                ? sheetRows
                : defaultRows.length > 0 ? defaultRows : undefined)
            }
            onDataChange={handleSheetChange}
            hint="First row = period labels. Each row below = one metric. Values update the chart instantly."
          />
          <Toolbar onClear={handleClear} onAction={parse} actionLabel="Plot" />
          <div className="card-actions" style={{ borderTop: 0 }}>
            <button type="button" className="btn-ghost btn-sm" onClick={loadSample}>
              Load sample
            </button>
          </div>
        </div>
      </Card>

      {showResults && trendRows.length > 0 && (
        <div id="trends-results">
          <Card label="Chart" className="mt-4">
            <div className="chart-wrap">
              <TrendsChart rows={trendRows} headers={['Metric', ...sheetPeriods]} />
            </div>
          </Card>

          {showResults && <CalculationTracePanel traces={traceItems} />}

          <Card label="Data table" className="mt-4">
            <table className="diff-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  {sheetPeriods.map((h, i) => <th key={i}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {trendRows.map((r, i) => (
                  <tr key={i}>
                    <td><strong>{r.label}</strong></td>
                    {r.vals.map((v, j) => <td key={j}>{isNaN(v) ? '—' : fmtNum(v)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-center py-3">
              <button className="btn-secondary btn-sm" onClick={() => {
                const hdrs = ['Metric', ...sheetPeriods];
                const data = trendRows.map((r) => [r.label, ...r.vals.map((v) => (isNaN(v) ? '' : v))]);
                downloadCSV('trends.csv', [hdrs, ...data]);
              }}>Download CSV</button>
            </div>
          </Card>

          <NextLinks links={[{ label: 'Growth rates', href: '/research/growth' }, { label: 'Estimate value', href: '/tools/dcf' }]} />
          <CalcTimestamp />
          <div className="flex gap-2 flex-wrap mt-2"><TrustBadge label={`Values from: ${isSampleLoaded ? 'Sample data' : activeDataset?.companyName || 'User entry'}`} variant="source" /><TrustBadge label="₹ Indian Market" /></div>
          <Disclaimer />
        </div>
      )}

      {!showResults && (
        <>
          <EmptyState title="Trend Charts" desc="Enter period labels as column headers and metrics below in the spreadsheet, import a file, or load the sample, then click Plot." action={{ label: 'Import data', href: '/import' }} />
          <div className="flex justify-center mt-3">
            <button type="button" className="btn-secondary btn-sm" onClick={loadSample}>
              Load sample
            </button>
          </div>
        </>
      )}
    </div>
  );
}
