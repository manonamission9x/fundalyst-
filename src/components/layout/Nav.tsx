'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGlobalDataStore } from '@/store/global-data-store';
import {
  LayoutDashboard, Upload, FileText, TrendingUp, BarChart3,
  Calculator, DollarSign, PieChart, Users, FolderKanban, Info,
  ArrowUpFromLine,
} from 'lucide-react';

const items: { id: string; label: string; href: string; group?: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', href: '/', icon: <LayoutDashboard size={14} /> },
  { id: 'import', label: 'Import', href: '/import', icon: <Upload size={14} /> },
  { id: 'filing', label: 'Filing', href: '/research/filing', group: 'Research', icon: <FileText size={14} /> },
  { id: 'trends', label: 'Trends', href: '/research/trends', group: 'Research', icon: <TrendingUp size={14} /> },
  { id: 'growth', label: 'Growth', href: '/research/growth', group: 'Research', icon: <BarChart3 size={14} /> },
  { id: 'dcf', label: 'DCF', href: '/tools/dcf', group: 'Analysis', icon: <Calculator size={14} /> },
  { id: 'wc', label: 'Cash', href: '/tools/wc', group: 'Analysis', icon: <DollarSign size={14} /> },
  { id: 'ratios', label: 'Ratios', href: '/tools/ratios', group: 'Analysis', icon: <PieChart size={14} /> },
  { id: 'peer', label: 'Peer', href: '/tools/peer', group: 'Analysis', icon: <Users size={14} /> },
  { id: 'workspace', label: 'Workspace', href: '/workspace', icon: <FolderKanban size={14} /> },
  { id: 'about', label: 'About', href: '/about', icon: <Info size={14} /> },
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
    return (pathname.replace(/\/$/, '') || '/') === (href.replace(/\/$/, '') || '/');
  }

  return (
    <nav className="nav" role="tablist" aria-label="Tool navigation">
      <div className="nav-inner">
        <Link href="/" className="nav-brand" aria-label="Fundalyst home">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <rect width="20" height="20" rx="3" fill="#4F6EF7" />
            <path d="M5 14V6L10 10L15 6V14" stroke="rgba(13,13,15,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Fundalyst</span>
        </Link>
        {items.map((item, i) => {
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
                <span>{item.label}</span>
              </Link>
            </React.Fragment>
          );
        })}
        <div className="nav-right">
          {activeDataset && activeDataset.facts.length > 0 && (
            <span
              className="nav-badge"
              title={`${activeDataset.companyName || 'Imported data'} — ${activeDataset.facts.length} facts, ${activeDataset.periods.length} periods`}
            >
              <span className="nav-badge-dot" />
              {activeDataset.companyName || `${activeDataset.facts.length} metrics`}
            </span>
          )}
          <Link href="/import" className="nav-cta">
            <ArrowUpFromLine size={12} />
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
