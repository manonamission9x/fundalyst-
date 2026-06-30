'use client';

import { useState, useEffect, useRef } from 'react';
import { useYoyStore } from '@/store';
import { useToast } from '@/components/shared/ToastProvider';
import { downloadCSV, readFile } from '@/lib/helpers';
import {
  PageHeader,
  Card,
  UploadBar,
  Toolbar,
  NextLinks,
  Disclaimer,
  CalcTimestamp,
  EmptyState,
  InsightCard,
  DataQualityBar,
  TrustBadge,
  DataSourceBadge,
} from '@/components/ui';
import ToolSpreadsheet from '@/components/input/ToolSpreadsheet';
import type { SpreadsheetRow } from '@/components/input/SpreadsheetInput';
import { useGlobalImportFill, extractYoYInputs, getDataSourceLabel } from '@/lib/importer/import-hooks';
import { useModelData } from '@/store/use-model-data';
import { extractTrendData } from '@/store/financial-model-selectors';
import { useActiveDataset } from '@/store/financial-model-selectors';
import ProvenanceBadge from '@/components/shared/ProvenanceBadge';
import CalculationTracePanel from '@/components/shared/CalculationTrace';
import { findRow, makeTraceSource, type CalculationTrace } from '@/lib/calculation-trace';

import { usePageTitle } from '@/lib/use-page-title';

export default function YoyPage() {
  const showToast = useToast();
  usePageTitle('Growth Rates');
  const { years, csv, rows, setYears, setCsv, setRows, clear: clearStore } = useYoyStore();
  const [clearVersion, setClearVersion] = useState<number | undefined>(undefined);
  const clearedRef = useRef(false);
  const [cleared, setCleared] = useState(false);
  const [sheetRows, setSheetRows] = useState<SpreadsheetRow[]>([]);

  const dataInfo = useGlobalImportFill(
    (vals) => { setYears(vals.years); setCsv(vals.csv); },
    extractYoYInputs
  );

  const modelData = useModelData((ds) => extractTrendData(ds));
  const activeDataset = useActiveDataset();

  // parseWithText: plain function (not useCallback) so it can be used before the effect
  function parseWithText(text: string) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const dataLines = lines[0] && /^metric\s*,/i.test(lines[0]) ? lines.slice(1) : lines;
    setRows(dataLines.map((l) => {
      const cols = l.split(',').map((s) => s.trim());
      const vals = cols.slice(1).map(Number);
      const growth = vals.map((v, i) => i > 0 && vals[i - 1] ? ((v - vals[i - 1]) / Math.abs(vals[i - 1])) * 100 : null);
      return { label: cols[0], vals, growth };
    }));
  }

  // Pre-fill from canonical model when available
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (clearedRef.current) return;
    if (prefilledRef.current) return;
    if (!modelData.data || !modelData.isLoaded) return;
    if (dataInfo.dataSource === 'none' || dataInfo.dataSource === undefined) return;
    const td = modelData.data;
    if (!td || !td.periods || td.periods.length < 2) return;
    const periods = td.periods;
    const rows: SpreadsheetRow[] = Object.entries(td.metrics).map(([metric, vals]) => ({
      metric,
      values: vals.map(v => v !== null ? String(v) : ''),
    }));
    const timer = setTimeout(() => {
      setSheetRows(rows);
      setYears(periods.join(','));
      const csvText = rows.map((r) => `${r.metric},${r.values.join(',')}`).join('\n');
      setCsv(csvText);
      parseWithText(csvText);
    }, 0);
    prefilledRef.current = true;
    return () => clearTimeout(timer);
  }, [modelData.data, modelData.isLoaded, dataInfo.dataSource]);

  const handleDataChange = (newRows: SpreadsheetRow[], newPeriods: string[]) => {
    setSheetRows(newRows);
    // Convert to growth format
    const labels = newPeriods.join(',');
    setYears(labels);
    const csvText = newRows.map((r) => `${r.metric},${r.values.join(',')}`).join('\n');
    setCsv(csvText);
    parseWithText(csvText);
  };

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFile(file);
      setCsv(text);
      parseWithText(text);
      // Also populate sheet
      const lines = text.split('\n').filter(Boolean);
      const periods = lines[0]?.split(',').slice(1).map(s => s.trim()) || [];
      const parsedRows = lines.slice(1).map(l => {
        const cols = l.split(',').map(s => s.trim());
        return { metric: cols[0], values: cols.slice(1) };
      });
      if (parsedRows.length > 0) {
        setSheetRows(parsedRows);
        setYears(periods.join(','));
      }
      showToast('Loaded data');
    } catch (err: unknown) {
      showToast('Error reading file: ' + (err instanceof Error ? err.message : 'unknown'));
    }
    e.target.value = '';
  }

  function parse() {
    parseWithText(csv);
    const lines = csv.split('\n').filter(Boolean);
    if (lines.length > 0) {
      showToast('Loaded ' + lines.length + ' metrics');
    }
  }

  function handleClear() { clearedRef.current = true; setCleared(true); setClearVersion(v => (v ?? 0) + 1); clearStore(); setSheetRows([]); }

  const yearList = years.split(',').map((s) => s.trim()).filter(Boolean);
  const colLabels = rows.length > 0
    ? rows[0].growth.slice(1).map((_, i) => yearList.length >= i + 2 ? `${yearList[i]}→${yearList[i + 1]}` : `Yr${i + 1}→Yr${i + 2}`)
    : [];

  const fastestGrowing = rows.length > 0
    ? rows.map((r) => {
        const avg = r.growth.slice(1).filter((g): g is number => g !== null).reduce((a, b) => a + b, 0) / r.growth.slice(1).filter((g): g is number => g !== null).length;
        return { label: r.label, avg: isNaN(avg) ? -Infinity : avg };
      }).sort((a, b) => b.avg - a.avg)[0]
    : null;

  const declining = rows.length > 0
    ? rows.map((r) => {
        const avg = r.growth.slice(1).filter((g): g is number => g !== null).reduce((a, b) => a + b, 0) / r.growth.slice(1).filter((g): g is number => g !== null).length;
        return { label: r.label, avg: isNaN(avg) ? Infinity : avg };
      }).filter((m) => m.avg < 0).sort((a, b) => a.avg - b.avg)[0]
    : null;

  const provenanceKind = dataInfo.dataSource === 'sample' ? 'manual' as const
    : dataInfo.dataSource === 'manual' ? 'manual' as const
    : dataInfo.dataSource && dataInfo.dataSource !== 'none' ? 'imported' as const
    : 'unavailable' as const;

  const traceItems: CalculationTrace[] = rows.length > 0
    ? rows.map((r) => {
        const sheetRow = findRow(sheetRows, [r.label]);
        const metricKeys = [r.label.toLowerCase().replace(/\s+/g, '')];
        return {
          label: r.label,
          value: r.growth.slice(1).map((g) => g !== null ? (g > 0 ? '+' : '') + g.toFixed(1) + '%' : '—').join(', '),
          formula: 'Year-over-year growth: (Vᵢ₊₁ − Vᵢ) ÷ |Vᵢ| × 100',
          sources: yearList.slice(0, -1).map((yr, idx) => {
            const nextYr = yearList[idx + 1];
            const curVal = r.vals[idx] ?? null;
            const nextVal = r.vals[idx + 1] ?? null;
            const source = makeTraceSource(
              `${yr}→${nextYr}`,
              activeDataset,
              metricKeys,
              sheetRow,
              curVal !== null ? String(curVal) : null,
            );
            return {
              ...source,
              value: curVal !== null ? String(curVal) : 'not provided',
              rawValue: nextVal !== null ? String(nextVal) : undefined,
              period: `${yr} / ${nextYr}`,
            };
          }),
        };
      })
    : [];

  return (
    <div>
      <PageHeader
        title="Growth Rates"
        subtitle="See whether revenue, profit, and other metrics are accelerating or slowing — year over year."
        answer="What this helps you answer: Is the company growing? Are margins improving?"
      />

      <DataQualityBar source={getDataSourceLabel(dataInfo.dataSource, dataInfo.companyName)} />
      <div className="flex items-center gap-2 mb-2 mt-1">
        <DataSourceBadge variant={dataInfo.dataSource === 'sample' ? 'sample' : dataInfo.dataSource === 'manual' ? 'manual' : dataInfo.dataSource && dataInfo.dataSource !== 'none' ? 'imported' : 'none'} />
        <ProvenanceBadge kind={provenanceKind} showLabel />
      </div>
      <UploadBar onUpload={handleCsvFile} hint="CSV: Metric, Year1, Year2, Year3, ..." />

      <Card label="Data">
        <div className="card-body">
          <ToolSpreadsheet
            tool="growth"
            multiColumn
            initialData={cleared ? undefined : (sheetRows.length > 0 ? sheetRows : undefined)}
            resetKey={clearVersion}
            initialPeriods={cleared ? ['', '', ''] : (yearList.length >= 3 ? yearList : ['FY22', 'FY23', 'FY24'])}
            onDataChange={handleDataChange}
            hint="Add rows for each metric. Tab to navigate between cells."
          />
          <Toolbar onClear={handleClear} onAction={parse} actionLabel="Calculate growth" />
        </div>
      </Card>

      {rows.length > 0 && (
        <div id="growth-results">
          <Card label="Growth rates (YoY %)" className="mt-4">
            <table className="diff-table">
              <thead><tr><th>Metric</th>{colLabels.map((cl, i) => <th key={i}>{cl}</th>)}</tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td><strong>{r.label}</strong></td>
                    {r.growth.slice(1).map((g, j) => (
                      <td key={j} style={{ color: g !== null && g > 0 ? 'var(--green)' : g !== null && g < 0 ? 'var(--red)' : 'var(--text)' }}>
                        {g !== null ? (g > 0 ? '+' : '') + g.toFixed(1) + '%' : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-center py-3">
              <button className="btn-secondary btn-sm" onClick={() => {
                const hdrs = ['Metric', ...colLabels];
                const data = rows.map((r) => [r.label, ...r.growth.slice(1).map((g) => g !== null ? (g > 0 ? '+' : '') + g.toFixed(1) + '%' : '')]);
                downloadCSV('yoy_growth.csv', [hdrs, ...data]);
              }}>Download CSV</button>
            </div>
          </Card>

          <div className="flex flex-col gap-3 mt-4">
            {fastestGrowing && fastestGrowing.avg > -Infinity && <InsightCard type="positive" title="Fastest growing metric" text={`${fastestGrowing.label} averaged ${fastestGrowing.avg.toFixed(1)}% growth.`} />}
            {declining && <InsightCard type="risk" title="Declining metric" text={`${declining.label} averaged ${declining.avg.toFixed(1)}% — worth investigating.`} />}
          </div>

          <CalculationTracePanel traces={traceItems} />

          <div className="mt-4">
            <NextLinks links={[{ label: 'Trend charts', href: '/research/trends' }, { label: 'Review filings', href: '/research/filing' }]} />
            <CalcTimestamp />
            <div className="flex gap-2 flex-wrap mt-2"><TrustBadge label={`Values from: ${getDataSourceLabel(dataInfo.dataSource, dataInfo.companyName)}`} variant="source" /><TrustBadge label="₹ Indian Market" /></div>
            <Disclaimer />
          </div>
        </div>
      )}

      {!rows.length && (
        <EmptyState title="No growth data yet" desc="Enter year labels and metrics in the spreadsheet above (or upload a CSV), then click Calculate growth. The tool computes year-over-year percentage changes." action={{ label: 'Import data', href: '/import' }} />
      )}
    </div>
  );
}
