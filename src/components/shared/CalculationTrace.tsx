'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CalculationTrace, CalculationSource } from '@/lib/calculation-trace';
import type { ProvenanceKind } from '@/types/financial';
import { ProvenanceDot } from '@/components/ui';
import { explainTrace } from '@/lib/grounded-ai';

/** Derive a provenance kind from a trace source's origin metadata. */
function sourceKind(source: CalculationSource): ProvenanceKind {
  if (source.overridden) return 'manual';
  if (source.source.toLowerCase().startsWith('manual')) return 'manual';
  if (!source.factId) return 'default';
  return 'imported';
}

function formatConfidence(confidence?: number): string {
  if (confidence === undefined) return 'Manual';
  return `${Math.round(confidence * 100)}%`;
}

function formatDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CalculationTracePanel({ traces }: { traces: CalculationTrace[] }) {
  const [open, setOpen] = useState(false);
  const [explained, setExplained] = useState<Record<string, boolean>>({});
  if (traces.length === 0) return null;

  return (
    <div className="calc-trace mt-4">
      <button
        type="button"
        className="btn-ghost btn-sm calc-trace-toggle"
        onClick={() => setOpen((next) => !next)}
        aria-expanded={open}
        aria-label={open ? 'Hide calculation sources' : 'Show calculation sources'}
      >
        {open ? 'Hide sources' : 'Show sources'}
      </button>
      {open && (
        <div className="calc-trace-panel">
          {traces.map((trace) => (
            <div key={trace.label} className="calc-trace-item">
              <div className="calc-trace-head">
                <div>
                  <div className="calc-trace-label">{trace.label}</div>
                  <div className="calc-trace-formula">{trace.formula}</div>
                </div>
                <div className="calc-trace-head-right">
                  <div className="calc-trace-value">{trace.value}</div>
                  <button
                    type="button"
                    className="btn-ghost btn-sm calc-trace-explain-btn"
                    aria-expanded={!!explained[trace.label]}
                    onClick={() => setExplained((prev) => ({ ...prev, [trace.label]: !prev[trace.label] }))}
                  >
                    {explained[trace.label] ? 'Hide explanation' : 'Explain'}
                  </button>
                </div>
              </div>
              {explained[trace.label] && (() => {
                const ex = explainTrace(trace);
                return (
                  <div className="calc-trace-explain" role="note">
                    <span className="calc-trace-explain-tag">Generated locally from your sources</span>
                    <p className="calc-trace-explain-body">{ex.summary}</p>
                    {ex.citations.length > 0 && (
                      <ol className="calc-trace-explain-cites">
                        {ex.citations.map((c) => (
                          <li key={c.ref}>
                            <span className="calc-trace-explain-cite-label">{c.label}:</span> {c.value}
                            <span className="calc-trace-explain-cite-src"> — {c.source}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                );
              })()}
              <div className="calc-trace-source-list" role="list">
                {trace.sources.map((source, index) => {
                  const content = (
                    <>
                      <div className="calc-trace-source-main">
                        <span className="calc-trace-source-label" aria-label={`Source: ${source.label}`}>{source.label}</span>
                        <span className="calc-trace-source-value" aria-label={`Value: ${source.value}`}>
                          {source.value}
                          <ProvenanceDot kind={sourceKind(source)} />
                        </span>
                        <span className={`confidence-badge ${source.confidence !== undefined && source.confidence >= 0.9 ? 'good' : source.confidence !== undefined && source.confidence < 0.7 ? 'warn' : ''}`}>
                          {formatConfidence(source.confidence)}
                        </span>
                      </div>
                      <div className="calc-trace-meta">
                        <span>{source.source}</span>
                        {source.period && <span>{source.period}</span>}
                        {source.originalLabel && <span>Original: {source.originalLabel}</span>}
                        {source.rawValue && <span>Raw: {source.rawValue}</span>}
                        {source.location && <span>{source.location}</span>}
                        {source.capturedAt && <span>{formatDate(source.capturedAt)}</span>}
                        {source.overridden && <span>Edited after import</span>}
                      </div>
                    </>
                  );
                  const className = `calc-trace-source${source.factId ? ' is-clickable' : ''}`;

                  return source.factId ? (
                    <Link
                      key={`${trace.label}-${source.label}-${index}`}
                      href={`/workspace?fact=${encodeURIComponent(source.factId)}`}
                      className={className}
                      role="listitem"
                      aria-label={`Open evidence for ${source.metric || source.label}`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={`${trace.label}-${source.label}-${index}`} className={className} role="listitem">
                      {content}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
