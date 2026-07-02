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
import {
  DownloadSimple,
  MagnifyingGlass,
  Moon,
  Sun,
  UploadSimple,
} from '@phosphor-icons/react';

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fundalyst-theme');
      const dark = saved !== 'light';
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      return dark;
    }
    return true;
  });

  const toggle = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('fundalyst-theme', next ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  }, [isDark]);

  return (
    <button
      type="button"
      className="nav-theme-toggle"
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={`${isDark ? 'Light' : 'Dark'} mode. Click to switch.`}
    >
      {isDark ? <Moon size={13} weight="fill" /> : <Sun size={13} weight="fill" />}
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

const workspaceItem: NavItem = { id: 'workspace', label: 'Workspace', href: '/workspace', icon: <IconNavWorkspace /> };

const desktopSections: NavSection[] = [
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
      { id: 'import', label: 'Import Source', href: '/import', icon: <IconNavImport /> },
    ],
  },
];

const mobileSections: NavSection[] = [
  desktopSections[0],
  desktopSections[1],
  {
    label: 'Data',
    items: [
      { id: 'import', label: 'Import Source', href: '/import', icon: <IconNavImport /> },
      workspaceItem,
    ],
  },
];

export default function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const desktopNavRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activeDataset = useGlobalDataStore((s) => {
    if (!s.activeDatasetId && s.datasets.length === 0) return null;
    const active = s.datasets.find((d) => d.id === s.activeDatasetId);
    return active || s.datasets[0] || null;
  });
  const clearAllData = useGlobalDataStore((s) => s.clearAllData);
  const datasetLabel =
    activeDataset && activeDataset.facts.length > 0
      ? activeDataset.companyName && activeDataset.companyName !== 'Unnamed Company'
        ? activeDataset.companyName
        : `${activeDataset.facts.length} facts`
      : null;

  function isActive(href: string): boolean {
    return (pathname.replace(/\/$/, '') || '/') === (href.replace(/\/$/, '') || '/');
  }

  function isSectionActive(section: NavSection): boolean {
    return section.items.some((item) => isActive(item.href));
  }

  // Close mobile menu on navigation
  const handleNavClick = useCallback(() => {
    setMobileOpen(false);
    setOpenSection(null);
  }, []);

  const closeDesktopMenu = useCallback((focusLabel?: string) => {
    setOpenSection(null);
    if (focusLabel) {
      requestAnimationFrame(() => triggerRefs.current[focusLabel]?.focus());
    }
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && openSection) {
        e.preventDefault();
        closeDesktopMenu(openSection);
        return;
      }
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeDesktopMenu, mobileOpen, openSection]);

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

  useEffect(() => {
    if (!openSection) return;
    function handleClick(e: MouseEvent) {
      if (desktopNavRef.current && !desktopNavRef.current.contains(e.target as Node)) {
        setOpenSection(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openSection]);

  function handleSectionKeyDown(e: React.KeyboardEvent, section: NavSection) {
    const isOpen = openSection === section.label;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpenSection(isOpen ? null : section.label);
      if (!isOpen) {
        requestAnimationFrame(() => {
          desktopNavRef.current
            ?.querySelector<HTMLAnchorElement>(`[data-nav-section="${section.label}"] a`)
            ?.focus();
        });
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpenSection(section.label);
      requestAnimationFrame(() => {
        desktopNavRef.current
          ?.querySelector<HTMLAnchorElement>(`[data-nav-section="${section.label}"] a`)
          ?.focus();
      });
    }
  }

  function handleDropdownKeyDown(e: React.KeyboardEvent, section: NavSection) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDesktopMenu(section.label);
      return;
    }
    if (e.key !== 'Tab') return;

    const links = Array.from(
      desktopNavRef.current?.querySelectorAll<HTMLAnchorElement>(`[data-nav-section="${section.label}"] a`) ?? [],
    );
    if (links.length === 0) return;

    const first = links[0];
    const last = links[links.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

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
    <nav className="nav" aria-label="Tool navigation">
      <div className="nav-inner">
        <Link href="/" className="nav-brand" aria-label="Fundalyst home">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <rect width="20" height="20" rx="3" fill="var(--primary)" />
            <path d="M5 14V6L10 10L15 6V14" stroke="rgba(12,12,14,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Fundalyst</span>
        </Link>

        {/* Desktop nav tabs (hidden on mobile) */}
        <div className="nav-desktop-tabs" ref={desktopNavRef}>
          <Link
            href={workspaceItem.href}
            className={`nav-tab nav-tab-primary${isActive(workspaceItem.href) ? ' active' : ''}`}
            aria-current={isActive(workspaceItem.href) ? 'page' : undefined}
          >
            {workspaceItem.icon}
            <span>{workspaceItem.label}</span>
          </Link>

          {desktopSections.map((section) => {
            const isOpen = openSection === section.label;
            const sectionActive = isSectionActive(section);
            return (
              <div
                key={section.label}
                className="nav-section"
                data-nav-section={section.label}
                onMouseEnter={() => setOpenSection(section.label)}
              >
                <button
                  type="button"
                  ref={(el) => { triggerRefs.current[section.label] = el; }}
                  className={`nav-section-trigger${sectionActive ? ' active' : ''}${isOpen ? ' open' : ''}`}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  aria-controls={`nav-menu-${section.label.toLowerCase()}`}
                  onClick={() => setOpenSection(isOpen ? null : section.label)}
                  onKeyDown={(e) => handleSectionKeyDown(e, section)}
                >
                  <span>{section.label}</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2.5 3.75L5 6.25l2.5-2.5" />
                  </svg>
                </button>
                {isOpen && (
                  <div
                    id={`nav-menu-${section.label.toLowerCase()}`}
                    className="nav-dropdown"
                    role="menu"
                    onKeyDown={(e) => handleDropdownKeyDown(e, section)}
                    onMouseLeave={() => setOpenSection(null)}
                  >
                    {section.items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={`nav-dropdown-item${isActive(item.href) ? ' active' : ''}`}
                        role="menuitem"
                        aria-current={isActive(item.href) ? 'page' : undefined}
                        onClick={handleNavClick}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <span className="nav-sep" />
        </div>

        <div className="nav-right">
          {datasetLabel && (
            <span
              className="nav-badge"
              title={`${activeDataset?.companyName || 'Imported data'} - ${activeDataset?.facts.length || 0} facts, ${activeDataset?.periods.length || 0} periods`}
            >
              <span className="nav-badge-dot" />
              <span>{datasetLabel}</span>
            </span>
          )}
          <button
            type="button"
            className="nav-cmdk-trigger"
            onClick={openCommandPalette}
            aria-label="Open command palette"
            title="Open command palette"
          >
            <MagnifyingGlass size={13} weight="regular" />
            <span>Search</span>
          </button>
          <Link href="/import" className="nav-cta nav-cta-primary">
            <UploadSimple size={13} weight="regular" />
            <span>Import</span>
          </Link>
          <div className="nav-utility-group" aria-label="Utilities">
            {activeDataset && activeDataset.facts.length > 0 && (
              <button
                type="button"
                className="nav-icon-btn"
                onClick={() => {
                  const ds = useGlobalDataStore.getState().getActiveDataset();
                  if (!ds) return;
                  downloadMemoMarkdown(generateMemo({ companyName: ds.companyName || 'Company', dataset: ds }));
                }}
                aria-label="Export investment memo"
                title="Export memo"
              >
                <DownloadSimple size={13} weight="regular" />
              </button>
            )}
            <ThemeToggle />
          </div>
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
              <rect width="20" height="20" rx="3" fill="var(--primary)" />
              <path d="M5 14V6L10 10L15 6V14" stroke="rgba(12,12,14,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
          {mobileSections.map((section) => (
            <React.Fragment key={section.label}>
              <span className="nav-mobile-section-label">{section.label}</span>
              {section.items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`nav-mobile-item${isActive(item.href) ? ' active' : ''}`}
                  onClick={handleNavClick}
                  aria-current={isActive(item.href) ? 'page' : undefined}
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
