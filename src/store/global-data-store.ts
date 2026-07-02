import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FundalystDataset, ToolReadiness, ValidationCheck } from '@/lib/importer/types';
import { TOOL_METRICS } from '@/lib/importer/types';
import { runValidationChecks } from '@/lib/importer/tool-validation';
import { usePipelineStore } from './pipeline-store';
import { useEnterpriseStore } from './enterprise-store';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Debounce notifyModelUpdated so a fast typist or big paste triggers one recompute */
let _notifyTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedNotify(ms = 80) {
  if (_notifyTimer) clearTimeout(_notifyTimer);
  _notifyTimer = setTimeout(() => {
    _notifyTimer = null;
    usePipelineStore.getState().notifyModelUpdated();
  }, ms);
}

/** A single cell edit (paste, single-cell, fill) */
export interface CellEdit {
  metric: string;
  periodLabel: string;
  value: number | null;
  /** True if this was a user edit (as opposed to paste from import) */
  userEdit?: boolean;
}

interface GlobalDataState {
  /** All imported datasets (multi-file support) */
  datasets: FundalystDataset[];
  /** ID of the currently active dataset */
  activeDatasetId: string | null;

  /** Add a dataset (from import, upload, etc.) */
  addDataset: (dataset: FundalystDataset) => void;
  /** Remove a dataset by ID */
  removeDataset: (id: string) => void;
  /** Set the active dataset */
  setActiveDataset: (id: string | null) => void;
  /** Clear all datasets */
  clearAllData: () => void;
  /** Get the active dataset object */
  getActiveDataset: () => FundalystDataset | null;
  /** Get tool readiness for a specific tool */
  getToolReadiness: (toolId: string) => ToolReadiness;
  /** Run validation checks on the active dataset */
  getValidations: () => ValidationCheck[];

  // ── Write API (Pillar A: unified data flow) ──

  /** Write a single cell value for (metric, period); marks userOverridden; preserves provenance */
  writeCell: (datasetId: string, metric: string, periodLabel: string, value: number | null) => void;
  /** Upsert (create or update) a fact by metric + periodLabel */
  upsertFact: (datasetId: string, fact: { metric: string; periodLabel: string; value: number | null; statement?: string; unit?: string; currency?: string }) => void;
  /** Rename a metric across all periods */
  renameMetric: (datasetId: string, from: string, to: string) => void;
  /** Delete a specific fact */
  deleteFact: (datasetId: string, metric: string, periodLabel: string) => void;
  /** Add a new empty period column */
  addPeriod: (datasetId: string, periodLabel: string) => void;
  /** Remove a period column and all facts within it */
  removePeriod: (datasetId: string, periodLabel: string) => void;
  /** Batch apply edits (paste, fill, multi-cell); one notify at end */
  applyEdits: (datasetId: string, edits: CellEdit[]) => void;
  /** Delete a metric row entirely (all periods) */
  deleteMetric: (datasetId: string, metric: string) => void;
}

export const useGlobalDataStore = create<GlobalDataState>()(
  persist(
    (set, get) => ({
      datasets: [],
      activeDatasetId: null,

      addDataset: (dataset: FundalystDataset) => {
        const existing = get().datasets;
        // Replace if same company + source type, otherwise append
        const idx = existing.findIndex(
          (d) => d.companyName === dataset.companyName && d.sourceType === dataset.sourceType
        );
        let updated: FundalystDataset[];
        if (idx >= 0) {
          updated = [...existing];
          updated[idx] = dataset;
        } else {
          // If adding a real (non-sample) dataset, remove any sample datasets
          const filtered = dataset.sourceType !== 'sample'
            ? existing.filter((d) => d.sourceType !== 'sample')
            : existing;
          updated = [...filtered, dataset];
        }
        set({
          datasets: updated,
          activeDatasetId: dataset.id,
        });
        useEnterpriseStore.getState().addAuditEvent({
          category: 'data',
          severity: dataset.missingFields?.length ? 'warning' : 'info',
          action: 'Dataset added',
          target: dataset.companyName || dataset.sourceType || dataset.id,
          details: `${dataset.facts.length} fact(s), ${dataset.periods.length} period(s)`,
        });
        // Notify all tools that the canonical model has been updated
        debouncedNotify(0);
      },

      removeDataset: (id: string) => {
        const remaining = get().datasets.filter((d) => d.id !== id);
        const activeId = get().activeDatasetId;
        set({
          datasets: remaining,
          activeDatasetId: activeId === id
            ? (remaining.length > 0 ? remaining[remaining.length - 1].id : null)
            : activeId,
        });
        useEnterpriseStore.getState().addAuditEvent({
          category: 'data',
          severity: 'warning',
          action: 'Dataset removed',
          target: id,
        });
      },

      setActiveDataset: (id: string | null) => {
        set({ activeDatasetId: id });
      },

      clearAllData: () => {
        set({ datasets: [], activeDatasetId: null });
        useEnterpriseStore.getState().addAuditEvent({
          category: 'data',
          severity: 'critical',
          action: 'All financial data cleared',
          target: 'Workspace',
        });
      },

      getActiveDataset: () => {
        const state = get();
        if (!state.activeDatasetId && state.datasets.length === 0) return null;
        const active = state.datasets.find((d) => d.id === state.activeDatasetId);
        return active || state.datasets[0] || null;
      },

      getToolReadiness: (toolId: string): ToolReadiness => {
        const dataset = get().getActiveDataset();
        const metrics = TOOL_METRICS[toolId];
        if (!metrics) {
          return {
            toolId,
            toolName: toolId,
            ready: false,
            requiredMetrics: [],
            presentMetrics: [],
            missingMetrics: [],
            dataSource: 'none',
          };
        }

        const metricKeys = dataset?.facts.map((f) => f.metric) || [];
        const present = metrics.required.filter((m) => metricKeys.includes(m));
        const missing = metrics.required.filter((m) => !metricKeys.includes(m));

        return {
          toolId,
          toolName: metrics.name,
          ready: dataset !== null && missing.length === 0,
          requiredMetrics: metrics.required,
          presentMetrics: present,
          missingMetrics: missing,
          dataSource: dataset ? 'imported' : 'none',
          companyName: dataset?.companyName,
        };
      },

      getValidations: (): ValidationCheck[] => {
        const dataset = get().getActiveDataset();
        if (!dataset) return [];
        return runValidationChecks(dataset);
      },

      // ── Write API ──

      writeCell: (datasetId: string, metric: string, periodLabel: string, value: number | null) => {
        set((state) => {
          const dsIdx = state.datasets.findIndex((d) => d.id === datasetId);
          if (dsIdx < 0) return state;

          const ds = state.datasets[dsIdx];
          const existingIdx = ds.facts.findIndex(
            (f) => f.metric === metric && f.periodLabel === periodLabel
          );

          let newFacts = [...ds.facts];

          if (value === null || value === undefined) {
            // Delete the fact if value is null
            if (existingIdx >= 0) {
              newFacts = newFacts.filter((_, i) => i !== existingIdx);
            }
          } else if (existingIdx >= 0) {
            // Update existing fact — preserve provenance, mark as overridden
            const existing = newFacts[existingIdx];
            newFacts[existingIdx] = {
              ...existing,
              value,
              userOverridden: true,
            };
          } else {
            // Create new fact
            newFacts.push({
              metric,
              periodLabel,
              value,
              userOverridden: true,
              // Inherit from dataset defaults if available
              sourceType: ds.sourceType || 'manual',
              statement: 'mixed',
              labelOriginal: metric,
              currency: ds.currency || 'INR',
              unit: ds.unit || 'crores',
              confidence: 1.0,
              sourceRow: 0,
              sourceColumn: 0,
            });
          }

          // Ensure periods list includes this period label
          const newPeriods = ds.periods.includes(periodLabel) || !periodLabel
            ? ds.periods
            : [...ds.periods, periodLabel].sort();

          return {
            datasets: state.datasets.map((d, i) =>
              i === dsIdx
                ? { ...d, facts: newFacts, periods: newPeriods }
                : d
            ),
          };
        });
        debouncedNotify();
      },

      upsertFact: (datasetId: string, fact) => {
        const { writeCell } = get();
        writeCell(datasetId, fact.metric, fact.periodLabel, fact.value);
        // Statement/unit/currency are set via the existing fact or default; fine for now
      },

      renameMetric: (datasetId: string, from: string, to: string) => {
        if (!from || !to || from === to) return;
        set((state) => {
          const dsIdx = state.datasets.findIndex((d) => d.id === datasetId);
          if (dsIdx < 0) return state;
          return {
            datasets: state.datasets.map((d, i) =>
              i === dsIdx
                ? { ...d, facts: d.facts.map((f) => f.metric === from ? { ...f, metric: to } : f) }
                : d
            ),
          };
        });
        useEnterpriseStore.getState().addAuditEvent({
          category: 'data',
          severity: 'info',
          action: 'Metric renamed',
          target: `${from} → ${to}`,
        });
        debouncedNotify();
      },

      deleteFact: (datasetId: string, metric: string, periodLabel: string) => {
        set((state) => {
          const dsIdx = state.datasets.findIndex((d) => d.id === datasetId);
          if (dsIdx < 0) return state;
          return {
            datasets: state.datasets.map((d, i) =>
              i === dsIdx
                ? { ...d, facts: d.facts.filter((f) => !(f.metric === metric && f.periodLabel === periodLabel)) }
                : d
            ),
          };
        });
        debouncedNotify();
      },

      addPeriod: (datasetId: string, periodLabel: string) => {
        set((state) => {
          const dsIdx = state.datasets.findIndex((d) => d.id === datasetId);
          if (dsIdx < 0) return state;
          const ds = state.datasets[dsIdx];
          if (ds.periods.includes(periodLabel)) return state;
          return {
            datasets: state.datasets.map((d, i) =>
              i === dsIdx
                ? { ...d, periods: [...d.periods, periodLabel] }
                : d
            ),
          };
        });
        debouncedNotify();
      },

      removePeriod: (datasetId: string, periodLabel: string) => {
        set((state) => {
          const dsIdx = state.datasets.findIndex((d) => d.id === datasetId);
          if (dsIdx < 0) return state;
          return {
            datasets: state.datasets.map((d, i) =>
              i === dsIdx
                ? {
                    ...d,
                    periods: d.periods.filter((p) => p !== periodLabel),
                    facts: d.facts.filter((f) => f.periodLabel !== periodLabel),
                  }
                : d
            ),
          };
        });
        debouncedNotify();
      },

      applyEdits: (datasetId: string, edits: CellEdit[]) => {
        // Batch apply — avoids re-render per cell
        set((state) => {
          const dsIdx = state.datasets.findIndex((d) => d.id === datasetId);
          if (dsIdx < 0) return state;

          const dataset = state.datasets[dsIdx];
          let newFacts = [...dataset.facts];
          const newPeriodsSet = new Set<string>(dataset.periods);

          for (const edit of edits) {
            const existingIdx = newFacts.findIndex(
              (f) => f.metric === edit.metric && f.periodLabel === edit.periodLabel
            );

            if (edit.periodLabel) newPeriodsSet.add(edit.periodLabel);

            if (edit.value === null || edit.value === undefined) {
              if (existingIdx >= 0) {
                newFacts = newFacts.filter((_, i) => i !== existingIdx);
              }
            } else if (existingIdx >= 0) {
              const existing = newFacts[existingIdx];
              newFacts[existingIdx] = {
                ...existing,
                value: edit.value,
                userOverridden: existing.userOverridden || (edit.userEdit ?? true),
              };
            } else {
              newFacts.push({
                metric: edit.metric,
                periodLabel: edit.periodLabel,
                value: edit.value,
                userOverridden: edit.userEdit ?? true,
                sourceType: dataset.sourceType || 'manual',
                statement: 'mixed',
                labelOriginal: edit.metric,
                currency: dataset.currency || 'INR',
                unit: dataset.unit || 'crores',
                confidence: 1.0,
                sourceRow: 0,
                sourceColumn: 0,
              });
            }
          }

          return {
            datasets: state.datasets.map((d, i) =>
              i === dsIdx
                ? { ...d, facts: newFacts, periods: [...newPeriodsSet].sort() }
                : d
            ),
          };
        });
        useEnterpriseStore.getState().addAuditEvent({
          category: 'data',
          severity: 'info',
          action: 'Batch cell edits applied',
          target: datasetId,
          details: `${edits.length} cell(s)`,
        });
        debouncedNotify();
      },

      deleteMetric: (datasetId: string, metric: string) => {
        set((state) => {
          const dsIdx = state.datasets.findIndex((d) => d.id === datasetId);
          if (dsIdx < 0) return state;
          return {
            datasets: state.datasets.map((d, i) =>
              i === dsIdx
                ? { ...d, facts: d.facts.filter((f) => f.metric !== metric) }
                : d
            ),
          };
        });
        debouncedNotify();
      },
    }),
    {
      name: 'fundalyst-global-data',
      partialize: (state) => ({
        datasets: state.datasets,
        activeDatasetId: state.activeDatasetId,
      }),
      merge: (persisted, current) => {
        if (!isRecord(persisted)) return current;
        const datasets = Array.isArray(persisted.datasets)
          ? persisted.datasets as FundalystDataset[]
          : current.datasets;
        const activeDatasetId = datasets.some((dataset) => dataset.id === persisted.activeDatasetId)
          ? String(persisted.activeDatasetId)
          : datasets[0]?.id ?? null;

        return {
          ...current,
          datasets,
          activeDatasetId,
        };
      },
    }
  )
);

/** Helper: generate a unique dataset ID */
export function generateDatasetId(): string {
  return 'ds_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

/** Helper: get the active dataset (non-hook version for callbacks) */
export function getActiveDataset(): FundalystDataset | null {
  return useGlobalDataStore.getState().getActiveDataset();
}

/** Helper: get all datasets count */
export function getDatasetCount(): number {
  return useGlobalDataStore.getState().datasets.length;
}
