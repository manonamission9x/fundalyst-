/**
 * PDF Importer — BETA / EXPERIMENTAL
 *
 * Orchestrates the PDF import workflow:
 *   1. Detects whether a PDF is text-based or scanned
 *   2. Routes to the appropriate extraction method
 *   3. Tries text extraction first, falls back to OCR if text is sparse
 *   4. Produces ImportedTable[] ready for metric mapping / dataset building
 *
 * Dependencies (install as needed):
 *   npm install pdfjs-dist          — text-based PDF extraction
 *   npm install tesseract.js        — scanned PDF OCR fallback
 *
 * Status: BETA — results should be reviewed by the user before analysis.
 */

import type {
  FundalystDataset,
  ImportedTable,
  CanonicalFact,
  SourceType,
  StatementType,
} from './types';
import {
  extractPdfText,
  extractScannedPdfText,
  detectFileType,
  isOCRAvailable,
  isPDFAvailable,
  type OcrProgress,
  type OcrResult,
} from './ocr';
import { findBestMetricMatch } from './metric-aliases';
import { normalizeValue, convertToOnes } from './normalizer';

// ── Progress types ──────────────────────────────────────────────────────────

export type PdfImportStage =
  | 'idle'
  | 'detecting'
  | 'extracting-text'
  | 'extracting-scanned'
  | 'parsing-tables'
  | 'building-dataset'
  | 'done'
  | 'error';

export interface PdfImportProgress {
  stage: PdfImportStage;
  message: string;
  percent: number;
}

// ── Import result ───────────────────────────────────────────────────────────

export interface PdfImportResult {
  success: boolean;
  dataset: FundalystDataset | null;
  tables: ImportedTable[];
  rawText: string;
  warnings: string[];
  method: 'text' | 'scanned-ocr' | 'fallback-ocr' | 'none';
  sourceType: SourceType;
}

// ── Heuristic: detect if PDF is scanned ─────────────────────────────────────

/**
 * A basic heuristic: if the PDF's text content is very sparse relative to
 * the number of pages, it's likely scanned.
 */
const MIN_TEXT_LENGTH_PER_PAGE = 20;

function isLikelyScanned(rawText: string, numPages: number): boolean {
  const textLength = rawText.replace(/\s+/g, '').length;
  return textLength < numPages * MIN_TEXT_LENGTH_PER_PAGE;
}

// ── Main import ─────────────────────────────────────────────────────────────

/**
 * Import a PDF file and produce a structured result.
 *
 * Strategy:
 *   1. Try text-based extraction (pdfjs-dist).
 *   2. If the result looks empty or scanned, fall back to scanned OCR.
 *   3. If neither is available, report which dependencies are missing.
 *   4. Clean the extracted tables and attempt metric mapping.
 */
export async function importPdf(
  file: File,
  onProgress?: (p: PdfImportProgress) => void,
  /** Force a specific extraction method. Auto-detect if omitted. */
  forceMethod?: 'text' | 'scanned',
): Promise<PdfImportResult> {
  const emit = (stage: PdfImportStage, message: string, percent: number) => {
    onProgress?.({ stage, message, percent });
  };

  emit('detecting', 'Checking dependencies and file…', 0);

  const fileType = detectFileType(file);
  if (fileType.type !== 'pdf-text') {
    return {
      success: false,
      dataset: null,
      tables: [],
      rawText: '',
      warnings: [`File "${file.name}" does not appear to be a PDF.`],
      method: 'none',
      sourceType: fileType.type,
    };
  }

  // Check what's available
  const [pdfjsOk, ocrOk] = await Promise.all([
    isPDFAvailable(),
    isOCRAvailable(),
  ]);

  if (!pdfjsOk && !ocrOk) {
    return {
      success: false,
      dataset: null,
      tables: [],
      rawText: '',
      warnings: [
        'Neither pdfjs-dist nor tesseract.js is installed.',
        'Run: npm install pdfjs-dist   (for text-based PDFs)',
        'Or:  npm install tesseract.js  (for scanned PDFs)',
      ],
      method: 'none',
      sourceType: 'pdf-text',
    };
  }

  // ── Step 1: Try text extraction (or forced scanned) ──────────────────────
  let result: OcrResult;
  let method: 'text' | 'scanned-ocr' | 'fallback-ocr';

  if (forceMethod === 'scanned' && ocrOk) {
    emit('extracting-scanned', 'Performing scanned PDF OCR…', 10);
    result = await extractScannedPdfText(file, makeOcrCallback(emit));
    method = 'scanned-ocr';
  } else if (forceMethod === 'text' && pdfjsOk) {
    emit('extracting-text', 'Extracting PDF text…', 10);
    result = await extractPdfText(file, makeOcrCallback(emit));
    method = 'text';
  } else if (pdfjsOk) {
    // Auto: try text extraction first
    emit('extracting-text', 'Extracting PDF text…', 10);
    result = await extractPdfText(file, makeOcrCallback(emit));

    // Check if the result seems scanned
    if (
      isLikelyScanned(result.rawText, 1) &&
      result.tables.length === 0 &&
      ocrOk
    ) {
      emit(
        'extracting-scanned',
        'PDF appears scanned. Falling back to OCR…',
        15,
      );
      result = await extractScannedPdfText(file, makeOcrCallback(emit));
      method = 'fallback-ocr';
    } else {
      method = 'text';
    }
  } else if (ocrOk) {
    // Only OCR available
    emit('extracting-scanned', 'No PDF text engine. Using OCR…', 10);
    result = await extractScannedPdfText(file, makeOcrCallback(emit));
    method = 'scanned-ocr';
  } else {
    // Should not reach here given the check above, but handle defensively
    return {
      success: false,
      dataset: null,
      tables: [],
      rawText: '',
      warnings: ['No PDF extraction engine available.'],
      method: 'none',
      sourceType: 'pdf-text',
    };
  }

  emit('parsing-tables', 'Parsing and cleaning tables…', 75);

  // ── Step 2: Build dataset from tables ────────────────────────────────────
  const warnings = [...result.warnings];
  const tables = result.tables;

  emit('building-dataset', 'Building financial dataset…', 85);

  const dataset = buildDatasetFromTables(tables, file.name, method, warnings);

  emit('done', 'PDF import complete', 100);

  return {
    success: tables.length > 0,
    dataset,
    tables,
    rawText: result.rawText,
    warnings,
    method,
    sourceType: method === 'text' ? 'pdf-text' : 'ocr',
  };
}

// ── Common non-financial label patterns to silently skip ──

const NON_FINANCIAL_LABELS = [
  /^(q[1-4]|quarter|half.?year|annual|year|month|january|february|march|april|may|june|july|august|september|october|november|december)$/i,
  /^(germany|uk|turkey|türkiye|africa|egypt|europe|asia|india|china|japan|usa|france|italy|spain|netherlands|sweden|switzerland)$/i,
  /^(group|total|subtotal|common functions|corporate|other|others|continuing|discontinued)$/i,
  /^(references|introduction|background|overview|summary|conclusion|notes|note|refer|source)$/i,
  /^(this|that|these|those|our|their|its|the|and|or|for|from|with|in|on|by|at|to|of)$/i,
  /^["""'']/,
  /(?:management|directors?|board|chairman)\s+(?:discussion|report|commentary|analysis|statement)/i,
  /(?:accounting|audit|tax)\s+(?:policies?|standards?|estimates?|assumptions?)/i,
  /\b(?:risk|uncertainty|outlook|guidance|forecast|strategy|initiative)\b/i,
  /^%\s+of/i,
  /^\d+%\s+(of|in|to)/,
  /(?:please|kindly|note|refer)\s+(?:see|to)/i,
  /^(?:the|this|our|we)\s+(?:following|table|report|quarter|year|period|measure|change|increase|decrease)/i,
  /(?:is|are|was|were|has|have|been|being)\s+(?:calculated|derived|based|prepared|presented|shown|stated|included|excluded|recognised|recognized)/i,
  /(?:in|for|during)\s+(?:accordance|compliance|conformity|line)\s+with/i,
  /^["""''](?:risk|management|discussion|analysis)/i,
];

/** Check if a label is clearly non-financial text that should be silently ignored */
function isNonFinancialLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed || trimmed.length < 2) return true;      // too short
  if (trimmed.length > 60) return true;                  // narrative sentence, not a data row
  if (/^[\d,.₹$£€¥%()\-]+$/.test(trimmed) && !/[a-zA-Z]/.test(trimmed)) return true; // pure number
  if (NON_FINANCIAL_LABELS.some((p) => p.test(trimmed))) return true;
  return false;
}

/** Check if a label looks like a plausible financial metric label */
function looksFinancial(label: string): boolean {
  return /(revenue|income|profit|loss|asset|liability|equity|debt|cash|expense|cost|margin|ratio|tax|ebit|pat|sales|turnover|depreciation|interest|dividend|reserve|surplus|borrowing|payable|receivable|inventory|investment|shareholder|fund|capital|goodwill|intangible|current|fixed|tangible|operating|financing|investing|capex|eps|earnings|comprehensive|adjusted|organic|service|mobile|fixed|group|total|net|gross|operating)/i.test(label);
}

// ── Build FundalystDataset from ImportedTable[] ─────────────────────────────

/**
 * Convert cleaned ImportedTable rows into a FundalystDataset.
 * Runs metric matching on each row's first-column label.
 */
function buildDatasetFromTables(
  tables: ImportedTable[],
  fileName: string,
  method: string,
  warnings: string[],
): FundalystDataset | null {
  if (!tables || tables.length === 0) {
    return null;
  }

  const allFacts: CanonicalFact[] = [];
  const uniquePeriods = new Set<string>();

  for (const table of tables) {
    const rows = table.cleanedRows.length > 0 ? table.cleanedRows : table.rows;

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      if (!row || row.length < 2) continue;

      const labelOriginal = row[0]?.trim() || '';
      if (!labelOriginal) continue;

      // Skip if first cell is purely numeric (subtotal / continuation row)
      if (/^[\d,.₹$£€¥%()\-]+$/.test(labelOriginal) && !/[a-zA-Z]/.test(labelOriginal)) {
        continue;
      }

      // Skip clearly non-financial labels silently (no warnings)
      if (isNonFinancialLabel(labelOriginal)) continue;

      // Find metric match
      const match = findBestMetricMatch(labelOriginal);
      const canonicalMetric = match?.canonical || 'unknown';
      const statement = (match?.statement as StatementType) || 'unknown';

      // Auto-skip: no match AND label doesn't look financial → skip silently
      if (!match && !looksFinancial(labelOriginal)) continue;
      if (match && match.confidence < 0.2 && !looksFinancial(labelOriginal)) continue;

      // Process value columns (columns 1..N)
      for (let colIdx = 1; colIdx < row.length; colIdx++) {
        const rawValue = row[colIdx]?.trim() || '';
        if (!rawValue) continue;

        const normalized = normalizeValue(rawValue);
        if (normalized.value === null) continue;

        const valueInOnes = convertToOnes(normalized.value, normalized.detectedUnit);

        const periodLabel = `Col ${colIdx}`;
        uniquePeriods.add(periodLabel);

        const fact: CanonicalFact = {
          sourceType: method === 'text' ? 'pdf-text' : 'ocr',
          statement,
          metric: canonicalMetric,
          canonicalMetric,
          labelOriginal,
          value: valueInOnes,
          periodLabel,
          currency: 'UNKNOWN',
          unit: 'ones',
          confidence: match?.confidence || 0.3,
          sourceRow: rowIdx,
          sourceColumn: colIdx,
          sourceTableId: table.id,
        };

        allFacts.push(fact);
      }

      // Warn about low-confidence mapping
      if (match && match.confidence < 0.6) {
        warnings.push(
          `Low confidence mapping: "${labelOriginal}" → ${canonicalMetric} (${Math.round(match.confidence * 100)}%)`,
        );
      }
      if (!match || match.canonical === 'unknown') {
        warnings.push(
          `Unrecognized metric: "${labelOriginal}". Consider adding it manually.`,
        );
      }
    }
  }

  // Detect missing important fields
  const present = new Set(allFacts.map((f) => f.canonicalMetric));
  const importantMetrics = [
    'revenue',
    'netProfit',
    'ebit',
    'totalAssets',
    'totalDebt',
    'equity',
    'currentAssets',
    'currentLiabilities',
    'inventory',
    'receivables',
    'payables',
    'cash',
    'operatingCashFlow',
    'interestExpense',
  ];
  const missingFields = importantMetrics.filter((m) => !present.has(m));

  return {
    id: `pdf-${Date.now()}`,
    sourceType: method === 'text' ? 'pdf-text' : 'ocr',
    companyName: undefined,
    currency: 'UNKNOWN',
    unit: 'ones',
    periods: Array.from(uniquePeriods),
    facts: allFacts,
    tables,
    warnings: [],
    missingFields,
    confidence: tables.length > 0 ? 0.5 : 0,
    createdAt: new Date().toISOString(),
    detectedStatementType: undefined,
    isConsolidated: undefined,
    periodType: 'unknown',
  };
}

// ── Helper: bridge OCR progress to PDF import progress ──────────────────────

function makeOcrCallback(
  emit: (stage: PdfImportStage, message: string, percent: number) => void,
): (p: OcrProgress) => void {
  return (p: OcrProgress) => {
    // Map OCR stages to PDF import stages
    let stage: PdfImportStage;
    switch (p.stage) {
      case 'reading':
        stage = 'extracting-text';
        break;
      case 'ocr':
      case 'tables':
        stage = 'parsing-tables';
        break;
      case 'mapping':
      case 'review':
      case 'done':
        stage = 'building-dataset';
        break;
      case 'error':
        stage = 'error';
        break;
      default:
        stage = 'extracting-text';
    }
    emit(stage, p.message, p.percent);
  };
}

// ── Convenience exports ─────────────────────────────────────────────────────

export { isOCRAvailable, isPDFAvailable } from './ocr';

/**
 * Get a human-readable status message about the PDF import pipeline.
 */
export function getPDFImportStatus(): {
  pdfjs: boolean;
  tesseract: boolean;
  message: string;
} {
  // We can't do async here, so return a sync status.
  // For real status, call isPDFAvailable() / isOCRAvailable().
  return {
    pdfjs: false,
    tesseract: false,
    message:
      'PDF import is BETA. Install dependencies:\n' +
      '  npm install pdfjs-dist      (text PDFs)\n' +
      '  npm install tesseract.js    (scanned PDFs)',
  };
}

/**
 * Quick summary of what the PDF import can do.
 */
export const PDF_IMPORT_BETA_NOTICE =
  'BETA — PDF import is experimental. Results should be reviewed before analysis. Install pdfjs-dist for text PDFs and/or tesseract.js for scanned PDFs.';
