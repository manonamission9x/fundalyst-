import Link from 'next/link';
import type { Metadata } from 'next';
import { PageHeader, Card, Disclaimer } from '@/components/ui';

export const metadata: Metadata = {
  title: 'About — Fundalyst',
  description:
    'A browser-based financial analysis tool for Indian markets. DCF valuation, ratio analysis, filing comparison, peer benchmarking — all calculations performed client-side.',
  openGraph: {
    title: 'Fundalyst — Financial Analysis for Indian Markets',
    description: 'Upload financial statements, compare periods, analyze ratios, build DCF valuations — all computed locally in your browser.',
  },
};

const aboutCards = [
  {
    title: 'What Fundalyst Is',
    text: 'Fundalyst lets you paste or upload financial data and get a complete analysis — from period comparisons to DCF valuations — computed locally in your browser. <strong>Built for Indian markets</strong> (₹, Cr/L, NSE/BSE terminology), but works with any financial data.',
    svg: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h5l2 2h5v8H2V3z" />
        <path d="M2 11V2h5l2 2h5" />
      </svg>
    ),
  },
  {
    title: 'Who It Is For',
    text: 'Curious investors, value researchers, finance beginners, and anyone who wants to understand company financials without spreadsheet pain. <strong>No finance degree needed.</strong>',
    svg: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="5" r="3" />
        <path d="M3 14c0-3 2.2-5 5-5s5 2 5 5" />
      </svg>
    ),
  },
  {
    title: 'Private by Design',
    text: 'All file parsing, normalization, and calculations happen in your browser. <strong>No data is sent to any server.</strong> No accounts. No database. Your work lives in localStorage — close the tab and come back, it&apos;s still there.',
    svg: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="10" height="8" rx="1.5" />
        <path d="M5 7V5a3 3 0 016 0v2" />
        <circle cx="8" cy="10.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    title: 'No Black-Box Finance',
    text: 'Every formula is documented. Every output shows its assumptions. The DCF model, working capital formulas, ratio calculations — all visible, all verifiable. <strong>You never have to trust a black box.</strong>',
    svg: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
        <circle cx="8" cy="8" r="2" />
      </svg>
    ),
  },
  {
    title: 'Tools Included',
    text: 'Import (CSV/XLSX with auto-detection), Filing Comparison, DCF Valuation, Cash Efficiency, Financial Ratios, Peer Comparison, Trend Charts, and Growth Rates. <strong>8 tools, all frontend-only.</strong>',
    svg: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    title: 'What It Does Not Do',
    text: 'Fundalyst is a <strong>research tool</strong>, not a broker, trading platform, or data provider. It does not give financial advice, generate buy/sell signals, or guarantee accuracy of user-uploaded data. Always verify calculations independently.',
    svg: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1L1 15h14L8 1z" />
        <path d="M8 6v3" />
        <circle cx="8" cy="11.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export default function AboutPage() {
  return (
    <div>
      <PageHeader
        title="About Fundalyst"
        subtitle="A browser-based financial analysis tool for Indian markets. No server uploads. No accounts. No black boxes."
      />

      <div className="about-grid">
        {aboutCards.map((card) => (
          <div key={card.title} className="about-card">
            <div className="about-card-icon">{card.svg}</div>
            <div className="about-card-title">{card.title}</div>
            <div className="about-card-text" dangerouslySetInnerHTML={{ __html: card.text }} />
          </div>
        ))}
      </div>

      {/* Methodology */}
      <Card label="Methodology" className="mt-4">
        <div className="card-body text-sm text-tertiary leading-normal">
          <ul className="about-methodology-list">
            <li><strong>DCF Valuation:</strong> Two-stage model. Stage 1 projects FCF for user-defined years at the user-set growth rate. Stage 2 uses Gordon Growth Model for terminal value. Discount rate = WACC.</li>
            <li><strong>Working Capital:</strong> DSO = (Receivables / Revenue) × 365. DIO = (Inventory / COGS) × 365. DPO = (Payables / COGS) × 365. CCC = DSO + DIO − DPO.</li>
            <li><strong>Financial Ratios:</strong> Current Ratio, Quick Ratio, Debt/Equity, Debt/Assets, Interest Coverage, Gross Margin, Net Profit Margin, ROE, Asset Turnover.</li>
            <li><strong>Percentage Change:</strong> ((B − A) / |A|) × 100.</li>
            <li><strong>Value Normalization:</strong> Import converts Crores, Lakhs, Millions, and Billions to base units automatically.</li>
            <li><strong>Risk Flags:</strong> Debt surge &gt;20%, margin compression &lt;−10%, revenue decline &lt;−5%, profit drop &lt;−15%, cash drop &lt;−20%.</li>
          </ul>
        </div>
      </Card>

      {/* Contact & Support */}
      <Card label="Support" className="mt-3">
        <div className="card-body text-sm text-tertiary leading-normal">
          <p className="p-0">
            Fundalyst is an open-source, client-side-only financial analysis tool.
            No user data is collected, stored, or transmitted.
            If you encounter issues, clear your browser data and reload — all state is in localStorage.
            For feature requests or bug reports, visit the project repository on GitHub.
          </p>
        </div>
      </Card>

      {/* Privacy & Data */}
      <Card label="Privacy &amp; Data" className="mt-3">
        <div className="card-body text-sm text-tertiary leading-normal">
          <p className="p-0">
            All data you import or enter in Fundalyst stays entirely in your browser&apos;s <strong>localStorage</strong> — a client-side storage mechanism built into every modern browser. <strong>No data is ever transmitted to any server, API, or third party.</strong>
          </p>
          <ul className="about-methodology-list mt-3">
            <li><strong>Per-browser only:</strong> localStorage is tied to the specific browser and device you are using. Data is not shared across browsers, devices, or profiles.</li>
            <li><strong>Not encrypted:</strong> localStorage data is stored in plain text in your browser&apos;s profile directory. It is not encrypted at rest.</li>
            <li><strong>Cleared on cache wipe:</strong> Clearing your browser cache, cookies, or site data will delete all Fundalyst workspace data.</li>
            <li><strong>Manual backup recommended:</strong> Use the <strong>Export workspace</strong> feature on the Workspace page to download a backup JSON file. No automatic backup is available.</li>
          </ul>
        </div>
      </Card>

      {/* Enterprise */}
      <Card label="Enterprise" className="mt-3">
        <div className="card-body text-sm text-tertiary leading-normal">
          <p className="p-0">
            Fundalyst is currently a <strong>client-only research tool</strong> with all data persisted in browser localStorage. This architecture is designed for individual use and does not meet enterprise requirements for:
          </p>
          <ul className="about-methodology-list mt-3">
            <li><strong>Authentication &amp; access control</strong> — no user accounts, roles, or permissions</li>
            <li><strong>Encrypted persisted storage</strong> — localStorage is unencrypted and browser-scoped</li>
            <li><strong>Audit logs</strong> — no tracking of data access or changes</li>
            <li><strong>Admin retention controls</strong> — no data lifecycle management or policy enforcement</li>
            <li><strong>Team workspaces</strong> — no shared spaces, collaboration, or conflict resolution</li>
          </ul>
          <p className="p-0 mt-3">
            <strong>Current:</strong> Client-side localStorage. All computation happens in-browser. No server uploads.
          </p>
          <p className="p-0">
            <strong>Enterprise:</strong> Would require a server-backed deployment with authenticated access, encrypted database storage, audit trail logging, admin retention policies, and team workspace management.
          </p>
          <p className="p-0 mt-3">
            Contact us for enterprise deployment options.
          </p>
        </div>
      </Card>

      {/* CTA */}
      <div className="mt-6 text-center">
        <Link href="/import" className="about-cta-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 2v10M3 7l5-5 5 5" /><path d="M2 13v1h12v-1" />
          </svg>
          Start analyzing
        </Link>
      </div>

      <Disclaimer extra="All data stays in browser localStorage — not encrypted, per-browser only. Export your workspace for backup." />
    </div>
  );
}
