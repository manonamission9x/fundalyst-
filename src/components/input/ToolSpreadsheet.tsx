'use client';

import SpreadsheetInput from './SpreadsheetInput';
import type { SpreadsheetRow } from './SpreadsheetInput';

/**
 * ToolSpreadsheet — a pre-configured SpreadsheetInput for each financial tool.
 *
 * Every tool (DCF, WC, Ratios, Growth, Peer) uses this instead of
 * raw Field components or textareas. This guarantees one unified
 * input experience across the entire application.
 *
 * Each tool defines:
 *  - tool: unique key for localStorage and metric presets
 *  - label: display name
 *  - columnLabel: the single-column header (e.g. "Current Period", "FY24")
 *  - defaultMetrics: initial rows shown when no data exists yet
 */

interface ToolSpreadsheetProps {
  tool: 'dcf' | 'wc' | 'ratios' | 'growth' | 'peer' | 'filing' | 'trends';
  onDataChange: (rows: SpreadsheetRow[], periods: string[]) => void;
  initialPeriods?: string[];
  initialData?: SpreadsheetRow[];
  /** If true, shows label instead of period name in the single column */
  singleColumnLabel?: string;
  /** Hint text shown below the grid */
  hint?: string;
  /** Columns for peer/growth (company names, year labels) */
  multiColumn?: boolean;
}

/** Default metrics that each tool needs to function */
const TOOL_DEFAULTS: Record<string, SpreadsheetRow[]> = {
  dcf: [
    { metric: 'Free Cash Flow', values: [''] },
    { metric: 'Growth Rate (%)', values: ['8'] },
    { metric: 'Projection Years', values: ['5'] },
    { metric: 'WACC (%)', values: ['10'] },
    { metric: 'Terminal Growth (%)', values: ['3'] },
    { metric: 'Net Debt', values: [''] },
    { metric: 'Shares Outstanding', values: [''] },
    { metric: 'Current Price (₹)', values: [''] },
  ],
  wc: [
    { metric: 'Revenue (annual)', values: [''] },
    { metric: 'Cost of Goods Sold', values: [''] },
    { metric: 'Trade Receivables', values: [''] },
    { metric: 'Inventory', values: [''] },
    { metric: 'Payables', values: [''] },
    { metric: 'Cash & Equivalents', values: [''] },
  ],
  ratios: [
    { metric: 'Revenue', values: [''] },
    { metric: 'Net Profit', values: [''] },
    { metric: 'EBIT', values: [''] },
    { metric: 'Total Assets', values: [''] },
    { metric: 'Total Equity', values: [''] },
    { metric: 'Total Debt', values: [''] },
  ],
  growth: [
    { metric: 'Revenue', values: ['', '', ''] },
    { metric: 'Net Profit', values: ['', '', ''] },
    { metric: 'EBITDA', values: ['', '', ''] },
  ],
};

export default function ToolSpreadsheet({
  tool,
  onDataChange,
  initialPeriods,
  initialData,
  singleColumnLabel,
  hint,
  multiColumn,
}: ToolSpreadsheetProps) {
  const defaults = TOOL_DEFAULTS[tool];
  const periods = initialPeriods || [singleColumnLabel || 'Value'];

  // If no initialData but defaults exist, use defaults
  const spreadsheetData = initialData && initialData.length > 0
    ? initialData
    : defaults || undefined;

  return (
    <div>
      <SpreadsheetInput
        initialPeriods={periods}
        initialData={spreadsheetData}
        onDataChange={onDataChange}
        className={tool === 'growth' || multiColumn ? '' : ''}
      />
      {hint && (
        <div className="flex justify-between items-center mt-2 px-1">
          <span className="spreadsheet-hint">{hint}</span>
        </div>
      )}
    </div>
  );
}
