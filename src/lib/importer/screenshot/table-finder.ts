/**
 * Table structure detector for OCR text output.
 *
 * Takes raw OCR text (which may have irregular spacing, misaligned columns)
 * and detects:
 *   - Row boundaries (one financial item per row)
 *   - Column boundaries (periods, values, labels)
 *   - Header rows vs data rows
 *   - Multiple fiscal years
 *   - Statement type hints
 */

/** A single detected cell with position metadata */
export interface DetectedCell {
  text: string;
  /** Normalized number value (null if not numeric) */
  numericValue: number | null;
  /** Whether this appears to be a percentage */
  isPercent: boolean;
}

/** A detected row of cells */
export interface DetectedRow {
  cells: DetectedCell[];
  /** Row index in the original text */
  sourceLine: number;
  /** Whether this row appears to be a section header (e.g. "Revenue", not a value row) */
  isHeader: boolean;
}

/** Full detection result for one table */
export interface DetectedTable {
  id: string;
  rows: DetectedRow[];
  /** Period labels detected in this table (e.g. ["FY24", "FY25"]) */
  periods: string[];
  /** Confidence score for this table's structure */
  confidence: number;
}

// ── Heuristics ──

/** Lines or blocks that are not financial data and should be filtered */
const NOISE_PATTERNS = [
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,          // dates
  /^(page|p\.|pg\.?)\s*\d+$/i,             // page numbers
  /^(all amounts|in |rs\.?|₹|note|refer|annexure|statement|schedule)/i,
  /^(auditor|director|registered office|cin|gstin|email|website|tel)/i,
  /^[•·●\-–—]\s/,                          // bullet points
  /^(forward|backward|previous|next)/i,     // navigation text
  /^[\d\s]{4,}$/,                          // just numbers (page numbers)
];

/** Labels that signal a row is a section header (not a data row) */

/**
 * Detect whether raw OCR text contains a multi-column table.
 * Returns true if multiple lines have similar structure (label + multiple values).
 */
function hasTableStructure(lines: string[]): boolean {
  let dataLineCount = 0;
  for (const line of lines) {
    // Skip noise
    if (NOISE_PATTERNS.some((p) => p.test(line.trim()))) continue;
    // Check for label + value pattern
    const trimmed = line.trim();
    if (/[a-zA-Z]/.test(trimmed) && /[\d]/.test(trimmed)) {
      dataLineCount++;
    }
  }
  return dataLineCount >= 3;
}

/**
 * Detect period labels from a set of candidate strings.
 */
function detectPeriods(candidates: string[]): string[] {
  const periodPatterns = [
    /^fy\s*(20)?\d{2}$/i,
    /^20\d{2}(\s*-\s*\d{2})?$/,
    /^q[1-4]\s*(20)?\d{2}$/i,
    /^[a-z]{3}\s*(20)?\d{2}$/i,
    /^\d{2}\/\d{2}\/\d{4}$/,
  ];

  return candidates.filter((c) =>
    periodPatterns.some((p) => p.test(c.trim())),
  );
}

/**
 * Split a line into cells by detecting whitespace-based column alignment.
 *
 * Financial OCR text often uses variable whitespace between columns.
 * This method detects natural column boundaries by looking for:
 *   1. Multiple consecutive spaces (3+) as column separators
 *   2. Tab characters
 *   3. Alignment of numeric values
 */
function splitIntoCells(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  // Tabs are unambiguous column separators
  if (trimmed.includes('\t')) {
    return trimmed.split('\t').map((c) => c.trim());
  }

  // Check for 3+ consecutive spaces as column separator
  if (/ {3,}/.test(trimmed)) {
    return trimmed.split(/ {3,}/).map((c) => c.trim());
  }

  // Fallback: try 2+ spaces
  if (/ {2,}/.test(trimmed)) {
    const cells = trimmed.split(/ {2,}/).map((c) => c.trim());
    // Only use if it produces multiple cells
    if (cells.length >= 2) return cells;
  }

  // Single column — the whole line is one cell (likely a label or header)
  return [trimmed];
}

/**
 * Attempt to align cells into columns using column position patterns.
 * This is useful when OCR output has inconsistent spacing.
 */
function alignToColumns(
  lines: string[],
): { cells: string[] }[] {
  // Strategy: for each line, find likely column splits based on
  // numeric value positions and known period labels

  const rows: { cells: string[] }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const cells = splitIntoCells(trimmed);
    rows.push({ cells });
  }

  return rows;
}

/**
 * Parse a financial value string to a number.
 */
function parseValue(s: string): { value: number | null; isPercent: boolean } {
  const trimmed = s.trim();
  if (!trimmed) return { value: null, isPercent: false };

  // Detect percentage
  const isPercent = trimmed.includes('%');

  // Remove currency symbols, commas, percent
  let cleaned = trimmed
    .replace(/[₹$£€¥,]/g, '')
    .replace(/%/g, '')
    .trim();

  // Handle brackets as negatives: (123.4)
  const bracketMatch = cleaned.match(/^\(([\d.\s]+)\)$/);
  if (bracketMatch) {
    cleaned = '-' + bracketMatch[1];
  }

  // Remove unit suffixes
  cleaned = cleaned.replace(/\s*(Cr\.?|Crore|Lakhs?|Mn|M(?![a-zA-Z])|Bn|B(?![a-zA-Z]))\s*$/i, '').trim();

  const num = parseFloat(cleaned);
  if (isNaN(num)) return { value: null, isPercent };

  return { value: num, isPercent };
}

/**
 * Find the most likely period labels from header-like content at the top.
 */
function extractPeriodLabels(
  rows: string[][],
): string[] {
  const candidates: string[] = [];

  // Look at first few rows for period labels
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    for (const cell of rows[i]) {
      const cleaned = cell.trim();
      if (detectPeriods([cleaned]).length > 0) {
        candidates.push(cleaned);
      }
    }
  }

  // If no explicit periods found, check if cells in data rows could be periods
  if (candidates.length === 0) {
    // Look for 4-digit numbers that could be years
    for (let i = 0; i < Math.min(rows.length, 3); i++) {
      for (const cell of rows[i]) {
        const yearMatch = cell.trim().match(/^(20\d{2})$/);
        if (yearMatch) {
          candidates.push('FY' + yearMatch[1].slice(2));
        }
      }
    }
  }

  return candidates;
}

/**
 * Main function: detect table structure from raw OCR text lines.
 */
export function detectTableStructure(
  rawText: string,
  tableId: string,
): DetectedTable {
  // Split into lines
  const allLines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Filter noise lines
  const cleanLines = allLines.filter(
    (l) => !NOISE_PATTERNS.some((p) => p.test(l)),
  );

  // Detect if this is tabular data
  const isTabular = hasTableStructure(cleanLines);

  if (!isTabular) {
    // Return as a single column table (label-only)
    const cells: DetectedCell[] = cleanLines.map((l) => ({
      text: l,
      numericValue: null,
      isPercent: false,
    }));
    return {
      id: tableId,
      rows: cells.map((c, i) => ({
        cells: [c],
        sourceLine: i,
        isHeader: false,
      })),
      periods: [],
      confidence: 0.3,
    };
  }

  // Split into column-aligned cells
  const aligned = alignToColumns(cleanLines);

  // Extract period labels from header rows
  const periodLabels = extractPeriodLabels(
    aligned.map((r) => r.cells),
  );

  // Build rows
  const rows: DetectedRow[] = aligned.map((alignedRow, i) => {
    const cells: DetectedCell[] = alignedRow.cells.map((cellText) => {
      const { value, isPercent } = parseValue(cellText);
      return {
        text: cellText,
        numericValue: value,
        isPercent,
      };
    });

    // Determine if this is a section header row (label but no values)
    const hasNumericValue = cells.some((c) => c.numericValue !== null);
    const isHeader = !hasNumericValue;

    return {
      cells,
      sourceLine: i,
      isHeader,
    };
  });

  // Calculate confidence based on structure clarity
  const dataRows = rows.filter((r) => !r.isHeader);
  const avgColumns =
    dataRows.length > 0
      ? dataRows.reduce((s, r) => s + r.cells.length, 0) / dataRows.length
      : 1;

  // Higher confidence when:
  // - More than 3 data rows
  // - Average of 2+ columns (indicates multi-period data)
  // - Period labels detected
  let confidence = 0.4;
  if (dataRows.length >= 3) confidence += 0.2;
  if (avgColumns >= 2) confidence += 0.15;
  if (periodLabels.length > 0) confidence += 0.15;

  return {
    id: tableId,
    rows,
    periods: periodLabels,
    confidence: Math.min(confidence, 1.0),
  };
}
