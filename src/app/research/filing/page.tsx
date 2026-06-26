'use client';

import { useState } from 'react';
import { parseLines, computeDiff, generateRiskFlags, fmtINR } from '@/lib/calculations';
import { readFile, downloadCSV } from '@/lib/helpers';
import { useFilingStore, useAnalysisStore } from '@/store';
import { useToast } from '@/components/shared/ToastProvider';
import {
  PageHeader, Card, UploadBar, Toolbar, NextLinks, Disclaimer,
  EmptyState, InsightCard, WarningCard, SectionTitle, ResultPanel,
  DataQualityBar,
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
    setTimeout(() => setLoading(false), 300);
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
              <label className="input-col-label" htmlFor={`period-${ci}`}>{col.heading}</label>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>Label: value per line</div>
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
                className="num-input"
                style={{ width: '100%', lineHeight: 1.7, fontSize: 12, fontFamily: 'var(--font-mono)' }}
                placeholder={col.phPeriod}
                value={col.period}
                onChange={(e) => col.setPeriod(e.target.value)}
                aria-label={`${col.heading} data`}
              />
            </div>
          ))}
        </div>
        {errMsg && <div style={{ padding: '0 14px 10px' }}><span className="err-msg">{errMsg}</span></div>}
        <Toolbar onClear={handleClear} onAction={handleCompare} actionLabel={loading ? 'Comparing...' : 'Compare'} isLoading={loading} />
      </Card>

      {showResults && diffs.length > 0 && (
        <ResultPanel label="Results — what changed">
          {/* Insight cards for top changes */}
          {topChanges.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
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
                </tr>
              </thead>
              <tbody>
                {diffs.map((d, i) => (
                  <tr key={i}>
                    <td>{d.label}</td>
                    <td>{d.a !== null ? (d.isPct ? d.a + '%' : fmtINR(d.a)) : '—'}</td>
                    <td>{d.b !== null ? (d.isPct ? d.b + '%' : fmtINR(d.b)) : '—'}</td>
                    <td style={{ color: d.dir === 'up' ? 'var(--green)' : d.dir === 'down' ? 'var(--red)' : 'var(--text-tertiary)' }}>
                      {d.dir === 'up' ? '↑' : d.dir === 'down' ? '↓' : '→'} {d.pct !== null ? Math.abs(d.pct).toFixed(1) + '%' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Risk flags */}
          {riskFlags.length > 0 && (
            <Card label="Risk flags" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {riskFlags.map((f, i) => (
                  <WarningCard key={i} level={f.level} label={f.label} text={f.text} />
                ))}
              </div>
            </Card>
          )}

          {/* Export and next steps */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button type="button" className="btn-primary" onClick={handleExportCSV} style={{ fontSize: 11, padding: '6px 14px' }}>
              Download CSV
            </button>
          </div>

          <NextLinks links={[{ label: 'Plot trends', href: '/research/trends' }, { label: 'Estimate value', href: '/tools/dcf' }]} />
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
