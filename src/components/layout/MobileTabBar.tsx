'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconNavHome,
  IconNavFiling,
  IconNavDCF,
  IconNavImport,
  IconNavWorkspace,
} from '@/components/ui';

/**
 * MobileTabBar — thumb-reachable primary navigation for phones.
 *
 * Best-in-class fintech mobile apps keep the top destinations one tap away in a
 * persistent bottom bar (the full section list still lives in the drawer via
 * <Nav />). Shown only ≤640px (see globals.css .mobile-tabbar). Desktop is
 * untouched.
 */

interface Tab {
  id: string;
  label: string;
  href: string;
  /** Route prefix that marks this tab active (covers sub-pages). */
  match: (path: string) => boolean;
  icon: React.ReactNode;
}

const norm = (p: string) => (p.replace(/\/$/, '') || '/');

const TABS: Tab[] = [
  { id: 'home', label: 'Home', href: '/', match: (p) => norm(p) === '/', icon: <IconNavHome /> },
  { id: 'research', label: 'Research', href: '/research/filing', match: (p) => p.startsWith('/research'), icon: <IconNavFiling /> },
  { id: 'tools', label: 'Tools', href: '/tools/dcf', match: (p) => p.startsWith('/tools'), icon: <IconNavDCF /> },
  { id: 'import', label: 'Import', href: '/import', match: (p) => p.startsWith('/import'), icon: <IconNavImport /> },
  { id: 'workspace', label: 'Workspace', href: '/workspace', match: (p) => p.startsWith('/workspace'), icon: <IconNavWorkspace /> },
];

export default function MobileTabBar() {
  const pathname = usePathname() ?? '/';

  return (
    <nav className="mobile-tabbar" aria-label="Primary" role="navigation">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`mobile-tab${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="mobile-tab-icon" aria-hidden="true">{tab.icon}</span>
            <span className="mobile-tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
