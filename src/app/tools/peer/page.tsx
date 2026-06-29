'use client';

import { useCallback, useState, useRef } from 'react';
import { fmtNum } from '@/lib/calculations';
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
import type { PeerRow } from '@/types/financial';

const LABELS = ['Revenue', 'Profit', 'Assets', 'Debt'];

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

  const [clearVersion, setClearVersion] = useState(0);
  const clearedRef = useRef(false);
  const [cleared, setCleared] = useState(false);
  const [sheetRows, setSheetRows] = useState<SpreadsheetRow[]>([]);
  const [sheetPeriods, setSheetPeriods] = useState<string[]>([]);
  const [peerResults, setPeerResults] = useState<PeerRow[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSampleLoaded, setIsSampleLoaded] = useState(false);

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

  function handleClear() { clearedRef.current = true; setCleared(true); setClearVersion(v => v + 1); clearStore(); setSheetRows([]); setSheetPeriods([]); setPeerResults([]); setShowResults(false); setIsSampleLoaded(false); }

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
      </div>

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

          <div className="flex flex-col gap-3 mt-4">
            {bestRevenue && <InsightCard type="positive" title="Highest Revenue" text={`${bestRevenue.name} leads with ${fmtNum(bestRevenue.vals[0])} in revenue.`} />}
            {bestProfit && <InsightCard type="positive" title="Highest Profit" text={`${bestProfit.name} leads with ${fmtNum(bestProfit.vals[1])} in profit.`} />}
            {lowestDebt && <InsightCard type="info" title="Lowest Debt" text={`${lowestDebt.name} carries the least debt at ${fmtNum(lowestDebt.vals[3])}.`} />}
            {strongestOverall && <InsightCard type="positive" title="Strongest Overall" text={`${strongestOverall.name} ranks highest on a combined score.`} formula="Score = Revenue + Profit − Debt" />}
          </div>

          <div className="mt-4">
            <NextLinks links={[{ label: 'Cash efficiency', href: '/tools/wc' }, { label: 'Estimate value', href: '/tools/dcf' }]} />
            <CalcTimestamp />
            <div className="flex gap-2 flex-wrap mt-2"><TrustBadge label={`Values from: ${isSampleLoaded ? 'Sample data' : dsCount > 0 ? 'Imported data' : 'User entry'}`} variant="source" /><TrustBadge label="₹ Indian Market" /></div>
            <Disclaimer />
          </div>
        </>
      )}

      {!showResults && (
        <EmptyState title="No peer comparison data yet" desc="Type company names as column headers and enter financial data in the spreadsheet above, then click Compare. Or load sample companies to see how the tool works." action={{ label: 'Import data', href: '/import' }} />
      )}
    </div>
  );
}
