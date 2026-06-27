'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { METRIC_LIBRARY, METRIC_LABELS } from './metric-library';

/**
 * SpreadsheetInput — A keyboard-first, paste-aware financial data entry grid.
 *
 * Features:
 *  - Tab/Enter/Arrow key navigation
 *  - Paste from Excel/Google Sheets (tab-separated)
 *  - Metric auto-suggest in first column
 *  - Auto-expand rows/columns on paste
 *  - Add/remove rows and columns
 *  - contentEditable cells for native copy/paste
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
}

export default function SpreadsheetInput({
  initialPeriods = ['FY23', 'FY24'],
  initialData,
  onDataChange,
  className = '',
}: SpreadsheetInputProps) {
  // Headers row (period labels) — data[0] = period labels starting at col 1
  const [periods, setPeriods] = useState<string[]>(initialPeriods);
  // Data rows — each row: { metric, values[] }
  const [rows, setRows] = useState<SpreadsheetRow[]>(() =>
    initialData && initialData.length > 0
      ? initialData
      : [
          { metric: 'Revenue', values: periods.map(() => '') },
          { metric: 'Net Profit', values: periods.map(() => '') },
          { metric: 'Total Assets', values: periods.map(() => '') },
        ],
  );
  // Active cell tracking
  const [activeRow, setActiveRow] = useState<number>(0);
  const [activeCol, setActiveCol] = useState<number>(0);

  // Metric suggestion state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState('');
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Refs for cells
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Notify parent of changes
  const notifyChange = useCallback(
    (newRows: SpreadsheetRow[], newPeriods: string[]) => {
      onDataChange?.(newRows, newPeriods);
    },
    [onDataChange],
  );

  // Filtered metrics for suggestions
  const filteredMetrics = useMemo(() => {
    if (!suggestionFilter) return METRIC_LABELS.slice(0, 15);
    const f = suggestionFilter.toLowerCase();
    return METRIC_LABELS.filter((m) => m.toLowerCase().includes(f)).slice(
      0, 15,
    );
  }, [suggestionFilter]);

  // Update a cell value
  const updateCell = useCallback(
    (rowIdx: number, colIdx: number, value: string) => {
      setRows((prev) => {
        const next = prev.map((r) => ({ ...r, values: [...r.values] }));
        if (colIdx === 0) {
          next[rowIdx] = { ...next[rowIdx], metric: value };
        } else {
          next[rowIdx].values[colIdx - 1] = value;
        }
        return next;
      });
    },
    [],
  );

  // Add a new row
  const addRow = useCallback(
    (metric = '') => {
      setRows((prev) => {
        const next = [...prev, { metric, values: periods.map(() => '') }];
        return next;
      });
      const newIdx = rows.length;
      setActiveRow(newIdx);
      setActiveCol(0);
      // Focus after render
      requestAnimationFrame(() => {
        const key = `${newIdx}-0`;
        cellRefs.current.get(key)?.focus();
      });
    },
    [periods.length],
  );

  // Add a new period column
  const addPeriod = useCallback(() => {
    setPeriods((prev) => [...prev, `Period ${prev.length + 1}`]);
    setRows((prev) => prev.map((r) => ({ ...r, values: [...r.values, ''] })));
    const newCol = periods.length + 1;
    setActiveCol(newCol);
    requestAnimationFrame(() => {
      const key = `${activeRow}-${newCol}`;
      cellRefs.current.get(key)?.focus();
    });
  }, [periods.length, activeRow]);

  // Remove a row
  const removeRow = useCallback((rowIdx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== rowIdx));
  }, []);

  // ── Keyboard navigation ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
      const maxRow = rows.length - 1;
      const maxCol = periods.length; // col 0 = metric, rest = periods

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
            addRow();
            return;
          }
          setActiveRow(nextRow);
          setActiveCol(nextCol);
          requestAnimationFrame(() => {
            cellRefs.current.get(`${nextRow}-${nextCol}`)?.focus();
          });
          break;
        }
        case 'Enter':
        case 'ArrowDown': {
          e.preventDefault();
          const downRow = Math.min(rowIdx + 1, maxRow);
          if (downRow === rowIdx && rowIdx >= maxRow) {
            addRow();
            return;
          }
          setActiveRow(downRow);
          requestAnimationFrame(() => {
            cellRefs.current.get(`${downRow}-${colIdx}`)?.focus();
          });
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const upRow = Math.max(0, rowIdx - 1);
          setActiveRow(upRow);
          requestAnimationFrame(() => {
            cellRefs.current.get(`${upRow}-${colIdx}`)?.focus();
          });
          break;
        }
        case 'ArrowRight': {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const el = e.target as HTMLElement;
            // If cursor is not at the end of content, let default handle
            if (range.startOffset < (el.textContent?.length ?? 0)) return;
          }
          e.preventDefault();
          const rightCol = Math.min(colIdx + 1, maxCol);
          setActiveCol(rightCol);
          requestAnimationFrame(() => {
            cellRefs.current.get(`${rowIdx}-${rightCol}`)?.focus();
          });
          break;
        }
        case 'ArrowLeft': {
          const sel2 = window.getSelection();
          if (sel2 && sel2.rangeCount > 0) {
            const range = sel2.getRangeAt(0);
            // If cursor is not at the start of content, let default handle
            if (range.startOffset > 0) return;
          }
          e.preventDefault();
          const leftCol = Math.max(0, colIdx - 1);
          setActiveCol(leftCol);
          requestAnimationFrame(() => {
            cellRefs.current.get(`${rowIdx}-${leftCol}`)?.focus();
          });
          break;
        }
        case 'Delete':
        case 'Backspace': {
          // Let default handle — clear cell content
          break;
        }
      }
    },
    [rows.length, periods.length, addRow],
  );

  // ── Paste handling ──
  const handlePaste = useCallback(
    (e: React.ClipboardEvent, _rowIdx: number, _colIdx: number) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      if (!text.trim()) return;

      // Detect tab-separated (from Excel/Sheets) or newline-separated
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length === 0) return;

      // Parse matrix
      const matrix = lines.map((line) => line.split('\t').map((c) => c.trim()));

      // Check if first line looks like headers (has "FY", "20xx", "Period", "Q")
      const firstRow = matrix[0];
      const hasHeaders =
        firstRow.length > 1 &&
        firstRow.some(
          (c) =>
            /^(fy|20\d{2}|period|q[1-4])/i.test(c) ||
            /^\d{4}$/.test(c),
        );

      let dataStartRow = 0;
      let parsedPeriods: string[] = [];

      if (hasHeaders) {
        // First row is headers — extract period labels
        parsedPeriods = firstRow.slice(1);
        dataStartRow = 1;
      }

      // Extract data rows
      const dataRows = matrix.slice(dataStartRow);
      if (dataRows.length === 0) return;

      setRows((prev) => {
        const next = prev.map((r) => ({ ...r, values: [...r.values] }));

        // If we got headers, update periods
        if (parsedPeriods.length > 0) {
          setPeriods(parsedPeriods);
          // Resize existing rows
          for (const r of next) {
            r.values = [...parsedPeriods.map((_, i) => r.values[i] ?? '')];
          }
        }

        // Fill in data
        for (let ri = 0; ri < dataRows.length; ri++) {
          const row = dataRows[ri];
          const metric = row[0];
          const values = row.slice(1);

          if (!metric) continue;

          // Try to find existing row with matching metric
          const existingIdx = next.findIndex(
            (r) => r.metric.toLowerCase() === metric.toLowerCase(),
          );

          if (existingIdx >= 0) {
            // Update existing row
            for (let vi = 0; vi < values.length && vi < (parsedPeriods.length || periods.length); vi++) {
              if (values[vi]) {
                next[existingIdx].values[vi] = values[vi];
              }
            }
          } else {
            // Add new row
            const newValues =
              parsedPeriods.length > 0
                ? parsedPeriods.map((_, vi) => values[vi] ?? '')
                : periods.map((_, vi) => values[vi] ?? '');
            next.push({ metric, values: newValues });
          }
        }

        return next;
      });

      // Focus the cell after paste
      requestAnimationFrame(() => {
        const targetRow =
          dataStartRow < dataRows.length ? _rowIdx + dataStartRow : _rowIdx;
        cellRefs.current.get(`${targetRow}-${_colIdx}`)?.focus();
      });
    },
    [periods],
  );

  // ── Handle cell blur — commit value ──
  const handleBlur = useCallback(
    (e: React.FocusEvent, rowIdx: number, colIdx: number) => {
      const value = (e.target as HTMLElement).textContent ?? '';
      updateCell(rowIdx, colIdx, value);
    },
    [updateCell],
  );

  // ── Metric suggestions ──
  const handleMetricInput = useCallback(
    (value: string) => {
      setSuggestionFilter(value);
      setShowSuggestions(value.length > 0);
    },
    [],
  );

  const selectMetric = useCallback(
    (metric: string) => {
      updateCell(activeRow, 0, metric);
      setShowSuggestions(false);
      setSuggestionFilter('');
      // Move to next cell
      setActiveCol(1);
      requestAnimationFrame(() => {
        cellRefs.current.get(`${activeRow}-1`)?.focus();
      });
    },
    [activeRow, updateCell],
  );

  // Close suggestions on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Notify parent on data change
  useEffect(() => {
    notifyChange(rows, periods);
  }, [rows, periods, notifyChange]);

  return (
    <div className={`spreadsheet-wrap${className ? ' ' + className : ''}`}>
      <table className="spreadsheet-grid">
        <thead>
          <tr>
            <th className="spreadsheet-corner">
              <span className="spreadsheet-corner-label">Metric</span>
            </th>
            {periods.map((p, ci) => (
              <th key={ci} className="spreadsheet-header">
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
                  aria-label={`Period ${ci + 1} label`}
                />
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
            <tr key={ri} className={ri === activeRow ? 'spreadsheet-row-active' : ''}>
              {/* Metric name cell */}
              <td className="spreadsheet-metric-cell">
                <div className="spreadsheet-metric-wrap">
                  <span
                    className="spreadsheet-cell spreadsheet-metric"
                    contentEditable
                    suppressContentEditableWarning
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${ri}-0`, el);
                    }}
                    onInput={(e) =>
                      handleMetricInput(
                        (e.target as HTMLElement).textContent ?? '',
                      )
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 0)}
                    onBlur={(e) => handleBlur(e, ri, 0)}
                    onFocus={() => {
                      setActiveRow(ri);
                      setActiveCol(0);
                      setShowSuggestions(false);
                    }}
                    onPaste={(e) => handlePaste(e, ri, 0)}
                    data-row={ri}
                    data-col={0}
                  >
                    {row.metric}
                  </span>
                  {ri === activeRow && activeCol === 0 && showSuggestions && filteredMetrics.length > 0 && (
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
                const val = row.values[ci] ?? '';
                return (
                  <td key={ci} className="spreadsheet-value-cell">
                    <span
                      className={`spreadsheet-cell spreadsheet-value${val ? '' : ' spreadsheet-empty'}`}
                      contentEditable
                      suppressContentEditableWarning
                      ref={(el) => {
                        if (el) cellRefs.current.set(`${ri}-${ci + 1}`, el);
                      }}
                      onKeyDown={(e) => handleKeyDown(e, ri, ci + 1)}
                      onBlur={(e) => handleBlur(e, ri, ci + 1)}
                      onFocus={() => {
                        setActiveRow(ri);
                        setActiveCol(ci + 1);
                        setShowSuggestions(false);
                      }}
                      onPaste={(e) => handlePaste(e, ri, ci + 1)}
                      data-row={ri}
                      data-col={ci + 1}
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

      {/* Add row button */}
      <div className="spreadsheet-footer">
        <button
          type="button"
          className="spreadsheet-add-row-btn"
          onClick={() => addRow('')}
        >
          + Add metric
        </button>
        <span className="spreadsheet-hint">
          Tab to navigate · Paste from Excel · Type metric names
        </span>
      </div>
    </div>
  );
}
