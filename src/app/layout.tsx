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
  icons: {
    icon: [
      { url: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22><rect width=%2220%22 height=%2220%22 rx=%225%22 fill=%22%234F6EF7%22/><path d=%22M5 14V6L10 10L15 6V14%22 stroke=%22white%22 stroke-width=%221.5%22 fill=%22none%22/></svg>', type: 'image/svg+xml' },
    ],
  },
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
          {/* Site-wide footer */}
          <footer style={{
            textAlign: 'center',
            padding: 'var(--space-6) var(--space-4) var(--space-4)',
            borderTop: '1px solid var(--border-light)',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            position: 'relative',
            zIndex: 1,
          }}>
            <div style={{ marginBottom: 4 }}>
              Fundalyst · All calculations client-side · For research purposes only · Not financial advice
            </div>
            <div>
              © Fundalyst · Data never leaves your browser
            </div>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
