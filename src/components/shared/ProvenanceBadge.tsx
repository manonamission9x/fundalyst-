'use client';

import type { ProvenanceKind } from '@/types/financial';
import { provenanceKindLabel } from '@/lib/calculation-trace';

const BADGE_STYLES: Record<ProvenanceKind, { bg: string; color: string }> = {
  imported: { bg: '#e8f5e9', color: '#2e7d32' },
  manual: { bg: '#e3f2fd', color: '#1565c0' },
  default: { bg: '#fff8e1', color: '#f57f17' },
  inferred: { bg: '#f3e5f5', color: '#7b1fa2' },
  unavailable: { bg: '#f5f5f5', color: '#9e9e9e' },
};

export interface ProvenanceBadgeProps {
  kind: ProvenanceKind;
  label?: string;
  showLabel?: boolean;
}

/** Small inline badge indicating where a value came from */
export default function ProvenanceBadge({
  kind,
  label,
  showLabel = true,
}: ProvenanceBadgeProps) {
  const style = BADGE_STYLES[kind] || BADGE_STYLES.unavailable;
  const text = label || provenanceKindLabel(kind);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 7px',
        borderRadius: 3,
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        background: style.bg,
        color: style.color,
        whiteSpace: 'nowrap',
        lineHeight: '18px',
      }}
      title={provenanceKindLabel(kind)}
    >
      {kind === 'imported' && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M2 5l2 2 4-4" />
        </svg>
      )}
      {showLabel ? text : text.charAt(0).toUpperCase()}
    </span>
  );
}
