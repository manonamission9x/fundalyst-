'use client';

import Link from 'next/link';
import { useRef } from 'react';

// ── Premium SVG Icon Components ──
// All icons: 20×20 viewBox, 1.5px stroke, round caps/joins, currentColor

export function IconFiling() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3h7l4 4v10H4V3z" /><path d="M11 3v4h4" /><path d="M7 12l2 2 3-3" />
    </svg>
  );
}
export function IconTrends() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 16l4-5 3 2 5-6" /><circle cx="14.5" cy="7.5" r="2.5" stroke="currentColor" /><path d="M14.5 5v5" />
    </svg>
  );
}
export function IconGrowth() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="3" height="6" rx="0.5" /><rect x="8.5" y="7" width="3" height="10" rx="0.5" /><rect x="14" y="3" width="3" height="14" rx="0.5" /><path d="M3 17h14" />
    </svg>
  );
}
export function IconDCF() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" /><path d="M10 6v4l3 2" /><path d="M6 14l3-3" strokeWidth="1.2" />
    </svg>
  );
}
export function IconCash() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="6" /><path d="M10 7v6" /><path d="M8 9h4" /><path d="M8 11h4" />
    </svg>
  );
}
export function IconRatios() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="3" /><circle cx="14" cy="13" r="3" /><path d="M9 9l4 4" />
    </svg>
  );
}
export function IconPeer() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="3" /><circle cx="14" cy="7" r="3" /><rect x="4" y="13" width="6" height="4" rx="1" /><rect x="12" y="13" width="6" height="4" rx="1" />
    </svg>
  );
}
export function IconImport() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3v10M5 8l5-5 5 5" /><path d="M3 15v2h14v-2" />
    </svg>
  );
}
export function IconWorkspace() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="6" height="6" rx="1" /><rect x="12" y="3" width="5" height="6" rx="1" /><rect x="3" y="12" width="5" height="5" rx="1" /><rect x="11" y="11" width="6" height="6" rx="1" />
    </svg>
  );
}
export function IconQuickCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 9.5V15a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h5" /><path d="M15 3l-6 6-2-2" /><circle cx="16" cy="4" r="2" />
    </svg>
  );
}
export function IconAbout() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" /><path d="M10 9v4" /><circle cx="10" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function IconUpload() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v8M4 6l4-4 4 4" /><path d="M2 12v2h12v-2" />
    </svg>
  );
}
export function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
export function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l4 4 6-6" />
    </svg>
  );
}
export function IconClock() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="5" /><path d="M6 3v3l2 2" />
    </svg>
  );
}
export function IconCalc() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7l3 3 5-5" />
    </svg>
  );
}
export function IconClear() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l8 8M11 3l-8 8" />
    </svg>
  );
}
export function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M7 2v10M2 7h10" />
    </svg>
  );
}
export function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 2v8M4 7l3 3 3-3" /><path d="M2 11v1h10v-1" />
    </svg>
  );
}
export function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.5" cy="6.5" r="4" /><path d="M13 13l-3-3" />
    </svg>
  );
}

// ── Tool icon set for nav ──
export function IconNavHome() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6l5-4 5 4v5a1 1 0 01-1 1H3a1 1 0 01-1-1V6z" /><path d="M5 11V8h4v3" />
    </svg>
  );
}
export function IconNavImport() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 2v7M4 6l3 3 3-3" /><path d="M2 11v1h10v-1" />
    </svg>
  );
}
export function IconNavFiling() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2h5l3 3v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" /><path d="M8 2v3h3" /><path d="M5 8l2 2 3-3" />
    </svg>
  );
}
export function IconNavTrends() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12l4-5 3 2 4-5" />
    </svg>
  );
}
export function IconNavGrowth() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="8" width="2" height="4" rx="0.5" /><rect x="6" y="5" width="2" height="7" rx="0.5" /><rect x="10" y="2" width="2" height="10" rx="0.5" />
    </svg>
  );
}
export function IconNavDCF() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="5" /><path d="M7 5v3l2 1" />
    </svg>
  );
}
export function IconNavCash() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="4" /><path d="M7 5v4" /><path d="M6 7h2" />
    </svg>
  );
}
export function IconNavRatios() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="5" r="2" /><circle cx="10" cy="9" r="2" /><path d="M6 6l3 3" />
    </svg>
  );
}
export function IconNavPeer() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="5" r="2" /><circle cx="9" cy="5" r="2" /><rect x="3" y="9" width="4" height="3" rx="0.5" /><rect x="8" y="9" width="4" height="3" rx="0.5" />
    </svg>
  );
}
export function IconNavWorkspace() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="4" height="4" rx="0.5" /><rect x="8" y="2" width="4" height="4" rx="0.5" /><rect x="2" y="8" width="4" height="4" rx="0.5" /><rect x="8" y="8" width="4" height="4" rx="0.5" />
    </svg>
  );
}
export function IconNavAbout() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="5" /><path d="M7 6v3" /><circle cx="7" cy="4.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ── Insight card icons ──
export function IconInsightPositive() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 16l5-5 3 3 6-6" /><path d="M12 8h4v4" />
    </svg>
  );
}
export function IconInsightRisk() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1L1 17h16L9 1z" /><path d="M9 7v4" /><circle cx="9" cy="13.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function IconInsightWarning() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="8" /><path d="M9 5v5" /><circle cx="9" cy="13" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function IconInsightInfo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="8" /><path d="M9 8v5" /><circle cx="9" cy="5.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

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

// ── Card ──
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
      {accent && <div className="card-accent" />}
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
        <IconUpload />
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
        <button type="button" onClick={onClear} className="btn-ghost btn-sm">
          <IconClear /> Clear
        </button>
      )}
      {hint && <span className="upload-hint">{hint}</span>}
      {onAction && (
        <button
          type="button"
          className="btn-primary ml-auto"
          disabled={isLoading}
          style={isLoading ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          onClick={onAction}
        >
          {isLoading ? (
            <>
              <span className="spinner" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', marginRight: 6, verticalAlign: 'middle', animation: 'spin 0.6s linear infinite' }} />
              {actionLabel}
            </>
          ) : (
            <>{actionLabel} <IconArrowRight /></>
          )}
        </button>
      )}
    </div>
  );
}

// ── TrustBadge ──
interface TrustBadgeProps {
  label: string;
  variant?: 'good' | 'source';
  icon?: React.ReactNode;
}
export function TrustBadge({ label, variant, icon }: TrustBadgeProps) {
  return (
    <span className={`trust-badge${variant ? ' ' + variant : ''}`}>
      {icon}{label}
    </span>
  );
}

// ── ConfidenceBadge ──
interface ConfidenceBadgeProps {
  confidence: number; // 0-1
  size?: 'sm' | 'xs';
}
export function ConfidenceBadge({ confidence, size = 'sm' }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);
  const variant = confidence >= 0.9 ? 'high' : confidence >= 0.7 ? 'medium' : 'low';
  const dotClass = variant === 'high' ? 'good' : variant === 'medium' ? '' : 'warn';
  const fontSize = size === 'xs' ? '8px' : '9px';
  return (
    <span
      className={`confidence-badge ${dotClass}`}
      style={{ fontSize }}
      title={`Confidence: ${pct}%`}
    >
      {pct}%
    </span>
  );
}

// ── StatRow (Bloomberg-style compact data row) ──
interface StatRowProps {
  label: string;
  value: string;
  sub?: string;
  trend?: 'up' | 'down' | 'flat';
  cls?: string;
}
export function StatRow({ label, value, sub, trend, cls }: StatRowProps) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className={`stat-value${cls ? ' ' + cls : ''}`}>{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
      {trend && (
        <span className={`stat-context trend-${trend}-context`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
        </span>
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
          <Link href={l.href}><IconArrowRight /> {l.label}</Link>
        </span>
      ))}
    </div>
  );
}

// ── Disclaimer ──
export function Disclaimer({ extra }: { extra?: string }) {
  return (
    <div className="disclaimer">
      <span>For research purposes only · Not financial advice</span>
      {extra && <span>{extra}</span>}
    </div>
  );
}

// ── EmptyState ──
interface EmptyStateProps {
  title: string;
  desc: string;
  action?: { label: string; href: string };
  icon?: React.ReactNode;
}
export function EmptyState({ title, desc, action }: EmptyStateProps) {
  return (
    <Card className="mt-4">
      <div className="empty-state">
        <div className="empty-state-title">{title}</div>
        <div className="empty-state-desc">{desc}</div>
        {action && (
          <Link href={action.href} className="empty-state-action">
            {action.label} →
          </Link>
        )}
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
  trend?: 'up' | 'down' | 'flat';
  bar?: number;
  context?: string;       // "5-yr trend: +14.8%"
  contextTrend?: 'up' | 'down' | 'flat';  // trend direction for context
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
          {m.context && (
            <div className={`stat-context ${m.contextTrend === 'up' ? 'trend-up-context' : m.contextTrend === 'down' ? 'trend-down-context' : ''}`}>
              {m.contextTrend === 'up' && '▲ '}{m.contextTrend === 'down' && '▼ '}{m.context}
            </div>
          )}
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
    positive: <IconInsightPositive />,
    risk: <IconInsightRisk />,
    warning: <IconInsightWarning />,
    info: <IconInsightInfo />,
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
  source?: string;
  periods?: string;
  metrics?: number;
  missing?: number;
}
export function DataQualityBar({ source, periods, metrics, missing }: DataQualityBarProps) {
  if (!source) return null;
  const dotClass = source === 'Manual mode' ? 'muted' : source.includes('sample') ? 'warn' : 'good';
  return (
    <div className="data-quality">
      <span className="data-quality-item">
        <span className={`data-quality-dot ${dotClass}`} />
        Source: {source}
      </span>
      {periods && (
        <span className="data-quality-item">
          <span className={`data-quality-dot ${dotClass}`} />
          {periods}
        </span>
      )}
      {metrics !== undefined && (
        <span className="data-quality-item">
          <span className="data-quality-dot good" />
          {metrics} metrics
        </span>
      )}
      {missing !== undefined && missing > 0 && (
        <span className="data-quality-item">
          <span className="data-quality-dot warn" />
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
    <div className="py-1 text-mono text-sm" style={{ color: 'var(--text-muted)' }}>
      {label && <span className="font-medium mr-1">{label}:</span>}
      <span style={{ color: 'var(--text-tertiary)' }}>{formula}</span>
    </div>
  );
}

// ── SectionTitle ──
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="section-title">{children}</div>;
}

// ── CalcTimestamp ──
export function CalcTimestamp() {
  const timeRef = useRef(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  return (
    <div className="calc-timestamp">
      <IconClock />
      Calculated {timeRef.current}
    </div>
  );
}

// ── ResultPanel ──
interface ResultPanelProps {
  children: React.ReactNode;
  label?: string;
  id?: string;
}
export function ResultPanel({ children, label, id }: ResultPanelProps) {
  return (
    <div id={id} className="mt-4">
      {label && <SectionTitle>{label}</SectionTitle>}
      {children}
    </div>
  );
}
