'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useGlobalDataStore } from '@/store/global-data-store';
import { useImporterStore } from '@/store/importer-store';
import { SectionTitle, Disclaimer } from '@/components/ui';

// ── Workspace step definitions ──
const steps = [
  { id: 'overview', label: 'Company Overview',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="6" /><path d="M7 4v3l2 2" /></svg> },
  { id: 'import', label: 'Import Data',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2v8M3 6l4-4 4 4" /><path d="M2 11v1h10v-1" /></svg> },
  { id: 'data', label: 'Financial Data',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="10" height="8" rx="1" /><path d="M5 7h4M5 9h2" /></svg> },
  { id: 'filing', label: 'Filing Comparison',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h5l3 3v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" /><path d="M8 2v3h3" /><path d="M5 7l2 2 3-3" /></svg> },
  { id: 'dcf', label: 'DCF Valuation',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12l4-5 3 2 5-6" /><circle cx="11.5" cy="3.5" r="1.5" fill="currentColor" stroke="none" /></svg> },
  { id: 'ratios', label: 'Ratios & Metrics',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12V5l3 2 3-5 3 7 2-3" /><circle cx="13" cy="3" r="1" fill="currentColor" stroke="none" /></svg> },
  { id: 'thesis', label: 'Investment Thesis',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v10M10 2v10M2 4h10M2 10h10" /><path d="M7 2v10" /><path d="M2 7h10" /></svg> },
] as const;

type StepId = (typeof steps)[number]['id'];

export default function WorkspacePage() {
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
          <div className="workspace-sidebar-label">Research Steps</div>
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
function OverviewPanel({ hasData, companyName, datasets }: { hasData: boolean; companyName: string; datasets: any[] }) {
  const totalFacts = datasets.reduce((sum, d) => sum + d.facts.length, 0);
  return (
    <div>
      <SectionTitle>Company Overview</SectionTitle>
      <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Status card */}
        <div className="workspace-card">
          <div className="workspace-card-header">Research Status</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
            <div>
              <div className="ws-metric-label">Company</div>
              <div className="ws-metric-value">{companyName}</div>
            </div>
            <div>
              <div className="ws-metric-label">Data Sources</div>
              <div className="ws-metric-value">{datasets.length}</div>
            </div>
            <div>
              <div className="ws-metric-label">Metrics Loaded</div>
              <div className="ws-metric-value">{totalFacts}</div>
            </div>
          </div>
        </div>

        {/* Getting started */}
        {!hasData && (
          <div className="workspace-card">
            <div className="workspace-card-header">Getting Started</div>
            <div style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 12px' }}>Welcome to the Research Workspace. Here&apos;s your workflow:</p>
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                <li style={{ marginBottom: 8 }}><strong>Import Data</strong> — Upload a CSV, Excel, or PDF file with financial data.</li>
                <li style={{ marginBottom: 8 }}><strong>Review Data</strong> — Check what was extracted and correct any issues.</li>
                <li style={{ marginBottom: 8 }}><strong>Run Analysis</strong> — Use Filing, DCF, Ratios, and other tools.</li>
                <li style={{ marginBottom: 8 }}><strong>Build Thesis</strong> — Write your investment thesis based on the analysis.</li>
              </ol>
            </div>
          </div>
        )}

        {/* Quick links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
          <Link href="/tools/dcf" className="workspace-quick-link">DCF Valuation →</Link>
          <Link href="/research/filing" className="workspace-quick-link">Filing Comparison →</Link>
          <Link href="/tools/ratios" className="workspace-quick-link">Financial Ratios →</Link>
          <Link href="/tools/peer" className="workspace-quick-link">Peer Comparison →</Link>
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
      <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div className="workspace-card">
          <div className="workspace-card-header">Upload Financial File</div>
          <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
            <label className="workspace-upload-area">
              <div className="workspace-upload-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2v14M6 10l6-6 6 6" /><path d="M2 18v4h20v-4" />
                </svg>
              </div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                Choose a file or drag it here
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                CSV · XLSX · PDF · Screenshot
              </div>
              <span className="upload-label" style={{ marginTop: 12 }}>
                Select file
                <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={handleFile} />
              </span>
            </label>
          </div>
        </div>

        {isImporting && (
          <div className="workspace-card">
            <div className="workspace-card-header">Importing...</div>
            <div style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
              Processing file...
            </div>
          </div>
        )}

        {error && (
          <div className="workspace-card" style={{ borderColor: 'var(--red)' }}>
            <div className="workspace-card-header" style={{ color: 'var(--red)' }}>Import Error</div>
            <div style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--red)' }}>{error}</div>
          </div>
        )}

        {lastDataset && (
          <div className="workspace-card" style={{ borderColor: 'rgba(39,174,96,0.3)' }}>
            <div className="workspace-card-header" style={{ color: 'var(--green)' }}>Imported Successfully</div>
            <div style={{ padding: 'var(--space-4)' }}>
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
function DataPanel({ datasets }: { datasets: any[] }) {
  if (datasets.length === 0) {
    return (
      <div>
        <SectionTitle>Financial Data</SectionTitle>
        <div className="workspace-card" style={{ marginTop: 'var(--space-4)', textAlign: 'center', padding: 'var(--space-8)' }}>
          <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-tertiary)', marginBottom: 8 }}>
            No data imported yet
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Use the Import step to upload financial data.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>Financial Data</SectionTitle>
      <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {datasets.map((ds, i) => (
          <div key={ds.id || i} className="workspace-card">
            <div className="workspace-card-header">{ds.companyName || `Dataset ${i + 1}`}</div>
            <div style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div>
                  <div className="ws-metric-label">Periods</div>
                  <div className="ws-metric-value">{ds.periods?.length || 0}</div>
                </div>
                <div>
                  <div className="ws-metric-label">Facts</div>
                  <div className="ws-metric-value">{ds.facts.length}</div>
                </div>
                <div>
                  <div className="ws-metric-label">Source</div>
                  <div className="ws-metric-value" style={{ fontSize: 'var(--text-xs)' }}>{ds.sourceType || 'Upload'}</div>
                </div>
                <div>
                  <div className="ws-metric-label">Confidence</div>
                  <div className="ws-metric-value" style={{ fontSize: 'var(--text-xs)' }}>
                    {ds.confidence ? Math.round(ds.confidence * 100) + '%' : '—'}
                  </div>
                </div>
              </div>
              {ds.facts.length > 0 && (
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  <table className="diff-table">
                    <thead>
                      <tr><th>Metric</th><th>Value</th><th>Period</th></tr>
                    </thead>
                    <tbody>
                      {ds.facts.slice(0, 30).map((f: any, j: number) => (
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
      <div className="workspace-card" style={{ marginTop: 'var(--space-4)' }}>
        <div className="workspace-card-header">Period Comparison</div>
        <div style={{ padding: 'var(--space-4)' }}>
          <Link href="/research/filing" className="btn-primary" style={{ textDecoration: 'none', fontSize: 12 }}>
            Open Filing Comparison →
          </Link>
          <span style={{ marginLeft: 12, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Opens the full filing tool
          </span>
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
      <div className="workspace-card" style={{ marginTop: 'var(--space-4)' }}>
        <div className="workspace-card-header">Valuation Model</div>
        <div style={{ padding: 'var(--space-4)' }}>
          <Link href="/tools/dcf" className="btn-primary" style={{ textDecoration: 'none', fontSize: 12 }}>
            Open DCF Valuation →
          </Link>
          <span style={{ marginLeft: 12, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Full DCF model with sensitivity analysis
          </span>
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
      <div className="workspace-card" style={{ marginTop: 'var(--space-4)' }}>
        <div className="workspace-card-header">Financial Ratios</div>
        <div style={{ padding: 'var(--space-4)' }}>
          <Link href="/tools/ratios" className="btn-primary" style={{ textDecoration: 'none', fontSize: 12 }}>
            Open Financial Ratios →
          </Link>
          <span style={{ marginLeft: 12, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Liquidity, leverage, profitability & efficiency
          </span>
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
    alert('Thesis saved!');
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
      <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div className="workspace-card">
          <div className="workspace-card-header">Your Assessment</div>
          <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Verdict selector */}
            <div>
              <div className="ws-metric-label" style={{ marginBottom: 8 }}>Overall Verdict</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['positive', 'neutral', 'negative'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={verdict === v ? 'btn-primary' : 'btn-ghost'}
                    style={{ fontSize: 12, padding: '6px 16px' }}
                    onClick={() => setVerdict(v)}
                  >
                    {v === 'positive' ? '✓ Bullish' : v === 'neutral' ? '→ Neutral' : '✗ Bearish'}
                  </button>
                ))}
              </div>
            </div>

            {/* Thesis notes */}
            <div>
              <div className="ws-metric-label" style={{ marginBottom: 8 }}>Research Notes</div>
              <textarea
                className="num-input"
                rows={8}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write your investment thesis here...&#10;&#10;Consider:&#10;- Business quality and competitive advantages&#10;- Financial health and trends&#10;- Growth prospects&#10;- Valuation (is it fairly priced?)&#10;- Key risks and mitigants&#10;- Your decision and rationale"
                aria-label="Investment thesis notes"
                style={{ lineHeight: 1.7, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-primary" onClick={handleSave} style={{ fontSize: 12 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 2h10v10H2z" /><path d="M9 2v5H5V2" fill="currentColor" /><path d="M4 10h6" />
                </svg>
                Save Thesis
              </button>
              {saved && (
                <button type="button" className="btn-secondary" onClick={handleLoad} style={{ fontSize: 12 }}>
                  Load saved
                </button>
              )}
            </div>

            {saved && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Previous thesis found — click &quot;Load saved&quot; to restore
              </div>
            )}
          </div>
        </div>

        {/* Quick checklist */}
        <div className="workspace-card">
          <div className="workspace-card-header">Investment Checklist</div>
          <div style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', lineHeight: 1.8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" /> Business has a durable competitive advantage
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" /> Revenue is growing consistently
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" /> Profit margins are stable or improving
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" /> Debt levels are manageable
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" /> Stock is undervalued or fairly priced
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" /> Key risks are identified and acceptable
            </label>
          </div>
        </div>
      </div>
      <Disclaimer extra="This is a research tool. Always verify calculations independently." />
    </div>
  );
}
