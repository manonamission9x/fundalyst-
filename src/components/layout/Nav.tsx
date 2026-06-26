'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGlobalDataStore } from '@/store/global-data-store';
import { IconNavHome, IconNavImport, IconNavFiling, IconNavTrends, IconNavGrowth, IconNavDCF, IconNavCash, IconNavRatios, IconNavPeer, IconNavWorkspace, IconNavAbout, IconUpload } from '@/components/ui';

const items: { id: string; label: string; href: string; group?: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', href: '/', icon: <IconNavHome /> },
  { id: 'import', label: 'Import', href: '/import', icon: <IconNavImport /> },
  { id: 'filing', label: 'Filing', href: '/research/filing', group: 'Research', icon: <IconNavFiling /> },
  { id: 'trends', label: 'Trends', href: '/research/trends', group: 'Research', icon: <IconNavTrends /> },
  { id: 'growth', label: 'Growth', href: '/research/growth', group: 'Research', icon: <IconNavGrowth /> },
  { id: 'dcf', label: 'DCF', href: '/tools/dcf', group: 'Analysis', icon: <IconNavDCF /> },
  { id: 'wc', label: 'Cash', href: '/tools/wc', group: 'Analysis', icon: <IconNavCash /> },
  { id: 'ratios', label: 'Ratios', href: '/tools/ratios', group: 'Analysis', icon: <IconNavRatios /> },
  { id: 'peer', label: 'Peer', href: '/tools/peer', group: 'Analysis', icon: <IconNavPeer /> },
  { id: 'workspace', label: 'Workspace', href: '/workspace', icon: <IconNavWorkspace /> },
  { id: 'about', label: 'About', href: '/about', icon: <IconNavAbout /> },
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
            <rect width="20" height="20" rx="3" fill="#7B8DA0" />
            <path d="M5 14V6L10 10L15 6V14" stroke="rgba(13,13,15,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
                {item.icon}
                {item.label}
              </Link>
            </React.Fragment>
          );
        })}
        <div className="nav-right">
          {/* Global data status badge */}
          {activeDataset && activeDataset.facts.length > 0 && (
            <span
              className="nav-badge"
              title={`${activeDataset.companyName || 'Data'} — ${activeDataset.facts.length} facts, ${activeDataset.periods.length} periods`}
            >
              <span className="nav-badge-dot" />
              {activeDataset.companyName || `${activeDataset.facts.length} metrics`}
            </span>
          )}
          <Link href="/import" className="nav-cta">
            <IconUpload />
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
