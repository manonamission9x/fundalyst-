'use client';

import { useState, useEffect, useRef } from 'react';
import { parseLines, computeDiff, generateRiskFlags, fmtINR } from '@/lib/calculations';
import { readFile, downloadCSV } from '@/lib/helpers';
import { useFilingStore, useAnalysisStore } from '@/store';
import { useToast } from '@/components/shared/ToastProvider';
import {
  PageHeader, Card, UploadBar, Toolbar, NextLinks, Disclaimer,
  EmptyState, InsightCard, WarningCard, SectionTitle, ResultPanel,
  DataQualityBar, CalcTimestamp,
} from '@/components/ui';
import { useGlobalImportFill, getDataSourceLabel, extractFilingInputs } from '@/lib/importer/import-hooks';

export default function FilingPage() {
  const showToast = useToast();
  const {
    labelA, labelB, periodA, periodB, diffs, flags, showResults, errMsg,
    setLabelA, setLabelB, setPeriodA, setPeriodB,
    setDiffs, setFlags, setShowResults, setErrMsg, clear,
  } = useFilingStore();
  const { setFiling } = useAnalysisStore();
  const [loading, setLoading] = useState(false);

  // Pre-fill from imported data
  const dataInfo = useGlobalImportFill(
    (vals) => {
      setLabelA(vals.labelA);
      setLabelB(vals.labelB);
      setPeriodA(vals.periodA);
      setPeriodB(vals.periodB);
    },
    extractFilingInputs
  );

  // Auto-demo: run comparison on first visit with sample data
  const autoDemoRef = useRef(false);
  useEffect(() => {
    if (autoDemoRef.current) return;
    autoDemoRef.current = true;
    if (!showResults && periodA && periodB) {
      const timer = setTimeout(() => handleCompare(), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFile(file);
      const rows = text.split('\n').filter(Boolean);
      if (rows.length < 3) { showToast('Need at least 2 data rows'); return; }
      const headers = rows[0].split(',').map((s) => s.trim());
      const labels: string[] = [];
      const valsA: string[] = [];
      const valsB: string[] = [];
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(',').map((s) => s.trim());
        if (cols.length >= 3) { labels.push(cols[0]); valsA.push(cols[1]); valsB.push(cols[2]); }
      }
      setLabelA(headers[1] || 'Earlier');
      setLabelB(headers[2] || 'Latest');
      setPeriodA(labels.map((l, i) => l + ': ' + valsA[i]).join('\n'));
      setPeriodB(labels.map((l, i) => l + ': ' + valsB[i]).join('\n'));
      showToast('Loaded ' + labels.length + ' line items');
    } catch (err: unknown) {
      showToast('Error reading file: ' + (err instanceof Error ? err.message : 'unknown'));
    }
    e.target.value = '';
  }

  function handleCompare() {
    setLoading(true);
    setErrMsg('');
    const pA = parseLines(periodA);
    const pB = parseLines(periodB);
    if (pA.length === 0 || pB.length === 0) {
      setErrMsg('Add at least one line item to each period.');
      setLoading(false);
      return;
    }
    const result = computeDiff(pA, pB);
    setDiffs(result);
    setShowResults(true);

    const flagList = generateRiskFlags(result);
    setFlags(flagList);
    setFiling({
      labels: periodA.split('\n').filter(Boolean).length.toString() + ' items',
      diffs: result,
      flags: flagList,
    });
    setTimeout(() => {
      setLoading(false);
      // Scroll to results
      document.getElementById('filing-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
    showToast('Comparison complete');
  }

  function handleClear() {
    clear();
  }

  function handleExportCSV() {
    downloadCSV('filing-comparison.csv', [
      ['Line item', labelA || 'Earlier', labelB || 'Latest', 'Change %'],
      ...diffs.map((d) => [d.label, d.a ?? '', d.b ?? '', d.pct !== null ? d.pct.toFixed(1) + '%' : '']),
    ]);
    showToast('CSV downloaded');
  }

  // Derive insight cards from diffs — show top 3 most significant changes
  const topChanges = diffs
    .filter((d) => d.dir !== 'flat' && d.pct !== null)
    .slice(0, 3)
    .map((d) => ({
      type: d.dir === 'up' ? 'positive' as const : 'warning' as const,
      title: d.label + ' ' + (d.dir === 'up' ? 'increased' : 'decreased'),
      text: `Changed by ${Math.abs(d.pct!).toFixed(1)}% (${fmtINR(d.abs ?? 0)})`,
      formula: d.isPct ? 'Percentage-point metric' : undefined,
    }));

  // Map store flags (danger|warn) to WarningCard (danger|caution)
  const riskFlags = flags.map((f) => ({
    level: (f.level === 'danger' ? 'danger' : 'caution') as 'danger' | 'caution',
    label: f.label,
    text: f.text,
  }));

  return (
    <div>
      <PageHeader
        title="Filing Comparison"
        subtitle="Compare two reporting periods line by line and spot what changed."
        answer="What this helps you answer: Is revenue growing? Are margins compressing? Is debt rising?"
      />

      <DataQualityBar source={getDataSourceLabel(dataInfo.dataSource, dataInfo.companyName)} />

      <UploadBar onUpload={handleCsvFile} hint="CSV: Label, Period1, Period2 or paste Label: value below" />

      <Card label="Input periods">
        <div className="inputs-row">
          {[
            { heading: 'Earlier period', label: labelA, setLabel: setLabelA, period: periodA, setPeriod: setPeriodA, phLabel: 'e.g. Q4 FY25', phPeriod: 'Revenue: 1240' },
            { heading: 'Latest period', label: labelB, setLabel: setLabelB, period: periodB, setPeriod: setPeriodB, phLabel: 'e.g. Q4 FY26', phPeriod: 'Revenue: 1530' },
          ].map((col, ci) => (
            <div className="input-col" key={ci}>
              <div className="input-col-label">{col.heading}</div>
              <div className="field-hint filing-hint">Label: value per line</div>
              <input
                id={`period-${ci}`}
                type="text"
                className="period-label-input"
                placeholder={col.phLabel}
                value={col.label}
                onChange={(e) => col.setLabel(e.target.value)}
              />
              <textarea
                id={`period-text-${ci}`}
                rows={8}
                className="filing-textarea num-input"
                placeholder={col.phPeriod}
                value={col.period}
                onChange={(e) => col.setPeriod(e.target.value)}
                aria-label={`${col.heading} data`}
              />
              <div className="label-examples">
                <span className="label-examples-title">Tap to add:</span>
                <span className="label-examples-item">Revenue</span>
                <span className="label-examples-item">Net Profit</span>
                <span className="label-examples-item">EBITDA Margin</span>
                <span className="label-examples-item">Total Debt</span>
                <span className="label-examples-item">Promoter Holding</span>
                <span className="label-examples-more">+ many more</span>
              </div>
            </div>
          ))}
        </div>
        {errMsg && <div className="px-5 py-3"><span className="err-msg">{errMsg}</span></div>}
        <Toolbar onClear={handleClear} onAction={handleCompare} actionLabel={loading ? 'Comparing...' : 'Compare'} isLoading={loading} />
      </Card>

      {showResults && diffs.length > 0 && (
        <ResultPanel label="Results — what changed" id="filing-results">
          {/* Insight cards for top changes */}
          {topChanges.length > 0 && (
            <div className="flex flex-col gap-3 mb-4">
              {topChanges.map((ic, i) => (
                <InsightCard key={i} type={ic.type} title={ic.title} text={ic.text} formula={ic.formula} />
              ))}
            </div>
          )}

          {/* Diff table */}
          <Card label="Line item comparison">
            <table className="diff-table">
              <thead>
                <tr>
                  <th>Line item</th>
                  <th>{labelA || 'Earlier'}</th>
                  <th>{labelB || 'Latest'}</th>
                  <th>Change</th>
                  <th>Magnitude</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Calculate max absolute change for bar scaling
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

          {/* Risk flags */}
          {riskFlags.length > 0 && (
            <Card label="Risk flags" className="mt-4">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {riskFlags.map((f, i) => (
                  <WarningCard key={i} level={f.level} label={f.label} text={f.text} />
                ))}
              </div>
            </Card>
          )}

          {/* Export and next steps */}
          <div className="flex gap-3 mt-4">
            <button type="button" className="btn-primary btn-sm" onClick={handleExportCSV}>
              Download CSV
            </button>
          </div>

          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--primary-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(91,110,245,0.15)' }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Next Steps</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <a href="/research/trends" style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--primary)', textDecoration: 'none' }}>→ Plot trends over time</a>
            <a href="/tools/dcf" style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--primary)', textDecoration: 'none' }}>→ Estimate intrinsic value</a>
          </div>
        </div>
          <CalcTimestamp />
          <Disclaimer extra="Pct change = ((B−A)/|A|)×100" />
        </ResultPanel>
      )}

      {!showResults && (
        <EmptyState
          title="See what changed between two reporting periods."
          desc="Paste line items as Label: value in both columns above, then click Compare. Sample data is pre-loaded — click Clear to start fresh."
        />
      )}
    </div>
  );
}
