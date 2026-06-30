'use client';

import Link from 'next/link';
import { canonicalDisplayName } from '@/lib/importer/metric-aliases';

export interface MissingMetricsNoticeProps {
  toolName: string;
  missingMetrics: string[];
  presentMetrics: string[];
}

export default function MissingMetricsNotice({
  toolName,
  missingMetrics,
  presentMetrics,
}: MissingMetricsNoticeProps) {
  if (missingMetrics.length === 0) return null;

  const missingNames = missingMetrics.map(canonicalDisplayName);
  const presentNames = presentMetrics.map(canonicalDisplayName);

  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--amber-subtle, #fff8e1)',
        border: '1px solid var(--amber, #f59e0b)',
        fontSize: 12,
        lineHeight: 1.6,
        marginBottom: 16,
      }}
      role="alert"
    >
      <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
        {toolName} — partially configured
      </div>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>
        Missing: <strong>{missingNames.join(', ')}</strong>
      </div>
      {presentNames.length > 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 6 }}>
          Present: {presentNames.join(', ')}
        </div>
      )}
      <div style={{ marginTop: 6 }}>
        <Link
          href="/import"
          style={{
            color: 'var(--primary)',
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: 11,
          }}
        >
          Import additional data →
        </Link>
        <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 11 }}>
          or enter values manually in the spreadsheet below.
        </span>
      </div>
    </div>
  );
}
