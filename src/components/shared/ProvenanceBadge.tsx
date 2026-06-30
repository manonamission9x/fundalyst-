'use client';

import type { ProvenanceKind } from '@/types/financial';
import { provenanceKindLabel } from '@/lib/calculation-trace';

const BADGE_STYLES: Record<ProvenanceKind, { bg: string; color: string }> = {
  imported: { bg: 'var(--green-subtle)', color: 'var(--green)' },
  manual: { bg: 'var(--primary-subtle)', color: 'var(--primary)' },
  default: { bg: 'var(--caution-subtle)', color: 'var(--caution)' },
  inferred: { bg: 'rgba(123, 126, 200, 0.08)', color: '#8B7EC8' },
  unavailable: { bg: 'var(--bg-surface)', color: 'var(--text-muted)' },
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
        borderRadius: 'var(--radius-sm)',
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
