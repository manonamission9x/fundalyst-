'use client';

import Link from 'next/link';
import { useGlobalDataStore } from '@/store/global-data-store';

const tools = [
  {
    section: 'Research',
    items: [
      { href: '/research/filing', label: 'Filing Comparison', desc: 'Compare two periods line by line. Spot changes in revenue, margins, debt, and promoter holding.', color: '#2ECC71' },
      { href: '/research/trends', label: 'Trend Charts', desc: 'Plot revenue, profit, and costs over 3+ years. Spot inflection points at a glance.', color: '#3498DB' },
      { href: '/research/growth', label: 'Growth Rates', desc: 'Year-over-year growth for every line item. Automatically color-coded for direction.', color: '#F0B429' },
    ],
  },
  {
    section: 'Valuation & Analysis',
    items: [
      { href: '/tools/dcf', label: 'DCF Valuation', desc: 'Estimate intrinsic value per share with sensitivity tables. Adjust assumptions in real time.', color: '#9B59B6' },
      { href: '/tools/wc', label: 'Cash Efficiency', desc: 'DSO, DIO, DPO, and the Cash Conversion Cycle. See where cash is trapped.', color: '#1ABC9C' },
      { href: '/tools/ratios', label: 'Financial Ratios', desc: 'Liquidity, leverage, profitability, and efficiency — 9 ratios, one click.', color: '#E74C3C' },
      { href: '/tools/peer', label: 'Peer Comparison', desc: 'Compare up to 10 companies side-by-side. Leaders and laggards highlighted instantly.', color: '#6C5CE7' },
    ],
  },
];

const trustItems = [
  { text: 'All computation in your browser — zero server uploads', detail: 'Privacy first' },
  { text: 'Indian market formats: ₹, Cr, Lakhs, Crores, NSE/BSE', detail: 'Local by design' },
  { text: 'Every formula is documented and visible', detail: 'No black boxes' },
  { text: 'No account, no sign-up, no data sharing', detail: 'Use instantly' },
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
      <section style={{
        padding: '4rem 0 3rem',
        textAlign: 'center',
        borderBottom: '1px solid var(--border-light)',
        marginBottom: '3rem',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--primary)',
            fontWeight: 500, marginBottom: 16, letterSpacing: '0.04em',
            padding: '4px 12px', border: '1px solid rgba(79,110,247,0.2)',
            borderRadius: 'var(--radius-sm)', background: 'var(--primary-subtle)',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 10l3-3 2 2 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Browser-based · No uploads to any server
          </div>

          <h1 style={{
            fontSize: 36, fontWeight: 650, letterSpacing: '-0.028em',
            lineHeight: 1.12, margin: '0 0 14px', color: 'var(--text)',
          }}>
            Understand any company&apos;s financial health
            <br />
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 450 }}>
              in minutes, not hours.
            </span>
          </h1>
          <p style={{
            fontSize: 15, color: 'var(--text-tertiary)', lineHeight: 1.65,
            margin: '0 auto 28px', maxWidth: 540,
          }}>
            Upload a CSV, Excel file, or paste numbers directly. Fundalyst extracts the data,
            runs the calculations, and shows you what matters — all inside your browser.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/import" style={{
              fontSize: 14, fontWeight: 550,
              background: 'var(--primary)', border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '11px 28px', cursor: 'pointer', color: '#fff',
              transition: 'all 0.12s ease', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              lineHeight: 1.4,
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={(e) => e.currentTarget.style.transform = ''}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 2v10M3 7l5-5 5 5" /><path d="M2 13v1h12v-1" />
              </svg>
              Upload financial data
            </Link>
            <Link href="/tools/dcf" style={{
              fontSize: 14, fontWeight: 500,
              padding: '11px 24px',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              transition: 'all 0.12s ease', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              lineHeight: 1.4,
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-tertiary)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              Try with sample data →
            </Link>
          </div>

          {/* Data status */}
          {activeDataset && (
            <div style={{
              marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '7px 16px', background: 'var(--green-subtle)',
              border: '1px solid rgba(46,204,113,0.15)', borderRadius: 'var(--radius-md)',
              fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--green)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
              {activeDataset.companyName || `${activeDataset.facts.length} metrics loaded`}
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <Link href="/research/filing" style={{ color: 'var(--green)', textDecoration: 'none' }}>
                Continue analysis →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          marginBottom: 20, fontFamily: 'var(--font-mono)',
        }}>
          Three steps to insight
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
        }}>
          {[
            {
              step: '01', icon: 'upload',
              title: 'Import your data',
              desc: 'Upload a CSV, Excel file, PDF, or paste numbers directly. Fundalyst detects periods, normalizes ₹/Cr/Lakh values, and maps metrics automatically.',
            },
            {
              step: '02', icon: 'review',
              title: 'Review the mapping',
              desc: 'Check how your data was interpreted. Fix any mismatches with one click, then load the cleaned dataset into any analysis tool.',
            },
            {
              step: '03', icon: 'analyze',
              title: 'Run your analysis',
              desc: 'Compare periods, value companies, check ratios, and benchmark peers — all tools share the same data. No re-importing, no duplicate work.',
            },
          ].map((item) => (
            <div key={item.step} style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)', padding: '24px',
              transition: 'border-color 0.12s ease',
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-subtle)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
                marginBottom: 14,
              }}>
                {item.step}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tools grid ── */}
      {tools.map((group) => (
        <section key={group.section} style={{ marginBottom: '2.5rem' }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 14, fontFamily: 'var(--font-mono)',
          }}>
            {group.section}
          </div>
          <div className="home-grid" style={{ maxWidth: '100%' }}>
            {group.items.map((t) => (
              <Link key={t.href} href={t.href} className="home-card"
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-surface)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              >
                <div className="home-card-icon" style={{ background: t.color + '18', color: t.color }}>
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
      <section style={{
        marginTop: '1.5rem', padding: '2rem 0',
        borderTop: '1px solid var(--border-light)',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
        }}>
          {trustItems.map((item) => (
            <div key={item.text} style={{
              padding: '16px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)', border: '1px solid var(--border-light)',
            }}>
              <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, marginBottom: 4, lineHeight: 1.4 }}>
                {item.text}
              </div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {item.detail}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ textAlign: 'center', padding: '2.5rem 0 0.5rem' }}>
        <h2 style={{
          fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em',
          margin: '0 0 8px', color: 'var(--text)',
        }}>
          Ready to analyze your first company?
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
          No account needed. No data leaves your browser.
        </p>
        <Link href="/import" style={{
          fontSize: 14, fontWeight: 550,
          background: 'var(--primary)', border: 'none',
          borderRadius: 'var(--radius-md)',
          padding: '11px 28px', cursor: 'pointer', color: '#fff',
          transition: 'all 0.12s ease', textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          lineHeight: 1.4,
        }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 2v10M3 7l5-5 5 5" /><path d="M2 13v1h12v-1" />
          </svg>
          Upload financial data
        </Link>
      </section>
    </div>
  );
}
