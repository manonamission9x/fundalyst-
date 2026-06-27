'use client';

import { fmtNum } from '@/lib/calculations';
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
} from '@/components/ui';
import { useGlobalImportFill, extractYoYInputs, getDataSourceLabel } from '@/lib/importer/import-hooks';

export default function YoyPage() {
  const showToast = useToast();
  const { years, csv, rows, setYears, setCsv, setRows, clear } = useYoyStore();

  const dataInfo = useGlobalImportFill(
    (vals) => {
      setYears(vals.years);
      setCsv(vals.csv);
    },
    extractYoYInputs
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
    setRows(
      lines.map((l) => {
        const cols = l.split(',').map((s) => s.trim());
        const vals = cols.slice(1).map(Number);
        const growth = vals.map((v, i) =>
          i > 0 && vals[i - 1] ? ((v - vals[i - 1]) / Math.abs(vals[i - 1])) * 100 : null
        );
        return { label: cols[0], vals, growth };
      })
    );
  }

  function parse() {
    parseWithText(csv);
    const lines = csv.split('\n').filter(Boolean);
    if (lines.length > 0) {
      showToast('Loaded ' + lines.length + ' metrics');
      setTimeout(() => {
        document.getElementById('growth-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }

  function handleClear() { clear(); }

  const yearList = years.split(',').map((s) => s.trim()).filter(Boolean);
  const colLabels = rows.length > 0
    ? rows[0].growth.slice(1).map((_, i) => {
        if (yearList.length >= i + 2) {
          return `${yearList[i]}→${yearList[i + 1]}`;
        }
        return `Yr${i + 1}→Yr${i + 2}`;
      })
    : [];

  const fastestGrowing =
    rows.length > 0
      ? rows
          .map((r) => {
            const avgGrowth =
              r.growth
                .slice(1)
                .filter((g): g is number => g !== null)
                .reduce((a, b) => a + b, 0) /
              r.growth.slice(1).filter((g): g is number => g !== null).length;
            return { label: r.label, avg: isNaN(avgGrowth) ? -Infinity : avgGrowth };
          })
          .sort((a, b) => b.avg - a.avg)[0]
      : null;

  const declining =
    rows.length > 0
      ? rows
          .map((r) => {
            const avgGrowth =
              r.growth
                .slice(1)
                .filter((g): g is number => g !== null)
                .reduce((a, b) => a + b, 0) /
              r.growth.slice(1).filter((g): g is number => g !== null).length;
            return { label: r.label, avg: isNaN(avgGrowth) ? Infinity : avgGrowth };
          })
          .filter((m) => m.avg < 0)
          .sort((a, b) => a.avg - b.avg)[0]
      : null;

  return (
    <div>
      <PageHeader
        title="Growth Rates"
        subtitle="See whether revenue, profit, and other metrics are accelerating or slowing — year over year."
        answer="What this helps you answer: Is the company growing? Are margins improving?"
      />

      <DataQualityBar source={getDataSourceLabel(dataInfo.dataSource, dataInfo.companyName)} />
      <UploadBar onUpload={handleCsvFile} hint="CSV: Metric, Year1, Year2, Year3, ..." />

      <Card label="Data" className="mt-4">
        <div className="card-body">
          <div className="field-group mb-2">
            <span className="field-label">Years:</span>
            <input
              type="text"
              className="num-input"
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
          </div>
          <textarea
            id="growth-csv"
            rows={6}
            className="num-input"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            aria-label="Growth data CSV input"
          />
          <Toolbar onClear={handleClear} onAction={parse} actionLabel="Calculate growth" />
        </div>
      </Card>

      {rows.length > 0 && (
        <div id="growth-results">
          <Card label="Growth rates (YoY %)" className="mt-4">
            <table className="diff-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  {colLabels.map((cl, i) => <th key={i}>{cl}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td><strong>{r.label}</strong></td>
                    {r.growth.slice(1).map((g, j) => (
                      <td
                        key={j}
                        style={{
                          color:
                            g !== null && g > 0
                              ? 'var(--green)'
                              : g !== null && g < 0
                                ? 'var(--red)'
                                : 'var(--text)',
                        }}
                      >
                        {g !== null ? (g > 0 ? '+' : '') + g.toFixed(1) + '%' : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-center py-3">
              <button
                className="btn-secondary btn-sm"
                onClick={() => {
                  const hdrs = ['Metric', ...colLabels];
                  const data = rows.map((r) => [
                    r.label,
                    ...r.growth.slice(1).map((g) =>
                      g !== null ? (g > 0 ? '+' : '') + g.toFixed(1) + '%' : ''
                    ),
                  ]);
                  downloadCSV('yoy_growth.csv', [hdrs, ...data]);
                }}
              >
                Download CSV
              </button>
            </div>
          </Card>

          <div className="flex flex-col gap-3 mt-4">
            {fastestGrowing && fastestGrowing.avg > -Infinity && (
              <InsightCard
                type="positive"
                title="Fastest growing metric"
                text={`${fastestGrowing.label} averaged ${fastestGrowing.avg.toFixed(1)}% growth across the periods.`}
              />
            )}
            {declining && (
              <InsightCard
                type="risk"
                title="Declining metric"
                text={`${declining.label} averaged ${declining.avg.toFixed(1)}% — worth investigating further.`}
              />
            )}
          </div>

          <div className="mt-4">
            <NextLinks
              links={[
                { label: 'Trend charts', href: '/research/trends' },
                { label: 'Review filings', href: '/research/filing' },
              ]}
            />
            <CalcTimestamp />
            <div className="flex gap-2 flex-wrap mt-2">
              <TrustBadge label="Growth Rate Analysis" variant="source" />
              <TrustBadge label="₹ Indian Market" />
            </div>
            <Disclaimer />
          </div>
        </div>
      )}

      {!rows.length && (
        <EmptyState
          title="No growth data yet"
          desc="Enter year labels and metrics above (CSV format: Metric, Year1, Year2...), then click Calculate growth. The tool computes year-over-year percentage changes and identifies accelerating or declining metrics. Data can also be pre-filled from the Smart Import tool."
          action={{ label: 'Import data', href: '/import' }}
        />
      )}
    </div>
  );
}
