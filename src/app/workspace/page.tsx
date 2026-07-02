'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePageTitle } from '@/lib/use-page-title';
import { useGlobalDataStore } from '@/store/global-data-store';
import { useImporterStore } from '@/store/importer-store';
import { getCanonicalFactId } from '@/lib/calculation-trace';
import { SectionTitle, Disclaimer, Card, TrustBadge, DataSourceBadge } from '@/components/ui';
import type { FundalystDataset, CanonicalFact } from '@/lib/importer/types';
import { useEnterpriseStore } from '@/store/enterprise-store';
import ToolReadinessCards from '@/components/shared/ToolReadinessCards';
import { TOOL_BY_ID, type ToolId, type ToolMetadata } from '@/lib/tool-metadata';
import {
  collectFundalystLocalState,
} from '@/lib/enterprise-backup';
import { generateMemo, downloadMemoMarkdown } from '@/lib/memo-export';
import { useActiveDataset } from '@/store/financial-model-selectors';
import { useDCFStore, useRatiosStore } from '@/store';
import {
  ArrowRight,
  Calculator,
  ChartPie,
  Clock,
  Database,
  FileText,
  GearSix,
  Notebook,
  ShieldCheck,
  UploadSimple,
  UsersThree,
} from '@phosphor-icons/react';

// ── Research workflow steps ──
const steps = [
  { id: 'overview', label: 'Overview',
    icon: <Clock size={14} weight="regular" /> },
  { id: 'import', label: 'Import Report',
    icon: <UploadSimple size={14} weight="regular" /> },
  { id: 'data', label: 'Financial Data',
    icon: <Database size={14} weight="regular" /> },
  { id: 'filing', label: 'Filing Comparison',
    icon: <FileText size={14} weight="regular" /> },
  { id: 'dcf', label: 'DCF Valuation',
    icon: <Calculator size={14} weight="regular" /> },
  { id: 'ratios', label: 'Financial Ratios',
    icon: <ChartPie size={14} weight="regular" /> },
  { id: 'thesis', label: 'Investment Thesis',
    icon: <Notebook size={14} weight="regular" /> },
] as const;

type StepId = (typeof steps)[number]['id'];

// ── Workspace lenses (collapsed below main workflow) ──
const settingsSteps = [
  { id: 'evidence', label: 'Evidence & Assumptions',
    icon: <ShieldCheck size={14} weight="regular" /> },
  { id: 'coverage', label: 'Coverage',
    icon: <UsersThree size={14} weight="regular" /> },
  { id: 'backup', label: 'Backup',
    icon: <GearSix size={14} weight="regular" /> },
] as const;

type SettingsStepId = (typeof settingsSteps)[number]['id'];

// ── Tool definitions with purpose context ──
const toolList = (ids: ToolId[]): ToolMetadata[] => ids.map((id) => TOOL_BY_ID[id]);
const quickAnalysisTools = toolList(['filing', 'trends', 'growth']);
const deepDiveTools = toolList(['dcf', 'ratios', 'peer', 'wc']);

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedFactId = searchParams.get('fact');
  const selectedMetric = searchParams.get('metric');
  const selectedLens = searchParams.get('lens') as SettingsStepId | null;
  const deepLinkedLens = settingsSteps.some((step) => step.id === selectedLens) ? selectedLens : null;
  const isEvidencePivot = Boolean(selectedFactId || selectedMetric);
  const hasWorkspaceQuery = Boolean(selectedFactId || selectedMetric || deepLinkedLens);
  const visibleSettingsOpen = settingsOpen || isEvidencePivot || Boolean(deepLinkedLens);
  const visibleActiveSettingsStep = isEvidencePivot ? 'evidence' : deepLinkedLens || activeSettingsStep;
  const visibleActiveStep = visibleActiveSettingsStep ? 'overview' : activeStep;
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
            Import Source
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
                className={`workspace-step ${visibleActiveStep === step.id && !visibleActiveSettingsStep ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => {
                  if (hasWorkspaceQuery) router.replace('/workspace', { scroll: false });
                  setActiveStep(step.id);
                  setActiveSettingsStep(null);
                }}
                aria-current={visibleActiveStep === step.id && !visibleActiveSettingsStep ? 'step' : undefined}
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
            className={`ws-settings-trigger${visibleSettingsOpen ? ' open' : ''}`}
            onClick={() => {
              if (hasWorkspaceQuery) router.replace('/workspace', { scroll: false });
              setSettingsOpen(!settingsOpen);
            }}
            aria-expanded={visibleSettingsOpen}
            aria-label="Workspace lenses"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <circle cx="5" cy="5" r="1.5" /><path d="M5 1v1M5 8v1M1.5 5h1M7.5 5h1" />
            </svg>
            <span>Workspace Lenses</span>
            <svg className={`ws-settings-chevron${visibleSettingsOpen ? ' open' : ''}`} width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <path d="M2 3l2 2 2-2" />
            </svg>
          </button>
          {visibleSettingsOpen && settingsSteps.map((step) => (
            <button
              key={step.id}
              className={`workspace-step ${visibleActiveSettingsStep === step.id ? 'active' : ''}`}
              onClick={() => {
                if (hasWorkspaceQuery) router.replace('/workspace', { scroll: false });
                setActiveSettingsStep(step.id);
                setActiveStep('overview');
              }}
              aria-current={visibleActiveSettingsStep === step.id ? 'step' : undefined}
            >
              <span className="workspace-step-icon">{step.icon}</span>
              <span className="workspace-step-label">{step.label}</span>
            </button>
          ))}
        </nav>

        {/* ── Main content ── */}
        <main className="workspace-content" role="main">
          {visibleActiveStep === 'overview' && !visibleActiveSettingsStep && (
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
          {visibleActiveStep === 'import' && <ImportPanel />}
          {visibleActiveStep === 'data' && <DataPanel datasets={datasets} />}
          {visibleActiveStep === 'filing' && <FilingPanel />}
          {visibleActiveStep === 'dcf' && <DCFPanel />}
          {visibleActiveStep === 'ratios' && <RatiosPanel />}
          {visibleActiveStep === 'thesis' && <ThesisPanel />}
          {visibleActiveSettingsStep === 'evidence' && <EvidencePanel datasets={datasets} totalFacts={totalFacts} selectedFactId={selectedFactId} selectedMetric={selectedMetric} />}
          {visibleActiveSettingsStep === 'coverage' && <CoveragePanel />}
          {visibleActiveSettingsStep === 'backup' && <BackupPanel />}
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
        <div className="ws-empty-hero ws-empty-primary">
          <div className="ws-kicker">Workspace starts with source data</div>
          <div className="ws-empty-hero-heading">No company selected.</div>
          <div className="ws-empty-hero-desc">
            Upload your first annual report to begin your research workspace.
            Fundalyst will extract financial statements, detect periods and metrics, and prepare every analysis tool with your data.
          </div>
          <Link href="/import" className="btn-primary ws-primary-action">
            Analyze an annual report
            <ArrowRight size={14} weight="bold" />
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
                    <div className="ws-tool-card-top">
                      <tool.icon size={15} weight="regular" />
                      <span>{tool.label}</span>
                    </div>
                    <div className="ws-tool-card-desc">{tool.description}</div>
                    <div className="ws-tool-card-status">
                      <span className={`ws-tool-card-status-dot ${tool.needsData && hasData ? 'ready' : 'needs-data'}`} />
                      {tool.value}
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
                    <div className="ws-tool-card-top">
                      <tool.icon size={15} weight="regular" />
                      <span>{tool.label}</span>
                    </div>
                    <div className="ws-tool-card-desc">{tool.description}</div>
                    <div className="ws-tool-card-status">
                      <span className={`ws-tool-card-status-dot ${tool.needsData && hasData ? 'ready' : tool.needsData ? 'needs-data' : 'ready'}`} />
                      {tool.value}
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
  const tool = TOOL_BY_ID.ratios;
  const count = tool.count ?? tool.value;
  const inputs = tool.inputs ?? '6 inputs';

  return (
    <div>
      <SectionTitle>{tool.label}</SectionTitle>
      <div className="workspace-card mt-4">
        <div className="workspace-card-header">{count}</div>
        <div className="p-4 flex flex-col gap-3">
          <p className="text-sm text-tertiary leading-normal" style={{ margin: 0 }}>
            {inputs} unlock Net Profit Margin, ROE, Debt/Equity, Debt/Assets, and Asset Turnover.
          </p>
          <Link href={tool.href} className="workspace-quick-link">
            Open {tool.label} →
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

// ── Evidence & Assumptions Panel ──
function EvidencePanel({
  datasets,
  totalFacts,
  selectedFactId,
  selectedMetric,
}: {
  datasets: FundalystDataset[];
  totalFacts: number;
  selectedFactId: string | null;
  selectedMetric: string | null;
}) {
  const activeDataset = useGlobalDataStore((s) => s.getActiveDataset());
  const validations = useGlobalDataStore((s) => s.getValidations());
  const facts = activeDataset?.facts ?? [];
  const selectedFact = activeDataset && selectedFactId
    ? facts.find((fact) => getCanonicalFactId(fact, activeDataset) === selectedFactId)
    : undefined;
  const metricFacts = selectedMetric
    ? facts.filter((fact) => {
      const metric = (fact.metric || fact.canonicalMetric || '').toLowerCase();
      const original = fact.labelOriginal.toLowerCase();
      const q = selectedMetric.toLowerCase();
      return metric.includes(q) || original.includes(q);
    })
    : [];
  const previewFacts = facts.slice(0, 12);
  const displayFacts = metricFacts.length > 0
    ? metricFacts.slice(0, 12)
    : selectedFact && !previewFacts.includes(selectedFact)
    ? [selectedFact, ...previewFacts.slice(0, 11)]
    : previewFacts;

  return (
    <div>
      <SectionTitle>Evidence & Assumptions</SectionTitle>
      <div className="flex flex-col gap-4 mt-4">
        <div className="workspace-card">
          <div className="workspace-card-header">Current Evidence</div>
          <div className="p-4">
            <div className="ws-status-grid">
              <div className="ws-status-item">
                <div className="ws-status-label">Company</div>
                <div className="ws-status-value">{activeDataset?.companyName || 'No company selected'}</div>
              </div>
              <div className="ws-status-item">
                <div className="ws-status-label">Sources</div>
                <div className="ws-status-value">{datasets.length}</div>
              </div>
              <div className="ws-status-item">
                <div className="ws-status-label">Accepted facts</div>
                <div className="ws-status-value">{totalFacts}</div>
              </div>
              <div className="ws-status-item">
                <div className="ws-status-label">Periods</div>
                <div className="ws-status-value">{activeDataset?.periods?.length || 0}</div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap mt-3">
              <DataSourceBadge variant={activeDataset ? 'imported' : 'none'} />
              {activeDataset?.sourceType && <TrustBadge label={activeDataset.sourceType} variant="source" />}
              {activeDataset?.confidence !== undefined && (
                <TrustBadge label={`${Math.round(activeDataset.confidence * 100)}% import confidence`} />
              )}
            </div>
          </div>
        </div>

        <div className="workspace-card">
          <div className="workspace-card-header">Tool Readiness</div>
          <div className="p-4">
            <ToolReadinessCards className="grid grid-cols-2 gap-3" />
          </div>
        </div>

        <div className="workspace-card">
          <div className="workspace-card-header">Accepted Facts</div>
          <div className="p-4">
            {selectedFactId && !selectedFact && (
              <div className="text-xs text-tertiary font-mono mb-3">
                Linked source fact was not found in the active dataset. Switch coverage or re-import the source to inspect it.
              </div>
            )}
            {selectedMetric && metricFacts.length === 0 && (
              <div className="text-xs text-tertiary font-mono mb-3">
                No accepted fact matched <strong>{selectedMetric}</strong> in the active dataset.
              </div>
            )}
            {displayFacts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">No accepted facts yet</div>
                <div className="empty-state-desc">Import a source document and confirm mappings to build the evidence base.</div>
                <Link href="/import" className="empty-state-action">Import source →</Link>
              </div>
            ) : (
              <table className="diff-table">
                <thead><tr><th>Metric</th><th>Period</th><th>Value</th><th>Source</th></tr></thead>
                <tbody>
                  {displayFacts.map((fact, i) => {
                    const factId = activeDataset ? getCanonicalFactId(fact, activeDataset) : '';
                    const isSelected = factId === selectedFactId;
                    return (
                    <tr key={`${fact.metric}-${fact.periodLabel}-${i}`} className={isSelected ? 'evidence-fact-selected' : undefined}>
                      <td>{fact.metric || fact.canonicalMetric || '—'}</td>
                      <td>{fact.periodLabel || '—'}</td>
                      <td>{fact.value ?? '—'}</td>
                      <td>{fact.sourceType || activeDataset?.sourceType || 'imported'}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {validations.length > 0 && (
              <div className="flex flex-col gap-2 mt-3">
                {validations.slice(0, 3).map((validation, i) => (
                  <div key={i} className="text-xs text-tertiary font-mono">
                    {validation.passed ? 'ok' : 'review'}: {validation.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Coverage Panel ──
function CoveragePanel() {
  const datasets = useGlobalDataStore((s) => s.datasets);
  const activeDatasetId = useGlobalDataStore((s) => s.activeDatasetId);
  const setActiveDataset = useGlobalDataStore((s) => s.setActiveDataset);
  const removeDataset = useGlobalDataStore((s) => s.removeDataset);

  return (
    <div>
      <SectionTitle>Coverage</SectionTitle>
      <div className="flex flex-col gap-4 mt-4">
        <div className="workspace-card">
          <div className="workspace-card-header">Saved Companies</div>
          <div className="p-4">
            {datasets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">No coverage yet</div>
                <div className="empty-state-desc">Import a company source to start a local coverage list.</div>
                <Link href="/import" className="empty-state-action">Import source →</Link>
              </div>
            ) : (
              <div className="coverage-list">
                {datasets.map((dataset) => {
                  const isActive = dataset.id === activeDatasetId;
                  const periods = dataset.periods?.length || 0;

                  return (
                    <div key={dataset.id} className={`coverage-row${isActive ? ' active' : ''}`}>
                      <div className="coverage-row-main">
                        <div className="coverage-name">{dataset.companyName || 'Unnamed company'}</div>
                        <div className="coverage-meta">
                          {dataset.sourceType} · {periods} period{periods !== 1 ? 's' : ''} · {dataset.facts.length} facts
                        </div>
                      </div>
                      <div className="coverage-actions">
                        <button
                          type="button"
                          className={isActive ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                          onClick={() => setActiveDataset(dataset.id)}
                        >
                          {isActive ? 'Active' : 'Make active'}
                        </button>
                        <Link href="/workspace?metric=revenue" className="btn-ghost btn-sm">
                          Evidence
                        </Link>
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={() => removeDataset(dataset.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="workspace-card">
          <div className="workspace-card-header">Coverage Actions</div>
          <div className="p-4 flex gap-2 flex-wrap">
            <Link href="/import" className="btn-primary btn-sm">Import another company</Link>
            <Link href="/tools/peer" className="btn-ghost btn-sm">Compare saved companies</Link>
            <Link href="/workspace?metric=revenue" className="btn-ghost btn-sm">Source revenue</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Backup Panel ──
function BackupPanel() {
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const payload = collectFundalystLocalState();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fundalyst-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

  return (
    <div>
      <SectionTitle>Backup</SectionTitle>
      <div className="workspace-card mt-4">
        <div className="workspace-card-header">Local Workspace Backup</div>
        <div className="p-4 flex flex-col gap-3">
          <p className="text-sm text-tertiary leading-normal" style={{ margin: 0 }}>
            Export the browser-stored research workspace, or restore a previous backup. This is local persistence, not simulated enterprise governance.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button type="button" className="btn-primary btn-sm" onClick={handleExport}>Export workspace</button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => importInputRef.current?.click()}>Import workspace</button>
            <input ref={importInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
          </div>
          {importMsg && <div className="text-xs text-primary font-mono">{importMsg}</div>}
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
