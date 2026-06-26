'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGlobalDataStore } from '@/store/global-data-store';

const items: { id: string; label: string; href: string; group?: string }[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'import', label: 'Import', href: '/import' },
  { id: 'filing', label: 'Filing', href: '/research/filing', group: 'Research' },
  { id: 'trends', label: 'Trends', href: '/research/trends', group: 'Research' },
  { id: 'growth', label: 'Growth', href: '/research/growth', group: 'Research' },
  { id: 'dcf', label: 'DCF', href: '/tools/dcf', group: 'Analysis' },
  { id: 'wc', label: 'Cash', href: '/tools/wc', group: 'Analysis' },
  { id: 'ratios', label: 'Ratios', href: '/tools/ratios', group: 'Analysis' },
  { id: 'peer', label: 'Peer', href: '/tools/peer', group: 'Analysis' },
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
        {items.map((item, i) => {
          // Show separator before first item of a new group (skip first item overall)
          const prevGroup = i > 0 ? items[i - 1].group : null;
          const showSep = item.group && prevGroup && item.group !== prevGroup;
          return (
            <React.Fragment key={item.id}>
              {showSep && <span className="nav-sep" />}
              <Link
                href={item.href}
                className={`nav-tab${isActive(item.href) ? ' active' : ''}`}
                id={`${item.id}-tab`}
                role="tab"
                aria-selected={isActive(item.href)}
              >
                {item.label}
              </Link>
            </React.Fragment>
          );
        })}
        <div className="nav-right">
          {/* Global data status badge */}
          {activeDataset && (
            <span
              className="nav-badge"
              title={`${activeDataset.companyName || 'Data'} — ${activeDataset.facts.length} facts, ${activeDataset.periods.length} periods`}
            >
              <span className="nav-badge-dot" />
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
              className="nav-clear"
              onClick={clearAllData}
              title="Clear all imported data"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
