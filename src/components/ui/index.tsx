'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ProvenanceKind } from '@/types/financial';
import { provenanceKindLabel } from '@/lib/calculation-trace';
import { ANALYST_ARC, TOOL_BY_ID, type ToolId } from '@/lib/tool-metadata';
import { useGlobalDataStore } from '@/store/global-data-store';
import {
  ArrowFatDown,
  Files,
  ChartLineUp,
  ChartBar,
  Calculator,
  Wallet,
  Percent,
  UsersThree,
  SquaresFour,
  Info,
  UploadSimple,
  ArrowRight,
  Check,
  Clock,
  X,
  Plus,
  DownloadSimple,
  MagnifyingGlass,
  Smiley,
  SmileyMeh,
  SmileySad,
  House,
  CaretUp,
  CaretDown,
} from '@phosphor-icons/react';

// ── Icon Components ──
// All icons use Phosphor with currentColor.

export function IconFiling() { return <Files size={20} weight="regular" />; }
export function IconTrends() { return <ChartLineUp size={20} weight="regular" />; }
export function IconGrowth() { return <ChartBar size={20} weight="regular" />; }
export function IconDCF() { return <Calculator size={20} weight="regular" />; }
export function IconCash() { return <Wallet size={20} weight="regular" />; }
export function IconRatios() { return <Percent size={20} weight="regular" />; }
export function IconPeer() { return <UsersThree size={20} weight="regular" />; }
export function IconImport() { return <ArrowFatDown size={20} weight="regular" />; }
export function IconWorkspace() { return <SquaresFour size={20} weight="regular" />; }
export function IconQuickCheck() { return <Files size={20} weight="regular" />; }
export function IconAbout() { return <Info size={20} weight="regular" />; }
export function IconUpload() { return <UploadSimple size={16} weight="regular" />; }
export function IconArrowRight() { return <ArrowRight size={16} weight="regular" />; }
export function IconCheck() { return <Check size={16} weight="regular" />; }
export function IconClock() { return <Clock size={12} weight="regular" />; }
export function IconCalc() { return <Check size={14} weight="regular" />; }
export function IconClear() { return <X size={14} weight="regular" />; }
export function IconPlus() { return <Plus size={14} weight="regular" />; }
export function IconDownload() { return <DownloadSimple size={14} weight="regular" />; }
export function IconSearch() { return <MagnifyingGlass size={14} weight="regular" />; }

// ── Tool icon set for nav (small 14px) ──
export function IconNavHome() { return <House size={14} weight="regular" />; }
export function IconNavImport() { return <ArrowFatDown size={14} weight="regular" />; }
export function IconNavFiling() { return <Files size={14} weight="regular" />; }
export function IconNavTrends() { return <ChartLineUp size={14} weight="regular" />; }
export function IconNavGrowth() { return <ChartBar size={14} weight="regular" />; }
export function IconNavDCF() { return <Calculator size={14} weight="regular" />; }
export function IconNavCash() { return <Wallet size={14} weight="regular" />; }
export function IconNavRatios() { return <Percent size={14} weight="regular" />; }
export function IconNavPeer() { return <UsersThree size={14} weight="regular" />; }
export function IconNavWorkspace() { return <SquaresFour size={14} weight="regular" />; }

// ── Insight card icons ──
export function IconInsightPositive() { return <Smiley size={18} weight="regular" />; }
export function IconInsightRisk() { return <SmileySad size={18} weight="regular" />; }
export function IconInsightWarning() { return <SmileyMeh size={18} weight="regular" />; }
export function IconInsightInfo() { return <Info size={18} weight="regular" />; }

// ── ProvenanceDot ──
// Inline per-value source marker for numeric cells (T5). Mirrors the homepage
// `stmt-prov` dot and stays consistent with ProvenanceBadge kinds. Tokens only.
export function ProvenanceDot({ kind, className }: { kind: ProvenanceKind; className?: string }) {
  const label = provenanceKindLabel(kind);
  return (
    <span
      className={`prov-dot prov-dot-${kind}${className ? ` ${className}` : ''}`}
      title={label}
      aria-label={label}
      role="img"
    />
  );
}

// ── PageHeader ──
interface PageHeaderProps {
  title: string;
  subtitle: string;
  answer?: string;
  kicker?: string;
}
export function PageHeader({ title, subtitle, answer, kicker }: PageHeaderProps) {
  return (
    <div className="page-hero">
      {kicker && <span className="page-hero-kicker">{kicker}</span>}
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
}
export function Card({ label, children, style, className }: CardProps) {
  return (
    <div className={`card${className ? ' ' + className : ''}`} style={style}>
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
              <span className="spinner" style={{ marginRight: 6 }} />
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
  const fontSize = size === 'xs' ? 'var(--text-micro)' : 'var(--text-3xs)';
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

// ── ProvenancePopover ──
interface ProvenancePopoverProps {
  sourceType?: string;
  originalLabel?: string;
  period?: string;
  rawValue?: string;
  normalizedValue?: string;
  confidence?: number;
  userOverridden?: boolean;
}
export function ProvenancePopover({
  sourceType,
  originalLabel,
  period,
  rawValue,
  normalizedValue,
  confidence,
  userOverridden,
}: ProvenancePopoverProps) {
  const [open, setOpen] = useState(false);
  const label = sourceType === 'csv' ? 'CSV' :
    sourceType === 'xlsx' ? 'XLSX' :
    sourceType === 'pdf-text' || sourceType === 'ocr' ? 'PDF' :
    sourceType === 'manual' ? 'Manual' :
    sourceType === 'sample' ? 'Sample' : sourceType || 'Data';
  const variant = !sourceType || sourceType === 'manual' ? 'muted' :
    sourceType === 'sample' ? 'warn' : 'good';
  return (
    <span className="provenance-badge-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
      <span
        className={`provenance-badge-trigger ${variant}`}
        onClick={() => setOpen(!open)}
        style={{
          fontSize: 9, cursor: 'pointer', padding: '1px 6px', borderRadius: '3px',
          fontFamily: 'var(--font-mono)', border: '1px solid var(--border)',
          background: 'var(--bg-field)', color: 'var(--text-muted)',
          whiteSpace: 'nowrap', userSelect: 'none',
        }}
      >
        {label}
      </span>
      {open && (
        <div
          className="provenance-popover"
          onClick={() => setOpen(false)}
          style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 50,
            marginTop: 4, minWidth: 200, maxWidth: 260,
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '8px 10px', fontSize: 10, fontFamily: 'var(--font-mono)',
            lineHeight: 1.6, color: 'var(--text)',
          }}
        >
          {sourceType && (
            <div style={{ marginBottom: 4 }}>
              <span className={`confidence-badge ${variant}`} style={{ fontSize: 8 }}>
                {label}
              </span>
            </div>
          )}
          {originalLabel && <div><span style={{ color: 'var(--text-muted)' }}>Original: </span>{originalLabel}</div>}
          {period && <div><span style={{ color: 'var(--text-muted)' }}>Period: </span>{period}</div>}
          {rawValue && normalizedValue && rawValue !== normalizedValue && (
            <div><span style={{ color: 'var(--text-muted)' }}>Raw: </span>{rawValue} <span style={{ color: 'var(--text-tertiary)' }}>→</span> {normalizedValue}</div>
          )}
          {rawValue && (!normalizedValue || rawValue === normalizedValue) && (
            <div><span style={{ color: 'var(--text-muted)' }}>Value: </span>{rawValue}</div>
          )}
          {confidence !== undefined && (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Confidence: </span>
              <span className={`confidence-badge ${confidence >= 0.9 ? 'good' : confidence >= 0.7 ? '' : 'warn'}`} style={{ fontSize: 8 }}>
                {Math.round(confidence * 100)}%
              </span>
            </div>
          )}
          {userOverridden && (
            <div style={{ color: 'var(--caution)', marginTop: 2 }}>✦ User override</div>
          )}
        </div>
      )}
    </span>
  );
}

// ── DataSourceBadge ──
interface DataSourceBadgeProps {
  variant: 'sample' | 'imported' | 'manual' | 'none';
}
export function DataSourceBadge({ variant }: DataSourceBadgeProps) {
  if (variant === 'none') return null;
  const config: Record<string, { label: string; cls: string }> = {
    sample: { label: 'Sample data', cls: 'warn' },
    imported: { label: 'Imported', cls: 'good' },
    manual: { label: 'Entered manually', cls: 'muted' },
  };
  const c = config[variant];
  return (
    <span
      className={`data-source-badge ${c.cls}`}
      style={{
        fontSize: 9, padding: '1px 7px', borderRadius: 'var(--radius-pill)',
        fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
        display: 'inline-flex', alignItems: 'center', gap: 3,
        border: '1px solid var(--border)',
        background: variant === 'sample' ? 'var(--caution-subtle)' :
                    variant === 'imported' ? 'var(--green-subtle)' :
                    'var(--bg-surface)',
        color: variant === 'sample' ? 'var(--caution)' :
           variant === 'imported' ? 'var(--green)' :
           'var(--text-muted)',
        }}
        >
        <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: variant === 'sample' ? 'var(--caution)' :
                    variant === 'imported' ? 'var(--green)' :
                    'var(--text-muted)',
        display: 'inline-block',
      }} />
      {c.label}
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

// ── ArcNextLinks (entity-aware) ──
// Derives the next steps along the canonical analyst arc (T6) and carries the
// active company: navigating keeps the active dataset, and the label names it.
export function ArcNextLinks({ current }: { current: ToolId }) {
  const activeDataset = useGlobalDataStore((s) => {
    if (!s.activeDatasetId && s.datasets.length === 0) return null;
    return s.datasets.find((d) => d.id === s.activeDatasetId) || s.datasets[0] || null;
  });
  const company =
    activeDataset?.companyName && activeDataset.companyName !== 'Unnamed Company'
      ? activeDataset.companyName
      : null;

  const idx = ANALYST_ARC.indexOf(current);
  const nextTools = idx >= 0 ? ANALYST_ARC.slice(idx + 1, idx + 3) : [];
  const links: NextLink[] = nextTools.map((id) => ({
    label: TOOL_BY_ID[id].shortLabel,
    href: TOOL_BY_ID[id].href,
  }));
  // Capstone: conclude the arc in the thesis.
  links.push({ label: 'Write thesis', href: '/workspace?step=thesis' });

  return (
    <div className="next-links">
      <span className="next-label">{company ? `Next for ${company}:` : 'Next:'}</span>
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

// ── ChartState ──
interface ChartStateProps {
  state?: 'loading' | 'empty' | 'error' | 'ready';
  title?: string;
  desc?: string;
  children?: React.ReactNode;
}
export function ChartState({
  state = 'ready',
  title,
  desc,
  children,
}: ChartStateProps) {
  if (state === 'ready') return <>{children}</>;

  if (state === 'loading') {
    return (
      <div className="chart-state skeleton" role="status" aria-label={title ?? 'Loading chart'} />
    );
  }

  if (state === 'error') {
    return (
      <div className="chart-state error" role="alert">
        <div className="state-card error">
          <div className="state-card-title">{title ?? 'Chart unavailable'}</div>
          {desc && <div className="state-card-desc">{desc}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="chart-state empty">
      <div className="empty-state">
        <div className="empty-state-title">{title ?? 'Chart has no data'}</div>
        {desc && <div className="empty-state-desc">{desc}</div>}
      </div>
    </div>
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
            {m.trend && m.trend !== 'flat' && (
              <span className={`trend-arrow trend-${m.trend}`}>
                {m.trend === 'up'
                  ? <CaretUp size={9} weight="bold" />
                  : <CaretDown size={9} weight="bold" />}
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
              {m.contextTrend === 'up' && <CaretUp size={8} weight="bold" style={{ marginRight: 3 }} />}
              {m.contextTrend === 'down' && <CaretDown size={8} weight="bold" style={{ marginRight: 3 }} />}
              {m.context}
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
  const dotClass = source === 'Manual entry' ? 'muted' : source.includes('sample') ? 'warn' : 'good';
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
  const [timeStr] = useState(() => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  return (
    <div className="calc-timestamp">
      <IconClock />
      Calculated {timeStr}
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

/**
 * The single hero decision number for a tool page (v5 §2): mono, weight 600,
 * >=36px (>=28px floor at 420px), colored by its actual sign. Exactly one per page.
 */
export interface HeroDecisionProps {
  label: string;
  value: string;
  sign?: 'positive' | 'negative' | 'neutral';
  sub?: string;
}

export function HeroDecision({ label, value, sign = 'neutral', sub }: HeroDecisionProps) {
  return (
    <div className="hero-decision">
      <div className="hero-decision-label">{label}</div>
      <div className={`hero-decision-value ${sign}`}>{value}</div>
      {sub && <div className="hero-decision-sub">{sub}</div>}
    </div>
  );
}
