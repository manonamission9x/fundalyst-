'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGlobalDataStore } from '@/store/global-data-store';
import { openCommandPalette } from '@/components/layout/CommandPalette';
import { generateMemo, downloadMemoMarkdown } from '@/lib/memo-export';
import {
  IconNavImport,
  IconNavFiling,
  IconNavTrends,
  IconNavGrowth,
  IconNavDCF,
  IconNavCash,
  IconNavRatios,
  IconNavPeer,
  IconNavWorkspace,
} from '@/components/ui';

function ThemeToggle() {
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fundalyst-theme');
      if (saved === 'light' || saved === 'dark') {
        document.documentElement.setAttribute('data-theme', saved);
        return saved;
      }
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    return 'dark';
  });

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : theme === 'light' ? 'auto' : 'dark';
    setTheme(next);
    if (next === 'auto') {
      localStorage.removeItem('fundalyst-theme');
      document.documentElement.removeAttribute('data-theme');
    } else {
      localStorage.setItem('fundalyst-theme', next);
      document.documentElement.setAttribute('data-theme', next);
    }
  }, [theme]);

  return (
    <button
      type="button"
      className="nav-theme-toggle"
      onClick={toggle}
      title={theme === 'auto' ? 'Auto theme' : theme === 'light' ? 'Light theme' : 'Dark theme'}
      aria-label={`Theme: ${theme}. Click to switch.`}
      style={{ minWidth: 28, justifyContent: 'center', padding: '4px 7px' }}
    >
      {theme === 'auto' ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="2.5" />
          <path d="M6 1v1M6 10v1M1 6h1M10 6h1M2.1 2.1l.7.7M9.2 9.2l.7.7M2.1 9.9l.7-.7M9.2 2.8l.7-.7" />
        </svg>
      ) : theme === 'light' ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <circle cx="6" cy="6" r="3" />
          <path d="M6 1v2M6 9v2M1 6h2M9 6h2M2.8 2.8l1.4 1.4M7.8 7.8l1.4 1.4M2.8 9.2l1.4-1.4M7.8 4.2l1.4-1.4" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <path d="M9.5 8.5A5 5 0 013.5 2.5 5 5 0 109.5 8.5z" />
        </svg>
      )}
    </button>
  );
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    label: 'Research',
    items: [
      { id: 'filing', label: 'Filing Comparison', href: '/research/filing', icon: <IconNavFiling /> },
      { id: 'trends', label: 'Trend Charts', href: '/research/trends', icon: <IconNavTrends /> },
      { id: 'growth', label: 'Growth Rates', href: '/research/growth', icon: <IconNavGrowth /> },
    ],
  },
  {
    label: 'Valuation',
    items: [
      { id: 'dcf', label: 'DCF Valuation', href: '/tools/dcf', icon: <IconNavDCF /> },
      { id: 'wc', label: 'Cash Efficiency', href: '/tools/wc', icon: <IconNavCash /> },
      { id: 'ratios', label: 'Financial Ratios', href: '/tools/ratios', icon: <IconNavRatios /> },
      { id: 'peer', label: 'Peer Comparison', href: '/tools/peer', icon: <IconNavPeer /> },
    ],
  },
  {
    label: 'Data',
    items: [
      { id: 'import', label: 'Import', href: '/import', icon: <IconNavImport /> },
    ],
  },
  {
    label: 'Tools',
    items: [
      { id: 'workspace', label: 'Workspace', href: '/workspace', icon: <IconNavWorkspace /> },
    ],
  },
];

export default function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const activeDataset = useGlobalDataStore((s) => {
    if (!s.activeDatasetId && s.datasets.length === 0) return null;
    const active = s.datasets.find((d) => d.id === s.activeDatasetId);
    return active || s.datasets[0] || null;
  });
  const clearAllData = useGlobalDataStore((s) => s.clearAllData);

  function isActive(href: string): boolean {
    return (pathname.replace(/\/$/, '') || '/') === (href.replace(/\/$/, '') || '/');
  }

  // Close mobile menu on navigation
  const handleNavClick = useCallback(() => {
    setMobileOpen(false);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  // Close on click outside
  useEffect(() => {
    if (!mobileOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          toggleRef.current && !toggleRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mobileOpen]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <nav className="nav" role="tablist" aria-label="Tool navigation">
      <div className="nav-inner">
        <Link href="/" className="nav-brand" aria-label="Fundalyst home">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <rect width="20" height="20" rx="3" fill="#C8962E" />
            <path d="M5 14V6L10 10L15 6V14" stroke="rgba(14,14,15,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Fundalyst</span>
        </Link>

        {/* Desktop nav tabs (hidden on mobile) */}
        <div className="nav-desktop-tabs">
          {sections.map((section) => (
            <React.Fragment key={section.label}>
              <span className="nav-section-label">{section.label}</span>
              {section.items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`nav-tab${isActive(item.href) ? ' active' : ''}`}
                  id={`${item.id}-tab`}
                  role="tab"
                  aria-selected={isActive(item.href)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </React.Fragment>
          ))}

          <span className="nav-sep" />
        </div>

        <div className="nav-right">
          <button
            type="button"
            className="nav-cmdk-trigger"
            onClick={openCommandPalette}
            aria-label="Open command palette"
            title="Command palette (Ctrl/Cmd+K)"
          >
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="4" /><path d="M13 13l-3-3" />
            </svg>
            <span>⌘K</span>
          </button>
          {activeDataset && activeDataset.facts.length > 0 && (
            <span
              className="nav-badge"
              title={`${activeDataset.companyName || 'Imported data'} — ${activeDataset.facts.length} facts, ${activeDataset.periods.length} periods`}
            >
              <span className="nav-badge-dot" />
              {activeDataset.companyName || `${activeDataset.facts.length} metrics`}
            </span>
          )}
          {activeDataset && activeDataset.facts.length > 0 && (
            <button
              type="button"
              className="nav-cta"
              onClick={() => {
                const ds = useGlobalDataStore.getState().getActiveDataset();
                if (!ds) return;
                downloadMemoMarkdown(generateMemo({ companyName: ds.companyName || 'Company', dataset: ds }));
              }}
              aria-label="Export investment memo"
              title="Export investment memo (Markdown)"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 2v8M4 7l3 3 3-3" /><path d="M2 11v1h10v-1" />
              </svg>
              <span>Memo</span>
            </button>
          )}
          <Link href="/import" className="nav-cta">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 2v7M4 6l3 3 3-3" /><path d="M2 11v1h10v-1" />
            </svg>
            <span>Import financials</span>
          </Link>
          <ThemeToggle />
          <button
            type="button"
            className="nav-mobile-toggle"
            ref={toggleRef}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            aria-controls="nav-mobile-menu"
          >
            <span className={`nav-hamburger${mobileOpen ? ' open' : ''}`}>
              <span /><span /><span />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile overlay menu */}
      <div
        id="nav-mobile-menu"
        ref={menuRef}
        className={`nav-mobile-overlay${mobileOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="nav-mobile-header">
          <Link href="/" className="nav-mobile-brand" onClick={handleNavClick} aria-label="Fundalyst home">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect width="20" height="20" rx="3" fill="#C8962E" />
              <path d="M5 14V6L10 10L15 6V14" stroke="rgba(14,14,15,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Fundalyst
          </Link>
          {activeDataset && activeDataset.facts.length > 0 && (
            <span className="nav-mobile-badge">
              <span className="nav-badge-dot" />
              {activeDataset.companyName || `${activeDataset.facts.length} metrics`}
            </span>
          )}
        </div>

        <div className="nav-mobile-items">
          {sections.map((section) => (
            <React.Fragment key={section.label}>
              <span className="nav-mobile-section-label">{section.label}</span>
              {section.items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`nav-mobile-item${isActive(item.href) ? ' active' : ''}`}
                  onClick={handleNavClick}
                  role="tab"
                  aria-selected={isActive(item.href)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {isActive(item.href) && <span className="nav-mobile-check" aria-hidden="true">✓</span>}
                </Link>
              ))}
            </React.Fragment>
          ))}
        </div>

        <div className="nav-mobile-footer">
          {activeDataset && (
            <button
              type="button"
              className="nav-mobile-clear"
              onClick={() => { clearAllData(); setMobileOpen(false); }}
            >
              Clear all data
            </button>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="nav-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </nav>
  );
}
