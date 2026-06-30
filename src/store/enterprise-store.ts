import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EnterpriseRole = 'Owner' | 'Admin' | 'Analyst' | 'Reviewer' | 'Viewer';
export type ProjectStatus = 'Active' | 'Review' | 'Approved' | 'Archived';
export type AuditSeverity = 'info' | 'warning' | 'critical';
export type AuditCategory = 'data' | 'calculation' | 'governance' | 'security' | 'export' | 'integration';
export type IntegrationStatus = 'not_configured' | 'ready_for_backend' | 'connected';

export interface EnterpriseMember {
  id: string;
  name: string;
  email: string;
  role: EnterpriseRole;
  status: 'Active' | 'Invited';
}

export interface EnterpriseProject {
  id: string;
  name: string;
  companyName: string;
  status: ProjectStatus;
  owner: string;
  createdAt: string;
  updatedAt: string;
  activeDatasetId: string | null;
  retentionPolicy: string;
  approvalRequired: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  category: AuditCategory;
  severity: AuditSeverity;
  action: string;
  target: string;
  details?: string;
}

export interface WorkspaceVersion {
  id: string;
  projectId: string;
  label: string;
  createdAt: string;
  actor: string;
  summary: string;
  datasetCount: number;
  factCount: number;
  payload: unknown;
}

export interface EnterpriseIntegration {
  id: string;
  label: string;
  description: string;
  status: IntegrationStatus;
  requiresBackend: boolean;
  lastCheckedAt?: string;
}

interface EnterpriseState {
  organizationName: string;
  currentUser: EnterpriseMember;
  members: EnterpriseMember[];
  projects: EnterpriseProject[];
  activeProjectId: string;
  auditEvents: AuditEvent[];
  versions: WorkspaceVersion[];
  integrations: EnterpriseIntegration[];
  createProject: (name: string, companyName?: string) => string;
  updateProject: (id: string, updates: Partial<Pick<EnterpriseProject, 'name' | 'companyName' | 'status' | 'activeDatasetId' | 'retentionPolicy' | 'approvalRequired'>>) => void;
  setActiveProject: (id: string) => void;
  updateMemberRole: (id: string, role: EnterpriseRole) => void;
  addAuditEvent: (event: Omit<AuditEvent, 'id' | 'timestamp' | 'actor'> & { actor?: string }) => void;
  createVersion: (input: { label: string; summary: string; datasetCount: number; factCount: number; payload: unknown }) => string;
  clearAuditEvents: () => void;
}

const nowIso = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const defaultUser: EnterpriseMember = {
  id: 'user_local_owner',
  name: 'Local Owner',
  email: 'owner@fundalyst.local',
  role: 'Owner',
  status: 'Active',
};

const defaultProject: EnterpriseProject = {
  id: 'project_local_default',
  name: 'Local Research Project',
  companyName: 'No company selected',
  status: 'Active',
  owner: defaultUser.name,
  createdAt: nowIso(),
  updatedAt: nowIso(),
  activeDatasetId: null,
  retentionPolicy: 'Local browser storage; export for retention',
  approvalRequired: true,
};

const defaultIntegrations: EnterpriseIntegration[] = [
  {
    id: 'market_data',
    label: 'Market data provider',
    description: 'Ready for FactSet, Bloomberg, Refinitiv, Capital IQ, or internal market-data APIs.',
    status: 'ready_for_backend',
    requiresBackend: true,
  },
  {
    id: 'filing_feed',
    label: 'Filing feed',
    description: 'Ready for SEC, NSE/BSE, EDGAR, or document-management ingestion once server jobs exist.',
    status: 'ready_for_backend',
    requiresBackend: true,
  },
  {
    id: 'identity',
    label: 'Identity provider',
    description: 'Ready for SSO/SAML/OIDC mapping. Local role simulation is active today.',
    status: 'ready_for_backend',
    requiresBackend: true,
  },
  {
    id: 'audit_export',
    label: 'Audit export',
    description: 'Available locally through workspace export and encrypted backup.',
    status: 'connected',
    requiresBackend: false,
  },
];

export const useEnterpriseStore = create<EnterpriseState>()(
  persist(
    (set, get) => ({
      organizationName: 'Fundalyst Local Research',
      currentUser: defaultUser,
      members: [
        defaultUser,
        { id: 'user_reviewer', name: 'Investment Committee', email: 'committee@fundalyst.local', role: 'Reviewer', status: 'Active' },
        { id: 'user_viewer', name: 'Read-only Stakeholder', email: 'viewer@fundalyst.local', role: 'Viewer', status: 'Invited' },
      ],
      projects: [defaultProject],
      activeProjectId: defaultProject.id,
      auditEvents: [
        {
          id: makeId('audit'),
          timestamp: nowIso(),
          actor: defaultUser.name,
          category: 'governance',
          severity: 'info',
          action: 'Workspace initialized',
          target: defaultProject.name,
          details: 'Local enterprise controls are active. Backend sync is not configured.',
        },
      ],
      versions: [],
      integrations: defaultIntegrations,

      createProject: (name, companyName) => {
        const id = makeId('project');
        const project: EnterpriseProject = {
          id,
          name: name.trim() || 'Untitled Research Project',
          companyName: companyName?.trim() || 'No company selected',
          status: 'Active',
          owner: get().currentUser.name,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          activeDatasetId: null,
          retentionPolicy: 'Local browser storage; export for retention',
          approvalRequired: true,
        };
        set((s) => ({ projects: [...s.projects, project], activeProjectId: id }));
        get().addAuditEvent({
          category: 'governance',
          severity: 'info',
          action: 'Project created',
          target: project.name,
          details: project.companyName,
        });
        return id;
      },

      updateProject: (id, updates) => {
        set((s) => ({
          projects: s.projects.map((p) => p.id === id ? { ...p, ...updates, updatedAt: nowIso() } : p),
        }));
        const project = get().projects.find((p) => p.id === id);
        get().addAuditEvent({
          category: 'governance',
          severity: 'info',
          action: 'Project updated',
          target: project?.name || id,
          details: Object.keys(updates).join(', '),
        });
      },

      setActiveProject: (id) => {
        set({ activeProjectId: id });
        const project = get().projects.find((p) => p.id === id);
        get().addAuditEvent({
          category: 'governance',
          severity: 'info',
          action: 'Project opened',
          target: project?.name || id,
        });
      },

      updateMemberRole: (id, role) => {
        set((s) => ({
          members: s.members.map((m) => m.id === id ? { ...m, role } : m),
        }));
        const member = get().members.find((m) => m.id === id);
        get().addAuditEvent({
          category: 'security',
          severity: 'warning',
          action: 'Role changed',
          target: member?.name || id,
          details: role,
        });
      },

      addAuditEvent: (event) => {
        const actor = event.actor || get().currentUser.name;
        const nextEvent: AuditEvent = {
          ...event,
          id: makeId('audit'),
          timestamp: nowIso(),
          actor,
        };
        set((s) => ({ auditEvents: [nextEvent, ...s.auditEvents].slice(0, 250) }));
      },

      createVersion: ({ label, summary, datasetCount, factCount, payload }) => {
        const state = get();
        const id = makeId('version');
        const version: WorkspaceVersion = {
          id,
          projectId: state.activeProjectId,
          label: label.trim() || `Snapshot ${state.versions.length + 1}`,
          createdAt: nowIso(),
          actor: state.currentUser.name,
          summary,
          datasetCount,
          factCount,
          payload,
        };
        set((s) => ({ versions: [version, ...s.versions].slice(0, 50) }));
        get().addAuditEvent({
          category: 'data',
          severity: 'info',
          action: 'Workspace snapshot created',
          target: version.label,
          details: summary,
        });
        return id;
      },

      clearAuditEvents: () => {
        set({ auditEvents: [] });
      },
    }),
    {
      name: 'fundalyst-enterprise',
      version: 1,
      merge: (persisted, current) => {
        if (!isRecord(persisted)) return current;
        const next = { ...current, ...persisted } as EnterpriseState;

        next.currentUser = isRecord(persisted.currentUser)
          ? { ...defaultUser, ...persisted.currentUser } as EnterpriseMember
          : current.currentUser;
        next.members = Array.isArray(persisted.members) ? persisted.members as EnterpriseMember[] : current.members;
        next.projects = Array.isArray(persisted.projects) && persisted.projects.length > 0
          ? persisted.projects as EnterpriseProject[]
          : current.projects;
        next.auditEvents = Array.isArray(persisted.auditEvents) ? persisted.auditEvents as AuditEvent[] : current.auditEvents;
        next.versions = Array.isArray(persisted.versions) ? persisted.versions as WorkspaceVersion[] : current.versions;
        next.integrations = Array.isArray(persisted.integrations) ? persisted.integrations as EnterpriseIntegration[] : current.integrations;
        next.activeProjectId = next.projects.some((project) => project.id === persisted.activeProjectId)
          ? String(persisted.activeProjectId)
          : next.projects[0].id;

        return next;
      },
    },
  ),
);

export function getActiveEnterpriseProject(): EnterpriseProject | null {
  const state = useEnterpriseStore.getState();
  return state.projects.find((p) => p.id === state.activeProjectId) || state.projects[0] || null;
}
