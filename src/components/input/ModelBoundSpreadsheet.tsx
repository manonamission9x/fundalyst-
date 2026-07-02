'use client';

import { useCallback, useMemo } from 'react';
import SpreadsheetInput from './SpreadsheetInput';
import type { SpreadsheetRow } from './SpreadsheetInput';
import { useGlobalDataStore } from '@/store/global-data-store';
import { useActiveDataset } from '@/store/financial-model-selectors';
import { datasetToGrid, gridToEdits } from '@/store/financial-model-selectors';
import { useWorkspaceContextStore } from '@/store/workspace-context-store';

/**
 * ModelBoundSpreadsheet — a SpreadsheetInput that reads from and writes to
 * the canonical model (FundalystDataset in global-data-store).
 *
 * This is the thin adapter that wires Pillar A: the grid becomes a
 * view+controller over the model, not a local state editor.
 *
 * Every cell commit → store.writeCell → debounced notifyModelUpdated()
 * → all useModelData readers re-extract → charts/tools/ratios live-update.
 */
interface ModelBoundSpreadsheetProps {
  /** Optional statement filter (income_statement, balance_sheet, etc.) */
  statement?: string;
  /** Optional className */
  className?: string;
  /** Optional tool-specific hint */
  hint?: string;
  /** Label for single-column mode (default: 'Value') */
  singleColumnLabel?: string;
}

export default function ModelBoundSpreadsheet({
  statement,
  className = '',
  hint,
  singleColumnLabel = 'Value',
}: ModelBoundSpreadsheetProps) {
  const dataset = useActiveDataset();
  const applyEdits = useGlobalDataStore((s) => s.applyEdits);
  const activeDatasetId = useGlobalDataStore((s) => s.activeDatasetId);
  const setActiveCell = useWorkspaceContextStore((s) => s.setActiveCell);

  // Derive grid shape from the canonical model
  const grid = useMemo(() => {
    if (!dataset) return { periods: [singleColumnLabel], rows: [] };
    return datasetToGrid(dataset, statement);
  }, [dataset, statement, singleColumnLabel]);

  // Convert canonical grid → SpreadsheetInput rows (string values)
  const initialPeriods = useMemo(() => grid.periods, [grid.periods]);
  const initialData = useMemo<SpreadsheetRow[]>(() =>
    grid.rows.map((r) => ({
      metric: r.metric,
      values: r.values.map((v) => v !== null ? String(v) : ''),
    })),
  [grid.rows]);

  // When the grid data changes, write back to the canonical model
  const handleDataChange = useCallback(
    (rows: SpreadsheetRow[], periods: string[]) => {
      if (!activeDatasetId) return;

      // Convert grid rows to canonical edits
      const edits = gridToEdits(
        rows.map((r) => ({
          metric: r.metric,
          values: r.values.map((v) => {
            if (v === '' || v === null || v === undefined) return null;
            const n = Number(String(v).replace(/,/g, ''));
            return isFinite(n) ? n : null;
          }),
        })),
        periods,
      );

      if (edits.length === 0) return;

      // Batch apply all edits with one notify at the end
      applyEdits(activeDatasetId, edits);
    },
    [activeDatasetId, applyEdits],
  );

  // Publish the active cell into the workspace-context store (T14 seam):
  // translate the grid's row/col into a canonical (metric, period) reference.
  const handleActiveCellChange = useCallback(
    (row: number, col: number) => {
      const metric = grid.rows[row]?.metric;
      if (!metric) return;
      const periodLabel = col <= 0 ? '' : (initialPeriods[col - 1] ?? '');
      setActiveCell({ metric, periodLabel });
    },
    [grid.rows, initialPeriods, setActiveCell],
  );

  if (!dataset || !activeDatasetId) {
    return (
      <div className="spreadsheet-empty">
        <p className="text-sm text-secondary">
          No dataset loaded. Import a financial report to see data here.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <SpreadsheetInput
        initialPeriods={initialPeriods}
        initialData={initialData}
        onDataChange={handleDataChange}
        onActiveCellChange={handleActiveCellChange}
      />
      {hint && (
        <div className="flex justify-between items-center mt-2 px-1">
          <span className="spreadsheet-hint">{hint}</span>
        </div>
      )}
    </div>
  );
}
