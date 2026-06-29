import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FundalystDataset, ToolReadiness, ValidationCheck } from '@/lib/importer/types';
import { TOOL_METRICS } from '@/lib/importer/types';
import { runValidationChecks } from '@/lib/importer/tool-validation';
import { usePipelineStore } from './pipeline-store';

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
        // Notify all tools that the canonical model has been updated
        setTimeout(() => usePipelineStore.getState().notifyModelUpdated(), 0);
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
      },

      setActiveDataset: (id: string | null) => {
        set({ activeDatasetId: id });
      },

      clearAllData: () => {
        set({ datasets: [], activeDatasetId: null });
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
    }),
    {
      name: 'fundalyst-global-data',
      partialize: (state) => ({
        datasets: state.datasets,
        activeDatasetId: state.activeDatasetId,
      }),
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
