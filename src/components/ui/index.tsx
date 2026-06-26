'use client';

import Link from 'next/link';
import { useRef } from 'react';

// ── PageHeader ──
interface PageHeaderProps {
  title: string;
  subtitle: string;
  answer?: string;
}
export function PageHeader({ title, subtitle, answer }: PageHeaderProps) {
  return (
    <div className="page-hero">
      <h1>{title}</h1>
      <p className="page-hero-sub">{subtitle}</p>
      {answer && <p className="page-hero-answer">{answer}</p>}
    </div>
  );
}

// ── Card (generic container) ──
interface CardProps {
  label?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  accent?: boolean;
}
export function Card({ label, children, style, className, accent }: CardProps) {
  return (
    <div className={`card${className ? ' ' + className : ''}`} style={style}>
      {accent && <div style={{ height: 3, backgroundColor: 'var(--primary)', borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />}
      {label && (
        <div className="card-header">
          <span className="card-label">{label}</span>
        </div>
      )}
      {children}
    </div>
  );
}

// ── UploadBar ──
interface UploadBarProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hint?: string;
}
export function UploadBar({ onUpload, hint }: UploadBarProps) {
  return (
    <div className="upload-zone">
      <label className="upload-label">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M7 2v10M2 7h10" />
        </svg>
        Upload file
        <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.gif,.webp" style={{ display: 'none' }} onChange={onUpload} />
      </label>
      <span className="upload-sep">·</span>
      <span className="upload-hint">{hint || 'Select a CSV or Excel file'}</span>
    </div>
  );
}

// ── Field ──
let _fieldId = 0;
interface FieldProps {
  label: string;
  value: number | '' | null;
  onChange: (v: number | '') => void;
  hint?: string;
}
export function Field({ label, value, onChange, hint }: FieldProps) {
  const id = `field-${++_fieldId}`;
  return (
    <div className="field-group">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        className="num-input"
        value={value !== null && value !== '' ? value : ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && <div className="field-hint" id={`${id}-hint`}>{hint}</div>}
    </div>
  );
}

// ── FieldGrid ──
export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="field-grid">{children}</div>;
}

// ── Toolbar ──
interface ToolbarProps {
  onClear?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  hint?: string;
  isLoading?: boolean;
}
export function Toolbar({ onClear, onAction, actionLabel, hint, isLoading }: ToolbarProps) {
  return (
    <div className="card-actions">
      {onClear && (
        <button type="button" onClick={onClear} className="btn-ghost">
          Clear
        </button>
      )}
      {hint && <span className="upload-hint">{hint}</span>}
      {onAction && (
        <button
          type="button"
          className="btn-primary"
          disabled={isLoading}
          style={{ marginLeft: 'auto', opacity: isLoading ? 0.6 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
          onClick={onAction}
        >
          {isLoading ? (
            <>
              <span className="spinner" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', marginRight: 6, verticalAlign: 'middle', animation: 'spin 0.6s linear infinite' }} />
              Calculating…
            </>
          ) : (
            actionLabel
          )}
        </button>
      )}
    </div>
  );
}

// ── NextLinks ──
interface NextLink {
  label: string;
  href: string;
}
export function NextLinks({ links }: { links: NextLink[] }) {
  return (
    <div className="next-links">
      <span className="next-label">Next:</span>
      {links.map((l, i) => (
        <span key={i}>
          <Link href={l.href}>{l.label} →</Link>
        </span>
      ))}
    </div>
  );
}

// ── Disclaimer ──
export function Disclaimer({ extra }: { extra?: string }) {
  return (
    <div className="disclaimer">
      <span>All calculations performed client-side</span>
      <span>For research purposes only · Not financial advice</span>
      {extra && <span>{extra}</span>}
    </div>
  );
}

// ── EmptyState ──
interface EmptyStateProps {
  title: string;
  desc: string;
  icon?: string;
}
export function EmptyState({ title, desc, icon }: EmptyStateProps) {
  return (
    <Card style={{ marginTop: '1.5rem' }}>
      <div style={{ height: 3, backgroundColor: 'var(--primary)', borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
      <div className="empty-state">
        {icon && <div className="empty-state-icon">{icon}</div>}
        <div className="empty-state-title">{title}</div>
        <div className="empty-state-desc">{desc}</div>
      </div>
    </Card>
  );
}

// ── MetricGrid ──
interface Metric {
  label: string;
  value: string;
  sub?: string;
  cls?: 'good' | 'warn' | 'neutral' | '';
  /** Trend direction: up, down, or flat */
  trend?: 'up' | 'down' | 'flat';
  /** Optional inline bar value (0-1) for comparison visuals */
  bar?: number;
}
export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="metric-grid">
      {metrics.map((m, i) => (
        <div className={'metric-cell' + (m.cls ? ' ' + m.cls : '')} key={i}>
          <div className="metric-label">
            {m.trend && (
              <span className={`trend-arrow trend-${m.trend}`}>
                {m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '→'}
              </span>
            )}
            {m.label}
          </div>
          <div className={'metric-value' + (m.cls ? ' ' + m.cls : '')}>
            {m.value}
          </div>
          {m.sub && <div className="metric-sub">{m.sub}</div>}
          {m.bar !== undefined && (
            <div className="metric-bar">
              <div className="metric-bar-fill" style={{ width: `${Math.max(2, m.bar * 100)}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── InsightCard ──
interface InsightCardProps {
  type: 'positive' | 'risk' | 'warning' | 'info';
  title: string;
  text: string;
  formula?: string;
}
export function InsightCard({ type, title, text, formula }: InsightCardProps) {
  const icons: Record<string, React.ReactNode> = {
    positive: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 16l5-5 3 3 6-6" />
        <path d="M12 8h4v4" />
      </svg>
    ),
    risk: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 1L1 17h16L9 1z" />
        <path d="M9 7v4" />
        <circle cx="9" cy="13.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
    warning: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="8" />
        <path d="M9 5v5" />
        <circle cx="9" cy="13" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    ),
    info: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="8" />
        <path d="M9 8v5" />
        <circle cx="9" cy="5.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    ),
  };
  return (
    <div className={`insight-card ${type}`}>
      <div className="insight-icon">{icons[type]}</div>
      <div className="insight-content">
        <div className="insight-title">{title}</div>
        <div className="insight-text">{text}</div>
        {formula && <div className="insight-formula">{formula}</div>}
      </div>
    </div>
  );
}

// ── WarningCard ──
interface WarningCardProps {
  level: 'danger' | 'caution';
  label: string;
  text: string;
}
export function WarningCard({ level, label, text }: WarningCardProps) {
  return (
    <div className={`warning-card ${level}`}>
      <span className="warning-badge">{level === 'danger' ? 'High' : 'Note'}</span>
      <div>
        <div className="warning-label">{label}</div>
        <div className="warning-text">{text}</div>
      </div>
    </div>
  );
}

// ── DataQualityBar ──
interface DataQualityBarProps {
  source: string;
  periods?: string;
  metrics?: number;
  missing?: number;
}
export function DataQualityBar({ source, periods, metrics, missing }: DataQualityBarProps) {
  const dotClass = source === 'Manual mode' ? 'muted' : source.includes('sample') ? 'warn' : 'good';
  return (
    <div className="data-quality" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.5rem', alignItems: 'center', padding: '0.5rem 0' }}>
      <span className="data-quality-item" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span className={`data-quality-dot ${dotClass}`} style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block' }} />
        Source: {source}
      </span>
      {periods && (
        <span className="data-quality-item" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className={`data-quality-dot ${dotClass}`} style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block' }} />
          {periods}
        </span>
      )}
      {metrics !== undefined && (
        <span className="data-quality-item" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="data-quality-dot good" style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block' }} />
          {metrics} metrics
        </span>
      )}
      {missing !== undefined && missing > 0 && (
        <span className="data-quality-item" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="data-quality-dot warn" style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block' }} />
          {missing} missing
        </span>
      )}
    </div>
  );
}

// ── FormulaDisclosure ──
interface FormulaDisclosureProps {
  formula: string;
  label?: string;
}
export function FormulaDisclosure({ formula, label }: FormulaDisclosureProps) {
  return (
    <div className="insight-formula" style={{ padding: '8px 0' }}>
      {label && <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}: </span>}
      <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{formula}</code>
    </div>
  );
}

// ── SectionTitle ──
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="section-title">{children}</div>;
}

// ── Calculated timestamp ──
export function CalcTimestamp() {
  const timeRef = useRef(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  return (
    <div className="calc-timestamp">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="5" />
        <path d="M6 3v3l2 2" />
      </svg>
      Calculated {timeRef.current}
    </div>
  );
}
interface ResultPanelProps {
  children: React.ReactNode;
  label?: string;
  id?: string;
}
export function ResultPanel({ children, label, id }: ResultPanelProps) {
  return (
    <div id={id} style={{ marginTop: '1.5rem' }}>
      {label && <SectionTitle>{label}</SectionTitle>}
      {children}
    </div>
  );
}
