'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Card, MetricGrid } from '@/components/ui';
import { FileText, TrendingUp, BarChart3, Calculator, DollarSign, PieChart, Users, Upload, Search } from 'lucide-react';
import { useGlobalDataStore } from '@/store/global-data-store';

// ── Quick Company Check (inline tool) ──
function QuickCheckForm() {
  const [rev, setRev] = useState('');
  const [profit, setProfit] = useState('');
  const [debt, setDebt] = useState('');
  const [assets, setAssets] = useState('');
  const [equity, setEquity] = useState('');
  const [mcap, setMcap] = useState('');

  const result = useMemo(() => {
    const r = Number(rev) || 0;
    const p = Number(profit) || 0;
    const d = Number(debt) || 0;
    const a = Number(assets) || 0;
    const e = Number(equity) || (a - d);
    const m = Number(mcap) || 0;
    if (!r || !a) return null;

    const npm = (p / r) * 100;
    const roe = e > 0 ? (p / e) * 100 : null;
    const de_ratio = e > 0 && d > 0 ? d / e : d > 0 ? null : 0;
    const da = (d / a) * 100;
    const pe = m > 0 && p > 0 ? m / p : null;

    const clsNpm: 'good' | 'warn' | 'neutral' | '' = npm > 10 ? 'good' : npm > 3 ? 'neutral' : 'warn';
    const clsRoe: 'good' | 'warn' | 'neutral' | '' = roe !== null ? (roe > 15 ? 'good' : roe > 5 ? 'neutral' : 'warn') : '';
    const clsDe: 'good' | 'warn' | 'neutral' | '' = de_ratio !== null ? (de_ratio < 1 ? 'good' : de_ratio < 2 ? 'neutral' : 'warn') : '';
    const clsDa: 'good' | 'warn' | 'neutral' | '' = da < 40 ? 'good' : da < 70 ? 'neutral' : 'warn';
    const clsPe: 'good' | 'warn' | 'neutral' | '' = pe !== null ? (pe < 30 ? 'good' : pe < 50 ? 'neutral' : 'warn') : '';

    return {
      npm: { v: npm.toFixed(1) + '%', cls: clsNpm },
      roe: roe !== null ? { v: roe.toFixed(1) + '%', cls: clsRoe } : null,
      de: de_ratio !== null ? { v: de_ratio.toFixed(2), cls: clsDe } : null,
      da: { v: da.toFixed(1) + '%', cls: clsDa },
      pe: pe !== null ? { v: pe.toFixed(1), cls: clsPe } : null,
      equityNote: !equity && a > 0 && d >= 0 ? ' (Assets − Debt)' : '',
    };
  }, [rev, profit, debt, assets, equity, mcap]);

  return (
    <div>
      <div className="field-grid">
        {[
          { l: 'Revenue (₹ Cr)', v: rev, s: setRev },
          { l: 'Net Profit', v: profit, s: setProfit },
          { l: 'Total Debt', v: debt, s: setDebt },
          { l: 'Total Assets', v: assets, s: setAssets },
          { l: 'Total Equity', v: equity, s: setEquity, h: 'Optional — derived from Assets − Debt if blank' },
          { l: 'Market Cap', v: mcap, s: setMcap },
        ].map((f, i) => (
          <div className="field-group" key={i}>
            <label className="field-label">{f.l}</label>
            <input type="number" className="num-input" value={f.v} onChange={(e) => f.s(e.target.value)} placeholder="Value" />
            {f.h && <div className="field-hint">{f.h}</div>}
          </div>
        ))}
      </div>

      {result && (
        <MetricGrid metrics={[
          {
            label: 'Net Profit Margin',
            value: result.npm.v,
            cls: result.npm.cls,
            sub: 'Profit ÷ Revenue',
            context: result.npm.cls === 'good' ? 'Above 10% — healthy margins' :
                     result.npm.cls === 'neutral' ? '3–10% — average range' :
                     'Below 3% — needs improvement',
            contextTrend: result.npm.cls === 'good' ? 'up' :
                          result.npm.cls === 'warn' ? 'down' : 'flat',
          },
          {
            label: 'ROE',
            value: result.roe?.v || '—',
            cls: result.roe?.cls || '',
            sub: 'Return on equity' + result.equityNote,
            context: result.roe?.cls === 'good' ? 'Above 15% — strong returns' :
                     result.roe?.cls === 'neutral' ? '5–15% — moderate' :
                     result.roe?.cls === 'warn' ? 'Below 5% — weak returns' : undefined,
            contextTrend: result.roe?.cls === 'good' ? 'up' :
                          result.roe?.cls === 'warn' ? 'down' : 'flat',
          },
          {
            label: 'Debt/Equity',
            value: result.de?.v || '—',
            cls: result.de?.cls || '',
            sub: 'Leverage ratio' + result.equityNote,
            context: result.de?.cls === 'good' ? 'Below 1.0 — low leverage' :
                     result.de?.cls === 'neutral' ? '1.0–2.0 — moderate' :
                     result.de?.cls === 'warn' ? 'Above 2.0 — high leverage' : undefined,
            contextTrend: result.de?.cls === 'good' ? 'down' :
                          result.de?.cls === 'warn' ? 'up' : 'flat',
          },
          {
            label: 'Debt/Assets',
            value: result.da.v,
            cls: result.da.cls,
            sub: 'Debt burden',
            context: result.da.cls === 'good' ? 'Below 40% — low debt burden' :
                     result.da.cls === 'neutral' ? '40–70% — moderate' :
                     'Above 70% — high debt burden',
            contextTrend: result.da.cls === 'good' ? 'down' :
                          result.da.cls === 'warn' ? 'up' : 'flat',
          },
          {
            label: 'P/E Ratio',
            value: result.pe?.v || '—',
            cls: result.pe?.cls || '',
            sub: 'Price ÷ Earnings',
            context: result.pe?.cls === 'good' ? 'Below 30 — reasonable' :
                     result.pe?.cls === 'neutral' ? '30–50 — elevated' :
                     result.pe?.cls === 'warn' ? 'Above 50 — premium' : undefined,
            contextTrend: result.pe?.cls === 'good' ? 'flat' :
                          result.pe?.cls === 'warn' ? 'flat' : 'flat',
          },
        ]} />
      )}

      {!result && rev && (
        <p className="text-muted text-sm text-center mt-3 font-mono">
          Enter revenue and assets at minimum to see ratios
        </p>
      )}

      <div className="mt-3 text-center font-mono text-muted" style={{ fontSize: 10 }}>
        Results update instantly as you type. For full analysis, use the tools above.
      </div>
    </div>
  );
}

const tools = [
  {
    section: 'Research',
    items: [
      {href: '/research/filing', label: 'Filing Comparison', icon: <FileText size={16} />, desc: 'Compare two periods line by line. Spot changes in revenue, margins, debt, and promoter holding.' },
      { href: '/research/trends', label: 'Trend Charts', icon: <TrendingUp size={16} />, desc: 'Plot revenue, profit, and costs over 3+ years. Spot inflection points at a glance.' },
      { href: '/research/growth', label: 'Growth Rates', icon: <BarChart3 size={16} />, desc: 'Year-over-year growth for every line item. Automatically color-coded for direction.' },
    ],
  },
  {
    section: 'Valuation & Analysis',
    items: [
      { href: '/tools/dcf', label: 'DCF Valuation', icon: <Calculator size={16} />, desc: 'Estimate intrinsic value per share with sensitivity tables. Adjust assumptions in real time.' },
      { href: '/tools/wc', label: 'Cash Efficiency', icon: <DollarSign size={16} />, desc: 'DSO, DIO, DPO, and the Cash Conversion Cycle. See where cash is trapped.' },
      { href: '/tools/ratios', label: 'Financial Ratios', icon: <PieChart size={16} />, desc: 'Liquidity, leverage, profitability, and efficiency — 9 ratios, one click.' },
      { href: '/tools/peer', label: 'Peer Comparison', icon: <Users size={16} />, desc: 'Compare up to 10 companies side-by-side. Leaders and laggards highlighted instantly.' },
    ],
  },
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
          <h1>
            Upload annual reports.
            <br />
            <span className="home-hero-sub">Compare periods. Estimate value.</span>
          </h1>
          <p className="home-subtitle">
            Enter financial data and get period comparisons, DCF valuations, ratio analysis,
            and peer benchmarking — all in your browser.
          </p>

          <div className="home-cta-row">
            <Link href="/import" className="home-cta-primary">
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

      {/* ── Tools grid ── */}
      {tools.map((group) => (
        <section key={group.section} className="home-section">
          <div className="section-title">{group.section}</div>
          <div className="home-grid">
            {group.items.map((t) => (
              <Link key={t.href} href={t.href} className="home-card">
                <div className="home-card-icon">
                  {t.icon}
                </div>
                <div className="home-card-title">{t.label}</div>
                <div className="home-card-desc">{t.desc}</div>
                <div className="home-card-cta">Open →</div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* ── Quick Company Check ── */}
      <section className="home-section mt-8">
        <div className="section-title">Quick Company Check</div>
        <Card>
          <div className="card-body">
            <p className="text-sm text-tertiary font-mono leading-normal mb-3">
              Enter 5 numbers to get an instant health overview. No file upload needed.
            </p>
            <QuickCheckForm />
          </div>
        </Card>
      </section>
    </div>
  );
}
