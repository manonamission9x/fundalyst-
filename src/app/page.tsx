'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Card } from '@/components/ui';
import { useGlobalDataStore } from '@/store/global-data-store';

// ── Quick Company Check (inline tool) ──
function QuickCheckForm() {
  const [rev, setRev] = useState('');
  const [profit, setProfit] = useState('');
  const [debt, setDebt] = useState('');
  const [assets, setAssets] = useState('');
  const [mcap, setMcap] = useState('');

  const result = useMemo(() => {
    const r = Number(rev) || 0;
    const p = Number(profit) || 0;
    const d = Number(debt) || 0;
    const a = Number(assets) || 0;
    const m = Number(mcap) || 0;
    if (!r || !a) return null;

    const npm = (p / r) * 100;
    const roe = a > 0 && (a - d) > 0 ? (p / (a - d)) * 100 : null;
    const de = d > 0 && (a - d) > 0 ? d / (a - d) : d > 0 ? null : 0;
    const da = (d / a) * 100;
    const pe = m > 0 && p > 0 ? m / p : null;

    return {
      npm: { v: npm.toFixed(1) + '%', cls: npm > 10 ? 'good' : npm > 3 ? 'neutral' : 'warn' as const },
      roe: roe !== null ? { v: roe.toFixed(1) + '%', cls: roe > 15 ? 'good' : roe > 5 ? 'neutral' : 'warn' as const } : null,
      de: de !== null ? { v: de.toFixed(2), cls: de < 1 ? 'good' : de < 2 ? 'neutral' : 'warn' as const } : null,
      da: { v: da.toFixed(1) + '%', cls: da < 40 ? 'good' : da < 70 ? 'neutral' : 'warn' as const },
      pe: pe !== null ? { v: pe.toFixed(1), cls: pe < 30 ? 'good' : pe < 50 ? 'neutral' : 'warn' as const } : null,
    };
  }, [rev, profit, debt, assets, mcap]);

  return (
    <div>
      <div className="field-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {[
          { l: 'Revenue (₹ Cr)', v: rev, s: setRev },
          { l: 'Net Profit', v: profit, s: setProfit },
          { l: 'Total Debt', v: debt, s: setDebt },
          { l: 'Total Assets', v: assets, s: setAssets },
          { l: 'Market Cap', v: mcap, s: setMcap },
        ].map((f, i) => (
          <div className="field-group" key={i}>
            <label className="field-label">{f.l}</label>
            <input type="number" className="num-input" value={f.v} onChange={(e) => f.s(e.target.value)} placeholder="0" />
          </div>
        ))}
      </div>

      {result && (
        <div className="metric-grid" style={{ marginTop: 16 }}>
          <div className={`metric-cell ${result.npm.cls}`}>
            <div className="metric-label">Net Profit Margin</div>
            <div className="metric-value">{result.npm.v}</div>
            <div className="metric-sub">Profit ÷ Revenue</div>
          </div>
          <div className={`metric-cell ${result.roe?.cls || ''}`}>
            <div className="metric-label">ROE</div>
            <div className="metric-value">{result.roe?.v || '—'}</div>
            <div className="metric-sub">Return on equity</div>
          </div>
          <div className={`metric-cell ${result.de?.cls || ''}`}>
            <div className="metric-label">Debt/Equity</div>
            <div className="metric-value">{result.de?.v || '—'}</div>
            <div className="metric-sub">Leverage ratio</div>
          </div>
          <div className={`metric-cell ${result.da.cls}`}>
            <div className="metric-label">Debt/Assets</div>
            <div className="metric-value">{result.da.v}</div>
            <div className="metric-sub">Debt burden</div>
          </div>
          <div className={`metric-cell ${result.pe?.cls || ''}`}>
            <div className="metric-label">P/E Ratio</div>
            <div className="metric-value">{result.pe?.v || '—'}</div>
            <div className="metric-sub">Price ÷ Earnings</div>
          </div>
        </div>
      )}

      {!result && rev && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          Enter revenue and assets at minimum to see ratios
        </p>
      )}

      <div style={{ marginTop: 12, textAlign: 'center', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
        Results update instantly as you type. For full analysis, use the tools above.
      </div>
    </div>
  );
}

const tools = [
  {
    section: 'Research',
    items: [
      { href: '/research/filing', label: 'Filing Comparison', desc: 'Compare two periods line by line. Spot changes in revenue, margins, debt, and promoter holding.' },
      { href: '/research/trends', label: 'Trend Charts', desc: 'Plot revenue, profit, and costs over 3+ years. Spot inflection points at a glance.' },
      { href: '/research/growth', label: 'Growth Rates', desc: 'Year-over-year growth for every line item. Automatically color-coded for direction.' },
    ],
  },
  {
    section: 'Valuation & Analysis',
    items: [
      { href: '/tools/dcf', label: 'DCF Valuation', desc: 'Estimate intrinsic value per share with sensitivity tables. Adjust assumptions in real time.' },
      { href: '/tools/wc', label: 'Cash Efficiency', desc: 'DSO, DIO, DPO, and the Cash Conversion Cycle. See where cash is trapped.' },
      { href: '/tools/ratios', label: 'Financial Ratios', desc: 'Liquidity, leverage, profitability, and efficiency — 9 ratios, one click.' },
      { href: '/tools/peer', label: 'Peer Comparison', desc: 'Compare up to 10 companies side-by-side. Leaders and laggards highlighted instantly.' },
    ],
  },
];

const trustItems = [
  { text: 'All computation runs in your browser — nothing is uploaded to any server.', detail: 'Privacy first' },
  { text: 'Indian market formats: ₹, Cr, Lakhs, Crores, NSE/BSE terminology.', detail: 'Local by design' },
  { text: 'Every formula is documented and visible. No black-box calculations.', detail: 'No black boxes' },
  { text: 'No account, no sign-up, no setup. Start analyzing in seconds.', detail: 'Use instantly' },
];

export default function HomePage() {
  const datasets = useGlobalDataStore((s) => s.datasets);
  const activeDataset = useGlobalDataStore((s) => {
    if (!s.activeDatasetId && s.datasets.length === 0) return null;
    return s.datasets.find((d) => d.id === s.activeDatasetId) || s.datasets[0] || null;
  });

  return (
    <div>
      {/* ── Hero ── */}
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-eyebrow">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 10l3-3 2 2 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Browser-based · No uploads to any server
          </div>

          <h1>
            Understand any company&apos;s financial health
            <br />
            <span className="home-hero-sub">in minutes, not hours.</span>
          </h1>
          <p className="home-subtitle">
            Upload a CSV, Excel file, or paste numbers directly. Fundalyst extracts the data,
            runs the calculations, and shows you what matters — all inside your browser.
          </p>

          <div className="home-cta-row">
            <Link href="/import" className="home-cta-primary">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 2v10M3 7l5-5 5 5" /><path d="M2 13v1h12v-1" />
              </svg>
              Upload financial data
            </Link>
            <Link href="/tools/dcf" className="home-cta-secondary">
              Try with sample data →
            </Link>
          </div>

          {activeDataset && (
            <div className="home-active-dataset">
              <span className="home-active-dataset-dot" />
              {activeDataset.companyName || `${activeDataset.facts.length} metrics loaded`}
              <span className="home-active-dataset-sep">·</span>
              <Link href="/research/filing" className="home-active-dataset-link">
                Continue analysis →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="home-section">
        <div className="section-title">Three steps to insight</div>
        <div className="home-steps">
          {[
            {
              step: '01',
              title: 'Import your data',
              desc: 'Upload a CSV, Excel file, PDF, or paste numbers directly. Fundalyst detects periods, normalizes ₹/Cr/Lakh values, and maps metrics automatically.',
            },
            {
              step: '02',
              title: 'Review the mapping',
              desc: 'Check how your data was interpreted. Fix any mismatches with one click, then load the cleaned dataset into any analysis tool.',
            },
            {
              step: '03',
              title: 'Run your analysis',
              desc: 'Compare periods, value companies, check ratios, and benchmark peers — all tools share the same data. No re-importing, no duplicate work.',
            },
          ].map((item) => (
            <div key={item.step} className="home-step">
              <div className="home-step-num">{item.step}</div>
              <div className="home-step-title">{item.title}</div>
              <div className="home-step-desc">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tools grid ── */}
      {tools.map((group) => (
        <section key={group.section} className="home-section">
          <div className="section-title">{group.section}</div>
          <div className="home-grid">
            {group.items.map((t) => (
              <Link key={t.href} href={t.href} className="home-card">
                <div className="home-card-icon">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="2" width="16" height="16" rx="3" />
                    <path d="M5 10l3-3 2 2 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="home-card-title">{t.label}</div>
                <div className="home-card-desc">{t.desc}</div>
                <div className="home-card-cta">Open →</div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* ── Trust section ── */}
      <section className="home-trust-section">
        <div className="home-trust-grid">
          {trustItems.map((item) => (
            <div key={item.text} className="home-trust-card">
              <div className="home-trust-card-text">{item.text}</div>
              <div className="home-trust-card-detail">{item.detail}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="home-cta-final">
        <h2>Ready to analyze your first company?</h2>
        <p>No account needed. No data leaves your browser.</p>
        <Link href="/import" className="home-cta-primary">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 2v10M3 7l5-5 5 5" /><path d="M2 13v1h12v-1" />
          </svg>
          Upload financial data
        </Link>
      </section>

      {/* ── Quick Company Check ── */}
      <section className="home-section" style={{ marginTop: 'var(--space-10)' }}>
        <div className="section-title">Quick Company Check</div>
        <Card>
          <div className="card-body">
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 14px', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
              Enter 5 numbers to get an instant health overview. No file upload needed.
            </p>
            <QuickCheckForm />
          </div>
        </Card>
      </section>
    </div>
  );
}
