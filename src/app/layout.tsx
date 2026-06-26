import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import Nav from '@/components/layout/Nav';
import ToastProvider from '@/components/shared/ToastProvider';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

const ibmPlexSans = IBM_Plex_Sans({
  variable: '--font-ibm-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Fundalyst — Financial analysis tool for Indian markets',
  description:
    'Upload financial statements, compare periods, analyze ratios, build DCF valuations, benchmark peers — all in your browser, no server uploads.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body>
        {/* Skip to content — keyboard navigation (CSS-only, no JS needed) */}
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <ToastProvider>
          <Nav />
          <ErrorBoundary>
            <main id="main-content" className="page" tabIndex={-1}>
              {children}
            </main>
          </ErrorBoundary>
        </ToastProvider>
      </body>
    </html>
  );
}
