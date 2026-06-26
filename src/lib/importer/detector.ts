import type { RawRow, FileMetadata, Currency, StatementType, Unit } from './types';
import { canonicalDisplayName } from './metric-aliases';
import { normalizeValue } from './normalizer';

/**
 * Detect period labels from column headers.
 * Recognizes: FY24, FY25, 2024, 2025, Mar 2024, 31/03/2025, Q1 FY24, etc.
 */
const PERIOD_PATTERNS = [
  /^fy\s*(20)?\d{2}$/i,         // FY24, FY 2024
  /^20\d{2}$/,                   // 2024
  /^(q[1-4])\s*(20)?\d{2}$/i,   // Q1 FY24, Q1 2024
  /^[a-z]{3}\s*(20)?\d{2}$/i,   // Mar 2024, Mar24
  /^\d{2}\/\d{2}\/20\d{2}$/,    // 31/03/2024
  /^\d{2}-\d{2}-20\d{2}$/,      // 31-03-2024
  /^(h[12])\s*(20)?\d{2}$/i,    // H1 FY24
  /^(9m|6m|3m)\s*(20)?\d{2}$/i, // 9M FY24
  /^fy\d{2}-\d{2}$/i,           // FY24-25
  /^\d{4}-\d{2}$/,              // 2024-25
];

/** Check if a string looks like a period label */
export function isPeriodLabel(s: string): boolean {
  const cleaned = s.trim();
  return PERIOD_PATTERNS.some((p) => p.test(cleaned));
}

/** Normalize a period label to a short form like "FY24" */
export function normalizePeriodLabel(s: string): string {
  const cleaned = s.trim();
  // FY24, fy24 → FY24
  const fyMatch = cleaned.match(/^fy\s*(\d{2,4})$/i);
  if (fyMatch) {
    const yr = fyMatch[1].length === 2 ? 'FY' + fyMatch[1] : 'FY' + fyMatch[1].slice(2);
    return yr;
  }
  // 2024 → FY24
  const yearMatch = cleaned.match(/^(20\d{2})$/);
  if (yearMatch) {
    return 'FY' + yearMatch[1].slice(2);
  }
  // FY24-25 → FY25
  const rangeMatch = cleaned.match(/^fy(\d{2})[-/](\d{2})$/i);
  if (rangeMatch) {
    return 'FY' + rangeMatch[1];
  }
  return cleaned;
}

/**
 * Check if a string looks like a metric label (vs a header or data value).
 * Metric labels typically contain alphabetic words, not just numbers.
 */
export function isMetricLabel(s: string): boolean {
  const cleaned = s.trim();
  if (!cleaned) return false;
  // Pure numbers are not metric labels
  if (/^[\d,.\-₹$£€¥%()]+$/.test(cleaned)) return false;
  // Has alphabetic content
  return /[a-zA-Z]/.test(cleaned);
}

/**
 * Detect company name from file content.
 * Looks for "Company", "Company Name", or similar on early rows.
 */
function detectCompanyName(rows: RawRow[]): string | null {
  for (const row of rows.slice(0, 10)) {
    const joined = row.cells.join(' ').toLowerCase();
    if (joined.includes('company') || joined.includes('limited') || joined.includes('ltd') || joined.includes('private')) {
      // Find the cell that looks like a company name
      for (const cell of row.cells) {
        const c = cell.trim();
        if (c.length > 3 && /[A-Za-z]/.test(c) && (c.toLowerCase().includes('limited') || c.toLowerCase().includes('ltd') || c.toLowerCase().includes('private'))) {
          return c;
        }
      }
    }
  }
  return null;
}

/**
 * Detect currency from file content.
 */
function detectCurrency(rows: RawRow[]): Currency {
  for (const row of rows) {
    for (const cell of row.cells) {
      const c = cell.toLowerCase();
      if (c.includes('₹') || c.includes('inr') || c.includes('rupee')) return 'INR';
      if (c.includes('$') || c.includes('usd')) return 'USD';
      if (c.includes('£') || c.includes('gbp')) return 'GBP';
    }
  }
  return 'UNKNOWN';
}

/**
 * Detect the unit used in numeric columns.
 */
function detectUnit(rows: RawRow[]): Unit {
  const unitCounts: Record<string, number> = {};
  for (const row of rows.slice(0, 30)) {
    for (const cell of row.cells) {
      const c = cell.toLowerCase().trim();
      if (/cr\.?$/.test(c) || /crore/i.test(c)) unitCounts['crores'] = (unitCounts['crores'] || 0) + 1;
      if (/lakhs?$/.test(c) || /lacs?$/.test(c)) unitCounts['lakhs'] = (unitCounts['lakhs'] || 0) + 1;
      if (/mn$/.test(c) || /million/i.test(c)) unitCounts['millions'] = (unitCounts['millions'] || 0) + 1;
      if (/bn$/.test(c) || /billion/i.test(c)) unitCounts['billions'] = (unitCounts['billions'] || 0) + 1;
      if (/thousand/i.test(c) || c.endsWith('k')) unitCounts['thousands'] = (unitCounts['thousands'] || 0) + 1;
    }
  }

  let bestUnit: Unit = 'ones';
  let bestCount = 0;
  for (const [unit, count] of Object.entries(unitCounts)) {
    if (count > bestCount) {
      bestCount = count;
      bestUnit = unit as Unit;
    }
  }
  return bestUnit;
}

/**
 * Find the most likely header row index. Looks for a row where
 * cells match period patterns or look like column labels.
 */
function findHeaderRow(rows: RawRow[]): number {
  let bestScore = 0;
  let bestRow = 0;

  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    let score = 0;
    for (const cell of row.cells) {
      const c = cell.trim().toLowerCase();
      if (isPeriodLabel(c)) score += 3;
      if (c === 'particulars' || c === 'particular' || c === 'items' || c === 'head' || c === 'description' || c === 'item' || c === 'metric' || c === 'line item' || c === 'line items') score += 5;
      if (c === 'notes' || c === 'note' || c === 'ref' || c === 'references') score -= 2;
      if (/^[\d\s]+$/.test(c) && c.length < 3) score -= 1; // Page numbers
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(c)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestRow = i;
    }
  }

  return bestRow;
}

/**
 * Detect which columns contain values vs labels vs period headers.
 */
function detectColumns(
  rows: RawRow[],
  headerRowIndex: number
): {
  metricColIndex: number;
  valueColIndices: number[];
  periodLabels: string[];
  confidence: number;
} {
  const headerRow = rows[headerRowIndex];
  if (!headerRow) {
    return { metricColIndex: -1, valueColIndices: [], periodLabels: [], confidence: 0 };
  }

  let metricColIndex = 0;
  const valueColIndices: number[] = [];
  const periodLabels: string[] = [];

  for (let j = 0; j < headerRow.cells.length; j++) {
    const cell = headerRow.cells[j].trim().toLowerCase();

    if (cell === 'particulars' || cell === 'particular' || cell === 'items' || cell === 'head' || cell === 'description' || cell === 'item' || cell === 'metric' || cell === 'line item' || cell === 'line items' || cell === '') {
      if (metricColIndex === 0 && j === 0) metricColIndex = j;
      continue;
    }

    if (isPeriodLabel(cell)) {
      valueColIndices.push(j);
      periodLabels.push(normalizePeriodLabel(headerRow.cells[j]));
      continue;
    }

    // If it's the first column and not a period, it's likely the metric column
    if (j === 0) {
      metricColIndex = j;
    }
  }

  // If no period labels found, try looking at data rows for numeric patterns
  if (valueColIndices.length === 0) {
    for (let j = 0; j < (rows[0]?.cells?.length || 0); j++) {
      let numericCount = 0;
      const sampleRows = rows.slice(headerRowIndex + 1, headerRowIndex + 10);
      for (const row of sampleRows) {
        const cell = row.cells[j]?.trim();
        if (cell && /^[\d,.\-₹$£€¥%()]+$/.test(cell) && !/[a-zA-Z]/.test(cell)) {
          numericCount++;
        }
      }
      if (numericCount >= 3) {
        valueColIndices.push(j);
        periodLabels.push('Period ' + (j + 1));
      }
    }
  }

  return {
    metricColIndex,
    valueColIndices,
    periodLabels,
    confidence: valueColIndices.length > 0 ? 0.8 : 0.3,
  };
}

/**
 * Detect the statement type from the content of rows.
 */
function detectStatementType(rows: RawRow[], metricColIndex: number): StatementType[] {
  const types = new Set<StatementType>();
  const labelTexts: string[] = [];

  for (const row of rows) {
    if (metricColIndex >= 0 && metricColIndex < row.cells.length) {
      labelTexts.push(row.cells[metricColIndex].toLowerCase().trim());
    }
  }

  const joined = labelTexts.join(' ');

  if (/\b(revenue|income|profit|pat|ebit|ebitda|cost of|sales|turnover|gross profit|net profit|operating profit)\b/i.test(joined)) {
    types.add('income_statement');
  }
  if (/\b(assets|liabilities|equity|shareholder|debt|borrowings|inventory|receivables|payables)\b/i.test(joined)) {
    types.add('balance_sheet');
  }
  if (/\b(cash flow|operating activities|investing activities|financing activities|capex|cfo|depreciation)\b/i.test(joined)) {
    types.add('cash_flow');
  }
  if (/\b(eps|market cap|shares outstanding|pe ratio|price|volume)\b/i.test(joined)) {
    types.add('market_data');
  }

  if (types.size === 0) types.add('unknown');
  return [...types];
}

/**
 * Main detection function: analyze raw rows and produce FileMetadata.
 */
export function detectMetadata(rows: RawRow[]): FileMetadata {
  const company = detectCompanyName(rows);
  const currency = detectCurrency(rows);
  const unit = detectUnit(rows);
  const headerRowIndex = findHeaderRow(rows);
  const columns = detectColumns(rows, headerRowIndex);
  const statementTypes = detectStatementType(rows, columns.metricColIndex);

  return {
    company: company || null,
    currency,
    unit,
    periods: columns.periodLabels,
    statementTypes,
    headerRowIndex,
    metricColIndex: columns.metricColIndex,
    valueColIndices: columns.valueColIndices,
    periodLabels: columns.periodLabels,
    confidence: columns.confidence,
  };
}
