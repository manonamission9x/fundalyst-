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
  HeroDecision,
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

const EMPTY_GROWTH_ROWS: SpreadsheetRow[] = [
  { metric: 'Revenue', values: ['', '', ''] },
  { metric: 'Net Profit', values: ['', '', ''] },
  { metric: 'EBITDA', values: ['', '', ''] },
];

const SAMPLE_GROWTH_PERIODS = ['FY22', 'FY23', 'FY24', 'FY25', 'FY26'];
const SAMPLE_GROWTH_ROWS: SpreadsheetRow[] = [
  { metric: 'Revenue', values: ['1000', '1150', '1240', '1380', '1530'] },
  { metric: 'Net Profit', values: ['160', '155', '142', '130', '119'] },
  { metric: 'EBITDA', values: ['280', '295', '310', '290', '270'] },
];

export default function YoyPage() {
  const showToast = useToast();
  usePageTitle('Growth Rates');
  const { years, csv, rows, setYears, setCsv, setRows, clear: clearStore } = useYoyStore();
  const [clearVersion, setClearVersion] = useState<number | undefined>(undefined);
  const clearedRef = useRef(false);
  const [cleared, setCleared] = useState(false);
  const [sheetRows, setSheetRows] = useState<SpreadsheetRow[]>([]);
  const [isSampleLoaded, setIsSampleLoaded] = useState(false);

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
  const loadedDatasetIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (clearedRef.current) return;
    if (activeDataset?.id && loadedDatasetIdRef.current === activeDataset.id) return;
    if (!modelData.data || !modelData.isLoaded) return;
    if (!activeDataset && (dataInfo.dataSource === 'none' || dataInfo.dataSource === undefined)) return;
    const td = modelData.data;
    if (!td || !td.periods || td.periods.length < 2) return;
    const periods = td.periods;
    const rows: SpreadsheetRow[] = Object.entries(td.metrics).map(([metric, vals]) => ({
      metric,
      values: vals.map(v => v !== null ? String(v) : ''),
    }));
    const timer = setTimeout(() => {
      setClearVersion(v => (v ?? 0) + 1);
      setSheetRows(rows);
      setYears(periods.join(','));
      const csvText = rows.map((r) => `${r.metric},${r.values.join(',')}`).join('\n');
      setCsv(csvText);
      parseWithText(csvText);
      setIsSampleLoaded(false);
      loadedDatasetIdRef.current = activeDataset?.id ?? null;
    }, 0);
    prefilledRef.current = true;
    return () => clearTimeout(timer);
  }, [activeDataset, modelData.data, modelData.isLoaded, dataInfo.dataSource, setCsv, setRows, setYears]);

  const handleDataChange = (newRows: SpreadsheetRow[], newPeriods: string[]) => {
    setSheetRows(newRows);
    const labels = newPeriods.join(',');
    setYears(labels);
    const csvText = newRows.map((r) => `${r.metric},${r.values.join(',')}`).join('\n');
    setCsv(csvText);
    if (!newRows.some((r) => r.values.some((v) => v.trim()))) {
      setRows([]);
      return;
    }
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
      setIsSampleLoaded(false);
      showToast('Loaded data');
    } catch (err: unknown) {
      showToast('Error reading file: ' + (err instanceof Error ? err.message : 'unknown'));
    }
    e.target.value = '';
  }

  function parse() {
    if (!csv.split('\n').some((line) => line.split(',').slice(1).some((v) => v.trim()))) {
      setRows([]);
      showToast('Add values to the spreadsheet first.');
      return;
    }
    parseWithText(csv);
    const lines = csv.split('\n').filter(Boolean);
    if (lines.length > 0) {
      showToast('Loaded ' + lines.length + ' metrics');
    }
  }

  function handleClear() { clearedRef.current = true; setCleared(true); setClearVersion(v => (v ?? 0) + 1); clearStore(); setSheetRows([]); setIsSampleLoaded(false); }

  function loadSample() {
    clearedRef.current = false;
    setCleared(false);
    setClearVersion(v => (v ?? 0) + 1);
    setSheetRows(SAMPLE_GROWTH_ROWS);
    const csvText = SAMPLE_GROWTH_ROWS.map((r) => `${r.metric},${r.values.join(',')}`).join('\n');
    setYears(SAMPLE_GROWTH_PERIODS.join(','));
    setCsv(csvText);
    parseWithText(csvText);
    setIsSampleLoaded(true);
    showToast('Loaded sample growth data');
  }

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

  // Hero decision (§2): CAGR of the primary metric (first row) over the full period.
  const heroCagr = (() => {
    if (rows.length === 0) return null;
    const r = rows[0];
    const nums = (r.vals as (number | string | null)[]).map((v) => Number(v)).filter((v) => !isNaN(v));
    if (nums.length < 2) return null;
    const first = nums[0];
    const last = nums[nums.length - 1];
    const periods = nums.length - 1;
    if (first <= 0 || last <= 0) return null;
    const cagr = (Math.pow(last / first, 1 / periods) - 1) * 100;
    return { label: r.label, cagr, periods };
  })();

  const provenanceKind = isSampleLoaded ? 'default' as const
    : dataInfo.dataSource === 'sample' ? 'manual' as const
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
        kicker="Research"
        title="Growth Rates"
        subtitle="See whether revenue, profit, and other metrics are accelerating or slowing — year over year."
        answer="What this helps you answer: Is the company growing? Are margins improving?"
      />

      <DataQualityBar source={getDataSourceLabel(dataInfo.dataSource, dataInfo.companyName)} />
      <div className="flex items-center gap-2 mb-2 mt-1">
        <DataSourceBadge variant={isSampleLoaded ? 'sample' : dataInfo.dataSource === 'sample' ? 'sample' : dataInfo.dataSource === 'manual' ? 'manual' : dataInfo.dataSource && dataInfo.dataSource !== 'none' ? 'imported' : 'none'} />
        <ProvenanceBadge kind={provenanceKind} showLabel />
      </div>
      <UploadBar onUpload={handleCsvFile} hint="CSV: Metric, Year1, Year2, Year3, ..." />

      <Card label="Data">
        <div className="card-body">
          <ToolSpreadsheet
            tool="growth"
            multiColumn
            initialData={cleared ? EMPTY_GROWTH_ROWS : (sheetRows.length > 0 ? sheetRows : EMPTY_GROWTH_ROWS)}
            resetKey={clearVersion}
            initialPeriods={cleared ? ['', '', ''] : (yearList.length >= 3 ? yearList : ['', '', ''])}
            onDataChange={handleDataChange}
            hint="Add rows for each metric. Tab to navigate between cells."
          />
          <Toolbar onClear={handleClear} onAction={parse} actionLabel="Calculate growth" />
          <div className="card-actions" style={{ borderTop: 0 }}>
            <button type="button" className="btn-ghost btn-sm" onClick={loadSample}>
              Load sample
            </button>
          </div>
        </div>
      </Card>

      {rows.length > 0 && (
        <div id="growth-results">
          {heroCagr && (
            <HeroDecision
              label={`${heroCagr.label} — ${heroCagr.periods}yr CAGR`}
              value={`${heroCagr.cagr > 0 ? '+' : ''}${heroCagr.cagr.toFixed(1)}%`}
              sign={heroCagr.cagr > 0 ? 'positive' : heroCagr.cagr < 0 ? 'negative' : 'neutral'}
              sub="Compound annual growth rate across the full period."
            />
          )}
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
            <div className="flex gap-2 flex-wrap mt-2"><TrustBadge label={`Values from: ${isSampleLoaded ? 'Sample data' : getDataSourceLabel(dataInfo.dataSource, dataInfo.companyName)}`} variant="source" /><TrustBadge label="₹ Indian Market" /></div>
            <Disclaimer />
          </div>
        </div>
      )}

      {!rows.length && (
        <>
          <EmptyState title="Growth Rates" desc="Enter year labels and metrics to calculate year-over-year changes for each line item." action={{ label: 'Import data', href: '/import' }} />
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
