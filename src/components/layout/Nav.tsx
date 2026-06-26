'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGlobalDataStore } from '@/store/global-data-store';

const items = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'import', label: 'Import', href: '/import' },
  { id: 'filing', label: 'Filing', href: '/research/filing' },
  { id: 'trends', label: 'Trends', href: '/research/trends' },
  { id: 'dcf', label: 'DCF', href: '/tools/dcf' },
  { id: 'wc', label: 'Cash', href: '/tools/wc' },
  { id: 'ratios', label: 'Ratios', href: '/tools/ratios' },
  { id: 'peer', label: 'Peer', href: '/tools/peer' },
  { id: 'growth', label: 'Growth', href: '/research/growth' },
  { id: 'about', label: 'About', href: '/about' },
];

export default function Nav() {
  const pathname = usePathname();
  const datasets = useGlobalDataStore((s) => s.datasets);
  const activeDataset = useGlobalDataStore((s) => {
    if (!s.activeDatasetId && s.datasets.length === 0) return null;
    const active = s.datasets.find((d) => d.id === s.activeDatasetId);
    return active || s.datasets[0] || null;
  });
  const clearAllData = useGlobalDataStore((s) => s.clearAllData);

  function isActive(href: string): boolean {
    const normalizedPath = pathname.replace(/\/$/, '') || '/';
    const normalizedHref = href.replace(/\/$/, '') || '/';
    return normalizedPath === normalizedHref;
  }

  return (
    <nav className="nav" role="tablist" aria-label="Tool navigation">
      <div className="nav-inner">
        <Link href="/" className="nav-brand" aria-label="Fundalyst home">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <rect width="20" height="20" rx="5" fill="#4F6EF7" />
            <path d="M5 14V6L10 10L15 6V14" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Fundalyst</span>
        </Link>
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`nav-tab${isActive(item.href) ? ' active' : ''}`}
            id={`${item.id}-tab`}
            role="tab"
            aria-selected={isActive(item.href)}
          >
            {item.label}
          </Link>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Global data status badge */}
          {activeDataset && (
            <span
              title={`${activeDataset.companyName || 'Data'} — ${activeDataset.facts.length} facts, ${activeDataset.periods.length} periods`}
              style={{
                fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--green)',
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', border: '1px solid rgba(46,204,113,0.2)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
              {activeDataset.companyName || `${activeDataset.facts.length} metrics`}
            </span>
          )}
          <Link href="/import" className="nav-cta">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 2v8M3 6l4-4 4 4" /><path d="M2 10v2h10v-2" />
            </svg>
            {activeDataset ? 'Import more' : 'Upload Data'}
          </Link>
          {activeDataset && (
            <button
              type="button"
              onClick={clearAllData}
              title="Clear all imported data"
              style={{
                fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
                background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '3px 8px', cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
