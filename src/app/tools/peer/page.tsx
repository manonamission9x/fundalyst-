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
    if (lines.length > 0) showToast('Loaded ' + lines.length + ' companies');
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
            <Card label="Results" style={{ marginTop: '1.5rem' }}>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="diff-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      {labels.map((l, i) => <th key={i}>{l}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 20px' }}>
                <button
                  className="btn btn-secondary"
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
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
              <Disclaimer />
            </div>
          </>
        )}

        {/* ── Empty state ── */}
        {!rows.length && (
          <EmptyState
            title="Enter companies and metrics above, then click Compare."
            desc="Format: Company Name, Revenue, Profit, Assets, Debt — one per line."
          />
        )}
    </div>
  );
}
