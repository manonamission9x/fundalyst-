'use client';

import { useState } from 'react';
import type { CalculationTrace } from '@/lib/calculation-trace';

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
  if (traces.length === 0) return null;

  return (
    <div className="calc-trace mt-4">
      <button
        type="button"
        className="btn-ghost btn-sm calc-trace-toggle"
        onClick={() => setOpen((next) => !next)}
        aria-expanded={open}
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
                <div className="calc-trace-value">{trace.value}</div>
              </div>
              <div className="calc-trace-source-list">
                {trace.sources.map((source, index) => (
                  <div key={`${trace.label}-${source.label}-${index}`} className="calc-trace-source">
                    <div className="calc-trace-source-main">
                      <span className="calc-trace-source-label">{source.label}</span>
                      <span className="calc-trace-source-value">{source.value}</span>
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
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
