import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import Nav from '@/components/layout/Nav';
import CommandPalette from '@/components/layout/CommandPalette';
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
          <ErrorBoundary>
            <main id="main-content" className="page" tabIndex={-1}>
              {children}
            </main>
          </ErrorBoundary>
          <footer className="site-footer">
            <div>
              Fundalyst
              <span className="nav-sep" aria-hidden="true" />
              Your data never leaves your machine
              <span className="nav-sep" aria-hidden="true" />
              For research purposes only. Not financial advice.
              <span className="nav-sep" aria-hidden="true" />
              <Link href="/about" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>About</Link>
            </div>
            <div>&copy; 2026 Fundalyst</div>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
