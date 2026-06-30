/**
 * OCR & PDF import module — BETA / EXPERIMENTAL
 *
 * Provides image OCR (via Tesseract.js), PDF text extraction (via pdfjs-dist),
 * scanned PDF OCR (render pages to canvas then OCR), table cleaning, and
 * file-type detection for the Smart Importer pipeline.
 *
 * Status: BETA — not wired into the main import flow by default.
 * Results are imperfect and should always be reviewed by the user.
 *
 * To enable OCR:
 *   npm install tesseract.js
 *
 * To enable PDF extraction:
 *   npm install pdfjs-dist
 */

import type { ImportedTable, SourceType } from './types';

// ── Minimal interfaces for libraries without @types ─────────────────────────

/** Tesseract.js logger progress message */
interface OcrLoggerMessage {
  status: string;
  progress: number;
}

/** Tesseract.js library interface */
interface TesseractLib {
  recognize(
    image: string | Blob,
    lang: string,
    options?: { logger?: (m: OcrLoggerMessage) => void }
  ): Promise<{ data: { text: string } }>;
}

/** pdfjs-dist library interface (partial) */
interface PdfjsLib {
  GlobalWorkerOptions?: { workerSrc?: string };
  getDocument(params: { data: ArrayBuffer }): { promise: Promise<PdfDoc> };
}

/** pdfjs-dist text content item (partial) */
interface PdfTextItem {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
}

/** pdfjs-dist PDF document proxy (minimal) */
interface PdfDoc {
  numPages: number;
  getPage(num: number): Promise<{
    getViewport(opts: { scale: number }): { width: number; height: number };
    render(opts: {
      canvasContext: CanvasRenderingContext2D;
      viewport: { width: number; height: number };
    }): { promise: Promise<void> };
    getTextContent(): Promise<{ items: PdfTextItem[] }>;
  }>;
}

// ── Progress types ──────────────────────────────────────────────────────────

export type OcrProgressStage =
  | 'idle'
  | 'reading'
  | 'ocr'
  | 'tables'
  | 'mapping'
  | 'review'
  | 'done'
  | 'error';

export interface OcrProgress {
  stage: OcrProgressStage;
  message: string;
  percent: number;
}

// ── OCR result (before metric mapping) ──────────────────────────────────────

export interface OcrResult {
  tables: ImportedTable[];
  rawText: string;
  warnings: string[];
}

// ── File-type detection ─────────────────────────────────────────────────────

export interface FileTypeInfo {
  type: SourceType;
  subtype: string;
}

/**
 * Detect the type and subtype of a file based on its name and MIME type.
 */
export function detectFileType(file: File): FileTypeInfo {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  // Image files
  if (
    /\.(png|jpg|jpeg|gif|webp|bmp|tiff?)$/i.test(name) ||
    mime.startsWith('image/')
  ) {
    const ext = name.split('.').pop() || 'png';
    return { type: 'ocr', subtype: ext };
  }

  // PDF
  if (/\.pdf$/i.test(name) || mime === 'application/pdf') {
    return { type: 'pdf-text', subtype: 'pdf' };
  }

  // CSV
  if (/\.csv$/i.test(name) || mime === 'text/csv' || mime === 'text/plain') {
    return { type: 'csv', subtype: 'csv' };
  }

  // XLSX / XLS
  if (/\.xlsx?$/i.test(name) || mime.includes('spreadsheet')) {
    const ext = name.split('.').pop() || 'xlsx';
    return { type: 'xlsx', subtype: ext };
  }

  // XML / XBRL
  if (/\.xbrl$/i.test(name) || /\.xml$/i.test(name)) {
    return {
      type: 'xbrl',
      subtype: name.endsWith('.xbrl') ? 'xbrl' : 'xml',
    };
  }

  // HTML / iXBRL
  if (
    /\.(html?|ixbrl)$/i.test(name) ||
    mime === 'text/html' ||
    mime === 'application/xhtml+xml'
  ) {
    return {
      type: 'xbrl',
      subtype: name.endsWith('.ixbrl') ? 'ixbrl' : 'html',
    };
  }

  return { type: 'manual', subtype: 'unknown' };
}

// ── Tesseract.js availability ───────────────────────────────────────────────

let _tesseractAvailable: boolean | null = null;

async function checkTesseract(): Promise<boolean> {
  if (_tesseractAvailable !== null) return _tesseractAvailable;
  try {
  await import('tesseract.js');
    _tesseractAvailable = true;
  } catch {
    _tesseractAvailable = false;
  }
  return _tesseractAvailable;
}

// ── pdfjs-dist availability ─────────────────────────────────────────────────

let _pdfjsAvailable: boolean | null = null;

async function checkPdfjs(): Promise<boolean> {
  if (_pdfjsAvailable !== null) return _pdfjsAvailable;
  try {
  await import('pdfjs-dist');
    _pdfjsAvailable = true;
  } catch {
    _pdfjsAvailable = false;
  }
  return _pdfjsAvailable;
}

// ── Image OCR ───────────────────────────────────────────────────────────────

/**
 * Extract text from an image file using Tesseract.js (if available).
 * Falls back gracefully with a warning if Tesseract is not installed.
 */
export async function performOcr(
  file: File,
  onProgress?: (p: OcrProgress) => void,
): Promise<OcrResult> {
  const emit = (stage: OcrProgressStage, message: string, percent: number) => {
    onProgress?.({ stage, message, percent });
  };

  emit('reading', 'Checking Tesseract.js availability…', 0);

  const available = await checkTesseract();
  if (!available) {
    const warning =
      'Tesseract.js is not installed. Run: npm install tesseract.js';
    console.warn('[OCR BETA]', warning);
    emit('error', warning, 0);
    return {
      tables: [],
      rawText: '',
      warnings: [warning],
    };
  }

  emit('reading', `Reading image: ${file.name}…`, 10);
  const dataUrl = await fileToDataUrl(file);

  emit('ocr', 'Running OCR engine…', 30);
  let tesseractModule: unknown;
  try {
  tesseractModule = await import('tesseract.js');
  } catch {
    const warning =
      'Failed to load Tesseract.js dynamically. Run: npm install tesseract.js';
    return { tables: [], rawText: '', warnings: [warning] };
  }

  const Tesseract: TesseractLib =
    (tesseractModule as { default?: TesseractLib }).default ??
    (tesseractModule as TesseractLib);
  const result = await Tesseract.recognize(dataUrl, 'eng', {
    logger: (m: OcrLoggerMessage) => {
      if (m.status === 'recognizing text') {
        const pct = 30 + Math.round(m.progress * 50);
        emit('ocr', `OCR: ${Math.round(m.progress * 100)}%`, pct);
      }
    },
  });

  const rawText: string = result.data?.text || '';
  emit('tables', 'Parsing OCR output into tables…', 80);

  const tables = parseOcrTextToTables(rawText, file.name);
  emit('mapping', 'Cleaning OCR tables…', 90);

  const cleaned = cleanOcrText(tables);
  emit('done', 'OCR complete', 100);

  const warnings: string[] = [];
  if (cleaned.length === 0) {
    warnings.push(
      'OCR produced no usable tables. The image may be low quality or contain no financial data.',
    );
  }

  return {
    tables: cleaned,
    rawText,
    warnings,
  };
}

// ── Text-based PDF extraction ───────────────────────────────────────────────

/**
 * Extract text from a text-based PDF using pdfjs-dist.
 * Reconstructs tables from positioned text items.
 */
export async function extractPdfText(
  file: File,
  onProgress?: (p: OcrProgress) => void,
): Promise<OcrResult> {
  const emit = (stage: OcrProgressStage, message: string, percent: number) => {
    onProgress?.({ stage, message, percent });
  };

  emit('reading', 'Checking pdfjs-dist availability…', 0);

  const available = await checkPdfjs();
  if (!available) {
    const warning =
      'pdfjs-dist is not installed. Run: npm install pdfjs-dist';
    console.warn('[OCR BETA]', warning);
    emit('error', warning, 0);
    return {
      tables: [],
      rawText: '',
      warnings: [warning],
    };
  }

  emit('reading', `Loading PDF: ${file.name}…`, 5);
  const arrayBuffer = await file.arrayBuffer();

  let pdfjsModule: unknown;
  try {
  pdfjsModule = await import('pdfjs-dist');
  } catch {
    const warning =
      'Failed to load pdfjs-dist dynamically. Run: npm install pdfjs-dist';
    return { tables: [], rawText: '', warnings: [warning] };
  }

  const pdfjsLib: PdfjsLib =
    (pdfjsModule as { default?: PdfjsLib }).default ??
    (pdfjsModule as PdfjsLib);
  // Set the workerSrc — use CDN matching installed pdfjs-dist version
  if (!pdfjsLib.GlobalWorkerOptions?.workerSrc) {
    try {
      pdfjsLib.GlobalWorkerOptions!.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs';
    } catch {
      // If setting workerSrc fails, some PDFs may still work synchronously
    }
  }

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const allPageTexts: string[] = [];
  const warnings: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const pct = 5 + Math.round((i / pdf.numPages) * 60);
    emit('reading', `Extracting page ${i}/${pdf.numPages}…`, pct);

    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Group text items by their Y position (rows)
    const yThreshold = 3; // pixels tolerance for same row
    const rows: { y: number; items: { x: number; text: string }[] }[] = [];

    for (const item of textContent.items) {
      const ti = item as PdfTextItem;
      const x = ti.transform?.[4] ?? 0;
      const y = ti.transform?.[5] ?? 0;
      const text = (ti.str ?? '').trim();

      if (!text) continue;

      // Find a row within yThreshold
      let row = rows.find((r) => Math.abs(r.y - y) < yThreshold);
      if (!row) {
        row = { y, items: [] };
        rows.push(row);
      }
      row.items.push({ x, text });
    }

    // Sort rows top-to-bottom, items left-to-right
    rows.sort((a, b) => b.y - a.y); // PDF coords: higher y = higher on page

    for (const row of rows) {
      row.items.sort((a, b) => a.x - b.x);
      const rowText = row.items.map((it) => it.text).join('   ');
      allPageTexts.push(rowText);
    }

    // Add page boundary marker for table separation
    if (i < pdf.numPages) {
      allPageTexts.push('---PAGE BREAK---');
    }
  }

  const rawText = allPageTexts.join('\n');
  emit('tables', 'Reconstructing tables from PDF text…', 70);

  const tables = parseOcrTextToTables(rawText, file.name);
  emit('mapping', 'Cleaning PDF tables…', 85);

  const cleaned = cleanOcrText(tables);
  emit('done', 'PDF text extraction complete', 100);

  if (rawText.trim().length < 50) {
    warnings.push(
      'Very little text extracted. This PDF may be scanned. Try extractScannedPdfText instead.',
    );
  }

  return {
    tables: cleaned,
    rawText,
    warnings,
  };
}

// ── Scanned PDF extraction ──────────────────────────────────────────────────

/**
 * Extract text from a scanned PDF by rendering each page to a canvas,
 * converting to an image, and running OCR on each page.
 */
export async function extractScannedPdfText(
  file: File,
  onProgress?: (p: OcrProgress) => void,
): Promise<OcrResult> {
  const emit = (stage: OcrProgressStage, message: string, percent: number) => {
    onProgress?.({ stage, message, percent });
  };

  emit('reading', 'Checking dependencies…', 0);

  // Check both dependencies
  const [tesseractOk, pdfjsOk] = await Promise.all([
    checkTesseract(),
    checkPdfjs(),
  ]);

  if (!pdfjsOk) {
    const warning =
      'pdfjs-dist is not installed. Run: npm install pdfjs-dist';
    emit('error', warning, 0);
    return { tables: [], rawText: '', warnings: [warning] };
  }
  if (!tesseractOk) {
    const warning =
      'Tesseract.js is not installed. Run: npm install tesseract.js';
    emit('error', warning, 0);
    return { tables: [], rawText: '', warnings: [warning] };
  }

  emit('reading', `Loading scanned PDF: ${file.name}…`, 5);
  const arrayBuffer = await file.arrayBuffer();

  let pdfjsModule: unknown;
  let tesseractModule: unknown;
  try {
  pdfjsModule = await import('pdfjs-dist');
  tesseractModule = await import('tesseract.js');
  } catch (e) {
    const warning = `Failed to load dependencies: ${e}`;
    return { tables: [], rawText: '', warnings: [warning] };
  }

  const pdfjsLib: PdfjsLib =
    (pdfjsModule as { default?: PdfjsLib }).default ??
    (pdfjsModule as PdfjsLib);
  const Tesseract: TesseractLib =
    (tesseractModule as { default?: TesseractLib }).default ??
    (tesseractModule as TesseractLib);

  if (!pdfjsLib.GlobalWorkerOptions?.workerSrc) {
    try {
      pdfjsLib.GlobalWorkerOptions!.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs';
    } catch {
      // best-effort
    }
  }

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const allPageTexts: string[] = [];
  const warnings: string[] = [];
  const scale = 2.0; // Higher = better OCR quality but slower

  for (let i = 1; i <= pdf.numPages; i++) {
    const basePct = 5 + Math.round(((i - 1) / pdf.numPages) * 70);
    emit('ocr', `Rendering page ${i}/${pdf.numPages}…`, basePct);

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    // Create a canvas for this page
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Convert canvas to blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png', 1.0);
    });

    if (!blob) {
      warnings.push(`Failed to render page ${i} to image.`);
      continue;
    }

    const ocrPct = basePct + 5;
    emit('ocr', `OCR scanning page ${i}/${pdf.numPages}…`, ocrPct);

    // OCR the image blob
    const result = await Tesseract.recognize(blob, 'eng', {
      logger: (m: OcrLoggerMessage) => {
        if (m.status === 'recognizing text') {
          const pct = ocrPct + Math.round(m.progress * 15);
          emit('ocr', `Page ${i} OCR: ${Math.round(m.progress * 100)}%`, pct);
        }
      },
    });

    const pageText: string = result.data?.text || '';
    allPageTexts.push(pageText);

    if (i < pdf.numPages) {
      allPageTexts.push('---PAGE BREAK---');
    }
  }

  const rawText = allPageTexts.join('\n');
  emit('tables', 'Reconstructing tables from scanned PDF…', 78);

  const tables = parseOcrTextToTables(rawText, file.name);
  emit('mapping', 'Cleaning scanned PDF tables…', 90);

  const cleaned = cleanOcrText(tables);
  emit('done', 'Scanned PDF extraction complete', 100);

  return {
    tables: cleaned,
    rawText,
    warnings,
  };
}

// ── Text to tables ──────────────────────────────────────────────────────────

/**
 * Parse raw OCR/extracted text into ImportedTable[].
 * Splits text into section blocks (by page breaks or double-blank lines),
 * then splits each block into rows of cells.
 */
function parseOcrTextToTables(rawText: string, sourceName: string): ImportedTable[] {
  const tables: ImportedTable[] = [];

  // Split into blocks (page breaks or 2+ blank lines)
  const blocks = rawText
    .split(/---PAGE BREAK---|\n\s*\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) continue; // Need at least 2 rows to make a table

    const rows: string[][] = lines.map((line) => {
      // Split on 3+ spaces (table column separator in OCR output)
      // or on single tab
      if (line.includes('\t')) {
        return line.split('\t').map((c) => c.trim());
      }
      const cells = line.split(/\s{3,}/).map((c) => c.trim());
      // If 3+ spaces didn't produce multiple cells, try 2+ spaces
      if (cells.length < 2) {
        const cells2 = line.split(/\s{2,}/).map((c) => c.trim());
        if (cells2.length >= 2) return cells2;
      }
      const financialCells = splitCollapsedFinancialRow(line);
      if (financialCells.length >= 2) return financialCells;
      return cells;
    });

    tables.push({
      id: `ocr-table-${i + 1}`,
      sourceName,
      rows,
      cleanedRows: [],
      confidence: 0.6,
    });
  }

  return tables;
}

/**
 * OCR often collapses table columns into single-space text:
 * "Revenue from operations 5,660.90 8,457.33 ...".
 * Recover these as [label, value1, value2, ...] so downstream metric mapping
 * can still work without relying on perfect whitespace alignment.
 */
function splitCollapsedFinancialRow(line: string): string[] {
  const trimmed = line.trim();
  if (!/[a-zA-Z]/.test(trimmed) || !/\d/.test(trimmed)) return [trimmed];

  const valuePattern = /\(?-?(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?\)?%?/g;
  const matches = [...trimmed.matchAll(valuePattern)]
    .filter((match) => {
      const raw = match[0];
      const start = match.index ?? 0;
      const before = trimmed[start - 1] || ' ';
      const after = trimmed[start + raw.length] || ' ';
      return !/[A-Za-z]/.test(before) && !/[A-Za-z]/.test(after);
    });

  if (matches.length < 2) return [trimmed];

  const firstValueAt = matches[0].index ?? -1;
  const label = trimmed
    .slice(0, firstValueAt)
    .replace(/^[^\w(]+/, '')
    .replace(/^\(?[a-z]\)?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (label.length < 3 || !/[a-zA-Z]/.test(label)) return [trimmed];

  const values = matches.map((match) => match[0].trim());
  return [label, ...values];
}

// ── Clean OCR tables ────────────────────────────────────────────────────────

/**
 * Keyword patterns that indicate non-financial rows to remove.
 */
const REMOVE_KEYWORDS = [
  /registered\s+office/i,
  /cin:/i,
  /\bcin\b/i,
  /email/i,
  /website/i,
  /tel:/i,
  /fax:/i,
  /board\s+of\s+directors/i,
  /\bauditor/i,
  /\bsigned\b/i,
  /place:/i,
  /date:/i,
  /\bpage\b/i,
  /notes?:/i,
  /disclaimer/i,
  /annexure/i,
  /corporate\s+information/i,
  /registered\s+office/i,
  /statutory\s+auditor/i,
  /chief\s+financial\s+officer/i,
  /company\s+secretary/i,
  /director:/i,
  /chairman/i,
  /managing\s+director/i,
  /independent\s+director/i,
  /regd\.?\s+office/i,
  /corp\.?\s+office/i,
  /principal\s+business/i,
  /(?:this|that)\s+is\s+(?:to\s+)?certify/i,
  // Additional noise patterns for financial PDFs
  /notes?\s+to\s+(?:the\s+)?(?:accounts|financial\s+statements)/i,
  /significant\s+accounting\s+polic/i,
  /accounting\s+(?:policies|standards|convention)/i,
  /(?:management|directors?)\s+(?:discussion|report|analysis)/i,
  /audit(?:ors?)?\s+report/i,
  /report\s+of\s+(?:the\s+)?(?:board|directors|auditors?)/i,
  /statement\s+of\s+(?:profit|cash\s+flows?|changes?\s+in\s+equity)/i,
  /schedule[s]?\s+(?:forming|to\s+the|attached|referred)/i,
  /balance\s+sheet\s+as\s+at/i,
  /profit\s+(?:and|&)\s+loss\s+(?:account|statement)/i,
  /\b(?:note|notes?|sch(?:edule)?\.?\s*\d+)\s*(?::|–|—|-|\d)/i,
  /figures?\s+(?:in|are)\s+(?:rs\.?|₹|crores?|lakhs?|millions?)/i,
  /(?:all|amounts?)\s+(?:in|are)\s+(?:rs\.?|₹|crores?|lakhs?)/i,
  /previous\s+year\s+figures/i,
  /current\s+year\s+figures/i,
  /corporate\s+(?:overview|information|identity)/i,
  /consolidated\s+(?:balance\s+sheet|statement|financials?)/i,
  /standalone\s+(?:balance\s+sheet|statement|financials?)/i,
  /\b(?:year|period)\s+ended\s+(?:31st|30th|31)\s+(?:march|mar|december|dec|september|sep|june|jun)/i,
  /\b(?:31st|30th|31)\s+(?:march|mar|december|dec)\s+\d{4}/i,
];

/**
 * Check if a row contains any of the removal keywords.
 */
function hasRemoveKeyword(row: string[]): boolean {
  const joined = row.join(' ').toLowerCase();
  return REMOVE_KEYWORDS.some((re) => re.test(joined));
}

/**
 * Check if a row has at least one numeric cell (potential financial value).
 */
function hasNumericValue(row: string[]): boolean {
  return row.some((cell) => {
    const cleaned = cell.replace(/[,₹$£€¥%\s]/g, '');
    return /^-?\d+(\.\d+)?$/.test(cleaned);
  });
}

/**
 * Check if a row is mostly empty (>50% empty cells).
 */
function isMostlyEmpty(row: string[]): boolean {
  if (row.length === 0) return true;
  const emptyCount = row.filter((c) => !c.trim()).length;
  return emptyCount / row.length > 0.5;
}

/**
 * Check if a row looks like a header/footer row (short, all text, no numbers).
 */
function isHeaderFooterRow(row: string[]): boolean {
  const joined = row.join(' ').trim();
  if (joined.length < 3) return true;
  // If it has no numeric values and length is short
  if (!hasNumericValue(row) && joined.length < 30) {
    // Check if it looks like a column header (financial terms only)
    const financialHeaderTerms = [
      'particulars',
      'year',
      'period',
      'amount',
      'note',
      'ref',
      'rs.',
      'rs',
      'inr',
      'usd',
    ];
    const lower = joined.toLowerCase();
    if (financialHeaderTerms.some((t) => lower.includes(t))) return false;
    // Page numbers, short labels, etc.
    return true;
  }
  return false;
}

/**
 * Normalize whitespace in all cells of a row.
 */
function normalizeRow(row: string[]): string[] {
  return row.map((c) => c.replace(/\s+/g, ' ').trim());
}

/**
 * Compute a similarity hash for a row to detect near-duplicates.
 */
function rowSignature(row: string[]): string {
  return row
    .map((c) => c.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 20))
    .join('|');
}

/**
 * Clean OCR tables by removing non-financial content, headers/footers,
 * and duplicate rows.
 */
export function cleanOcrText(tables: ImportedTable[]): ImportedTable[] {
  const result: ImportedTable[] = [];

  for (const table of tables) {
    if (!table.rows || table.rows.length === 0) continue;

    const seenSignatures = new Set<string>();
    const cleanedRows: string[][] = [];

    for (let i = 0; i < table.rows.length; i++) {
      const row = normalizeRow(table.rows[i]);

      // Skip empty rows
      if (row.length === 0 || row.every((c) => !c)) continue;

      // Skip rows with removal keywords
      if (hasRemoveKeyword(row)) continue;

      // Skip mostly empty rows
      if (isMostlyEmpty(row)) continue;

      // Skip rows that are all non-numeric (no financial values) unless
      // they look like a financial label (metric label in first column)
      if (!hasNumericValue(row)) {
        const firstCell = (row[0] || '').toLowerCase().trim();
        const isFinancialLabel =
          /(revenue|income|profit|loss|asset|liability|equity|debt|cash|expense|cost|margin|ratio|tax|ebit|pat|sales|turnover|depreciation|interest|dividend|reserve|surplus|borrowing|payable|receivable|inventory|investment|shareholder|fund|capital|goodwill|intangible|current|non.?current|fixed|tangible)/i.test(
            firstCell,
          );

        if (!isFinancialLabel) {
          // Remove repeated header/footer lines
          if (isHeaderFooterRow(row)) continue;
          // If it's just text with no financial indicators, skip it
          continue;
        }
      }

      // De-duplicate: skip rows with same signature as a recent row
      const sig = rowSignature(row);
      if (seenSignatures.has(sig)) {
        continue;
      }
      seenSignatures.add(sig);

      cleanedRows.push(row);
    }

    if (cleanedRows.length > 0) {
      result.push({
        ...table,
        rows: table.rows, // keep original rows intact
        cleanedRows,
        confidence: Math.min(0.9, 0.5 + cleanedRows.length / table.rows.length * 0.4),
      });
    }
  }

  return result;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a File to a data URL (base64-encoded data URI).
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file as data URL'));
    reader.readAsDataURL(file);
  });
}

/**
 * Check if Tesseract.js is available by trying a dynamic import.
 */
export async function isOCRAvailable(): Promise<boolean> {
  return checkTesseract();
}

/**
 * Check if pdfjs-dist is available by trying a dynamic import.
 */
export async function isPDFAvailable(): Promise<boolean> {
  return checkPdfjs();
}

/**
 * UI hint for OCR status.
 */
export function getOCRStatusText(): string {
  return 'Experimental screenshot mode (BETA). Please review extracted values before analysis.';
}
