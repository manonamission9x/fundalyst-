'use client';

import SpreadsheetInput from './SpreadsheetInput';
import type { SpreadsheetRow } from './SpreadsheetInput';

interface ToolSpreadsheetProps {
  tool: 'dcf' | 'wc' | 'ratios' | 'growth' | 'peer' | 'filing' | 'trends';
  onDataChange: (rows: SpreadsheetRow[], periods: string[]) => void;
  initialPeriods?: string[];
  initialData?: SpreadsheetRow[];
  singleColumnLabel?: string;
  hint?: string;
  multiColumn?: boolean;
  /** Increment to force re-mount (used by parent Clear buttons) */
  resetKey?: number;
}

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
  resetKey,
}: ToolSpreadsheetProps) {
  const defaults = TOOL_DEFAULTS[tool];
  const periods = initialPeriods || [singleColumnLabel || 'Value'];

  const spreadsheetData = initialData && initialData.length > 0
    ? initialData
    : defaults || undefined;

  return (
    <div>
      <SpreadsheetInput
        initialPeriods={periods}
        initialData={spreadsheetData}
        onDataChange={onDataChange}
        resetKey={resetKey}
      />
      {hint && (
        <div className="flex justify-between items-center mt-2 px-1">
          <span className="spreadsheet-hint">{hint}</span>
        </div>
      )}
    </div>
  );
}
