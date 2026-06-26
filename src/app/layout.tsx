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

        {/* Premium Background Layers */}
        <div className="bg-noise" aria-hidden="true" />
        <div className="bg-curves" aria-hidden="true">
          <svg viewBox="0 0 1200 800" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path className="bg-curve-path" d="M0,600 C200,400 300,700 600,500 C800,350 950,550 1200,450" />
            <path className="bg-curve-path" d="M0,300 C150,450 400,200 600,350 C800,500 1000,250 1200,400" />
            <path className="bg-curve-path" d="M0,700 C250,550 450,800 700,600 C900,450 1050,650 1200,550" />
            <path className="bg-curve-path" d="M0,200 C300,350 500,150 750,250 C950,350 1100,150 1200,300" />
          </svg>
        </div>

        {/* Mouse parallax for background depth */}
        <script dangerouslySetInnerHTML={{
          __html: "document.addEventListener('mousemove',function(e){var x=e.clientX/window.innerWidth*100,y=e.clientY/window.innerHeight*100;document.documentElement.style.setProperty('--glow-x-1',(20+x*0.15)+'%');document.documentElement.style.setProperty('--glow-y-1',(15+y*0.15)+'%');document.documentElement.style.setProperty('--glow-x-2',(70-x*0.1)+'%');document.documentElement.style.setProperty('--glow-y-2',(75-y*0.1)+'%');})"
        }} />

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
