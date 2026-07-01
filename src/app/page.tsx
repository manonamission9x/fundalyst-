'use client';

import Link from 'next/link';
import { usePageTitle } from '@/lib/use-page-title';
import { useGlobalDataStore } from '@/store/global-data-store';
import {
  FileText,
  Calculator,
  ChartLineUp,
  ChartPie,
  ArrowRight,
  ShieldCheck,
  Detective,
  Lightning,
} from '@phosphor-icons/react';

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
        <div className="home-hero-bg" aria-hidden="true" />
        <div className="home-hero-inner">
          <span className="home-eyebrow">
            <span className="home-eyebrow-dot" />
            Runs 100% in your browser · No account
          </span>

          <h1>
            Less noise. Clearer numbers.
            <br />
            Faster decisions.
          </h1>

          <p className="home-descriptor">
            Fundalyst reads any financial filing and turns it into valuation, trends,
            ratios, and peer analysis — right in your browser.
          </p>

          <p className="home-subtitle">
            One clean screen instead of forty pages of PDF. Built to cut the cognitive
            load so you can make the call, not chase the data.
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
                <ArrowRight size={14} weight="bold" />
              </Link>
            )}
          </div>

          <p className="home-trust-line">
            First analysis in under a minute · No sign-up · Your data never leaves your device.
          </p>

          {/* Product preview — institutional valuation panel with sensitivity matrix */}
          <div className="home-panel">
            <div className="home-panel-head">
              <div className="home-panel-id">
                <span className="home-panel-name">Reliance Industries</span>
                <span className="home-panel-ticker">NSE: RELIANCE · FY24</span>
              </div>
              <span className="home-panel-badge">Imported</span>
            </div>

            <div className="home-panel-body">
              <div className="home-panel-decision">
                <div className="home-panel-label">Intrinsic value / share</div>
                <div className="home-panel-value">₹1,284</div>
                <div className="home-panel-delta">
                  <span className="home-panel-delta-pos">+32.4%</span>
                  <span className="home-panel-delta-note">vs. ₹970 market</span>
                </div>
                <div className="home-panel-divider" />
                <dl className="home-panel-stats">
                  <div>
                    <dt>Enterprise value</dt>
                    <dd>₹12,847Cr</dd>
                  </div>
                  <div>
                    <dt>WACC</dt>
                    <dd>10.2%</dd>
                  </div>
                  <div>
                    <dt>Terminal growth</dt>
                    <dd>3.5%</dd>
                  </div>
                </dl>
              </div>

              <div className="home-panel-sens">
                <div className="home-panel-label">Sensitivity · value / share (₹)</div>
                <table className="home-sens-table">
                  <thead>
                    <tr>
                      <th scope="col" />
                      <th scope="col">9.2%</th>
                      <th scope="col">10.2%</th>
                      <th scope="col">11.2%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">3.0%</th>
                      <td className="s1">1,352</td>
                      <td>1,201</td>
                      <td>1,078</td>
                    </tr>
                    <tr>
                      <th scope="row">3.5%</th>
                      <td className="s2">1,447</td>
                      <td className="s-focus">1,284</td>
                      <td>1,149</td>
                    </tr>
                    <tr>
                      <th scope="row">4.0%</th>
                      <td className="s2">1,561</td>
                      <td className="s1">1,381</td>
                      <td>1,232</td>
                    </tr>
                  </tbody>
                </table>
                <div className="home-sens-key">Rows: terminal growth · Cols: WACC</div>
              </div>
            </div>

            <div className="home-panel-footer">
              <span>5-yr FCF projection</span>
              <span>Every input traced to source</span>
              <span className="home-panel-tag">Sample data</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="home-strip">
        <div className="home-strip-item">
          <span className="home-strip-num">0</span>
          <span className="home-strip-cap">files uploaded to any server</span>
        </div>
        <div className="home-strip-item">
          <span className="home-strip-num">100%</span>
          <span className="home-strip-cap">runs on your device</span>
        </div>
        <div className="home-strip-item">
          <span className="home-strip-num">&lt;60s</span>
          <span className="home-strip-cap">filing to full analysis</span>
        </div>
        <div className="home-strip-item">
          <span className="home-strip-num">Every</span>
          <span className="home-strip-cap">number traced to its source</span>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="home-section">
        <div className="home-section-heading">How it works</div>
        <div className="home-section-sub">Three steps from filing to decision.</div>
        <div className="home-steps">
          <div className="home-step">
            <span className="home-step-num">1</span>
            <div className="home-step-title">Upload</div>
            <div className="home-step-desc">
              Drop a PDF, CSV, XLSX, or screenshot. Or paste data directly. Fundalyst
              detects the format and extracts every number automatically.
            </div>
          </div>
          <div className="home-step">
            <span className="home-step-num">2</span>
            <div className="home-step-title">Extract</div>
            <div className="home-step-desc">
              Periods, metrics, and values are normalized. Crores, lakhs, millions — all
              converted. Every value carries a confidence score and its source.
            </div>
          </div>
          <div className="home-step">
            <span className="home-step-num">3</span>
            <div className="home-step-title">Decide</div>
            <div className="home-step-desc">
              DCF, filing comparison, trends, ratios, peers — each tool opens with your
              data pre-filled, so you read the signal instead of building the model.
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
            <span className="home-trust-icon"><ShieldCheck size={16} weight="regular" /></span>
            <div className="home-trust-title">Private by design</div>
            <div className="home-trust-text">
              Your data never leaves your device. No accounts. No server uploads. No
              database. Every parse, normalization, and calculation runs in your browser.
            </div>
          </div>
          <div className="home-trust-col">
            <span className="home-trust-icon"><Detective size={16} weight="regular" /></span>
            <div className="home-trust-title">Never a black box</div>
            <div className="home-trust-text">
              Every formula is documented. Every output shows its assumptions and source
              facts, with a provenance badge on each visible metric. Verify, don&apos;t trust.
            </div>
          </div>
          <div className="home-trust-col">
            <span className="home-trust-icon"><Lightning size={16} weight="regular" /></span>
            <div className="home-trust-title">Built for real filings</div>
            <div className="home-trust-text">
              Indian markets first (₹, Cr/L, NSE/BSE), with multi-company, multi-period
              analysis. Export investment memos and back up your workspace anytime.
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="home-final-cta">
        <div className="home-final-cta-glow" aria-hidden="true" />
        <h2>Read your next report in a minute.</h2>
        <p className="home-final-cta-sub">
          No sign-up, no upload. Bring a filing and see the whole company on one screen.
        </p>
        <div className="home-cta-row">
          <Link href="/import" className="btn-primary home-cta-btn">
            Analyze a report
            <ArrowRight size={15} weight="bold" />
          </Link>
          <Link href="/tools/dcf" className="home-cta-ghost">
            View interactive demo
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
      </section>
    </div>
  );
}