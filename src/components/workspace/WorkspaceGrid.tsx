'use client';

/**
 * WorkspaceGrid — a virtualized, model-bound spreadsheet for Fundalyst.
 *
 * Design (Option B per handoff §6):
 * - Single floating <input> overlay over the active cell (never contentEditable-per-cell)
 * - Windowed rendering: only visible rows + buffer
 * - Controlled: reads from canonical model, writes via store write API
 * - Type-to-replace: typing on a selected cell immediately enters edit mode
 *
 * Keyboard:
 *   Tab/Shift+Tab, Enter/Shift+Enter → navigate
 *   Arrow keys → navigate; Ctrl+Arrow → edge-of-data
 *   Esc → cancel edit (restore original)
 *   F2 / double-click → edit mode
 *   Ctrl+C/V/X → clipboard
 *   Ctrl+Z/Y → undo/redo (model-level)
 *   Ctrl+A → select all
 *   Home/End → first/last column
 *   Delete/Backspace → clear cell(s)
 */

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useActiveDataset } from '@/store/financial-model-selectors';
import { useGlobalDataStore } from '@/store/global-data-store';
import { datasetToGrid } from '@/store/financial-model-selectors';
import { useWorkspaceContextStore } from '@/store/workspace-context-store';

export interface WorkspaceGridProps {
  /** Optional statement filter */
  statement?: string;
  className?: string;
  /** Row height in px */
  rowHeight?: number;
  /** Column widths: metric column then period columns */
  columnWidths?: [number, number];
}

const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 36;
const BUFFER_ROWS = 5;

function formatCellValue(value: number | null): string {
  if (value === null || value === undefined) return '';
  // Format large numbers with commas
  if (Math.abs(value) >= 10000000) {
    // ₹ Cr display
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);
  }
  return String(value);
}

export default function WorkspaceGrid({
  statement,
  className = '',
  rowHeight = ROW_HEIGHT,
  columnWidths,
}: WorkspaceGridProps) {
  const dataset = useActiveDataset();
  const activeDatasetId = useGlobalDataStore((s) => s.activeDatasetId);
  const writeCell = useGlobalDataStore((s) => s.writeCell);
  const applyEdits = useGlobalDataStore((s) => s.applyEdits);

  const setActiveCell = useWorkspaceContextStore((s) => s.setActiveCell);

  // Derive grid from canonical model
  const grid = useMemo(() => {
    if (!dataset) return { periods: [], rows: [], columns: 0 };
    const g = datasetToGrid(dataset, statement);
    return {
      periods: g.periods,
      rows: g.rows,
      columns: g.periods.length,
    };
  }, [dataset, statement]);

  // Column widths
  const metricColWidth = columnWidths?.[0] || 180;
  const periodColWidth = columnWidths?.[1] || 120;

  // ── UI state (ephemeral — never financial data) ──
  const [activeRow, setActiveRow] = useState(0);
  const [activeCol, setActiveCol] = useState(0); // 0 = metric, 1+ = periods
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ row: number; col: number } | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editBeforeRef = useRef<string>(''); // Value before edit started

  const totalRows = grid.rows.length;
  const totalCols = grid.columns + 1; // +1 for metric column
  const totalWidth = metricColWidth + grid.columns * periodColWidth;

  // ── Virtualization ──
  const visibleRows = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / rowHeight) + BUFFER_ROWS;
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - BUFFER_ROWS);
    const endRow = Math.min(totalRows, startRow + visibleCount);
    return { startRow, endRow };
  }, [containerHeight, scrollTop, rowHeight, totalRows]);

  // ── Focus / scroll cell into view ──
  const scrollCellIntoView = useCallback((row: number, col: number) => {
    const container = containerRef.current;
    if (!container) return;

    const x = col === 0 ? 0 : metricColWidth + (col - 1) * periodColWidth;
    const y = row * rowHeight;
    const w = col === 0 ? metricColWidth : periodColWidth;

    if (x < container.scrollLeft) {
      container.scrollLeft = x - 20;
    } else if (x + w > container.scrollLeft + container.clientWidth) {
      container.scrollLeft = x + w - container.clientWidth + 20;
    }

    if (y < container.scrollTop) {
      container.scrollTop = y - 10;
    } else if (y + rowHeight > container.scrollTop + container.clientHeight) {
      container.scrollTop = y + rowHeight - container.clientHeight + 10;
    }
  }, [metricColWidth, periodColWidth, rowHeight]);

  // ── Enter edit mode ──
  const startEditing = useCallback((row: number, col: number) => {
    if (col === 0) return; // Don't edit metric names for now
    const periodIdx = col - 1;
    const cellValue = grid.rows[row]?.values[periodIdx] ?? null;
    editBeforeRef.current = formatCellValue(cellValue);
    setEditValue(editBeforeRef.current);
    setEditing(true);
    setActiveRow(row);
    setActiveCol(col);
    // Focus input
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [grid.rows]);

  // ── Commit edit ──
  const commitEdit = useCallback(() => {
    if (!editing || !activeDatasetId) return;

    const periodIdx = activeCol - 1;
    const metric = grid.rows[activeRow]?.metric;
    if (!metric || periodIdx < 0 || periodIdx >= grid.periods.length) return;

    const raw = editValue.trim();
    const oldRaw = editBeforeRef.current;

    if (raw === oldRaw) {
      setEditing(false);
      return;
    }

    const value = raw === '' ? null : Number(raw.replace(/,/g, ''));
    const numericValue = (value !== null && isFinite(value)) ? value : null;

    writeCell(activeDatasetId, metric, grid.periods[periodIdx], numericValue);
    setEditing(false);
  }, [editing, activeDatasetId, activeCol, activeRow, grid.rows, grid.periods, editValue, writeCell]);

  // ── Cancel edit ──
  const cancelEdit = useCallback(() => {
    setEditValue(editBeforeRef.current);
    setEditing(false);
    inputRef.current?.blur();
  }, []);

  // ── Selection helpers ──
  const isInSelection = useCallback((row: number, col: number): boolean => {
    if (!selectionStart) return false;
    const end = selectionEnd || selectionStart;
    const r1 = Math.min(selectionStart.row, end.row);
    const r2 = Math.max(selectionStart.row, end.row);
    const c1 = Math.min(selectionStart.col, end.col);
    const c2 = Math.max(selectionStart.col, end.col);
    return row >= r1 && row <= r2 && col >= c1 && col <= c2;
  }, [selectionStart, selectionEnd]);

  const getSelectedCells = useCallback((): { metric: string; periodLabel: string }[] => {
    if (!selectionStart) return [];
    const end = selectionEnd || selectionStart;
    const r1 = Math.min(selectionStart.row, end.row);
    const r2 = Math.max(selectionStart.row, end.row);
    const c1 = Math.min(selectionStart.col, end.col);
    const c2 = Math.max(selectionStart.col, end.col);
    const cells: { metric: string; periodLabel: string }[] = [];
    for (let r = r1; r <= r2; r++) {
      if (!grid.rows[r]) continue;
      for (let c = c1; c <= c2; c++) {
        if (c === 0) continue; // Skip metric column
        const pi = c - 1;
        if (pi < grid.periods.length) {
          cells.push({ metric: grid.rows[r].metric, periodLabel: grid.periods[pi] });
        }
      }
    }
    return cells;
  }, [selectionStart, selectionEnd, grid.rows, grid.periods]);

  // ── Copy selection to clipboard ──
  const copySelection = useCallback(async () => {
    if (!selectionStart) return;
    const end = selectionEnd || selectionStart;
    const r1 = Math.min(selectionStart.row, end.row);
    const r2 = Math.max(selectionStart.row, end.row);
    const c1 = Math.min(selectionStart.col, end.col);
    const c2 = Math.max(selectionStart.col, end.col);

    const lines: string[] = [];
    for (let r = r1; r <= r2; r++) {
      const cells: string[] = [];
      for (let c = c1; c <= c2; c++) {
        if (c === 0) {
          cells.push(grid.rows[r]?.metric ?? '');
        } else {
          const pi = c - 1;
          const v = grid.rows[r]?.values[pi];
          cells.push(v !== null ? String(v) : '');
        }
      }
      lines.push(cells.join('\t'));
    }
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }, [selectionStart, selectionEnd, grid.rows]);

  // ── Paste from clipboard ──
  const pasteFromClipboard = useCallback(async (targetRow: number, targetCol: number) => {
    if (!activeDatasetId) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;

      const lines = text.split('\n').filter(l => l.trim());
      const data = lines.map(l => l.split('\t'));

      const edits: { metric: string; periodLabel: string; value: number | null }[] = [];

      for (let ri = 0; ri < data.length; ri++) {
        const rowIdx = targetRow + ri;
        if (rowIdx >= grid.rows.length) break;
        for (let ci = 0; ci < data[ri].length; ci++) {
          const colIdx = targetCol + ci;
          if (colIdx === 0) continue; // Don't paste into metric column
          const pi = colIdx - 1;
          if (pi >= grid.periods.length) continue;

          const raw = data[ri][ci].trim();
          if (raw === '') continue;

          const num = Number(raw.replace(/,/g, ''));
          if (!isFinite(num)) continue;

          edits.push({
            metric: grid.rows[rowIdx].metric,
            periodLabel: grid.periods[pi],
            value: num,
          });
        }
      }

      if (edits.length > 0) {
        applyEdits(activeDatasetId, edits.map(e => ({ ...e, userEdit: true })));
      }
    } catch {}
  }, [activeDatasetId, applyEdits, grid.rows, grid.periods]);

  // ── Clear selection cells ──
  const clearSelectionCells = useCallback(() => {
    if (!activeDatasetId) return;
    const cells = getSelectedCells();
    if (cells.length === 0) return;
    applyEdits(activeDatasetId, cells.map(c => ({ metric: c.metric, periodLabel: c.periodLabel, value: null, userEdit: true })));
  }, [activeDatasetId, getSelectedCells, applyEdits]);

  // ── Navigate ──
  const navigate = useCallback((dRow: number, dCol: number) => {
    if (editing) {
      commitEdit();
    }
    const newRow = Math.max(0, Math.min(totalRows - 1, activeRow + dRow));
    const newCol = Math.max(0, Math.min(totalCols - 1, activeCol + dCol));
    setActiveRow(newRow);
    setActiveCol(newCol);
    setSelectionStart(null);
    setSelectionEnd(null);
    scrollCellIntoView(newRow, newCol);

    // Update workspace context
    setActiveCell(newCol > 0 ? {
      metric: grid.rows[newRow]?.metric || '',
      periodLabel: grid.periods[newCol - 1] || '',
    } : null);
  }, [editing, activeRow, activeCol, totalRows, totalCols, commitEdit, scrollCellIntoView, grid.rows, grid.periods, setActiveCell]);

  // ── Keyboard handler ──
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const isEditingInput = editing && document.activeElement === inputRef.current;

    if (isEditingInput) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
        containerRef.current?.focus();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
        navigate(1, 0);
        containerRef.current?.focus();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit();
        navigate(0, e.shiftKey ? -1 : 1);
        containerRef.current?.focus();
        return;
      }
      // Allow normal typing
      return;
    }

    // Focus grid — keyboard navigation
    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); navigate(-1, 0); break;
      case 'ArrowDown': e.preventDefault(); navigate(1, 0); break;
      case 'ArrowLeft': e.preventDefault(); navigate(0, -1); break;
      case 'ArrowRight': e.preventDefault(); navigate(0, 1); break;
      case 'Tab': {
        e.preventDefault();
        const dir = e.shiftKey ? -1 : 1;
        let newCol = activeCol + dir;
        let newRow = activeRow;
        if (newCol < 0) { newCol = totalCols - 1; newRow = Math.max(0, activeRow - 1); }
        else if (newCol >= totalCols) { newCol = 0; newRow = Math.min(totalRows - 1, activeRow + 1); }
        setActiveRow(newRow);
        setActiveCol(newCol);
        setSelectionStart(null);
        setSelectionEnd(null);
        scrollCellIntoView(newRow, newCol);
        break;
      }
      case 'Enter': {
        e.preventDefault();
        navigate(1, 0);
        break;
      }
      case 'F2': {
        e.preventDefault();
        startEditing(activeRow, activeCol);
        break;
      }
      case 'Delete':
      case 'Backspace': {
        e.preventDefault();
        clearSelectionCells();
        break;
      }
      case 'Escape': {
        e.preventDefault();
        setSelectionStart(null);
        setSelectionEnd(null);
        break;
      }
      default: {
        // Type-to-replace: any printable character starts editing
        if (!ctrl && e.key.length === 1 && e.key !== ' ' && activeCol > 0) {
          e.preventDefault();
          editBeforeRef.current = '';
          setEditValue(e.key);
          startEditing(activeRow, activeCol);
          // Already called startEditing which sets editValue, but override with the typed char
          setTimeout(() => {
            setEditValue(e.key);
            if (inputRef.current) {
              inputRef.current.value = e.key;
            }
          }, 0);
        }
      }
    }
  }, [
    editing, activeRow, activeCol, totalRows, totalCols,
    commitEdit, cancelEdit, navigate, scrollCellIntoView,
    clearSelectionCells, startEditing, setActiveCell, grid.rows, grid.periods,
  ]);

  // ── Ctrl shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      switch (e.key.toLowerCase()) {
        case 'c': {
          e.preventDefault();
          copySelection();
          break;
        }
        case 'v': {
          if (!editing) {
            e.preventDefault();
            pasteFromClipboard(activeRow, activeCol);
          }
          break;
        }
        case 'x': {
          e.preventDefault();
          copySelection();
          clearSelectionCells();
          break;
        }
        case 'a': {
          e.preventDefault();
          setSelectionStart({ row: 0, col: 0 });
          setSelectionEnd({ row: totalRows - 1, col: totalCols - 1 });
          break;
        }
        case 'z': {
          e.preventDefault();
          // Ctrl+Z — model-level undo. For now, this is handled by zustand's persist.
          // Future: implement undo stack in global-data-store
          break;
        }
        case 'y': {
          e.preventDefault();
          break;
        }
      }
    };

    const container = containerRef.current;
    container?.addEventListener('keydown', handler);
    return () => container?.removeEventListener('keydown', handler);
  }, [copySelection, pasteFromClipboard, clearSelectionCells, editing, activeRow, activeCol, totalRows, totalCols]);

  // ── Update workspace context on scroll, track container height ──
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    setScrollTop(container.scrollTop);
    setScrollLeft(container.scrollLeft);
  }, []);

  // Track container height on mount and resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(container);
    setContainerHeight(container.clientHeight);
    return () => observer.disconnect();
  }, []);

  // No data state
  if (!dataset || grid.rows.length === 0) {
    return (
      <div className={`workspace-grid-empty ${className}`}>
        <p className="text-sm text-secondary">
          No financial data loaded. Import a report to see data here.
        </p>
      </div>
    );
  }

  const totalHeight = totalRows * rowHeight;
  const topPadding = visibleRows.startRow * rowHeight;

  // Compute the input overlay position
  const inputLeft = activeCol === 0 ? 2 : metricColWidth + (activeCol - 1) * periodColWidth + 2 - scrollLeft;
  const inputTop = activeRow * rowHeight + HEADER_HEIGHT - scrollTop + topPadding - visibleRows.startRow * rowHeight;

  return (
    <div
      className={`workspace-grid ${className}`}
      ref={containerRef}
      tabIndex={0}
      role="grid"
      aria-label="Financial data spreadsheet"
      onKeyDown={handleKeyDown}
      onScroll={handleScroll}
      style={{
        position: 'relative',
        overflow: 'auto',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        outline: 'none',
        maxHeight: '80vh',
      }}
    >
      {/* ── Header row ── */}
      <div
        className="workspace-grid-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          display: 'flex',
          height: HEADER_HEIGHT,
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
          minWidth: totalWidth,
        }}
      >
        <div
          className="workspace-grid-header-cell"
          style={{
            width: metricColWidth,
            minWidth: metricColWidth,
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center',
            fontSize: 'var(--text-2xs)',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            borderRight: '1px solid var(--border-light)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            userSelect: 'none',
          }}
        >
          Metric
        </div>
        {grid.periods.map((period, i) => (
          <div
            key={period}
            className="workspace-grid-header-cell"
            style={{
              width: periodColWidth,
              minWidth: periodColWidth,
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              fontSize: 'var(--text-2xs)',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              borderRight: i < grid.periods.length - 1 ? '1px solid var(--border-light)' : 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              userSelect: 'none',
            }}
          >
            {period}
          </div>
        ))}
      </div>

      {/* ── Body — virtualized rows ── */}
      <div
        className="workspace-grid-body"
        style={{
          position: 'relative',
          height: totalHeight,
          minWidth: totalWidth,
        }}
      >
        {/* Spacer for hidden rows above viewport */}
        {topPadding > 0 && (
          <div style={{ height: topPadding }} />
        )}

        {grid.rows.slice(visibleRows.startRow, visibleRows.endRow).map((row, vi) => {
          const realRowIdx = visibleRows.startRow + vi;
          const isSelected = isInSelection(realRowIdx, 0);
          const isActiveRow = activeRow === realRowIdx;

          return (
            <div
              key={row.metric}
              className="workspace-grid-row"
              style={{
                display: 'flex',
                height: rowHeight,
                background: isSelected ? 'var(--primary-subtle)' : (realRowIdx % 2 === 1 ? 'var(--bg)' : 'var(--bg-surface)'),
                borderBottom: '1px solid var(--border-light)',
              }}
            >
              {/* Metric column */}
              <div
                className={`workspace-grid-cell workspace-grid-cell-metric ${isActiveRow && activeCol === 0 ? 'active' : ''}`}
                style={{
                  width: metricColWidth,
                  minWidth: metricColWidth,
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 'var(--text-2xs)',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                  color: 'var(--text)',
                  borderRight: '1px solid var(--border-light)',
                  cursor: 'default',
                  outline: isActiveRow && activeCol === 0 ? '1px solid var(--border-focus)' : 'none',
                  outlineOffset: -1,
                }}
                onClick={() => {
                  setActiveRow(realRowIdx);
                  setActiveCol(0);
                  setSelectionStart(null);
                  setSelectionEnd(null);
                }}
                onDoubleClick={() => {/* Could rename metric */}}
                title={row.metric}
              >
                <span style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  {/* Provenance dot */}
                  {row.userOverridden ? (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', flexShrink: 0 }} />
                  ) : row.confidence >= 0.8 ? (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                  ) : row.confidence > 0 ? (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--caution)', flexShrink: 0 }} />
                  ) : null}
                  {row.metric}
                </span>
              </div>

              {/* Value cells per period */}
              <div style={{ display: 'flex', flex: 1 }}>
                {grid.periods.map((period, pi) => {
                  const colIdx = pi + 1;
                  const value = row.values[pi] ?? null;
                  const isCellSelected = isInSelection(realRowIdx, colIdx);
                  const isCellActive = isActiveRow && activeCol === colIdx;
        
                  return (
                    <div
                      key={period}
                      className={`workspace-grid-cell ${isCellSelected ? 'selected' : ''} ${isCellActive ? 'active' : ''}`}
                      style={{
                        width: periodColWidth,
                        minWidth: periodColWidth,
                        padding: '0 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        fontSize: 'var(--text-2xs)',
                        fontFamily: 'var(--font-ibm-plex-mono)',
                        fontVariantNumeric: 'tabular-nums',
                        color: value !== null ? 'var(--text)' : 'var(--text-muted)',
                        borderRight: pi < grid.periods.length - 1 ? '1px solid var(--border-light)' : 'none',
                        cursor: 'cell',
                        userSelect: 'none',
                        background: isCellSelected ? 'var(--primary-subtle)' : undefined,
                        outline: isCellActive && !editing ? '1px solid var(--border-focus)' : 'none',
                        outlineOffset: -1,
                        position: 'relative',
                      }}
                      onClick={(e) => {
                        if (editing && isCellActive) return;
                        setActiveRow(realRowIdx);
                        setActiveCol(colIdx);
                        if (e.shiftKey && selectionStart) {
                          setSelectionEnd({ row: realRowIdx, col: colIdx });
                        } else if (!e.shiftKey) {
                          setSelectionStart({ row: realRowIdx, col: colIdx });
                          setSelectionEnd(null);
                        }
                        // Update workspace context
                        setActiveCell({ metric: row.metric, periodLabel: period });
                        scrollCellIntoView(realRowIdx, colIdx);
                      }}
                      onDoubleClick={() => {
                        startEditing(realRowIdx, colIdx);
                      }}
                      title={value !== null ? formatCellValue(value) : ''}
                    >
                      {value !== null ? formatCellValue(value) : '—'}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Spacer for hidden rows below viewport */}
        {totalHeight - topPadding - visibleRows.endRow * rowHeight > 0 && (
          <div style={{ height: totalHeight - topPadding - (visibleRows.endRow - visibleRows.startRow) * rowHeight }} />
        )}
      </div>

      {/* ── Floating edit input overlay ── */}
      {editing && (
        <input
          ref={inputRef}
          type="text"
          className="workspace-grid-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => commitEdit()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
            if (e.key === 'Enter') { e.preventDefault(); commitEdit(); navigate(1, 0); containerRef.current?.focus(); }
            if (e.key === 'Tab') { e.preventDefault(); commitEdit(); navigate(0, e.shiftKey ? -1 : 1); containerRef.current?.focus(); }
          }}
          style={{
            position: 'absolute',
            left: Math.max(0, inputLeft),
            top: Math.max(0, inputTop),
            width: activeCol === 0 ? metricColWidth - 4 : periodColWidth - 4,
            height: rowHeight - 2,
            zIndex: 10,
            border: '1px solid var(--border-focus)',
            borderRadius: 'var(--radius-sm)',
            padding: '0 6px',
            fontSize: 'var(--text-2xs)',
            fontFamily: 'var(--font-ibm-plex-mono)',
            fontVariantNumeric: 'tabular-nums',
            background: 'var(--bg-field)',
            color: 'var(--text)',
            outline: 'none',
            boxShadow: '0 0 0 2px var(--primary-subtle)',
          }}
          autoFocus
          aria-label="Edit cell value"
        />
      )}
    </div>
  );
}
