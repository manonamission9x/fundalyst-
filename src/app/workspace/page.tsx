'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePageTitle } from '@/lib/use-page-title';
import { useGlobalDataStore } from '@/store/global-data-store';
import { useImporterStore } from '@/store/importer-store';
import { SectionTitle, Disclaimer, Card, TrustBadge } from '@/components/ui';
import type { FundalystDataset, CanonicalFact } from '@/lib/importer/types';

// ── Workspace step definitions ──
const steps = [
  { id: 'overview', label: 'Overview',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="6" /><path d="M7 4v3l2 2" /></svg> },
  { id: 'import', label: 'Import',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2v8M3 6l4-4 4 4" /><path d="M2 11v1h10v-1" /></svg> },
  { id: 'data', label: 'Financial Data',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="10" height="8" rx="1" /><path d="M5 7h4M5 9h2" /></svg> },
  { id: 'filing', label: 'Filing',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h5l3 3v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" /><path d="M8 2v3h3" /><path d="M5 7l2 2 3-3" /></svg> },
  { id: 'dcf', label: 'DCF',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12l4-5 3 2 5-6" /><circle cx="11.5" cy="3.5" r="1.5" fill="currentColor" stroke="none" /></svg> },
  { id: 'ratios', label: 'Ratios',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12V5l3 2 3-5 3 7 2-3" /><circle cx="13" cy="3" r="1" fill="currentColor" stroke="none" /></svg> },
  { id: 'thesis', label: 'Thesis',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v10M10 2v10M2 4h10M2 10h10" /><path d="M7 2v10" /><path d="M2 7h10" /></svg> },
] as const;

type StepId = (typeof steps)[number]['id'];

export default function WorkspacePage() {
  usePageTitle('Workspace');
  const [activeStep, setActiveStep] = useState<StepId>('overview');
  const datasets = useGlobalDataStore((s) => s.datasets);
  const lastDataset = useImporterStore((s) => s.lastDataset);
  const companyName = lastDataset?.companyName || datasets[0]?.companyName || 'No company selected';
  const hasData = datasets.length > 0 || lastDataset !== null;

  return (
    <div className="workspace">
      {/* ── Workspace header ── */}
      <div className="workspace-header">
        <div className="workspace-header-left">
          <span className="workspace-brand">Research Workspace</span>
          <span className="workspace-sep">/</span>
          <span className="workspace-company">{companyName}</span>
        </div>
        <div className="workspace-header-right">
          {hasData ? (
            <span className="workspace-status">
              <span className="workspace-dot" />
              Data loaded
            </span>
          ) : (
            <span className="workspace-status muted">
              <span className="workspace-dot muted" />
              No data
            </span>
          )}
          <Link href="/import" className="workspace-cta">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 2v8M3 6l4-4 4 4" /><path d="M2 10v2h10v-2" />
            </svg>
            Import
          </Link>
        </div>
      </div>

      <div className="workspace-body">
        {/* ── Sidebar ── */}
        <nav className="workspace-sidebar" aria-label="Research steps">
          <div className="workspace-sidebar-label">Steps</div>
          {steps.map((step) => (
            <button
              key={step.id}
              className={`workspace-step ${activeStep === step.id ? 'active' : ''}`}
              onClick={() => setActiveStep(step.id)}
              aria-current={activeStep === step.id ? 'step' : undefined}
            >
              <span className="workspace-step-icon">{step.icon}</span>
              <span className="workspace-step-label">{step.label}</span>
            </button>
          ))}
        </nav>

        {/* ── Main content ── */}
        <main className="workspace-content" role="main">
          {activeStep === 'overview' && <OverviewPanel hasData={hasData} companyName={companyName} datasets={datasets} />}
          {activeStep === 'import' && <ImportPanel />}
          {activeStep === 'data' && <DataPanel datasets={datasets} />}
          {activeStep === 'filing' && <FilingPanel />}
          {activeStep === 'dcf' && <DCFPanel />}
          {activeStep === 'ratios' && <RatiosPanel />}
          {activeStep === 'thesis' && <ThesisPanel />}
        </main>
      </div>
    </div>
  );
}

// ── Overview Panel ──
function OverviewPanel({ hasData, companyName, datasets }: { hasData: boolean; companyName: string; datasets: FundalystDataset[] }) {
  const totalFacts = datasets.reduce((sum, d) => sum + d.facts.length, 0);
  const stepItems = [
    { num: '01', label: 'Import', desc: 'Upload CSV, Excel, or PDF with financial statements.', action: '/import', cta: 'Import data' },
    { num: '02', label: 'Review', desc: 'Check extracted metrics and periods. Correct any issues.', action: '', cta: '' },
    { num: '03', label: 'Analyze', desc: 'Use Filing, DCF, Ratios, and other tools to evaluate.', action: '/research/filing', cta: 'Start analysis' },
    { num: '04', label: 'Conclude', desc: 'Write your investment thesis based on the evidence.', action: '', cta: '' },
  ];

  return (
    <div>
      <SectionTitle>Company Overview</SectionTitle>
      <div className="flex flex-col gap-4 mt-4">
        {/* Status card */}
        <div className="workspace-card">
          <div className="workspace-card-header">Research Status</div>
          <div className="grid grid-cols-3 gap-4 p-4">
            <div>
              <div className="ws-metric-label">Company</div>
              <div className="ws-metric-value">{companyName}</div>
            </div>
            <div>
              <div className="ws-metric-label">Data Sources</div>
              <div className="ws-metric-value">{datasets.length}</div>
            </div>
            <div>
              <div className="ws-metric-label">Metrics</div>
              <div className="ws-metric-value">{totalFacts}</div>
            </div>
          </div>
        </div>

        {/* Workflow steps */}
        <div className="workflow-steps">
          {stepItems.map((s, i) => (
            <div key={i} className="workflow-step">
              <div className="workflow-step-num">{s.num}</div>
              <div className="workflow-step-title">{s.label}</div>
              <div className="workflow-step-desc">{s.desc}</div>
              {s.cta && (
                <Link
                  href={s.action}
                  className="inline-flex items-center gap-1 mt-2 text-2xs text-primary font-mono"
                  style={{ textDecoration: 'none' }}
                >
                  {s.cta} →
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/tools/dcf" className="workspace-quick-link">DCF Valuation →</Link>
          <Link href="/research/filing" className="workspace-quick-link">Filing Comparison →</Link>
          <Link href="/tools/ratios" className="workspace-quick-link">Financial Ratios →</Link>
          <Link href="/tools/peer" className="workspace-quick-link">Peer Comparison →</Link>
        </div>

        <div className="flex gap-2 flex-wrap mt-2">
          <TrustBadge label="Fundalyst Research" variant="source" />
          {hasData && <TrustBadge label="Data Loaded" variant="good" />}
        </div>
      </div>
    </div>
  );
}

// ── Import Panel ──
function ImportPanel() {
  const { startImport, error, isImporting } = useImporterStore();
  const lastDataset = useImporterStore((s) => s.lastDataset);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await startImport(file);
    e.target.value = '';
  }

  return (
    <div>
      <SectionTitle>Import Data</SectionTitle>
      <div className="flex flex-col gap-4 mt-4">
        <div className="workspace-card">
          <div className="workspace-card-header">Upload Financial File</div>
          <div className="p-4 text-center">
            <label className="workspace-upload-area">
              <div className="workspace-upload-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2v14M6 10l6-6 6 6" /><path d="M2 18v4h20v-4" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-center mb-1" style={{ color: 'var(--text)' }}>
                Choose a file or drag it here
              </div>
              <div className="text-xs text-muted">CSV · XLSX · PDF · Screenshot</div>
              <span className="upload-label mt-3">
                Select file
                <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={handleFile} />
              </span>
            </label>
          </div>
        </div>

        {isImporting && (
          <div className="workspace-card">
            <div className="workspace-card-header">Importing...</div>
            <div className="p-4 text-sm text-tertiary">Processing file...</div>
          </div>
        )}

        {error && (
          <div className="workspace-card" style={{ borderColor: 'var(--red)' }}>
            <div className="workspace-card-header" style={{ color: 'var(--red)' }}>Import Error</div>
            <div className="p-4 text-sm" style={{ color: 'var(--red)' }}>{error}</div>
          </div>
        )}

        {lastDataset && (
          <div className="workspace-card" style={{ borderColor: 'rgba(61,160,109,0.3)' }}>
            <div className="workspace-card-header" style={{ color: 'var(--green)' }}>Imported Successfully</div>
            <div className="p-4">
              <div className="ws-metric-label">Company</div>
              <div className="ws-metric-value" style={{ marginBottom: 8 }}>{lastDataset.companyName || 'Unknown'}</div>
              <div className="ws-metric-label">Metrics</div>
              <div className="ws-metric-value">{lastDataset.facts.length} values</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Data Panel ──
function DataPanel({ datasets }: { datasets: FundalystDataset[] }) {
  if (datasets.length === 0) {
    return (
      <div>
        <SectionTitle>Financial Data</SectionTitle>
        <Card className="mt-4">
          <div className="empty-state">
            <div className="empty-state-title">No financial data imported yet</div>
            <div className="empty-state-desc">
              Use the Import step to upload a CSV, Excel, or PDF file. Once data is extracted, it appears here with all metrics and periods for review before running analysis tools.
            </div>
            <Link href="/import" className="empty-state-action">Import data →</Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>Financial Data</SectionTitle>
      <div className="flex flex-col gap-4 mt-4">
        {datasets.map((ds, i) => (
          <div key={ds.id || i} className="workspace-card">
            <div className="workspace-card-header">{ds.companyName || `Dataset ${i + 1}`}</div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div><div className="ws-metric-label">Periods</div><div className="ws-metric-value">{ds.periods?.length || 0}</div></div>
                <div><div className="ws-metric-label">Facts</div><div className="ws-metric-value">{ds.facts.length}</div></div>
                <div><div className="ws-metric-label">Source</div><div className="ws-metric-value text-xs">{ds.sourceType || 'Upload'}</div></div>
                <div><div className="ws-metric-label">Confidence</div><div className="ws-metric-value text-xs">{ds.confidence ? Math.round(ds.confidence * 100) + '%' : '—'}</div></div>
              </div>
              {ds.facts.length > 0 && (
                <div className="max-h-48 overflow-y-auto">
                  <table className="diff-table">
                    <thead><tr><th>Metric</th><th>Value</th><th>Period</th></tr></thead>
                    <tbody>
                      {ds.facts.slice(0, 30).map((f: CanonicalFact, j: number) => (
                        <tr key={j}>
                          <td>{f.metric || f.canonicalMetric || '—'}</td>
                          <td>{f.value !== undefined ? f.value : '—'}</td>
                          <td>{f.periodLabel || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Filing Panel ──
function FilingPanel() {
  return (
    <div>
      <SectionTitle>Filing Comparison</SectionTitle>
      <div className="workspace-card mt-4">
        <div className="workspace-card-header">Period-over-Period Analysis</div>
        <div className="p-4 flex flex-col gap-3">
          <p className="text-sm text-tertiary leading-normal" style={{ margin: 0 }}>
            Compare two reporting periods side by side. The tool highlights revenue growth, margin compression, debt changes, and risk flags automatically.
          </p>
          <Link href="/research/filing" className="workspace-quick-link">
            Open Filing Comparison →
          </Link>
          <div className="flex gap-2 flex-wrap">
            <TrustBadge label="Filing Comparison" variant="source" />
            <TrustBadge label="YoY Change" variant="good" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DCF Panel ──
function DCFPanel() {
  return (
    <div>
      <SectionTitle>DCF Valuation</SectionTitle>
      <div className="workspace-card mt-4">
        <div className="workspace-card-header">Intrinsic Value Estimation</div>
        <div className="p-4 flex flex-col gap-3">
          <p className="text-sm text-tertiary leading-normal" style={{ margin: 0 }}>
            Estimate intrinsic value per share using projected free cash flows. Includes sensitivity analysis across terminal growth and discount rates.
          </p>
          <Link href="/tools/dcf" className="workspace-quick-link">
            Open DCF Valuation →
          </Link>
          <div className="flex gap-2 flex-wrap">
            <TrustBadge label="DCF - Gordon Growth" variant="source" />
            <TrustBadge label="₹ Indian Market" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Ratios Panel ──
function RatiosPanel() {
  return (
    <div>
      <SectionTitle>Ratios & Metrics</SectionTitle>
      <div className="workspace-card mt-4">
        <div className="workspace-card-header">Financial Health Check</div>
        <div className="p-4 flex flex-col gap-3">
          <p className="text-sm text-tertiary leading-normal" style={{ margin: 0 }}>
            Calculate 5 key ratios from just 6 numbers: Net Profit Margin, ROE, Debt/Equity, Debt/Assets, and Asset Turnover.
          </p>
          <Link href="/tools/ratios" className="workspace-quick-link">
            Open Financial Ratios →
          </Link>
          <div className="flex gap-2 flex-wrap">
            <TrustBadge label="Ratio Analysis" variant="source" />
            <TrustBadge label="₹ Indian Market" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Thesis Panel ──
function ThesisPanel() {
  const [notes, setNotes] = useState('');
  const [verdict, setVerdict] = useState<'positive' | 'negative' | 'neutral' | ''>('');
  const saved = typeof window !== 'undefined' ? localStorage.getItem('fundalyst-thesis') : null;

  function handleSave() {
    localStorage.setItem('fundalyst-thesis', JSON.stringify({ notes, verdict, updatedAt: new Date().toISOString() }));
  }

  function handleLoad() {
    try {
      const data = JSON.parse(saved || '{}');
      setNotes(data.notes || '');
      setVerdict(data.verdict || '');
    } catch {}
  }

  return (
    <div>
      <SectionTitle>Investment Thesis</SectionTitle>
      <div className="flex flex-col gap-4 mt-4">
        <div className="workspace-card">
          <div className="workspace-card-header">Your Assessment</div>
          <div className="p-4 flex flex-col gap-4">
            {/* Verdict selector */}
            <div>
              <div className="ws-metric-label mb-2">Overall Verdict</div>
              <div className="flex gap-2">
                {(['positive', 'neutral', 'negative'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={verdict === v ? 'btn-primary' : 'btn-ghost'}
                    onClick={() => setVerdict(v)}
                  >
                    {v === 'positive' ? '✓ Bullish' : v === 'neutral' ? '→ Neutral' : '✗ Bearish'}
                  </button>
                ))}
              </div>
            </div>

            {/* Thesis notes */}
            <div>
              <div className="ws-metric-label mb-2">Research Notes</div>
              <textarea
                className="num-input"
                rows={8}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write your investment thesis here...&#10;&#10;Consider:&#10;- Business quality and competitive advantages&#10;- Financial health and trends&#10;- Growth prospects&#10;- Valuation (is it fairly priced?)&#10;- Key risks and mitigants&#10;- Your decision and rationale"
                aria-label="Investment thesis notes"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button type="button" className="btn-primary btn-sm" onClick={handleSave}>
                Save Thesis
              </button>
              {saved && (
                <button type="button" className="btn-secondary btn-sm" onClick={handleLoad}>
                  Load saved
                </button>
              )}
            </div>

            {saved && (
              <div className="text-xs text-muted font-mono">
                Previous thesis found — click &quot;Load saved&quot; to restore
              </div>
            )}
          </div>
        </div>

        {/* Quick checklist */}
        <div className="workspace-card">
          <div className="workspace-card-header">Investment Checklist</div>
          <div className="p-4 text-sm text-tertiary">
            {[
              'Business has a durable competitive advantage',
              'Revenue is growing consistently',
              'Profit margins are stable or improving',
              'Debt levels are manageable',
              'Stock is undervalued or fairly priced',
              'Key risks are identified and acceptable',
            ].map((item, i) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer py-1">
                <input type="checkbox" /> {item}
              </label>
            ))}
          </div>
        </div>
      </div>
      <Disclaimer extra="This is a research tool. Always verify calculations independently." />
    </div>
  );
}
