'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { METRIC_LABELS, METRIC_LIBRARY } from './metric-library';
import type { MetricEntry } from './metric-library';

/**
 * SpreadsheetInput — An Excel-like data entry grid for financial figures.
 *
 * Features:
 *  - Tab/Shift+Tab, Enter/Shift+Enter, Arrow key navigation
 *  - Ctrl+Arrow keys to jump to edge of data region
 *  - Home/End to jump to first/last column
 *  - Paste from Excel/Google Sheets (tab-separated) with header detection
 *  - Copy-paste within the spreadsheet (multi-cell range support)
 *  - Undo/Redo (Ctrl+Z / Ctrl+Y)
 *  - Select all (Ctrl+A)
 *  - Range selection via Shift+click
 *  - Metric auto-suggest in first column
 *  - Add/remove rows and columns
 *  - contentEditable cells for native editing
 */

export interface SpreadsheetRow {
  metric: string;
  values: string[];
}

interface SpreadsheetInputProps {
  initialPeriods?: string[];
  initialData?: SpreadsheetRow[];
  onDataChange?: (rows: SpreadsheetRow[], periods: string[]) => void;
  className?: string;
  resetKey?: number;
}

/** Column label for the metric name column */
const METRIC_COL = 0;

/** Get column letter (A, B, C... Z, AA, AB...) */
function colLetter(n: number): string {
  let s = '';
  let x = n;
  while (x >= 0) {
    s = String.fromCharCode(65 + (x % 26)) + s;
    x = Math.floor(x / 26) - 1;
  }
  return s;
}

/** Clamp a number between min and max */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Deep clone rows for undo stack */
function cloneRows(rows: SpreadsheetRow[]): SpreadsheetRow[] {
  return rows.map((r) => ({ ...r, values: [...r.values] }));
}

export default function SpreadsheetInput({
  initialPeriods = ['Q1', 'Q2', 'Q3', 'Q4'],
  initialData,
  onDataChange,
  className = '',
  resetKey,
}: SpreadsheetInputProps) {
  const [periods, setPeriods] = useState<string[]>(initialPeriods);
  const [rows, setRows] = useState<SpreadsheetRow[]>(() =>
    initialData && initialData.length > 0
      ? initialData
      : [
          { metric: 'Revenue', values: periods.map(() => '') },
          { metric: 'Net Profit', values: periods.map(() => '') },
          { metric: 'Total Assets', values: periods.map(() => '') },
        ],
  );
  const [activeRow, setActiveRow] = useState<number>(0);
  const [activeCol, setActiveCol] = useState<number>(0);

  // ── Range selection ──
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const selectionEndRef = useRef<{ row: number; col: number } | null>(null);

  // ── Clipboard (internal copy-paste) ──
  const clipboardRef = useRef<{ rows: number; cols: number; data: string[][] } | null>(null);

  // ── Undo stack ──
  const undoStackRef = useRef<{ rows: SpreadsheetRow[]; periods: string[] }[]>([]);
  const redoStackRef = useRef<{ rows: SpreadsheetRow[]; periods: string[] }[]>([]);
  const MAX_UNDO = 50;
  const ignoreNextUndoRef = useRef(false);

  // Metric suggestion state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState('');
  const suggestionRef = useRef<HTMLDivElement>(null);
  const [showMetricBrowser, setShowMetricBrowser] = useState(false);
  const metricBrowserRef = useRef<HTMLDivElement>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row: number; col: number } | null>(null);

  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());

  const notifyChange = useCallback(
    (newRows: SpreadsheetRow[], newPeriods: string[]) => {
      onDataChange?.(newRows, newPeriods);
    },
    [onDataChange],
  );

  const filteredMetrics = useMemo(() => {
    if (!suggestionFilter) return METRIC_LABELS.slice(0, 15);
    const f = suggestionFilter.toLowerCase();
    return METRIC_LABELS.filter((m) => m.toLowerCase().includes(f)).slice(0, 15);
  }, [suggestionFilter]);

  // ── Undo helper ──
  const pushUndo = useCallback(() => {
    if (ignoreNextUndoRef.current) { ignoreNextUndoRef.current = false; return; }
    undoStackRef.current.push({ rows: cloneRows(rows), periods: [...periods] });
    if (undoStackRef.current.length > MAX_UNDO) undoStackRef.current.shift();
    redoStackRef.current = [];
  }, [rows, periods]);

  const undo = useCallback(() => {
    const state = undoStackRef.current.pop();
    if (!state) return;
    redoStackRef.current.push({ rows: cloneRows(rows), periods: [...periods] });
    ignoreNextUndoRef.current = true;
    setRows(state.rows);
    setPeriods(state.periods);
  }, [rows, periods]);

  const redo = useCallback(() => {
    const state = redoStackRef.current.pop();
    if (!state) return;
    undoStackRef.current.push({ rows: cloneRows(rows), periods: [...periods] });
    ignoreNextUndoRef.current = true;
    setRows(state.rows);
    setPeriods(state.periods);
  }, [rows, periods]);

  const updateCell = useCallback(
    (rowIdx: number, colIdx: number, value: string) => {
      setRows((prev) => {
        const next = prev.map((r) => ({ ...r, values: [...r.values] }));
        if (colIdx === METRIC_COL) {
          next[rowIdx] = { ...next[rowIdx], metric: value };
        } else {
          next[rowIdx].values[colIdx - 1] = value;
        }
        return next;
      });
    },
    [],
  );

  // ── Focus helper ──
  const focusCell = useCallback((row: number, col: number) => {
    requestAnimationFrame(() => {
      const el = cellRefs.current.get(`${row}-${col}`);
      if (el) {
        el.focus({ preventScroll: true });
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }, []);

  // ── Range: is a cell within the selection? ──
  const isInSelection = useCallback(
    (row: number, col: number): boolean => {
      if (!selectionStart) return false;
      const end = selectionEndRef.current || selectionStart;
      const r1 = Math.min(selectionStart.row, end.row);
      const r2 = Math.max(selectionStart.row, end.row);
      const c1 = Math.min(selectionStart.col, end.col);
      const c2 = Math.max(selectionStart.col, end.col);
      return row >= r1 && row <= r2 && col >= c1 && col <= c2;
    },
    [selectionStart],
  );

  // ── Read selected range as 2D array ──
  const readSelection = useCallback((): string[][] => {
    const start = selectionStart;
    if (!start) return [];
    const end = selectionEndRef.current ?? start;
    const r1 = Math.min(start.row, end.row);
    const r2 = Math.max(start.row, end.row);
    const c1 = Math.min(start.col, end.col);
    const c2 = Math.max(start.col, end.col);
    const result: string[][] = [];
    for (let r = r1; r <= r2; r++) {
      const rowArr: string[] = [];
      for (let c = c1; c <= c2; c++) {
        if (c === METRIC_COL) {
          rowArr.push(rows[r]?.metric ?? '');
        } else {
          rowArr.push(rows[r]?.values[c - 1] ?? '');
        }
      }
      result.push(rowArr);
    }
    return result;
  }, [selectionStart, rows]);

  // ── Write a 2D array into the grid starting at a position ──
  const writeRange = useCallback(
    (data: string[][], startRow: number, startCol: number) => {
      pushUndo();
      setRows((prev) => {
        const next = prev.map((r) => ({ ...r, values: [...r.values] }));
        for (let ri = 0; ri < data.length; ri++) {
          const targetRow = startRow + ri;
          // Ensure enough rows exist
          while (next.length <= targetRow) {
            next.push({ metric: '', values: periods.map(() => '') });
          }
          for (let ci = 0; ci < data[ri].length; ci++) {
            const targetCol = startCol + ci;
            if (targetCol === METRIC_COL) {
              if (data[ri][ci]) next[targetRow].metric = data[ri][ci];
            } else {
              const vi = targetCol - 1;
              // Ensure enough values in the row
              while (next[targetRow].values.length <= vi) {
                next[targetRow].values.push('');
              }
              next[targetRow].values[vi] = data[ri][ci];
            }
          }
        }
        return next;
      });
    },
    [periods, pushUndo],
  );

  // ── Add a new row ──
  const addRow = useCallback(
    (metric = '', focusCol = 0) => {
      pushUndo();
      setRows((prev) => [...prev, { metric, values: periods.map(() => '') }]);
      const newIdx = rows.length;
      setActiveRow(newIdx);
      setActiveCol(focusCol);
      focusCell(newIdx, focusCol);
    },
    [periods, rows.length, focusCell, pushUndo],
  );

  // ── Add a new period column ──
  const addPeriod = useCallback(() => {
    pushUndo();
    setPeriods((prev) => [...prev, `Period ${prev.length + 1}`]);
    setRows((prev) => prev.map((r) => ({ ...r, values: [...r.values, ''] })));
    const newCol = periods.length + 1;
    setActiveCol(newCol);
    focusCell(activeRow, newCol);
  }, [periods.length, activeRow, focusCell, pushUndo]);

  // ── Remove a row ──
  const removeRow = useCallback(
    (rowIdx: number) => {
      pushUndo();
      setRows((prev) => prev.filter((_, i) => i !== rowIdx));
    },
    [pushUndo],
  );

  // ── Remove a period column ──
  const removePeriod = useCallback(
    (colIdx: number) => {
      pushUndo();
      const dataCol = colIdx; // 0-indexed period column
      setPeriods((prev) => prev.filter((_, i) => i !== dataCol));
      setRows((prev) => prev.map((r) => ({ ...r, values: r.values.filter((_, i) => i !== dataCol) })));
      if (activeCol > dataCol + 1) setActiveCol(activeCol - 1);
      else if (activeCol === dataCol + 1) setActiveCol(Math.max(1, dataCol));
    },
    [activeCol, pushUndo],
  );

  // ── Clear selected cells ──
  const clearSelection = useCallback(() => {
    const start = selectionStart;
    if (!start) {
      // No range — clear active cell
      pushUndo();
      updateCell(activeRow, activeCol, '');
      return;
    }
    const end = selectionEndRef.current || start;
    pushUndo();
    const r1 = Math.min(start.row, end.row);
    const r2 = Math.max(start.row, end.row);
    const c1 = Math.min(start.col, end.col);
    const c2 = Math.max(start.col, end.col);
    setRows((prev) => {
      const next = prev.map((r) => ({ ...r, values: [...r.values] }));
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          if (c === METRIC_COL) {
            if (next[r]) next[r].metric = '';
          } else {
            if (next[r]) next[r].values[c - 1] = '';
          }
        }
      }
      return next;
    });
  }, [selectionStart, activeRow, activeCol, pushUndo, updateCell]);

  // ── Keyboard navigation ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
      const maxRow = rows.length - 1;
      const maxCol = periods.length; // col 0 = metric, rest = periods
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl shortcuts
      if (ctrl) {
        switch (e.key.toLowerCase()) {
          case 'z': {
            e.preventDefault();
            if (e.shiftKey) redo();
            else undo();
            return;
          }
          case 'y': {
            e.preventDefault();
            redo();
            return;
          }
          case 'c': {
            e.preventDefault();
            const data = readSelection();
            if (data.length === 0) return;
            clipboardRef.current = {
              rows: data.length,
              cols: data[0].length,
              data,
            };
            // Also write to OS clipboard
            const text = data.map((row) => (row.includes('\t') ? row.map((c) => `"${c}"`).join('\t') : row.join('\t'))).join('\n');
            navigator.clipboard?.writeText(text).catch((err) => console.warn('[SpreadsheetInput] clipboard write failed:', err));
            return;
          }
          case 'x': {
            e.preventDefault();
            const data = readSelection();
            if (data.length === 0) return;
            clipboardRef.current = {
              rows: data.length,
              cols: data[0].length,
              data,
            };
            const text = data.map((row) => row.join('\t')).join('\n');
            navigator.clipboard?.writeText(text).catch(() => {});
            clearSelection();
            return;
          }
          case 'v': {
            e.preventDefault();
            // If we have internal clipboard, paste from it
            if (clipboardRef.current) {
              writeRange(clipboardRef.current.data, rowIdx, colIdx);
              return;
            }
            // Otherwise, let default paste handler run
            return;
          }
          case 'a': {
            e.preventDefault();
            setSelectionStart({ row: 0, col: 0 });
            selectionEndRef.current = { row: maxRow, col: maxCol };
            return;
          }
          case 'arrowup': {
            e.preventDefault();
            // Jump to top of data in this column
            let r = rowIdx - 1;
            while (r >= 0) {
              const v = colIdx === METRIC_COL ? rows[r].metric : rows[r].values[colIdx - 1];
              if (v && v.trim()) break;
              r--;
            }
            const target = Math.max(0, r >= 0 ? r : 0);
            setActiveRow(target);
            setActiveCol(colIdx);
            focusCell(target, colIdx);
            return;
          }
          case 'arrowdown': {
            e.preventDefault();
            let r = rowIdx + 1;
            while (r <= maxRow) {
              const v = colIdx === METRIC_COL ? rows[r].metric : rows[r].values[colIdx - 1];
              if (v && v.trim()) break;
              r++;
            }
            const target = Math.min(maxRow, r <= maxRow ? r : maxRow);
            setActiveRow(target);
            setActiveCol(colIdx);
            focusCell(target, colIdx);
            return;
          }
          case 'arrowleft': {
            e.preventDefault();
            // Jump to first column with data to the left
            let c = colIdx - 1;
            while (c >= 0) {
              const v = rows[rowIdx] ? (c === METRIC_COL ? rows[rowIdx].metric : rows[rowIdx].values[c - 1]) : '';
              if (v && v.trim()) break;
              c--;
            }
            const target = Math.max(0, c >= 0 ? c : 0);
            setActiveCol(target);
            focusCell(rowIdx, target);
            return;
          }
          case 'arrowright': {
            e.preventDefault();
            let c = colIdx + 1;
            while (c <= maxCol) {
              const v = rows[rowIdx] ? (c === METRIC_COL ? rows[rowIdx].metric : rows[rowIdx].values[c - 1]) : '';
              if (v && v.trim()) break;
              c++;
            }
            const target = Math.min(maxCol, c <= maxCol ? c : maxCol);
            setActiveCol(target);
            focusCell(rowIdx, target);
            return;
          }
        }
        return; // All other ctrl combos fall through
      }

      switch (e.key) {
        case 'Tab': {
          e.preventDefault();
          const dir = e.shiftKey ? -1 : 1;
          let nextCol = colIdx + dir;
          let nextRow = rowIdx;
          if (nextCol < 0) {
            nextCol = maxCol;
            nextRow = Math.max(0, rowIdx - 1);
          } else if (nextCol > maxCol) {
            nextCol = 0;
            nextRow = rowIdx + 1;
          }
          if (nextRow > maxRow) {
            addRow('', nextCol);
            return;
          }
          setActiveRow(nextRow);
          setActiveCol(nextCol);
          setSelectionStart(null);
          selectionEndRef.current = null;
          focusCell(nextRow, nextCol);
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (rowIdx >= maxRow) {
            addRow('', colIdx);
            return;
          }
          setActiveRow(rowIdx + 1);
          setActiveCol(colIdx);
          setSelectionStart(null);
          selectionEndRef.current = null;
          focusCell(rowIdx + 1, colIdx);
          break;
        }
        case 'Shift+Enter':
        case 'ArrowUp': {
          e.preventDefault();
          const upRow = Math.max(0, rowIdx - 1);
          setActiveRow(upRow);
          setActiveCol(colIdx);
          setSelectionStart(null);
          selectionEndRef.current = null;
          focusCell(upRow, colIdx);
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          if (rowIdx >= maxRow) {
            addRow('', colIdx);
            return;
          }
          setActiveRow(rowIdx + 1);
          setActiveCol(colIdx);
          setSelectionStart(null);
          selectionEndRef.current = null;
          focusCell(rowIdx + 1, colIdx);
          break;
        }
        case 'ArrowRight': {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const el = e.target as HTMLElement;
            if (range.startOffset < (el.textContent?.length ?? 0)) return;
          }
          e.preventDefault();
          const rightCol = Math.min(colIdx + 1, maxCol);
          setActiveCol(rightCol);
          setSelectionStart(null);
          selectionEndRef.current = null;
          focusCell(rowIdx, rightCol);
          break;
        }
        case 'ArrowLeft': {
          const sel2 = window.getSelection();
          if (sel2 && sel2.rangeCount > 0) {
            const range = sel2.getRangeAt(0);
            if (range.startOffset > 0) return;
          }
          e.preventDefault();
          const leftCol = Math.max(0, colIdx - 1);
          setActiveCol(leftCol);
          setSelectionStart(null);
          selectionEndRef.current = null;
          focusCell(rowIdx, leftCol);
          break;
        }
        case 'Home': {
          e.preventDefault();
          setActiveCol(0);
          setSelectionStart(null);
          selectionEndRef.current = null;
          focusCell(rowIdx, 0);
          break;
        }
        case 'End': {
          e.preventDefault();
          setActiveCol(maxCol);
          setSelectionStart(null);
          selectionEndRef.current = null;
          focusCell(rowIdx, maxCol);
          break;
        }
        case 'Delete':
        case 'Backspace': {
          e.preventDefault();
          clearSelection();
          break;
        }
        case 'Escape': {
          setSelectionStart(null);
          selectionEndRef.current = null;
          setContextMenu(null);
          break;
        }
      }
    },
    [rows, periods.length, addRow, focusCell, undo, redo, readSelection, clearSelection, writeRange, pushUndo],
  );

  // ── Paste handling ──
  const handlePaste = useCallback(
    (e: React.ClipboardEvent, _rowIdx: number, _colIdx: number) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      if (!text.trim()) return;

      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const matrix = lines.map((line) => line.split('\t').map((c) => c.trim()));

      // Check if first line looks like headers
      const firstRow = matrix[0];
      const hasHeaders =
        firstRow.length > 1 &&
        firstRow.some((c) => /^(fy|20\d{2}|period|q[1-4])/i.test(c) || /^\d{4}$/.test(c));

      let dataStartRow = 0;
      let parsedPeriods: string[] = [];

      if (hasHeaders) {
        parsedPeriods = firstRow.slice(1);
        dataStartRow = 1;
      }

      const dataRows = matrix.slice(dataStartRow);
      if (dataRows.length === 0) return;

      pushUndo();

      setRows((prev) => {
        const next = prev.map((r) => ({ ...r, values: [...r.values] }));

        if (parsedPeriods.length > 0) {
          setPeriods(parsedPeriods);
          for (const r of next) {
            r.values = [...parsedPeriods.map((_, i) => r.values[i] ?? '')];
          }
        }

        for (let ri = 0; ri < dataRows.length; ri++) {
          const row = dataRows[ri];
          const metric = row[0];
          const values = row.slice(1);
          if (!metric) continue;

          const existingIdx = next.findIndex((r) => r.metric.toLowerCase() === metric.toLowerCase());
          if (existingIdx >= 0) {
            for (let vi = 0; vi < values.length && vi < (parsedPeriods.length || periods.length); vi++) {
              if (values[vi]) next[existingIdx].values[vi] = values[vi];
            }
          } else {
            const newValues = parsedPeriods.length > 0
              ? parsedPeriods.map((_, vi) => values[vi] ?? '')
              : periods.map((_, vi) => values[vi] ?? '');
            next.push({ metric, values: newValues });
          }
        }

        return next;
      });

      const pasteTargetRow = dataStartRow < dataRows.length ? _rowIdx + dataStartRow : _rowIdx;
      focusCell(pasteTargetRow, _colIdx);
    },
    [periods, focusCell, pushUndo],
  );

  // ── Handle cell blur ──
  const handleBlur = useCallback(
    (e: React.FocusEvent, rowIdx: number, colIdx: number) => {
      const value = (e.target as HTMLElement).textContent ?? '';
      updateCell(rowIdx, colIdx, value);
    },
    [updateCell],
  );

  // ── Metric suggestions ──
  const handleMetricInput = useCallback((value: string) => {
    setSuggestionFilter(value);
    setShowSuggestions(value.length > 0);
  }, []);

  const selectMetric = useCallback(
    (metric: string) => {
      updateCell(activeRow, METRIC_COL, metric);
      setShowSuggestions(false);
      setSuggestionFilter('');
      setActiveCol(1);
      setSelectionStart(null);
      selectionEndRef.current = null;
      focusCell(activeRow, 1);
    },
    [activeRow, updateCell, focusCell],
  );

  // ── Context menu ──
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, row: number, col: number) => {
      e.preventDefault();
      setActiveRow(row);
      setActiveCol(col);
      setContextMenu({ x: e.clientX, y: e.clientY, row, col });
    },
    [],
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // ── Mouse click on cell handles range selection ──
  const handleCellMouseDown = useCallback(
    (e: React.MouseEvent, row: number, col: number) => {
      if (e.shiftKey && selectionStart) {
        e.preventDefault();
        selectionEndRef.current = { row, col };
        setActiveRow(row);
        setActiveCol(col);
        // Force re-render by toggling selectionStart
        setSelectionStart({ ...selectionStart });
      } else {
        setSelectionStart({ row, col });
        selectionEndRef.current = { row, col };
      }
    },
    [selectionStart],
  );

  // Close popups on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (metricBrowserRef.current && !metricBrowserRef.current.contains(e.target as Node)) {
        setShowMetricBrowser(false);
      }
      if (contextMenu) closeContextMenu();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contextMenu, closeContextMenu]);

  // Reset internal state when resetKey changes
  useEffect(() => {
    if (resetKey === undefined) return;
    setPeriods(initialPeriods);
    setRows(
      initialData && initialData.length > 0
        ? initialData
        : [
            { metric: 'Revenue', values: initialPeriods.map(() => '') },
            { metric: 'Net Profit', values: initialPeriods.map(() => '') },
            { metric: 'Total Assets', values: initialPeriods.map(() => '') },
          ],
    );
    setActiveRow(0);
    setActiveCol(0);
    setSelectionStart(null);
    selectionEndRef.current = null;
    setShowSuggestions(false);
    setSuggestionFilter('');
    setShowMetricBrowser(false);
    undoStackRef.current = [];
    redoStackRef.current = [];
  }, [resetKey]);

  // Notify parent
  useEffect(() => {
    notifyChange(rows, periods);
  }, [rows, periods, notifyChange]);

  // ── Determine cell classes ──
  const cellClass = useCallback(
    (row: number, col: number, val: string): string => {
      const isActive = row === activeRow && col === activeCol;
      const inSel = isActive ? true : isInSelection(row, col);
      const classes = ['spreadsheet-cell'];
      if (col === METRIC_COL) classes.push('spreadsheet-metric');
      else classes.push('spreadsheet-value');
      if (!val) classes.push('spreadsheet-empty');
      if (isActive) classes.push('cell-active');
      else if (inSel) classes.push('cell-selected');
      return classes.join(' ');
    },
    [activeRow, activeCol, isInSelection],
  );

  return (
    <div className={`spreadsheet-wrap${className ? ' ' + className : ''}`}>
      <table className="spreadsheet-grid">
        <thead>
          <tr>
            <th className={`spreadsheet-corner${activeCol >= 0 ? ' col-active' : ''}`}>
              <span className="spreadsheet-corner-label">Line Item</span>
            </th>
            {periods.map((p, ci) => (
              <th
                key={ci}
                className={`spreadsheet-header${activeCol === ci + 1 ? ' col-active' : ''}`}
              >
                <input
                  className="spreadsheet-header-input"
                  value={p}
                  onChange={(e) => {
                    setPeriods((prev) => {
                      const next = [...prev];
                      next[ci] = e.target.value;
                      return next;
                    });
                  }}
                  maxLength={20}
                  aria-label={`Period ${ci + 1} label`}
                />
                <button
                  type="button"
                  className="spreadsheet-header-remove"
                  onClick={() => removePeriod(ci)}
                  aria-label={`Remove ${p}`}
                  title="Remove period"
                >
                  ×
                </button>
              </th>
            ))}
            <th className="spreadsheet-add-col">
              <button
                type="button"
                className="spreadsheet-add-btn"
                onClick={addPeriod}
                aria-label="Add period column"
                title="Add period column"
              >
                +
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={`${ri === activeRow ? 'spreadsheet-row-active' : ''}${isInSelection(ri, -1) ? ' row-selected' : ''}`}>
              {/* Metric name cell */}
              <td className={`spreadsheet-metric-cell${activeRow === ri ? ' row-active' : ''}`}>
                <div className="spreadsheet-metric-wrap">
                  <span
                    className={cellClass(ri, METRIC_COL, row.metric)}
                    contentEditable
                    suppressContentEditableWarning
                    ref={(el) => { if (el) cellRefs.current.set(`${ri}-${METRIC_COL}`, el); }}
                    onInput={(e) => handleMetricInput((e.target as HTMLElement).textContent ?? '')}
                    onKeyDown={(e) => handleKeyDown(e, ri, METRIC_COL)}
                    onBlur={(e) => handleBlur(e, ri, METRIC_COL)}
                    onFocus={() => { setActiveRow(ri); setActiveCol(METRIC_COL); setShowSuggestions(false); }}
                    onPaste={(e) => handlePaste(e, ri, METRIC_COL)}
                    onContextMenu={(e) => handleContextMenu(e, ri, METRIC_COL)}
                    onMouseDown={(e) => handleCellMouseDown(e, ri, METRIC_COL)}
                    data-row={ri}
                    data-col={METRIC_COL}
                  >
                    {row.metric}
                  </span>
                  {ri === activeRow && activeCol === METRIC_COL && showSuggestions && filteredMetrics.length > 0 && (
                    <div className="spreadsheet-suggestions" ref={suggestionRef}>
                      {filteredMetrics.map((m) => (
                        <div
                          key={m}
                          className="spreadsheet-suggestion-item"
                          onClick={() => selectMetric(m)}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {m}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </td>
              {/* Value cells */}
              {periods.map((_, ci) => {
                const colIdx = ci + 1;
                const val = row.values[ci] ?? '';
                return (
                  <td key={ci} className={`spreadsheet-value-cell${activeRow === ri && activeCol === colIdx ? ' cell-active-td' : ''}`}>
                    <span
                      className={cellClass(ri, colIdx, val)}
                      contentEditable
                      suppressContentEditableWarning
                      ref={(el) => { if (el) cellRefs.current.set(`${ri}-${colIdx}`, el); }}
                      onKeyDown={(e) => handleKeyDown(e, ri, colIdx)}
                      onInput={(e) => updateCell(ri, colIdx, (e.target as HTMLElement).textContent ?? '')}
                      onBlur={(e) => handleBlur(e, ri, colIdx)}
                      onFocus={() => { setActiveRow(ri); setActiveCol(colIdx); setShowSuggestions(false); }}
                      onPaste={(e) => handlePaste(e, ri, colIdx)}
                      onContextMenu={(e) => handleContextMenu(e, ri, colIdx)}
                      onMouseDown={(e) => handleCellMouseDown(e, ri, colIdx)}
                      data-row={ri}
                      data-col={colIdx}
                    >
                      {val}
                    </span>
                  </td>
                );
              })}
              {/* Row actions */}
              <td className="spreadsheet-row-actions">
                <button
                  type="button"
                  className="spreadsheet-remove-btn"
                  onClick={() => removeRow(ri)}
                  aria-label={`Remove ${row.metric || 'row'}`}
                  title="Remove row"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add row button & metric browser */}
      <div className="spreadsheet-footer">
        <div className="flex items-center gap-2">
          <button type="button" className="spreadsheet-add-row-btn" onClick={() => addRow('')}>
            + Add metric
          </button>
          <button
            type="button"
            className="btn-ghost spreadsheet-browse-btn"
            onClick={() => setShowMetricBrowser(!showMetricBrowser)}
          >
            Browse metrics
          </button>
        </div>
        <span className="spreadsheet-hint">
          Tab to navigate · Paste from Excel · Ctrl+Z undo
        </span>
      </div>

      {/* Categorized metric browser popover */}
      {showMetricBrowser && (
        <div ref={metricBrowserRef} className="metric-browser">
          {(['Income Statement', 'Balance Sheet', 'Cash Flow', 'Ratios'] as const).map((cat) => {
            const items = METRIC_LIBRARY.filter((m) => m.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <div className="metric-browser-cat">{cat}</div>
                <div className="metric-browser-items">
                  {items.map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      className="metric-browser-item"
                      onClick={() => { addRow(m.label); setShowMetricBrowser(false); }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="spreadsheet-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={closeContextMenu}
        >
          <button
            type="button"
            className="spreadsheet-context-item"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const data = readSelection();
              if (data.length > 0) {
                clipboardRef.current = { rows: data.length, cols: data[0].length, data };
              }
              closeContextMenu();
            }}
          >
            Copy
          </button>
          <button
            type="button"
            className="spreadsheet-context-item"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              pushUndo();
              clearSelection();
              closeContextMenu();
            }}
          >
            Clear
          </button>
          <div className="spreadsheet-context-sep" />
          <button
            type="button"
            className="spreadsheet-context-item"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { addRow(''); closeContextMenu(); }}
          >
            Insert row
          </button>
          <button
            type="button"
            className="spreadsheet-context-item"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { removeRow(contextMenu.row); closeContextMenu(); }}
          >
            Delete row
          </button>
          <div className="spreadsheet-context-sep" />
          <button
            type="button"
            className="spreadsheet-context-item"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { undo(); closeContextMenu(); }}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
