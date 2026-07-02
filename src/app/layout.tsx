import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import Nav from '@/components/layout/Nav';
import MobileTabBar from '@/components/layout/MobileTabBar';
import CommandPalette from '@/components/layout/CommandPalette';
import RouteTracker from '@/components/layout/RouteTracker';
import ToastProvider from '@/components/shared/ToastProvider';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

export const metadata: Metadata = {
  title: { template: '%s — Fundalyst', default: 'Fundalyst — Financial analysis tool for Indian markets' },
  description:
    'Upload financial statements, compare periods, analyze ratios, build DCF valuations, benchmark peers — all in your browser.',
  icons: {
    icon: [
      { url: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22><rect width=%2220%22 height=%2220%22 rx=%223%22 fill=%22%236F7D8C%22/><path d=%22M5 14V6L10 10L15 6V14%22 stroke=%22%230C0C0E%22 stroke-width=%221.5%22 fill=%22none%22/></svg>', type: 'image/svg+xml' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Let content extend under the notch/home indicator so env(safe-area-inset-*)
  // resolves to real values (the nav, tab bar, and .page all rely on it).
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0C0C0E' },
    { media: '(prefers-color-scheme: light)', color: '#F6F5F3' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>

        <ToastProvider>
          <Nav />
          <CommandPalette />
          <RouteTracker />
          <ErrorBoundary>
            <main id="main-content" className="page" tabIndex={-1}>
              {children}
            </main>
          </ErrorBoundary>
          <footer className="site-footer">
            <div className="site-footer-top">
              <div className="site-footer-brand">
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <rect width="20" height="20" rx="3" fill="var(--primary)" />
                  <path d="M5 14V6L10 10L15 6V14" stroke="rgba(12,12,14,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Fundalyst</span>
                <span className="site-footer-tag">Your data never leaves your machine</span>
              </div>
              <nav className="site-footer-links" aria-label="Footer">
                <Link href="/import">Import</Link>
                <Link href="/research/filing">Research</Link>
                <Link href="/tools/dcf">Valuation</Link>
                <Link href="/workspace">Workspace</Link>
                <Link href="/about">About</Link>
              </nav>
            </div>
            <div className="site-footer-bottom">
              <span>For research purposes only. Not financial advice.</span>
              <span>&copy; 2026 Fundalyst</span>
            </div>
          </footer>
          <MobileTabBar />
        </ToastProvider>
      </body>
    </html>
  );
}
