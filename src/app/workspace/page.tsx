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
  decryptWorkspaceBackup,
  downloadTextFile,
  encryptWorkspaceBackup,
  restoreFundalystLocalState,
} from '@/lib/enterprise-backup';
import { generateMemo, downloadMemoMarkdown } from '@/lib/memo-export';
import { useActiveDataset } from '@/store/financial-model-selectors';
import { useDCFStore, useRatiosStore } from '@/store';

// ── Workspace step definitions ──
const steps = [
  { id: 'overview', label: 'Overview',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="6" /><path d="M7 4v3l2 2" /></svg> },
  { id: 'import', label: 'Import',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2v8M3 6l4-4 4 4" /><path d="M2 11v1h10v-1" /></svg> },
  { id: 'data', label: 'Financial Data',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="10" height="8" rx="1" /><path d="M5 7h4M5 9h2" /></svg> },
  { id: 'filing', label: 'Filing',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h5l3 3v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" /><path d="M8 2v3h3" /><path d="M5 7l2 2 3-3" /></svg> },
  { id: 'dcf', label: 'DCF',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12l4-5 3 2 5-6" /><circle cx="11.5" cy="3.5" r="1.5" fill="currentColor" stroke="none" /></svg> },
  { id: 'ratios', label: 'Ratios',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12V5l3 2 3-5 3 7 2-3" /><circle cx="13" cy="3" r="1" fill="currentColor" stroke="none" /></svg> },
  { id: 'thesis', label: 'Thesis',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v10M10 2v10M2 4h10M2 10h10" /><path d="M7 2v10" /><path d="M2 7h10" /></svg> },
  { id: 'governance', label: 'Governance',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V3l5-2z" /><path d="M5 7l1.5 1.5L10 5" /></svg> },
  { id: 'audit', label: 'Audit',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h8v10H3z" /><path d="M5 5h4M5 7h4M5 9h2" /></svg> },
  { id: 'integrations', label: 'Integrations',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4H3a3 3 0 000 6h2M9 4h2a3 3 0 010 6H9M5 7h4" /></svg> },
] as const;

type StepId = (typeof steps)[number]['id'];

// ── Quick link definitions with status indicators ──
interface QuickLink {
  id: string;
  label: string;
  href: string;
  desc: string;
}

const quickLinks: QuickLink[] = [
  { id: 'dcf', label: 'DCF Valuation', href: '/tools/dcf', desc: 'Intrinsic value estimation' },
  { id: 'filing', label: 'Filing Comparison', href: '/research/filing', desc: 'Period-over-period analysis' },
  { id: 'ratios', label: 'Financial Ratios', href: '/tools/ratios', desc: 'Health check metrics' },
  { id: 'peer', label: 'Peer Comparison', href: '/tools/peer', desc: 'Industry benchmark' },
  { id: 'wc', label: 'Cash Efficiency', href: '/tools/wc', desc: 'Working capital analysis' },
  { id: 'trends', label: 'Trend Charts', href: '/research/trends', desc: 'Revenue & margin trends' },
  { id: 'growth', label: 'Growth Rates', href: '/research/growth', desc: 'CAGR & YoY growth' },
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
    activeDatasetId,
    activeProjectSyncId,
    activeProjectCompanyName,
    activeProjectDatasetId,
    companyName,
    hasData,
    updateProject,
  ]);

  // Track completed steps based on actual state
  const completedSteps: Set<StepId> = new Set();
  if (hasData) completedSteps.add('import');
  if (hasData) completedSteps.add('data');
  if (totalFacts > 0) completedSteps.add('filing');
  completedSteps.add('governance');
  completedSteps.add('audit');
  completedSteps.add('integrations');

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
              Data loaded
            </span>
          ) : null}
          <Link href="/import" className="workspace-cta">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 2v8M3 6l4-4 4 4" /><path d="M2 10v2h10v-2" />
            </svg>
            Import
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
                onClick={() => setActiveStep(step.id)}
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
        </nav>

        {/* ── Main content ── */}
        <main className="workspace-content" role="main">
          {activeStep === 'overview' && (
            <OverviewPanel
              hasData={hasData}
              companyName={companyName}
              datasets={datasets}
              totalFacts={totalFacts}
              quickLinks={quickLinks}
              activeDataset={activeDataset}
            />
          )}
          {activeStep === 'import' && <ImportPanel />}
          {activeStep === 'data' && <DataPanel datasets={datasets} />}
          {activeStep === 'filing' && <FilingPanel />}
          {activeStep === 'dcf' && <DCFPanel />}
          {activeStep === 'ratios' && <RatiosPanel />}
          {activeStep === 'thesis' && <ThesisPanel />}
          {activeStep === 'governance' && <GovernancePanel />}
          {activeStep === 'audit' && <AuditPanel datasets={datasets} totalFacts={totalFacts} />}
          {activeStep === 'integrations' && <IntegrationsPanel />}
        </main>
      </div>
    </div>
  );
}

// ── Overview Panel ──
export function OverviewPanel({
  hasData, companyName, datasets, totalFacts, quickLinks, activeDataset,
}: {
  hasData: boolean; companyName: string; datasets: FundalystDataset[]; totalFacts: number;
  quickLinks: QuickLink[]; activeDataset: FundalystDataset | null;
}) {
  const stepItems = [
    { num: '01', label: 'Import', desc: 'Upload CSV, Excel, or PDF with financial statements.', action: '/import', cta: 'Import data' },
    { num: '02', label: 'Review', desc: 'Check extracted metrics and periods. Correct any issues.', action: '', cta: '' },
    { num: '03', label: 'Analyze', desc: 'Use Filing, DCF, Ratios, and other tools to evaluate.', action: '/research/filing', cta: 'Start analysis' },
    { num: '04', label: 'Conclude', desc: 'Write your investment thesis based on the evidence.', action: '', cta: '' },
  ];

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

  function handleImportClick() {
    importInputRef.current?.click();
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

  function handleExportMemo() {
    const dataset = activeDataset;
    const dcfState = useDCFStore.getState();
    const ratiosState = useRatiosStore.getState();

    // Read thesis from localStorage
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
      dataset,
      thesis,
      ratios: ratiosState.res ?? undefined,
      dcfResult: dcfState.summary,
    });

    downloadMemoMarkdown(memo);
  }

  return (
    <div>
      <SectionTitle>Company Overview</SectionTitle>
      <div className="flex flex-col gap-4 mt-4">
        {/* Status card */}
        <div className="workspace-card">
          <div className="workspace-card-header">Research Status</div>
          <div className="grid grid-cols-3 gap-4 p-4">
            <div>
              <div className="ws-metric-label">Company</div>
              <div className="ws-metric-value">{companyName}</div>
            </div>
            <div>
              <div className="ws-metric-label">Data Sources</div>
              <div className="ws-metric-value">{datasets.length}</div>
            </div>
            <div>
              <div className="ws-metric-label">Metrics</div>
              <div className="ws-metric-value">{totalFacts}</div>
            </div>
          </div>
          {!hasData && (
            <div className="p-4 border-t border-[var(--border-light)] text-xs text-muted">
              No data imported yet. Start by importing financial statements.
            </div>
          )}
        </div>

        <EnterpriseCommandCenter datasets={datasets} totalFacts={totalFacts} companyName={companyName} />

        {/* Workflow steps */}
        <div className="workflow-steps">
          {stepItems.map((s, i) => (
            <div key={i} className="workflow-step">
              <div className="workflow-step-num">{s.num}</div>
              <div className="workflow-step-title">{s.label}</div>
              <div className="workflow-step-desc">{s.desc}</div>
              {s.cta && (
                <Link
                  href={s.action}
                  className="inline-flex items-center gap-1 mt-2 text-2xs text-primary font-mono"
                  style={{ textDecoration: 'none' }}
                >
                  {s.cta} →
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Quick links with status indicators */}
        <div className="workspace-card">
          <div className="workspace-card-header">Tool Quick Links</div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  className="workspace-quick-link"
                >
                  <div className="flex items-center justify-between">
                    <span>{link.label}</span>
                    <span className="workspace-link-status" aria-label="Available">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                        <path d="M3 5l2 2 3-4" />
                      </svg>
                    </span>
                  </div>
                  <div className="text-xs text-muted font-mono mt-1">{link.desc}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Export Investment Memo */}
        <div className="workspace-card">
          <div className="workspace-card-header">Investment Memo</div>
          <div className="p-4">
            <div className="text-xs text-tertiary mb-3">
              Generate a structured investment memo with company overview, thesis, DCF valuation, financial ratios, and data provenance — all exported as a Markdown file.
            </div>
            <button type="button" className="btn-primary btn-sm" onClick={handleExportMemo}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2v6M4 6l2 2 2-2" /><path d="M2 9v1h8V9" />
              </svg>
              Export Investment Memo
            </button>
          </div>
        </div>

        {/* Export / Import */}
        <div className="workspace-card">
          <div className="workspace-card-header">Data Backup &amp; Restore</div>
          <div className="p-4">
            <div className="text-xs text-tertiary mb-3">
              All Fundalyst data is stored in browser localStorage. Export your workspace for safekeeping, or restore from a previous export.
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
              <input
                ref={importInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportFile}
              />
            </div>
            {importMsg && (
              <div className="text-xs text-primary font-mono mt-2">{importMsg}</div>
            )}
          </div>
        </div>

        {/* Enterprise */}
        <div className="workspace-card">
          <div className="workspace-card-header">Enterprise</div>
          <div className="p-4 text-xs text-tertiary leading-normal">
            <p className="p-0" style={{ margin: 0 }}>
              <strong>Current:</strong> Fundalyst now includes local projects, role simulation, audit events, version snapshots, and encrypted workspace export. Data still lives in this browser unless exported.
            </p>
            <p className="p-0 mt-2" style={{ margin: 0 }}>
              <strong>Enterprise deployment would require:</strong> backend authentication, server-enforced permissions, encrypted cloud persistence, organization tenancy, and retained audit storage.
            </p>
            <p className="p-0 mt-2" style={{ margin: 0 }}>
              Contact us for enterprise deployment options.
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mt-2">
          <TrustBadge label="Fundalyst Research" variant="source" />
          {hasData && <TrustBadge label="Data Loaded" variant="good" />}
        </div>
      </div>
    </div>
  );
}

function EnterpriseCommandCenter({
  datasets,
  totalFacts,
  companyName,
}: {
  datasets: FundalystDataset[];
  totalFacts: number;
  companyName: string;
}) {
  const projects = useEnterpriseStore((s) => s.projects);
  const activeProjectId = useEnterpriseStore((s) => s.activeProjectId);
  const createProject = useEnterpriseStore((s) => s.createProject);
  const setActiveProject = useEnterpriseStore((s) => s.setActiveProject);
  const updateProject = useEnterpriseStore((s) => s.updateProject);
  const createVersion = useEnterpriseStore((s) => s.createVersion);
  const addAuditEvent = useEnterpriseStore((s) => s.addAuditEvent);
  const versions = useEnterpriseStore((s) => s.versions);
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const [projectName, setProjectName] = useState(activeProject?.name || '');
  const [passphrase, setPassphrase] = useState('');
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const encryptedImportRef = useRef<HTMLInputElement>(null);

  function handleCreateProject() {
    const id = createProject(projectName || `${companyName} Research`, companyName);
    setActiveProject(id);
    setProjectName('');
  }

  function handleSnapshot() {
    createVersion({
      label: `${companyName} snapshot`,
      summary: `${datasets.length} data source(s), ${totalFacts} fact(s)`,
      datasetCount: datasets.length,
      factCount: totalFacts,
      payload: collectFundalystLocalState(),
    });
  }

  async function handleEncryptedExport() {
    try {
      const encrypted = await encryptWorkspaceBackup(collectFundalystLocalState(), passphrase);
      downloadTextFile(`fundalyst-encrypted-${new Date().toISOString().slice(0, 10)}.json`, encrypted);
      setBackupMsg('Encrypted workspace exported.');
      addAuditEvent({
        category: 'export',
        severity: 'info',
        action: 'Encrypted workspace exported',
        target: activeProject?.name || 'Workspace',
      });
    } catch (err) {
      setBackupMsg(err instanceof Error ? err.message : 'Could not export encrypted workspace.');
    }
  }

  function handleEncryptedImportClick() {
    encryptedImportRef.current?.click();
  }

  function handleEncryptedImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_WORKSPACE_RESTORE_BYTES) {
      setBackupMsg('Encrypted workspace file is too large. Please restore a file under 10 MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const decrypted = await decryptWorkspaceBackup(String(evt.target?.result || ''), passphrase);
        restoreFundalystLocalState(decrypted);
        addAuditEvent({
          category: 'security',
          severity: 'warning',
          action: 'Encrypted workspace restored',
          target: file.name,
        });
        setBackupMsg('Encrypted workspace restored. Reloading page...');
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        setBackupMsg(err instanceof Error ? err.message : 'Could not restore encrypted workspace.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="workspace-card">
      <div className="workspace-card-header">Enterprise Command Center</div>
      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="ws-metric-label">Active Project</div>
            <div className="ws-metric-value text-xs">{activeProject?.name || 'None'}</div>
          </div>
          <div>
            <div className="ws-metric-label">Status</div>
            <select
              className="num-input"
              value={activeProject?.status || 'Active'}
              onChange={(e) => activeProject && updateProject(activeProject.id, { status: e.target.value as ProjectStatus })}
              aria-label="Project status"
            >
              {(['Active', 'Review', 'Approved', 'Archived'] as ProjectStatus[]).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div className="ws-metric-label">Snapshots</div>
            <div className="ws-metric-value">{versions.length}</div>
          </div>
          <div>
            <div className="ws-metric-label">Security</div>
            <div className="ws-metric-value text-xs">Local + encrypted export</div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <select className="num-input" style={{ maxWidth: 260 }} value={activeProjectId} onChange={(e) => setActiveProject(e.target.value)} aria-label="Active project">
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="num-input" style={{ maxWidth: 260 }} value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="New project name" aria-label="New project name" />
          <button type="button" className="btn-ghost btn-sm" onClick={handleCreateProject}>Create project</button>
          <button type="button" className="btn-primary btn-sm" onClick={handleSnapshot}>Create snapshot</button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <input className="num-input" type="password" style={{ maxWidth: 260 }} value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="Backup passphrase" aria-label="Backup passphrase" />
          <button type="button" className="btn-ghost btn-sm" onClick={handleEncryptedExport}>Encrypted export</button>
          <button type="button" className="btn-ghost btn-sm" onClick={handleEncryptedImportClick}>Restore encrypted</button>
          <input ref={encryptedImportRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleEncryptedImport} />
          {backupMsg && <span className="text-xs text-primary font-mono">{backupMsg}</span>}
        </div>

        <div className="flex gap-2 flex-wrap">
          <TrustBadge label="Local roles" variant="source" />
          <TrustBadge label="Audit log active" variant="good" />
          <TrustBadge label="Version snapshots" variant="good" />
          <TrustBadge label="Backend-ready integrations" variant="source" />
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
      <SectionTitle>Import Data</SectionTitle>
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
      <SectionTitle>Ratios & Metrics</SectionTitle>
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
        <div className="workspace-card">
          <div className="workspace-card-header">Project Controls</div>
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
          <div className="workspace-card-header">Role Simulation</div>
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
            These controls are enforced as local product state today. Production enforcement still requires server-side auth, permission checks, encrypted storage, audit retention, and organization tenancy.
          </div>
        </div>
      </div>
    </div>
  );
}

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
                placeholder="Write your investment thesis here...&#10;&#10;Consider:&#10;- Business quality and competitive advantages&#10;- Financial health and trends&#10;- Growth prospects&#10;- Valuation (is it fairly priced?)&#10;- Key risks and mitigants&#10;- Your decision and rationale"
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
