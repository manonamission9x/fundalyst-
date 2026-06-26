'use client';

import { useEffect } from 'react';
import { fmtNum } from '@/lib/calculations';
import { useTrendsStore, useAnalysisStore } from '@/store';
import { useToast } from '@/components/shared/ToastProvider';
import { downloadCSV, readFile } from '@/lib/helpers';
import { PageHeader, Card, UploadBar, Toolbar, NextLinks, Disclaimer, EmptyState, DataQualityBar, CalcTimestamp } from '@/components/ui';
import dynamic from 'next/dynamic';
import { useGlobalImportFill, extractTrendsCSV, getDataSourceLabel } from '@/lib/importer/import-hooks';

const TrendsChart = dynamic(() => import('@/components/tools/trends/TrendsChart'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ width: '100%', height: 250, borderRadius: 'var(--radius-md)' }} />,
});

export default function TrendsPage() {
  const showToast = useToast();
  const { filingData } = useAnalysisStore();
  const { csv, headers, rows, setCsv, setHeaders, setRows, clear } = useTrendsStore();

  // Pre-fill from imported data via global data pipeline
  const { dataSource, companyName } = useGlobalImportFill(
    (vals) => { setCsv(vals); },
    extractTrendsCSV
  );

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFile(file);
      setCsv(text);
      parseWithText(text);
    } catch (err: unknown) {
      showToast('Error reading file: ' + (err instanceof Error ? err.message : 'unknown'));
    }
    e.target.value = '';
  }

  function parseWithText(text: string) {
    const lines = text.split('\n').filter(Boolean);
    if (lines.length < 2) return;
    setHeaders(lines[0].split(',').map((s) => s.trim()));
    setRows(
      lines.slice(1).map((l) => {
        const cols = l.split(',').map((s) => s.trim());
        return { label: cols[0], vals: cols.slice(1).map(Number) };
      })
    );
  }

  // When filingData changes, pre-fill CSV with filing diffs
  useEffect(() => {
    if (filingData && filingData.diffs && filingData.diffs.length > 0) {
      const headerLine = 'Metric, Earlier, Latest';
      const dataLines = filingData.diffs.map((d: any) => `${d.label}, ${d.a ?? ''}, ${d.b ?? ''}`);
      setCsv([headerLine, ...dataLines].join('\n'));
    }
  }, [filingData, setCsv]);

  function parse() {
    parseWithText(csv);
    const lines = csv.split('\n').filter(Boolean);
    if (lines.length > 0) {
      showToast('Loaded ' + (lines.length - 1) + ' metrics');
      setTimeout(() => {
        document.getElementById('trends-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }

  function handleClear() {
    clear();
  }

  return (
    <div>
      <PageHeader
        title="Trend Charts"
        subtitle="Track revenue, profit, costs, debt, and other metrics across periods."
        answer="What this helps you answer: Which metrics are improving? Which are declining?"
      />
      <DataQualityBar source={getDataSourceLabel(dataSource, companyName)} />
      <UploadBar onUpload={handleCsvFile} hint="CSV: Metric, Period1, Period2, Period3, ..." />
      <Card label="Data">
        <div className="card-body">
          <textarea
            id="trends-csv"
            rows={6}
            className="num-input"
            style={{ width: '100%', lineHeight: 1.7, fontSize: 12, fontFamily: 'var(--font-mono)' }}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            aria-label="Trend data CSV input"
          />
          <Toolbar onClear={handleClear} onAction={parse} actionLabel="Plot" />
        </div>
      </Card>

      {rows.length > 0 && (
        <div id="trends-results">
          <Card label="Data table" style={{ marginTop: '1.5rem' }}>
            <div className="card-body">
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                {rows[0]?.label || 'Revenue'} Trend (₹ Cr)
              </div>
              <div style={{ position: 'relative', height: 250 }}>
                <TrendsChart rows={rows} headers={headers} />
              </div>
            </div>
            <table className="diff-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  {headers.slice(1).map((h, i) => <th key={i}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td><strong>{r.label}</strong></td>
                    {r.vals.map((v, j) => (
                      <td key={j}>{isNaN(v) ? '—' : fmtNum(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="card-body" style={{ textAlign: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  const hdrs = ['Metric', ...headers.slice(1)];
                  const data = rows.map((r) => [r.label, ...r.vals.map((v) => (isNaN(v) ? '' : v))]);
                  downloadCSV('trends.csv', [hdrs, ...data]);
                }}
              >
                Download CSV
              </button>
            </div>
          </Card>
          <NextLinks
            links={[
              { label: 'Growth rates', href: '/research/growth' },
              { label: 'Estimate value', href: '/tools/dcf' },
            ]}
          />
          <CalcTimestamp />
          <Disclaimer />
        </div>
      )}

      {!rows.length && (
        <EmptyState
          title="Enter period labels as the first row and metrics below, then click Plot."
          desc="Format: Metric, Period1, Period2, Period3, ..."
        />
      )}
    </div>
  );
}
