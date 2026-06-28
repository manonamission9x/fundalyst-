'use client';

import { useCallback, useState, useRef } from 'react';
import { fmtNum } from '@/lib/calculations';
import { useAnalysisStore } from '@/store';
import { useToast } from '@/components/shared/ToastProvider';
import { downloadCSV, readFile } from '@/lib/helpers';
import { PageHeader, Card, UploadBar, Toolbar, NextLinks, Disclaimer, EmptyState, DataQualityBar, CalcTimestamp, TrustBadge } from '@/components/ui';
import ToolSpreadsheet from '@/components/input/ToolSpreadsheet';
import type { SpreadsheetRow } from '@/components/input/SpreadsheetInput';
import dynamic from 'next/dynamic';
import { useGlobalImportFill, extractTrendsCSV, getDataSourceLabel } from '@/lib/importer/import-hooks';
import { useActiveDataset, extractTrendData } from '@/store/financial-model-selectors';
import { useModelData } from '@/store/use-model-data';
import type { TrendRow } from '@/types/financial';
import { usePageTitle } from '@/lib/use-page-title';

const TrendsChart = dynamic(() => import('@/components/tools/trends/TrendsChart'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ width: '100%', height: 250 }} />,
});

export default function TrendsPage() {
  const showToast = useToast();
  usePageTitle('Trend Charts');
  const { filingData } = useAnalysisStore();
  const { dataSource, companyName } = useGlobalImportFill((vals) => {}, extractTrendsCSV);
  const modelData = useModelData((ds) => extractTrendData(ds));

  const [clearVersion, setClearVersion] = useState(0);
  const clearedRef = useRef(false);
  const [sheetRows, setSheetRows] = useState<SpreadsheetRow[]>([]);
  const [sheetPeriods, setSheetPeriods] = useState<string[]>([]);
  const [trendRows, setTrendRows] = useState<TrendRow[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSheetChange = useCallback((newRows: SpreadsheetRow[], periods: string[]) => {
    setSheetRows(newRows);
    setSheetPeriods(periods);
    const trendData: TrendRow[] = newRows.map((r) => ({
      label: r.metric,
      vals: r.values.map((v) => {
        const n = parseFloat(v.replace(/,/g, ''));
        return isNaN(n) ? 0 : n;
      }),
    }));
    setTrendRows(trendData);
    setShowResults(true);
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
    setClearVersion(v => v + 1);
    setSheetRows([]); setSheetPeriods([]); setTrendRows([]); setShowResults(false);
  }

  return (
    <div>
      <PageHeader
        title="Trend Charts"
        subtitle="Track revenue, profit, costs, debt, and other metrics across periods."
        answer="What this helps you answer: Which metrics are improving? Which are declining?"
      />
      <DataQualityBar source={modelData.companyName || undefined} />
      <UploadBar onUpload={handleCsvFile} hint="CSV: Metric, Period1, Period2, Period3, ..." />

      <Card label="Data">
        <div className="card-body">
          <ToolSpreadsheet
            tool="trends"
            multiColumn
            initialPeriods={sheetPeriods.length >= 3 ? sheetPeriods : (clearedRef.current ? ['', '', ''] : ['FY22', 'FY23', 'FY24', 'FY25', 'FY26'])}
            resetKey={clearVersion}
            initialData={
              clearedRef.current ? [] : (sheetRows.length > 0
                ? sheetRows
                : [
                    { metric: 'Revenue', values: ['1000', '1150', '1240', '1380', '1530'] },
                    { metric: 'Net Profit', values: ['160', '155', '142', '130', '119'] },
                    { metric: 'Total Assets', values: ['2000', '2200', '2450', '2700', '3000'] },
                  ])
            }
            onDataChange={handleSheetChange}
            hint="First row = period labels. Each row below = one metric. Values update the chart instantly."
          />
          <Toolbar onClear={handleClear} onAction={parse} actionLabel="Plot" />
        </div>
      </Card>

      {showResults && trendRows.length > 0 && (
        <div id="trends-results">
          <Card label="Chart" className="mt-4">
            <div className="chart-wrap">
              <TrendsChart rows={trendRows} headers={['Metric', ...sheetPeriods]} />
            </div>
          </Card>

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
          <div className="flex gap-2 flex-wrap mt-2"><TrustBadge label="Trend Analysis" variant="source" /><TrustBadge label="₹ Indian Market" /></div>
          <Disclaimer />
        </div>
      )}

      {!showResults && (
        <EmptyState title="No trend data yet" desc="Enter period labels as the first column headers and metrics below in the spreadsheet, then click Plot. Data can also be pre-filled from the Filing Comparison or Import tools." action={{ label: 'Import data', href: '/import' }} />
      )}
    </div>
  );
}
