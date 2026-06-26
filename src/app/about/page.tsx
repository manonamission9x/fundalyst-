import Link from 'next/link';
import { PageHeader, Card, Disclaimer } from '@/components/ui';

export default function AboutPage() {
  return (
    <div>
      <PageHeader
        title="About Fundalyst"
        subtitle="A browser-based financial analysis tool for Indian markets. No server uploads. No accounts. No black boxes."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: '1.5rem' }}>
        {/* What it is */}
        <div className="about-card">
          <div className="about-card-title">📖 What Fundalyst Is</div>
          <div className="about-card-text">
            Fundalyst lets you paste or upload financial data and get a complete analysis — from period comparisons to DCF valuations — computed locally in your browser. <strong>Built for Indian markets</strong> (₹, Cr/L, NSE/BSE terminology), but works with any financial data.
          </div>
        </div>

        {/* Who it is for */}
        <div className="about-card">
          <div className="about-card-title">🎯 Who It Is For</div>
          <div className="about-card-text">
            Curious investors, value researchers, finance beginners, and anyone who wants to understand company financials without spreadsheet pain. <strong>No finance degree needed.</strong>
          </div>
        </div>

        {/* Privacy */}
        <div className="about-card">
          <div className="about-card-title">🔒 Private by Design</div>
          <div className="about-card-text">
            All file parsing, normalization, and calculations happen in your browser. <strong>No data is sent to any server.</strong> No accounts. No database. Your work lives in localStorage — close the tab and come back, it&apos;s still there. Clear your browser data and it&apos;s gone.
          </div>
        </div>

        {/* No black-box */}
        <div className="about-card">
          <div className="about-card-title">📐 No Black-Box Finance</div>
          <div className="about-card-text">
            Every formula is documented. Every output shows its assumptions. The DCF model, working capital formulas, ratio calculations — all visible, all verifiable. <strong>You never have to trust a black box.</strong>
          </div>
        </div>

        {/* Tools */}
        <div className="about-card">
          <div className="about-card-title">🧰 Tools Included</div>
          <div className="about-card-text">
            Smart Import (CSV/XLSX with auto-detection), Filing Comparison, DCF Valuation, Cash Efficiency (WC), Financial Ratios, Peer Comparison, Trend Charts, and Growth Rates. <strong>8 tools, all frontend-only.</strong>
          </div>
        </div>

        {/* What it does not do */}
        <div className="about-card">
          <div className="about-card-title">⚠️ What It Does Not Do</div>
          <div className="about-card-text">
            Fundalyst is a <strong>research tool</strong>, not a broker, trading platform, or data provider. It does not give financial advice, generate buy/sell signals, or guarantee accuracy of user-uploaded data. Always verify calculations independently.
          </div>
        </div>
      </div>

      {/* Methodology */}
      <Card label="Methodology" style={{ marginTop: '1.5rem' }}>
        <div style={{ padding: '14px 20px', fontSize: 11, lineHeight: 1.7, color: 'var(--text-tertiary)' }}>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li><strong>DCF:</strong> Two-stage model. Stage 1 projects FCF for 5 years at the user-defined growth rate. Stage 2 uses the Gordon Growth Model for terminal value. Discount rate is WACC.</li>
            <li><strong>Working Capital:</strong> DSO = (Receivables / Revenue) × 365. DIO = (Inventory / COGS) × 365. DPO = (Payables / COGS) × 365. CCC = DSO + DIO − DPO.</li>
            <li><strong>Percentage change:</strong> ((B − A) / |A|) × 100.</li>
            <li><strong>Value normalization:</strong> Smart Import converts Crores, Lakhs, Millions, and Billions to base units.</li>
            <li><strong>Risk flags:</strong> Debt surge &gt;20%, margin compression &lt;−10%, revenue decline &lt;−5%, profit drop &lt;−15%, cash drop &lt;−20%, pledge increase &gt;5%.</li>
          </ul>
        </div>
      </Card>

      {/* CTA */}
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <Link href="/import" className="btn-primary" style={{ padding: '11px 24px', display: 'inline-flex', textDecoration: 'none', fontSize: 13 }}>
          Start analyzing
        </Link>
      </div>

      <Disclaimer />
    </div>
  );
}
