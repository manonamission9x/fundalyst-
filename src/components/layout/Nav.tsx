'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGlobalDataStore } from '@/store/global-data-store';
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
  IconNavAbout,
} from '@/components/ui';

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

const aboutItem: NavItem = { id: 'about', label: 'About', href: '/about', icon: <IconNavAbout /> };

const allNavItems: NavItem[] = sections.flatMap((s) => s.items);
allNavItems.push(aboutItem);

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
            <rect width="20" height="20" rx="3" fill="#4F6EF7" />
            <path d="M5 14V6L10 10L15 6V14" stroke="rgba(13,13,15,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
          <Link
            href={aboutItem.href}
            className={`nav-tab${isActive(aboutItem.href) ? ' active' : ''}`}
            id={`${aboutItem.id}-tab`}
            role="tab"
            aria-selected={isActive(aboutItem.href)}
          >
            {aboutItem.icon}
            <span>{aboutItem.label}</span>
          </Link>
        </div>

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
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 2v7M4 6l3 3 3-3" /><path d="M2 11v1h10v-1" />
            </svg>
            <span>Import financials</span>
          </Link>
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
              <rect width="20" height="20" rx="3" fill="#4F6EF7" />
              <path d="M5 14V6L10 10L15 6V14" stroke="rgba(13,13,15,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
          <Link
            href={aboutItem.href}
            className={`nav-mobile-item${isActive(aboutItem.href) ? ' active' : ''}`}
            onClick={handleNavClick}
            role="tab"
            aria-selected={isActive(aboutItem.href)}
          >
            {aboutItem.icon}
            <span>{aboutItem.label}</span>
          </Link>
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
