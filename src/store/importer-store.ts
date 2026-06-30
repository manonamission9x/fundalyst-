import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FundalystDataset, ImportReviewState, MetricMapping } from '@/lib/importer/types';
import { buildReviewState, applyMappingOverrides } from '@/lib/importer/parser';
import { useGlobalDataStore, generateDatasetId } from '@/store/global-data-store';
import { clearAllToolStores } from '@/store';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function isDataset(value: unknown): value is FundalystDataset {
  return isRecord(value) && Array.isArray(value.facts) && Array.isArray(value.periods);
}

interface ImporterState {
  /** The current import review (null = no active import) */
  review: ImportReviewState | null;
  /** Whether an import is in progress */
  isImporting: boolean;
  /** Error message if import failed */
  error: string | null;
  /** Saved mapping templates (label pattern → canonical metric) */
  savedMappings: Record<string, string>;
  /** The last confirmed dataset (null = none imported yet) */
  lastDataset: FundalystDataset | null;

  // Actions
  startImport: (file: File) => Promise<void>;
  updateMapping: (originalLabel: string, updates: Partial<MetricMapping>) => void;
  confirmImport: () => FundalystDataset | null;
  cancelImport: () => void;
  saveMappingTemplate: () => void;
  clearLastDataset: () => void;
}

export const useImporterStore = create<ImporterState>()(
  persist(
    (set, get) => ({
      review: null,
      isImporting: false,
      error: null,
      savedMappings: {},
      lastDataset: null,

      startImport: async (file: File) => {
        set({ isImporting: true, error: null });
        try {
          const review = await buildReviewState(file);
          if (!review.dataset || review.rawFacts.length === 0) {
            const detail = review.warnings.length > 0
              ? review.warnings.join(' ')
              : 'No financial values were detected in this file.';
            throw new Error(`No usable financial data was parsed. ${detail}`);
          }
          // Apply any saved mappings to auto-correct
          const saved = get().savedMappings;
          if (Object.keys(saved).length > 0) {
            review.mappings = review.mappings.map((m) => {
              const savedMatch = saved[m.originalLabel.toLowerCase()];
              if (savedMatch) {
                return { ...m, canonicalMetric: savedMatch, userConfirmed: true };
              }
              return m;
            });
          }
          set({ review, isImporting: false });
        } catch (err) {
          set({
            isImporting: false,
            error: err instanceof Error ? err.message : 'Failed to parse file',
          });
        }
      },

      updateMapping: (originalLabel: string, updates: Partial<MetricMapping>) => {
        const review = get().review;
        if (!review) return;
        set({
          review: {
            ...review,
            mappings: review.mappings.map((m) =>
              m.originalLabel === originalLabel ? { ...m, ...updates } : m
            ),
          },
        });
      },

      confirmImport: () => {
        const review = get().review;
        if (!review) return null;
        const dataset = applyMappingOverrides(review, review.mappings);
        const isSample = review.fileName === 'sample-financial-data.csv';
        const fallbackCompanyName = isSample ? 'Sample Company' : undefined;
        const sourceType = isSample ? 'sample' : review.sourceType;
        const facts = dataset.facts.map((fact) => ({ ...fact, sourceType }));
        // Ensure dataset has ID and push to global store
        const fullDataset: FundalystDataset = {
          ...dataset,
          facts,
          sourceType,
          companyName: dataset.companyName || fallbackCompanyName,
          id: dataset.id || generateDatasetId(),
          createdAt: dataset.createdAt || new Date().toISOString(),
        };
        clearAllToolStores();
        set({ lastDataset: fullDataset, review: null });
        // Push into global data store so all tools can access it
        useGlobalDataStore.getState().addDataset(fullDataset);
        return fullDataset;
      },

      cancelImport: () => {
        set({ review: null, error: null });
      },

      saveMappingTemplate: () => {
        const review = get().review;
        if (!review) return;
        const newMappings: Record<string, string> = {};
        for (const m of review.mappings) {
          if (m.userConfirmed && !m.ignored && m.confidence < 1.0) {
            newMappings[m.originalLabel.toLowerCase()] = m.userOverride || m.canonicalMetric;
          }
        }
        set((s) => ({
          savedMappings: { ...s.savedMappings, ...newMappings },
        }));
      },

      clearLastDataset: () => {
        set({ lastDataset: null });
      },
    }),
    {
      name: 'fundalyst-importer',
      partialize: (state) => ({
        savedMappings: state.savedMappings,
        lastDataset: state.lastDataset,
      }),
      merge: (persisted, current) => {
        if (!isRecord(persisted)) return current;
        return {
          ...current,
          savedMappings: isRecord(persisted.savedMappings)
            ? persisted.savedMappings as Record<string, string>
            : current.savedMappings,
          lastDataset: isDataset(persisted.lastDataset) ? persisted.lastDataset : current.lastDataset,
        };
      },
    }
  )
);
