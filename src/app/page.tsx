'use client';

import Link from 'next/link';
import { usePageTitle } from '@/lib/use-page-title';
import { useGlobalDataStore } from '@/store/global-data-store';
import { FileText, Calculator, ChartLineUp, ChartPie, ArrowRight } from '@phosphor-icons/react';

export default function HomePage() {
  usePageTitle('Home');
  const activeDataset = useGlobalDataStore((s) => {
    if (!s.activeDatasetId && s.datasets.length === 0) return null;
    return s.datasets.find((d) => d.id === s.activeDatasetId) || s.datasets[0] || null;
  });

  // Only offer to resume when there's a real, named workspace — never surface
  // the "Unnamed Company" placeholder on the marketing page.
  const resumeName =
    activeDataset?.companyName && activeDataset.companyName !== 'Unnamed Company'
      ? activeDataset.companyName
      : null;

  return (
    <div>
      {/* ── Hero ── */}
      <section className="home-hero">
        <div className="home-hero-inner">
          <h1>
            Upload an annual report.
            <br />
            Get the analysis instantly.
          </h1>
          <p className="home-subtitle">
            Automatically extract financial statements, compare periods, build DCF valuations,
            and generate investment insights — all in your browser. No server uploads.
          </p>

          <div className="home-cta-row">
            <Link href="/import" className="btn-primary home-cta-btn">
              Analyze a report
              <ArrowRight size={15} weight="bold" />
            </Link>
            {resumeName ? (
              <Link href="/research/filing" className="home-cta-ghost">
                Resume {resumeName}
                <ArrowRight size={14} weight="bold" />
              </Link>
            ) : (
              <Link href="/tools/dcf" className="home-cta-ghost">
                View interactive demo
              </Link>
            )}
          </div>

          <p className="home-trust-line">
            No account, no upload — runs in your browser, first analysis in under a minute.
          </p>

          {/* Product preview — live DCF output */}
          <div className="home-preview">
            <div className="home-preview-body">
              <div className="home-preview-caption">DCF valuation output</div>
              <div className="home-preview-metrics">
                <div className="home-preview-metric">
                  <div className="home-preview-metric-label">Enterprise value</div>
                  <div className="home-preview-metric-value">₹12,847Cr</div>
                </div>
                <div className="home-preview-metric">
                  <div className="home-preview-metric-label">Intrinsic value / share</div>
                  <div className="home-preview-metric-value">₹1,284</div>
                </div>
                <div className="home-preview-metric">
                  <div className="home-preview-metric-label">Margin of safety</div>
                  <div className="home-preview-metric-value" style={{ color: 'var(--green)' }}>+32.4%</div>
                </div>
              </div>
              <div className="home-preview-chart">
                <div className="home-preview-bar">
                  <span className="home-preview-bar-label">PV of FCF</span>
                  <div className="home-preview-bar-track">
                    <div className="home-preview-bar-fill ink-100" style={{ width: '62%' }} />
                  </div>
                </div>
                <div className="home-preview-bar">
                  <span className="home-preview-bar-label">PV of terminal value</span>
                  <div className="home-preview-bar-track">
                    <div className="home-preview-bar-fill ink-60" style={{ width: '90%' }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="home-preview-footer">
              <span>WACC: 10.2%</span>
              <span>Terminal growth: 3.5%</span>
              <span>Projected FCF (yr 1): ₹1,420Cr</span>
              <span className="home-preview-tag">Sample data</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="home-section" style={{ marginTop: 'var(--space-10)' }}>
        <div className="home-section-heading">How it works</div>
        <div className="home-section-sub">Three steps from filing to analysis.</div>
        <div className="home-steps">
          <div className="home-step">
            <span className="home-step-num">1</span>
            <div className="home-step-title">Upload</div>
            <div className="home-step-desc">
              Drop a PDF, CSV, or XLSX. Or paste data directly. Fundalyst detects the format and extracts every number automatically.
            </div>
          </div>
          <div className="home-step">
            <span className="home-step-num">2</span>
            <div className="home-step-title">Extract</div>
            <div className="home-step-desc">
              Periods, metrics, and values are normalized. Crores, lakhs, millions — all converted. Every value shows its confidence score.
            </div>
          </div>
          <div className="home-step">
            <span className="home-step-num">3</span>
            <div className="home-step-title">Analyze</div>
            <div className="home-step-desc">
              DCF valuation. Filing comparison. Trends. Ratios. Peer benchmarking. Each tool opens with your data pre-filled.
            </div>
          </div>
        </div>
      </section>

      {/* ── What You Get ── */}
      <section className="home-section">
        <div className="home-section-heading">What you get</div>
        <div className="home-section-sub">Real outputs from real financial data.</div>
        <div className="home-tools">
          <Link href="/tools/dcf" className="home-tool-card">
            <div className="home-tool-card-head">
              <span className="home-tool-card-icon"><Calculator size={14} weight="regular" /></span>
              <span className="home-tool-card-title">DCF Valuation</span>
            </div>
            <div className="home-tool-card-value">₹12,847Cr</div>
            <div className="home-tool-card-sub">Enterprise value · 5yr projection</div>
          </Link>
          <Link href="/research/filing" className="home-tool-card">
            <div className="home-tool-card-head">
              <span className="home-tool-card-icon"><FileText size={14} weight="regular" /></span>
              <span className="home-tool-card-title">Filing Comparison</span>
            </div>
            <div className="home-tool-card-value" style={{ color: 'var(--green)' }}>+14.2%</div>
            <div className="home-tool-card-sub">Revenue growth · Period over period</div>
          </Link>
          <Link href="/research/trends" className="home-tool-card">
            <div className="home-tool-card-head">
              <span className="home-tool-card-icon"><ChartLineUp size={14} weight="regular" /></span>
              <span className="home-tool-card-title">Trend Charts</span>
            </div>
            <div className="home-tool-card-value">3yr CAGR</div>
            <div className="home-tool-card-sub">Revenue · Profit · Margin trends</div>
          </Link>
        </div>
        <div className="home-tools" style={{ marginTop: 'var(--space-3)' }}>
          <Link href="/tools/ratios" className="home-tool-card">
            <div className="home-tool-card-head">
              <span className="home-tool-card-icon"><ChartPie size={14} weight="regular" /></span>
              <span className="home-tool-card-title">Financial Ratios</span>
            </div>
            <div className="home-tool-card-value">9 ratios</div>
            <div className="home-tool-card-sub">Liquidity · Leverage · Profitability</div>
          </Link>
          <Link href="/tools/peer" className="home-tool-card">
            <div className="home-tool-card-head">
              <span className="home-tool-card-icon"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="5" r="2" /><circle cx="9" cy="5" r="2" /><rect x="3" y="9" width="4" height="3" rx="0.5" /><rect x="8" y="9" width="4" height="3" rx="0.5" /></svg></span>
              <span className="home-tool-card-title">Peer Comparison</span>
            </div>
            <div className="home-tool-card-value">Up to 10</div>
            <div className="home-tool-card-sub">Companies side-by-side</div>
          </Link>
          <Link href="/tools/wc" className="home-tool-card">
            <div className="home-tool-card-head">
              <span className="home-tool-card-icon"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="4" /><path d="M7 5v4" /><path d="M6 7h2" /></svg></span>
              <span className="home-tool-card-title">Cash Efficiency</span>
            </div>
            <div className="home-tool-card-value">CCC</div>
            <div className="home-tool-card-sub">DSO · DIO · DPO · Cash cycle</div>
          </Link>
        </div>
      </section>

      {/* ── Why It Works ── */}
      <section className="home-section">
        <div className="home-section-heading">Why professionals use Fundalyst</div>
        <div className="home-section-sub">Trust comes from competence — not marketing.</div>
        <div className="home-trust">
          <div className="home-trust-col">
            <div className="home-trust-title">Privacy</div>
            <div className="home-trust-text">
              Your data never leaves your device. No accounts. No server uploads. No database. All file parsing, normalization, and calculations happen in your browser.
            </div>
          </div>
          <div className="home-trust-col">
            <div className="home-trust-title">Accuracy</div>
            <div className="home-trust-text">
              Every formula is documented. Every output shows its assumptions and source facts. Provenance badges on every visible metric. You never have to trust a black box.
            </div>
          </div>
          <div className="home-trust-col">
            <div className="home-trust-title">Coverage</div>
            <div className="home-trust-text">
              Built for Indian markets (₹, Cr/L, NSE/BSE terminology). Handles multi-company, multi-period analysis. Export investment memos. Back up your workspace.
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="home-final-cta">
        <h2>Ready to analyze your first report?</h2>
        <div className="home-cta-row">
          <Link href="/import" className="btn-primary home-cta-btn">
            Upload annual report
            <ArrowRight size={15} weight="bold" />
          </Link>
        </div>
      </section>
    </div>
  );
}
