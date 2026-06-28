import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        404
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px' }}>
        Page not found
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: '0 0 28px', lineHeight: 1.6 }}>
        This page doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 18px', border: '1px solid var(--border-strong)',
          borderRadius: 4, color: 'var(--text-secondary)',
          textDecoration: 'none', fontSize: 14,
        }}
      >
        Back to home →
      </Link>
    </div>
  );
}
