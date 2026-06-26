import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FundalystDataset, ImportReviewState, MetricMapping } from '@/lib/importer/types';
import { buildReviewState, applyMappingOverrides } from '@/lib/importer/parser';
import { useGlobalDataStore, generateDatasetId } from '@/store/global-data-store';

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
        // Ensure dataset has ID and push to global store
        const fullDataset: FundalystDataset = {
          ...dataset,
          id: dataset.id || generateDatasetId(),
          createdAt: dataset.createdAt || new Date().toISOString(),
        };
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
    }
  )
);
