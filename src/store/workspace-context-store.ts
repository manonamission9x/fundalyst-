'use client';
import { create } from 'zustand';
import { useGlobalDataStore } from './global-data-store';
import type { CanonicalFact } from '@/lib/importer/types';

/**
 * Workspace Context Store — "what the user is looking at, right now."
 *
 * Every surface (grid, tool, chart) updates this store when the user
 * changes selection, sheet, or active cell.  Nothing reads it yet at
 * the app level — it's the substrate for future grounded-AI (T14),
 * memo export, audit trail, and cross-tool context.
 *
 * T14 SEAM: `describeContext()` + `getSelectedFacts()` produce the
 * exact payload a future "Explain this" assistant will consume.
 * No AI answer ships here; just the socket.
 */

export type StatementType = 'income_statement' | 'balance_sheet' | 'cash_flow' | 'market_data' | 'quarterly_results' | 'assumptions' | 'all';

export interface CellRef {
  metric: string;
  periodLabel: string;
}

interface SelectionRange {
  anchor: CellRef;
  focus: CellRef;
}

interface WorkspaceContextState {
  activeDatasetId: string | null;
  activeSheet: StatementType;
  selection: SelectionRange | null;
  activeCell: CellRef | null;

  /** Set the currently active sheet/worksheet tab */
  setActiveSheet: (sheet: StatementType) => void;
  /** Update selection (called on every selection/toggle in the grid) */
  setSelection: (anchor: CellRef, focus: CellRef) => void;
  /** Update active cell (called on every cell focus) */
  setActiveCell: (ref: CellRef | null) => void;
  /** Clear selection (e.g. clicking outside the grid) */
  clearSelection: () => void;

  // ── Derived helpers (computed on access) ──

  /** Get the facts currently in selection */
  getSelectedFacts: () => CanonicalFact[];
  /** Describe context as a string for AI prompt / debug */
  describeContext: () => string;
}

export const useWorkspaceContextStore = create<WorkspaceContextState>((set, get) => ({
  activeDatasetId: null,
  activeSheet: 'all',
  selection: null,
  activeCell: null,

  setActiveSheet: (sheet) => {
    set({ activeSheet: sheet, selection: null, activeCell: null });
  },

  setSelection: (anchor, focus) => {
    set({ selection: { anchor, focus } });
  },

  setActiveCell: (ref) => {
    set({ activeCell: ref });
  },

  clearSelection: () => {
    set({ selection: null, activeCell: null });
  },

  getSelectedFacts: () => {
    const state = get();
    if (!state.selection) return [];

    const ds = useGlobalDataStore.getState().datasets.find(
      (d) => d.id === state.activeDatasetId || d.id === useGlobalDataStore.getState().activeDatasetId
    );
    if (!ds) return [];

    const { anchor, focus } = state.selection;
    // Sort metrics and period labels to define the range
    const allMetrics = [...new Set(ds.facts.map((f) => f.metric))];
    const allPeriods = [...new Set(ds.facts.map((f) => f.periodLabel))];

    const m1 = allMetrics.indexOf(anchor.metric);
    const m2 = allMetrics.indexOf(focus.metric);
    const p1 = allPeriods.indexOf(anchor.periodLabel);
    const p2 = allPeriods.indexOf(focus.periodLabel);

    if (m1 < 0 || m2 < 0 || p1 < 0 || p2 < 0) return [];

    const mMin = Math.min(m1, m2);
    const mMax = Math.max(m1, m2);
    const pMin = Math.min(p1, p2);
    const pMax = Math.max(p1, p2);

    const selectedMetrics = allMetrics.slice(mMin, mMax + 1);
    const selectedPeriods = allPeriods.slice(pMin, pMax + 1);

    return ds.facts.filter(
      (f) => selectedMetrics.includes(f.metric) && selectedPeriods.includes(f.periodLabel)
    );
  },

  describeContext: () => {
    const state = get();
    const ds = useGlobalDataStore.getState().datasets.find(
      (d) => d.id === state.activeDatasetId || d.id === useGlobalDataStore.getState().activeDatasetId
    );
    const company = ds?.companyName || 'Unknown company';

    const parts: string[] = [company];

    if (state.activeSheet && state.activeSheet !== 'all') {
      parts.push(state.activeSheet.replace('_', ' '));
    }

    if (state.activeCell) {
      parts.push(`${state.activeCell.metric} ${state.activeCell.periodLabel}`);
    }

    if (state.selection) {
      const { anchor, focus } = state.selection;
      if (anchor.metric !== focus.metric || anchor.periodLabel !== focus.periodLabel) {
        parts.push(`(selection: ${anchor.metric} → ${focus.metric}, ${anchor.periodLabel} → ${focus.periodLabel})`);
      }
    }

    return parts.join(' / ');
  },
}));
