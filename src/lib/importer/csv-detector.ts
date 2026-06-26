/**
 * CSV auto-delimiter detection.
 *
 * Analyzes the first few lines of a CSV file to determine the
 * most likely delimiter, handling edge cases like quoted fields.
 */

export type CsvDelimiter = ',' | '\t' | ';' | '|';

interface DelimiterResult {
  delimiter: CsvDelimiter;
  confidence: number;
}

/** Delimiters to try, in priority order */
const DELIMITERS: CsvDelimiter[] = [',', '\t', ';', '|'];

/**
 * Count delimiter occurrences outside quoted strings.
 */
function countDelimiterOutsideQuotes(line: string, delimiter: string): number {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === delimiter && !inQuotes) count++;
  }
  return count;
}

/**
 * Detect the most likely delimiter in a CSV text.
 * Analyzes the first 5 non-empty lines for consistent delimiter usage.
 */
export function detectDelimiter(text: string): DelimiterResult {
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .slice(0, 10);

  if (lines.length === 0) {
    return { delimiter: ',', confidence: 0 };
  }

  const scores = new Map<CsvDelimiter, number>();
  let totalLinesWithData = 0;

  for (const delimiter of DELIMITERS) {
    let consistentLines = 0;
    let totalCount = 0;

    for (const line of lines) {
      const count = countDelimiterOutsideQuotes(line, delimiter);
      if (count > 0) {
        consistentLines++;
        totalCount += count;
      }
    }

    if (consistentLines >= lines.length * 0.5) {
      const avgCount = totalCount / consistentLines;
      // Prefer delimiters that produce consistent column counts
      scores.set(delimiter, consistentLines / lines.length);
    }
  }

  // Find the delimiter with the highest score
  let bestDelimiter: CsvDelimiter = ',';
  let bestScore = 0;

  const entries = Array.from(scores.entries());
  for (let i = 0; i < entries.length; i++) {
    const [delim, score] = entries[i];
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delim;
    }
  }

  // Quick sanity: check that the best delimiter produces
  // at least 2 columns in the first data row
  if (bestScore > 0) {
    const firstRowCols = lines[0].split(bestDelimiter).length;
    if (firstRowCols < 2) {
      // Fall back to comma
      return { delimiter: ',', confidence: 0.2 };
    }
  }

  return {
    delimiter: bestDelimiter,
    confidence: bestScore,
  };
}

/**
 * Parse CSV text with auto-detected delimiter, handling quoted fields.
 */
export function parseCsvWithDetection(text: string): string[][] {
  const { delimiter } = detectDelimiter(text);
  return parseCsvLines(text, delimiter);
}

/**
 * Parse CSV text with a specific delimiter.
 */
export function parseCsvLines(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    rows.push(cells);
  }

  return rows;
}
