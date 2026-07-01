'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePageTitle } from '@/lib/use-page-title';
import { useGlobalDataStore } from '@/store/global-data-store';
import { useImporterStore } from '@/store/importer-store';
import { SectionTitle, Disclaimer, Card, TrustBadge } from '@/components/ui';
import type { FundalystDataset, CanonicalFact } from '@/lib/importer/types';
import { useEnterpriseStore, type EnterpriseRole, type ProjectStatus } from '@/store/enterprise-store';
import {
  collectFundalystLocalState,
} from '@/lib/enterprise-backup';
import { generateMemo, downloadMemoMarkdown } from '@/lib/memo-export';
import { useActiveDataset } from '@/store/financial-model-selectors';
import { useDCFStore, useRatiosStore } from '@/store';

// ── Research workflow steps ──
const steps = [
  { id: 'overview', label: 'Overview',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="6" /><path d="M7 4v3l2 2" /></svg> },
  { id: 'import', label: 'Import Report',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2v8M3 6l4-4 4 4" /><path d="M2 11v1h10v-1" /></svg> },
  { id: 'data', label: 'Financial Data',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="10" height="8" rx="1" /><path d="M5 7h4M5 9h2" /></svg> },
  { id: 'filing', label: 'Filing Comparison',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h5l3 3v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" /><path d="M8 2v3h3" /><path d="M5 7l2 2 3-3" /></svg> },
  { id: 'dcf', label: 'DCF Valuation',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12l4-5 3 2 5-6" /><circle cx="11.5" cy="3.5" r="1.5" fill="currentColor" stroke="none" /></svg> },
  { id: 'ratios', label: 'Financial Ratios',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12V5l3 2 3-5 3 7 2-3" /><circle cx="13" cy="3" r="1" fill="currentColor" stroke="none" /></svg> },
  { id: 'thesis', label: 'Investment Thesis',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v10M10 2v10M2 4h10M2 10h10" /><path d="M7 2v10" /><path d="M2 7h10" /></svg> },
] as const;

type StepId = (typeof steps)[number]['id'];

// ── Settings steps (collapsed below main workflow) ──
const settingsSteps = [
  { id: 'governance', label: 'Governance',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V3l5-2z" /><path d="M5 7l1.5 1.5L10 5" /></svg> },
  { id: 'audit', label: 'Audit Trail',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h8v10H3z" /><path d="M5 5h4M5 7h4M5 9h2" /></svg> },
  { id: 'integrations', label: 'Integrations',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4H3a3 3 0 000 6h2M9 4h2a3 3 0 010 6H9M5 7h4" /></svg> },
] as const;

type SettingsStepId = (typeof settingsSteps)[number]['id'];

// ── Tool definitions with purpose context ──
interface ToolDef {
  id: string;
  label: string;
  href: string;
  desc: string;
  why: string;
  needsData: boolean;
}

const quickAnalysisTools: ToolDef[] = [
  { id: 'filing', label: 'Filing Comparison', href: '/research/filing', desc: 'Compare financial periods side by side', why: 'See revenue growth, margin changes, and risk flags', needsData: true },
  { id: 'trends', label: 'Trend Charts', href: '/research/trends', desc: 'Visualize revenue, profit & margin trends', why: 'Spot patterns across multiple periods', needsData: true },
  { id: 'growth', label: 'Growth Rates', href: '/research/growth', desc: 'CAGR & YoY growth calculation', why: 'Measure growth trajectory', needsData: true },
];

const deepDiveTools: ToolDef[] = [
  { id: 'dcf', label: 'DCF Valuation', href: '/tools/dcf', desc: 'Estimate intrinsic value per share', why: 'Projected FCF + terminal value + discount rate', needsData: true },
  { id: 'ratios', label: 'Financial Ratios', href: '/tools/ratios', desc: 'Profitability, leverage & efficiency', why: 'Health check from just 6 numbers', needsData: true },
  { id: 'peer', label: 'Peer Comparison', href: '/tools/peer', desc: 'Benchmark against industry peers', why: 'Compare up to 10 companies side-by-side', needsData: false },
  { id: 'wc', label: 'Cash Efficiency', href: '/tools/wc', desc: 'Working capital & cash conversion cycle', why: 'Understand DSO, DIO, DPO', needsData: true },
];

const RESTORABLE_WORKSPACE_KEYS = new Set([
  'fundalyst-global-data',
  'fundalyst-importer',
  'fundalyst-enterprise',
  'fundalyst-filing',
  'fundalyst-wc',
  'fundalyst-ratios',
  'fundalyst-peer',
  'fundalyst-trends',
  'fundalyst-yoy',
  'fundalyst-thesis',
]);

const MAX_WORKSPACE_RESTORE_BYTES = 10 * 1024 * 1024;

export default function WorkspacePage() {
  usePageTitle('Workspace');
  const [activeStep, setActiveStep] = useState<StepId>('overview');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeSettingsStep, setActiveSettingsStep] = useState<SettingsStepId | null>(null);
  const datasets = useGlobalDataStore((s) => s.datasets);
  const activeDatasetId = useGlobalDataStore((s) => s.activeDatasetId);
  const activeDataset = useActiveDataset();
  const lastDataset = useImporterStore((s) => s.lastDataset);
  const projects = useEnterpriseStore((s) => s.projects);
  const activeProjectId = useEnterpriseStore((s) => s.activeProjectId);
  const updateProject = useEnterpriseStore((s) => s.updateProject);
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const companyName = lastDataset?.companyName || datasets[0]?.companyName || activeProject?.companyName || 'No company selected';
  const hasData = datasets.length > 0 || lastDataset !== null;
  const totalFacts = datasets.reduce((sum, d) => sum + d.facts.length, 0);
  const activeProjectSyncId = activeProject?.id;
  const activeProjectCompanyName = activeProject?.companyName;
  const activeProjectDatasetId = activeProject?.activeDatasetId ?? null;

  useEffect(() => {
    if (!activeProjectSyncId || !hasData) return;
    const shouldUpdateCompany =
      activeProjectCompanyName === 'No company selected' && companyName !== activeProjectCompanyName;
    const shouldUpdateDataset = activeProjectDatasetId !== activeDatasetId;
    if (shouldUpdateCompany || shouldUpdateDataset) {
      updateProject(activeProjectSyncId, {
        ...(shouldUpdateCompany ? { companyName } : {}),
        ...(shouldUpdateDataset ? { activeDatasetId } : {}),
      });
    }
  }, [
    activeDatasetId, activeProjectSyncId, activeProjectCompanyName,
    activeProjectDatasetId, companyName, hasData, updateProject,
  ]);

  // Track completed steps based on actual state
  const completedSteps: Set<StepId> = new Set();
  if (hasData) completedSteps.add('import');
  if (hasData) completedSteps.add('data');

  // Determine current workflow progress
  let workflowCurrentIndex = 0; // 0=Import, 1=Review, 2=Analyze, 3=Conclude
  if (hasData) workflowCurrentIndex = 1;
  if (totalFacts > 0 && datasets.some(d => d.facts.length > 0)) workflowCurrentIndex = 2;
  // If thesis has been saved, conclude is current
  const thesisSaved = typeof window !== 'undefined' && localStorage.getItem('fundalyst-thesis') !== null;

  return (
    <div className="workspace">
      {/* ── Workspace header ── */}
      <div className="workspace-header">
        <div className="workspace-header-left">
          <span className="workspace-brand">Research Workspace</span>
          <span className="workspace-sep">/</span>
          <span className="workspace-company">{companyName}</span>
        </div>
        <div className="workspace-header-right">
          {hasData ? (
            <span className="workspace-status">
              <span className="workspace-dot" />
              {totalFacts} metrics loaded
            </span>
          ) : null}
          <Link href="/import" className="workspace-cta">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 2v8M3 6l4-4 4 4" /><path d="M2 10v2h10v-2" />
            </svg>
            Upload Reports
          </Link>
        </div>
      </div>

      <div className="workspace-body">
        {/* ── Sidebar with workflow checklist ── */}
        <nav className="workspace-sidebar" aria-label="Research steps">
          <div className="workspace-sidebar-label">Research Workflow</div>
          {steps.map((step) => {
            const isCompleted = completedSteps.has(step.id as StepId);
            return (
              <button
                key={step.id}
                className={`workspace-step ${activeStep === step.id ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => { setActiveStep(step.id); setActiveSettingsStep(null); }}
                aria-current={activeStep === step.id ? 'step' : undefined}
              >
                <span className="workspace-step-icon">
                  {isCompleted ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="7" cy="7" r="5" /><path d="M5 7l2 2 3-3" />
                    </svg>
                  ) : step.icon}
                </span>
                <span className="workspace-step-label">{step.label}</span>
              </button>
            );
          })}

          {/* ── Settings collapse ── */}
          <hr className="ws-settings-divider" />
          <button
            type="button"
            className={`ws-settings-trigger${settingsOpen ? ' open' : ''}`}
            onClick={() => setSettingsOpen(!settingsOpen)}
            aria-expanded={settingsOpen}
            aria-label="Workspace settings"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <circle cx="5" cy="5" r="1.5" /><path d="M5 1v1M5 8v1M1.5 5h1M7.5 5h1" />
            </svg>
            <span>Workspace Settings</span>
            <svg className={`ws-settings-chevron${settingsOpen ? ' open' : ''}`} width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <path d="M2 3l2 2 2-2" />
            </svg>
          </button>
          {settingsOpen && settingsSteps.map((step) => (
            <button
              key={step.id}
              className={`workspace-step ${activeSettingsStep === step.id ? 'active' : ''}`}
              onClick={() => { setActiveSettingsStep(step.id); setActiveStep('overview'); }}
              aria-current={activeSettingsStep === step.id ? 'step' : undefined}
            >
              <span className="workspace-step-icon">{step.icon}</span>
              <span className="workspace-step-label">{step.label}</span>
            </button>
          ))}
        </nav>

        {/* ── Main content ── */}
        <main className="workspace-content" role="main">
          {activeStep === 'overview' && !activeSettingsStep && (
            <OverviewPanel
              hasData={hasData}
              companyName={companyName}
              datasets={datasets}
              totalFacts={totalFacts}
              activeDataset={activeDataset}
              workflowCurrentIndex={workflowCurrentIndex}
              thesisSaved={thesisSaved}
            />
          )}
          {activeStep === 'import' && <ImportPanel />}
          {activeStep === 'data' && <DataPanel datasets={datasets} />}
          {activeStep === 'filing' && <FilingPanel />}
          {activeStep === 'dcf' && <DCFPanel />}
          {activeStep === 'ratios' && <RatiosPanel />}
          {activeStep === 'thesis' && <ThesisPanel />}
          {activeSettingsStep === 'governance' && <GovernancePanel />}
          {activeSettingsStep === 'audit' && <AuditPanel datasets={datasets} totalFacts={totalFacts} />}
          {activeSettingsStep === 'integrations' && <IntegrationsPanel />}
        </main>
      </div>
    </div>
  );
}

// ── Overview Panel ──
export function OverviewPanel({
  hasData, companyName, datasets, totalFacts, activeDataset, workflowCurrentIndex, thesisSaved,
}: {
  hasData: boolean; companyName: string; datasets: FundalystDataset[]; totalFacts: number;
  activeDataset: FundalystDataset | null; workflowCurrentIndex: number; thesisSaved: boolean;
}) {
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('fundalyst-'));
    const data: Record<string, unknown> = {};
    for (const key of keys) {
      try { data[key] = JSON.parse(localStorage.getItem(key)!); } catch {}
    }
    data._exportedAt = new Date().toISOString();
    data._version = '1.0';
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `fundalyst-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() { importInputRef.current?.click(); }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_WORKSPACE_RESTORE_BYTES) {
      setImportMsg('Workspace file is too large. Please restore a file under 10 MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target?.result as string);
        for (const key of Object.keys(imported)) {
          if (RESTORABLE_WORKSPACE_KEYS.has(key)) {
            localStorage.setItem(key, JSON.stringify(imported[key]));
          }
        }
        setImportMsg('Workspace restored. Reloading page...');
        setTimeout(() => window.location.reload(), 1000);
      } catch {
        setImportMsg('Invalid workspace file. No changes made.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleExportMemo() {
    const dcfState = useDCFStore.getState();
    const ratiosState = useRatiosStore.getState();
    let thesis: string | undefined;
    try {
      const saved = localStorage.getItem('fundalyst-thesis');
      if (saved) {
        const data = JSON.parse(saved);
        thesis = data.notes || undefined;
      }
    } catch {}
    const memo = generateMemo({
      companyName,
      dataset: activeDataset,
      thesis,
      ratios: ratiosState.res ?? undefined,
      dcfResult: dcfState.summary,
    });
    downloadMemoMarkdown(memo);
  }

  // ── Empty state: no data imported ──
  if (!hasData) {
    return (
      <div>
        <div className="ws-empty-hero">
          <div className="ws-empty-hero-heading">No company selected</div>
          <div className="ws-empty-hero-desc">
            Upload your first annual report to begin your research workspace.
            Fundalyst will extract financial statements, detect periods and metrics, and prepare every analysis tool with your data.
          </div>
          <Link href="/import" className="ws-empty-hero-cta">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M7 2v8M3 6l4-4 4 4" /><path d="M2 10v2h10v-2" />
            </svg>
            Upload Annual Report
          </Link>
          <div className="ws-empty-hero-formats">CSV · XLSX · PDF · Screenshot</div>
        </div>

        <div className="workspace-card" style={{ marginTop: 0 }}>
          <div className="workspace-card-header">Data Backup</div>
          <div className="p-4">
            <div className="text-xs text-tertiary mb-3">
              Export your workspace data for safekeeping, or restore from a previous backup.
            </div>
            <div className="flex gap-2 flex-wrap">
              <button type="button" className="btn-ghost btn-sm" onClick={handleExport}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2v6M4 6l2 2 2-2" /><path d="M2 9v1h8V9" />
                </svg>
                Export workspace
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={handleImportClick}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2v6M4 6l2 2 2-2" /><path d="M2 9v1h8V9" />
                </svg>
                Import workspace
              </button>
              <input ref={importInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
            </div>
            {importMsg && <div className="text-xs text-primary font-mono mt-2">{importMsg}</div>}
          </div>
        </div>
      </div>
    );
  }

  // ── Has data: research dashboard ──
  const activeSource = datasets[0] || null;
  const totalPeriods = datasets.reduce((sum, d) => sum + (d.periods?.length || 0), 0);
  const workflowLabels = ['Import', 'Review', 'Analyze', 'Conclude'];

  return (
    <div>
      <SectionTitle>Research Dashboard</SectionTitle>
      <div className="flex flex-col gap-4 mt-4">
        {/* 1. Research Status */}
        <div className="workspace-card">
          <div className="workspace-card-header">Research Status</div>
          <div className="p-4">
            <div className="ws-status-grid">
              <div className="ws-status-item">
                <div className="ws-status-label">Company</div>
                <div className="ws-status-value">{companyName}</div>
              </div>
              <div className="ws-status-item">
                <div className="ws-status-label">Report</div>
                <div className="ws-status-value">{activeSource?.companyName || datasets[0]?.companyName || 'Uploaded'}</div>
              </div>
              <div className="ws-status-item">
                <div className="ws-status-label">Periods</div>
                <div className="ws-status-value">{totalPeriods} period{totalPeriods !== 1 ? 's' : ''}</div>
              </div>
              <div className="ws-status-item">
                <div className="ws-status-label">Metrics</div>
                <div className="ws-status-value">{totalFacts} value{totalFacts !== 1 ? 's' : ''} extracted</div>
              </div>
            </div>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <Link href="/import" className="workspace-cta">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7 2v8M3 6l4-4 4 4" /><path d="M2 10v2h10v-2" />
                </svg>
                Import new report
              </Link>
            </div>
          </div>
        </div>

        {/* 2. Next Step (contextual) */}
        {workflowCurrentIndex < 3 ? (
          <Link
            href={workflowCurrentIndex === 0 ? '/import' : workflowCurrentIndex === 1 ? '/research/filing' : '/tools/dcf'}
            className="ws-next-step"
          >
            <div className="ws-next-step-text">
              <span className="ws-next-step-label">
                {workflowCurrentIndex === 0 ? 'Import a financial report' :
                 workflowCurrentIndex === 1 ? 'Review your extracted data' :
                 workflowCurrentIndex === 2 ? 'Start your analysis' :
                 'Write your investment thesis'}
              </span>
              <span className="ws-next-step-desc">
                {workflowCurrentIndex <= 1 ? 'Upload CSV, XLSX, or PDF to begin.' :
                 'Compare periods to see revenue growth, margin changes, and risk flags.'}
              </span>
            </div>
            <svg className="ws-next-step-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3l4 4-4 4" />
            </svg>
          </Link>
        ) : (
          <Link href={thesisSaved ? '/workspace' : ''} className="ws-next-step" onClick={(e) => { if (!thesisSaved) { e.preventDefault(); document.getElementById('thesis-step')?.click(); } }}>
            <div className="ws-next-step-text">
              <span className="ws-next-step-label">Write your investment thesis</span>
              <span className="ws-next-step-desc">Document your conclusion based on all the evidence you&apos;ve gathered.</span>
            </div>
            <svg className="ws-next-step-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3l4 4-4 4" />
            </svg>
          </Link>
        )}

        {/* 3. Research Progress */}
        <div className="workspace-card">
          <div className="workspace-card-header">Research Progress</div>
          <div className="p-4">
            <div className="ws-progress">
              {workflowLabels.map((label, i) => (
                <div key={label} className="ws-progress-step" style={{ flex: i < workflowLabels.length - 1 ? 1 : 0 }}>
                  <span className={`ws-progress-dot ${i < workflowCurrentIndex ? 'completed' : ''} ${i === workflowCurrentIndex ? 'current' : ''}`} />
                  <span className={`ws-progress-label ${i < workflowCurrentIndex ? 'completed' : ''} ${i === workflowCurrentIndex ? 'current' : ''}`}>
                    {label}
                  </span>
                  {i < workflowLabels.length - 1 && (
                    <span className={`ws-progress-connector ${i < workflowCurrentIndex ? 'completed' : ''}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Analysis Tools */}
        <div className="workspace-card">
          <div className="workspace-card-header">Analysis Tools</div>
          <div className="p-4 flex flex-col gap-4">
            {/* Quick Analysis */}
            <div className="ws-tools-section">
              <div className="ws-tools-category">Quick Analysis</div>
              <div className="ws-tools-grid">
                {quickAnalysisTools.map((tool) => (
                  <Link key={tool.id} href={tool.href} className="ws-tool-card">
                    <div className="ws-tool-card-title">{tool.label}</div>
                    <div className="ws-tool-card-desc">{tool.desc}</div>
                    <div className="ws-tool-card-status">
                      <span className={`ws-tool-card-status-dot ${tool.needsData && hasData ? 'ready' : 'needs-data'}`} />
                      {tool.why}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            {/* Deep Dive */}
            <div className="ws-tools-section">
              <div className="ws-tools-category">Deep Dive</div>
              <div className="ws-tools-grid">
                {deepDiveTools.map((tool) => (
                  <Link key={tool.id} href={tool.href} className="ws-tool-card">
                    <div className="ws-tool-card-title">{tool.label}</div>
                    <div className="ws-tool-card-desc">{tool.desc}</div>
                    <div className="ws-tool-card-status">
                      <span className={`ws-tool-card-status-dot ${tool.needsData && hasData ? 'ready' : tool.needsData ? 'needs-data' : 'ready'}`} />
                      {tool.why}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Investment Memo */}
        <div className="workspace-card">
          <div className="workspace-card-header">Investment Memo</div>
          <div className="p-4">
            <div className="text-xs text-tertiary mb-3">
              Generate a structured investment memo with company overview, thesis, DCF valuation, financial ratios, and data provenance — exported as a Markdown file.
            </div>
            <button type="button" className="btn-primary btn-sm" onClick={handleExportMemo}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2v6M4 6l2 2 2-2" /><path d="M2 9v1h8V9" />
              </svg>
              Export Investment Memo
            </button>
          </div>
        </div>

        {/* 6. Data Backup */}
        <div className="workspace-card">
          <div className="workspace-card-header">Data Backup</div>
          <div className="p-4">
            <div className="text-xs text-tertiary mb-3">
              All Fundalyst data is stored in browser localStorage. Export for safekeeping or restore a previous backup.
            </div>
            <div className="flex gap-2 flex-wrap">
              <button type="button" className="btn-ghost btn-sm" onClick={handleExport}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2v6M4 6l2 2 2-2" /><path d="M2 9v1h8V9" />
                </svg>
                Export workspace
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={handleImportClick}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2v6M4 6l2 2 2-2" /><path d="M2 9v1h8V9" />
                </svg>
                Import workspace
              </button>
              <input ref={importInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
            </div>
            {importMsg && <div className="text-xs text-primary font-mono mt-2">{importMsg}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Import Panel ──
function ImportPanel() {
  const { startImport, error, isImporting } = useImporterStore();
  const lastDataset = useImporterStore((s) => s.lastDataset);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await startImport(file);
    e.target.value = '';
  }

  return (
    <div>
      <SectionTitle>Import Report</SectionTitle>
      <div className="flex flex-col gap-4 mt-4">
        <div className="workspace-card">
          <div className="workspace-card-header">Upload Financial File</div>
          <div className="p-4 text-center">
            <label className="workspace-upload-area">
              <div className="workspace-upload-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2v14M6 10l6-6 6 6" /><path d="M2 18v4h20v-4" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-center mb-1" style={{ color: 'var(--text)' }}>
                Choose a file or drag it here
              </div>
              <div className="text-xs text-muted">CSV · XLSX · PDF · Screenshot</div>
              <span className="upload-label mt-3">
                Select file
                <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={handleFile} />
              </span>
            </label>
          </div>
        </div>

        {isImporting && (
          <div className="workspace-card">
            <div className="workspace-card-header">Importing...</div>
            <div className="p-4 text-sm text-tertiary">Processing file...</div>
          </div>
        )}

        {error && (
          <div className="workspace-card" style={{ borderColor: 'var(--red)' }}>
            <div className="workspace-card-header" style={{ color: 'var(--red)' }}>Import Error</div>
            <div className="p-4 text-sm" style={{ color: 'var(--red)' }}>{error}</div>
          </div>
        )}

        {lastDataset && (
          <div className="workspace-card" style={{ borderColor: 'rgba(61,160,109,0.3)' }}>
            <div className="workspace-card-header" style={{ color: 'var(--green)' }}>Imported Successfully</div>
            <div className="p-4">
              <div className="ws-metric-label">Company</div>
              <div className="ws-metric-value" style={{ marginBottom: 8 }}>{lastDataset.companyName || 'Unknown'}</div>
              <div className="ws-metric-label">Metrics</div>
              <div className="ws-metric-value">{lastDataset.facts.length} values</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Data Panel ──
function DataPanel({ datasets }: { datasets: FundalystDataset[] }) {
  if (datasets.length === 0) {
    return (
      <div>
        <SectionTitle>Financial Data</SectionTitle>
        <Card className="mt-4">
          <div className="empty-state">
            <div className="empty-state-title">No financial data imported yet</div>
            <div className="empty-state-desc">
              Use the Import step to upload a CSV, Excel, or PDF file. Once data is extracted, it appears here with all metrics and periods for review before running analysis tools.
            </div>
            <Link href="/import" className="empty-state-action">Import data →</Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>Financial Data</SectionTitle>
      <div className="flex flex-col gap-4 mt-4">
        {datasets.map((ds, i) => (
          <div key={ds.id || i} className="workspace-card">
            <div className="workspace-card-header">{ds.companyName || `Dataset ${i + 1}`}</div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div><div className="ws-metric-label">Periods</div><div className="ws-metric-value">{ds.periods?.length || 0}</div></div>
                <div><div className="ws-metric-label">Facts</div><div className="ws-metric-value">{ds.facts.length}</div></div>
                <div><div className="ws-metric-label">Source</div><div className="ws-metric-value text-xs">{ds.sourceType || 'Upload'}</div></div>
                <div><div className="ws-metric-label">Confidence</div><div className="ws-metric-value text-xs">{ds.confidence ? Math.round(ds.confidence * 100) + '%' : '—'}</div></div>
              </div>
              {ds.facts.length > 0 && (
                <div className="max-h-48 overflow-y-auto">
                  <table className="diff-table">
                    <thead><tr><th>Metric</th><th>Value</th><th>Period</th></tr></thead>
                    <tbody>
                      {ds.facts.slice(0, 30).map((f: CanonicalFact, j: number) => (
                        <tr key={j}>
                          <td>{f.metric || f.canonicalMetric || '—'}</td>
                          <td>{f.value !== undefined ? f.value : '—'}</td>
                          <td>{f.periodLabel || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Filing Panel ──
function FilingPanel() {
  return (
    <div>
      <SectionTitle>Filing Comparison</SectionTitle>
      <div className="workspace-card mt-4">
        <div className="workspace-card-header">Period-over-Period Analysis</div>
        <div className="p-4 flex flex-col gap-3">
          <p className="text-sm text-tertiary leading-normal" style={{ margin: 0 }}>
            Compare two reporting periods side by side. The tool highlights revenue growth, margin compression, debt changes, and risk flags automatically.
          </p>
          <Link href="/research/filing" className="workspace-quick-link">
            Open Filing Comparison →
          </Link>
          <div className="flex gap-2 flex-wrap">
            <TrustBadge label="Filing Comparison" variant="source" />
            <TrustBadge label="YoY Change" variant="good" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DCF Panel ──
function DCFPanel() {
  return (
    <div>
      <SectionTitle>DCF Valuation</SectionTitle>
      <div className="workspace-card mt-4">
        <div className="workspace-card-header">Intrinsic Value Estimation</div>
        <div className="p-4 flex flex-col gap-3">
          <p className="text-sm text-tertiary leading-normal" style={{ margin: 0 }}>
            Estimate intrinsic value per share using projected free cash flows. Includes sensitivity analysis across terminal growth and discount rates.
          </p>
          <Link href="/tools/dcf" className="workspace-quick-link">
            Open DCF Valuation →
          </Link>
          <div className="flex gap-2 flex-wrap">
            <TrustBadge label="DCF - Gordon Growth" variant="source" />
            <TrustBadge label="₹ Indian Market" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Ratios Panel ──
function RatiosPanel() {
  return (
    <div>
      <SectionTitle>Financial Ratios</SectionTitle>
      <div className="workspace-card mt-4">
        <div className="workspace-card-header">Financial Health Check</div>
        <div className="p-4 flex flex-col gap-3">
          <p className="text-sm text-tertiary leading-normal" style={{ margin: 0 }}>
            Calculate 5 key ratios from just 6 numbers: Net Profit Margin, ROE, Debt/Equity, Debt/Assets, and Asset Turnover.
          </p>
          <Link href="/tools/ratios" className="workspace-quick-link">
            Open Financial Ratios →
          </Link>
          <div className="flex gap-2 flex-wrap">
            <TrustBadge label="Ratio Analysis" variant="source" />
            <TrustBadge label="₹ Indian Market" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Governance Panel ──
function GovernancePanel() {
  const projects = useEnterpriseStore((s) => s.projects);
  const activeProjectId = useEnterpriseStore((s) => s.activeProjectId);
  const members = useEnterpriseStore((s) => s.members);
  const updateProject = useEnterpriseStore((s) => s.updateProject);
  const updateMemberRole = useEnterpriseStore((s) => s.updateMemberRole);
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  return (
    <div>
      <SectionTitle>Governance</SectionTitle>
      <div className="flex flex-col gap-4 mt-4">
        <div className="workspace-card" style={{ borderColor: 'var(--caution)', marginBottom: 8 }}>
          <div className="workspace-card-header" style={{ color: 'var(--caution)' }}>Local Simulation Mode</div>
          <div className="p-4 text-xs text-tertiary leading-normal">
            All governance controls, roles, and audit features shown here are LOCAL SIMULATIONS.
            They are NOT enforced by any server. Data is stored in unencrypted browser localStorage
            and can be cleared by the user at any time. Production enforcement requires a backend
            with authentication, permission checks, encrypted storage, and immutable audit retention.
          </div>
        </div>
        <div className="workspace-card">
          <div className="workspace-card-header">Project Controls ⚡ local simulation</div>
          <div className="p-4 grid grid-cols-3 gap-4">
            <div>
              <div className="ws-metric-label">Approval Gate</div>
              <label className="flex items-center gap-2 text-sm text-tertiary mt-2">
                <input type="checkbox" checked={activeProject?.approvalRequired ?? true} onChange={(e) => activeProject && updateProject(activeProject.id, { approvalRequired: e.target.checked })} />
                Require review before final thesis
              </label>
            </div>
            <div>
              <div className="ws-metric-label">Retention Policy</div>
              <input className="num-input" value={activeProject?.retentionPolicy || ''} onChange={(e) => activeProject && updateProject(activeProject.id, { retentionPolicy: e.target.value })} aria-label="Retention policy" />
            </div>
            <div>
              <div className="ws-metric-label">Project Status</div>
              <select className="num-input" value={activeProject?.status || 'Active'} onChange={(e) => activeProject && updateProject(activeProject.id, { status: e.target.value as ProjectStatus })}>
                {(['Active', 'Review', 'Approved', 'Archived'] as ProjectStatus[]).map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="workspace-card">
          <div className="workspace-card-header">Role Simulation ⚡ local simulation</div>
          <div className="p-4">
            <table className="diff-table">
              <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Role</th></tr></thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>{m.email}</td>
                    <td>{m.status}</td>
                    <td>
                      <select className="num-input" value={m.role} onChange={(e) => updateMemberRole(m.id, e.target.value as EnterpriseRole)}>
                        {(['Owner', 'Admin', 'Analyst', 'Reviewer', 'Viewer'] as EnterpriseRole[]).map((role) => <option key={role}>{role}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="workspace-card">
          <div className="workspace-card-header">Backend Boundary</div>
          <div className="p-4 text-xs text-tertiary leading-normal">
            These controls are LOCAL-ONLY and NOT enforced. They simulate what a production server would enforce. All data is stored in unencrypted browser localStorage.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Audit Panel ──
function AuditPanel({ datasets, totalFacts }: { datasets: FundalystDataset[]; totalFacts: number }) {
  const auditEvents = useEnterpriseStore((s) => s.auditEvents);
  const versions = useEnterpriseStore((s) => s.versions);
  const clearAuditEvents = useEnterpriseStore((s) => s.clearAuditEvents);
  const createVersion = useEnterpriseStore((s) => s.createVersion);

  function handleSnapshot() {
    createVersion({
      label: `Audit snapshot ${new Date().toLocaleDateString('en-IN')}`,
      summary: `${datasets.length} data source(s), ${totalFacts} fact(s), ${auditEvents.length} audit event(s)`,
      datasetCount: datasets.length,
      factCount: totalFacts,
      payload: collectFundalystLocalState(),
    });
  }

  return (
    <div>
      <SectionTitle>Audit Trail</SectionTitle>
      <div className="flex flex-col gap-4 mt-4">
        <div className="workspace-card">
          <div className="workspace-card-header">Version History</div>
          <div className="p-4 flex flex-col gap-3">
            <div className="flex gap-2 flex-wrap">
              <button type="button" className="btn-primary btn-sm" onClick={handleSnapshot}>Create audit snapshot</button>
              <button type="button" className="btn-ghost btn-sm" onClick={clearAuditEvents}>Clear local audit log</button>
            </div>
            {versions.length === 0 ? (
              <div className="text-xs text-muted">No snapshots yet.</div>
            ) : (
              <table className="diff-table">
                <thead><tr><th>Version</th><th>Created</th><th>Data</th><th>Summary</th></tr></thead>
                <tbody>
                  {versions.slice(0, 8).map((v) => (
                    <tr key={v.id}>
                      <td>{v.label}</td>
                      <td>{new Date(v.createdAt).toLocaleString('en-IN')}</td>
                      <td>{v.datasetCount} source(s), {v.factCount} fact(s)</td>
                      <td>{v.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="workspace-card">
          <div className="workspace-card-header">Recent Events</div>
          <div className="p-4">
            <table className="diff-table">
              <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Severity</th></tr></thead>
              <tbody>
                {auditEvents.slice(0, 20).map((event) => (
                  <tr key={event.id}>
                    <td>{new Date(event.timestamp).toLocaleString('en-IN')}</td>
                    <td>{event.actor}</td>
                    <td>{event.action}</td>
                    <td>{event.target}</td>
                    <td>{event.severity}</td>
                  </tr>
                ))}
                {auditEvents.length === 0 && <tr><td colSpan={5}>No local audit events recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Integrations Panel ──
function IntegrationsPanel() {
  const integrations = useEnterpriseStore((s) => s.integrations);
  return (
    <div>
      <SectionTitle>Integrations</SectionTitle>
      <div className="flex flex-col gap-4 mt-4">
        <div className="workspace-card">
          <div className="workspace-card-header">Backend-Ready Connectors</div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {integrations.map((integration) => (
              <div key={integration.id} className="workspace-quick-link">
                <div className="flex items-center justify-between">
                  <span>{integration.label}</span>
                  <span className="text-2xs text-muted">{integration.status.replace(/_/g, ' ')}</span>
                </div>
                <div className="text-xs text-muted font-mono mt-1">{integration.description}</div>
                {integration.requiresBackend && <div className="text-2xs text-tertiary mt-2">Requires backend API, credential vault, and scheduled jobs.</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="workspace-card">
          <div className="workspace-card-header">Implementation Contract</div>
          <div className="p-4 text-xs text-tertiary leading-normal">
            The UI now models connector status, identity readiness, audit export, and data-ingestion surfaces. A backend can replace the local store with organization-scoped APIs without changing the analyst workflow.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Thesis Panel ──
function ThesisPanel() {
  const [notes, setNotes] = useState('');
  const [verdict, setVerdict] = useState<'positive' | 'negative' | 'neutral' | ''>('');
  const addAuditEvent = useEnterpriseStore((s) => s.addAuditEvent);
  const saved = typeof window !== 'undefined' ? localStorage.getItem('fundalyst-thesis') : null;
  const [savedStatus, setSavedStatus] = useState<string | null>(() => {
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.notes || data.verdict) return 'Previous thesis found';
      } catch {}
    }
    return null;
  });

  function handleSave() {
    localStorage.setItem('fundalyst-thesis', JSON.stringify({ notes, verdict, updatedAt: new Date().toISOString() }));
    addAuditEvent({
      category: 'governance',
      severity: verdict === 'negative' ? 'warning' : 'info',
      action: 'Investment thesis saved',
      target: verdict || 'No verdict',
      details: `${notes.length} character(s)`,
    });
    setSavedStatus('Saved at ' + new Date().toLocaleTimeString());
  }

  function handleLoad() {
    try {
      const data = JSON.parse(saved || '{}');
      setNotes(data.notes || '');
      setVerdict(data.verdict || '');
      setSavedStatus(null);
    } catch {}
  }

  return (
    <div>
      <SectionTitle>Investment Thesis</SectionTitle>
      <div className="flex flex-col gap-4 mt-4">
        <div className="workspace-card">
          <div className="workspace-card-header">Your Assessment</div>
          <div className="p-4 flex flex-col gap-4">
            {/* Verdict selector */}
            <div>
              <div className="ws-metric-label mb-2">Overall Verdict</div>
              <div className="flex gap-2">
                {(['positive', 'neutral', 'negative'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={verdict === v ? 'btn-primary' : 'btn-ghost'}
                    onClick={() => setVerdict(v)}
                  >
                    {v === 'positive' ? '✓ Bullish' : v === 'neutral' ? '→ Neutral' : '✗ Bearish'}
                  </button>
                ))}
              </div>
            </div>

            {/* Thesis notes */}
            <div>
              <div className="ws-metric-label mb-2">Research Notes</div>
              <textarea
                className="num-input"
                rows={8}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`Write your investment thesis here...\n\nConsider:\n- Business quality and competitive advantages\n- Financial health and trends\n- Growth prospects\n- Valuation (is it fairly priced?)\n- Key risks and mitigants\n- Your decision and rationale`}
                aria-label="Investment thesis notes"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button type="button" className="btn-primary btn-sm" onClick={handleSave}>
                Save Thesis
              </button>
              {saved && (
                <button type="button" className="btn-secondary btn-sm" onClick={handleLoad}>
                  Load saved
                </button>
              )}
            </div>

            {savedStatus && (
              <div className="text-xs text-muted font-mono">{savedStatus}</div>
            )}
          </div>
        </div>

        {/* Quick checklist */}
        <div className="workspace-card">
          <div className="workspace-card-header">Investment Checklist</div>
          <div className="p-4 text-sm text-tertiary">
            {[
              'Business has a durable competitive advantage',
              'Revenue is growing consistently',
              'Profit margins are stable or improving',
              'Debt levels are manageable',
              'Stock is undervalued or fairly priced',
              'Key risks are identified and acceptable',
            ].map((item, i) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer py-1">
                <input type="checkbox" /> {item}
              </label>
            ))}
          </div>
        </div>
      </div>
      <Disclaimer extra="This is a research tool. Always verify calculations independently." />
    </div>
  );
}
