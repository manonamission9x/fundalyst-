'use client';

import { fmtNum } from '@/lib/calculations';
import { usePeerStore } from '@/store';
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
} from '@/components/ui';
import { useGlobalDataStore } from '@/store/global-data-store';
import type { PeerRow } from '@/types/financial';

const labels = ['Revenue', 'Profit', 'Assets', 'Debt'];

function best(rows: PeerRow[], ci: number): { value: number; isUnique: boolean } | null {
  const n = rows.map((r) => r.vals[ci]).filter((v) => !isNaN(v));
  if (n.length === 0) return null;
  const max = Math.max(...n);
  const count = n.filter((v) => v === max).length;
  return { value: max, isUnique: count === 1 };
}

function worst(rows: PeerRow[], ci: number): { value: number; isUnique: boolean } | null {
  const n = rows.map((r) => r.vals[ci]).filter((v) => !isNaN(v));
  if (n.length === 0) return null;
  const min = Math.min(...n);
  const count = n.filter((v) => v === min).length;
  return { value: min, isUnique: count === 1 };
}

function findBestRow(rows: PeerRow[], ci: number, preferMax: boolean): PeerRow | null {
  const valid = rows.filter((r) => !isNaN(r.vals[ci]));
  if (valid.length === 0) return null;
  return preferMax
    ? valid.reduce((a, b) => (a.vals[ci] > b.vals[ci] ? a : b))
    : valid.reduce((a, b) => (a.vals[ci] < b.vals[ci] ? a : b));
}

export default function PeerPage() {
  const showToast = useToast();
  const { csv, rows, setCsv, setRows, clear } = usePeerStore();
  const datasets = useGlobalDataStore((s) => s.datasets);
  const dsCount = datasets.length;

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
    setRows(
      lines.map((l) => {
        const cols = l.split(',').map((s) => s.trim());
        return { name: cols[0], vals: cols.slice(1).map(Number) };
      })
    );
  }

  function parse() {
    parseWithText(csv);
    const lines = csv.split('\n').filter(Boolean);
    if (lines.length > 0) {
      showToast('Loaded ' + lines.length + ' companies');
      setTimeout(() => {
        document.getElementById('peer-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }

  function handleClear() {
    clear();
  }

  // ── Insight helpers ──
  const bestRevenue = findBestRow(rows, 0, true);
  const bestProfit = findBestRow(rows, 1, true);
  const lowestDebt = findBestRow(rows, 3, false);
  // "Strongest overall" — highest sum of (revenue + profit - debt) as a rough proxy
  const strongestOverall =
    rows.length > 0
      ? rows
          .filter((r) => !isNaN(r.vals[0]) && !isNaN(r.vals[1]) && !isNaN(r.vals[3]))
          .reduce((a, b) => {
            const scoreA = a.vals[0] + a.vals[1] - a.vals[3];
            const scoreB = b.vals[0] + b.vals[1] - b.vals[3];
            return scoreA > scoreB ? a : b;
          }, rows[0])
      : null;

  return (
    <div>
      <PageHeader
        title="Peer Comparison"
        subtitle="Compare companies side by side and instantly spot leaders and laggards — revenue, profit, assets, and debt."
        answer="What this helps you answer: Which company is the strongest? Who is lagging?"
      />

      <DataQualityBar
        source={dsCount > 0 ? `${dsCount} dataset(s) loaded` : 'Manual mode'}
        metrics={dsCount}
      />

      {/* ── Upload ── */}
        <UploadBar onUpload={handleCsvFile} hint="Company, Revenue, Profit, Assets, Debt" />

        {/* ── Quick sample data button ── */}
        <div style={{ marginTop: '-0.5rem', marginBottom: '1rem', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => {
              const sample = `Tata Motors, 420000, 28500, 345000, 105000
Reliance, 900000, 74500, 1620000, 280000
HDFC Bank, 185000, 45200, 3650000, 85000
Infosys, 156000, 28700, 172000, 24000`;
              setCsv(sample);
              parseWithText(sample);
              showToast('Loaded 4 sample companies');
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M2 6h8M6 2v8" />
            </svg>
            Load sample companies
          </button>
          <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            Or paste your own data below
          </span>
        </div>

        {/* ── Input Card ── */}
        <Card label="Company data (Company, Revenue, Profit, Assets, Debt)">
          <div className="card-body">
            <textarea
              id="peer-csv"
              rows={6}
              className="num-input"
              style={{ width: '100%', lineHeight: 1.7, fontSize: 12, fontFamily: 'var(--font-mono)' }}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              aria-label="Company data CSV input"
            />
            <Toolbar onClear={handleClear} onAction={parse} actionLabel="Compare" />
          </div>
        </Card>

        {/* ── Results ── */}
        {rows.length > 0 && (
          <>
            <Card label="Results" className="mt-6">
              <div className="card-body p-0">
                <table className="diff-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      {labels.map((l, i) => <th key={i}>{l}</th>)}
                      <th>Comparison</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Pre-calculate max per column for bar scaling
                      const maxPerCol = labels.map((_, j) => {
                        const vals = rows.map(r => r.vals[j]).filter(v => !isNaN(v));
                        return vals.length > 0 ? Math.max(...vals) : 1;
                      });
                      return rows.map((r, i) => (
                        <tr key={i}>
                          <td><strong>{r.name}</strong></td>
                          {r.vals.map((v, j) => {
                            const b = best(rows, j);
                            const w = worst(rows, j);
                            const isBest = b && v === b.value && b.isUnique;
                            const isWorst = w && v === w.value && w.isUnique;
                            return (
                              <td key={j} className={isBest ? 'good' : isWorst ? 'warn' : ''}>
                                {isNaN(v) ? '—' : fmtNum(v)}
                              </td>
                            );
                          })}
                          <td className="change-mag-cell">
                            <div className="peer-bars">
                              {r.vals.map((v, j) => {
                                if (isNaN(v) || maxPerCol[j] <= 0) return null;
                                const pct = (v / maxPerCol[j]) * 100;
                                const isBest = best(rows, j) && v === best(rows, j)!.value && best(rows, j)!.isUnique;
                                return (
                                  <div key={j} className="peer-bar-row">
                                    <span className="peer-bar-label">{labels[j][0]}</span>
                                    <div className="change-bar-wrap">
                                      <div
                                        className={`change-bar ${isBest ? 'change-bar-up' : 'change-bar-down'}`}
                                        style={{ width: `${Math.max(4, pct)}%` }}
                                      />
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
              </div>
              <div style={{ textAlign: 'center', padding: '12px 20px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    const headers = ['Company', ...labels];
                    const data = rows.map((r) => [r.name, ...r.vals.map((v) => (isNaN(v) ? '' : v))]);
                    downloadCSV('peer_comparison.csv', [headers, ...data]);
                  }}
                >
                  Download CSV
                </button>
              </div>
            </Card>

            {/* ── Insights ── */}
            <div className="result-section flex flex-col gap-3">
              {bestRevenue && (
                <InsightCard
                  type="positive"
                  title="Highest Revenue"
                  text={`${bestRevenue.name} leads with ${fmtNum(bestRevenue.vals[0])} in revenue.`}
                />
              )}
              {bestProfit && (
                <InsightCard
                  type="positive"
                  title="Highest Profit"
                  text={`${bestProfit.name} leads with ${fmtNum(bestProfit.vals[1])} in profit.`}
                />
              )}
              {lowestDebt && (
                <InsightCard
                  type="info"
                  title="Lowest Debt"
                  text={`${lowestDebt.name} carries the least debt at ${fmtNum(lowestDebt.vals[3])}.`}
                />
              )}
              {strongestOverall && (
                <InsightCard
                  type="positive"
                  title="Strongest Overall"
                  text={`${strongestOverall.name} ranks highest on a combined score of revenue + profit − debt.`}
                  formula="Score = Revenue + Profit − Debt"
                />
              )}
            </div>

            {/* ── Bottom metadata ── */}
            <div style={{ marginTop: '1.5rem' }}>
              <NextLinks
                links={[
                  { label: 'Cash efficiency', href: '/tools/wc' },
                  { label: 'Estimate value', href: '/tools/dcf' },
                ]}
              />
              <CalcTimestamp />
              <div className="flex gap-2 flex-wrap mt-2">
                <TrustBadge label="Peer Comparison" variant="source" />
                <TrustBadge label="₹ Indian Market" />
              </div>
              <Disclaimer />
            </div>
          </>
        )}

        {/* ── Empty state ── */}
        {!rows.length && (
          <EmptyState
            title="No peer comparison data yet"
            desc="Enter companies and their metrics above (Company, Revenue, Profit, Assets, Debt — one per line), then click Compare. Or load sample companies above to see how the tool works. Data can also be imported from a CSV file."
            action={{ label: 'Import data', href: '/import' }}
          />
        )}
    </div>
  );
}
