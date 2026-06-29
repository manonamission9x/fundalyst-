/**
 * Screenshot import pipeline orchestrator.
 *
 * Coordinates the full flow:
 *   1. Image preprocessing (resize, enhance, sharpen)
 *   2. OCR via Tesseract.js
 *   3. Table structure detection
 *   4. Value extraction & confidence scoring
 *   5. Metric mapping
 *
 * All client-side. Feeds into the existing ImportReviewState flow.
 */

import { preprocessImage, estimateImageQuality } from './preprocessor';
import { detectTableStructure, type DetectedTable } from './table-finder';
import { extractValues, type ExtractionResult } from './value-extractor';
import type { FundalystDataset, MetricMapping, ImportReviewState, FileMetadata } from '../types';

// ── Public types ──

export type ScreenshotStage =
  | 'loading'
  | 'preprocessing'
  | 'ocr'
  | 'analyzing'
  | 'mapping'
  | 'review'
  | 'done'
  | 'error';

export interface ScreenshotProgress {
  stage: ScreenshotStage;
  message: string;
  percent: number;
}

export interface ScreenshotResult {
  /** Preprocessed image for review */
  imageDataUrl: string;
  /** Detected tables */
  tables: DetectedTable[];
  /** Extracted financial values */
  extraction: ExtractionResult;
  /** Warnings about the process */
  warnings: string[];
  /** Image quality assessment */
  quality: { score: number; label: string };
}

// ── Orchestrator ──

/**
 * Run the full screenshot import pipeline on a single image file.
 *
 * @param file - The image file (png, jpg, webp)
 * @param onProgress - Optional progress callback for UI
 * @returns Structured extraction result
 */
export async function processScreenshot(
  file: File,
  onProgress?: (p: ScreenshotProgress) => void,
): Promise<ScreenshotResult> {
  const emit = (stage: ScreenshotStage, message: string, percent: number) => {
    onProgress?.({ stage, message, percent });
  };

  const warnings: string[] = [];

  // ═══ Stage 1: Preprocess ═══
  emit('preprocessing', 'Preparing image for analysis…', 5);

  let preprocessed;
  try {
    preprocessed = await preprocessImage(file);
  } catch (err) {
    emit('error', 'Failed to process image', 0);
    throw new Error(
      `Could not process image: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
  }

  const quality = estimateImageQuality(preprocessed);
  if (quality.score < 0.4) {
    warnings.push(quality.label);
  }

  emit('preprocessing', 'Image ready', 15);

  // ═══ Stage 2: OCR ═══
  emit('ocr', 'Running text recognition…', 20);

  let tessModule: typeof import('tesseract.js');
  try {
    tessModule = await import('tesseract.js');
  } catch {
    emit('error', 'OCR library not available', 0);
    throw new Error(
      'Tesseract.js is required for screenshot import. Run: npm install tesseract.js',
    );
  }

  const Tesseract = (tessModule as typeof import('tesseract.js') & { default?: typeof import('tesseract.js') }).default || tessModule;

  let ocrText = '';
  try {
    const result = await Tesseract.recognize(preprocessed.blob, 'eng', {
      logger: (m: { jobId: string; progress: number; status: string; userJobId: string; workerId: string }) => {
        if (m.status === 'recognizing text') {
          const pct = 20 + Math.round(m.progress * 55);
          emit('ocr', `Reading text: ${Math.round(m.progress * 100)}%`, pct);
        }
      },
    });
    ocrText = result.data?.text || '';
  } catch (err) {
    emit('error', 'Text recognition failed', 0);
    throw new Error(
      `OCR failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
  }

  if (ocrText.trim().length < 20) {
    warnings.push(
      'Very little text was recognized. The image may be too blurry, dark, or may not contain financial data.',
    );
  }

  emit('analyzing', 'Detecting table structure…', 78);

  // ═══ Stage 3: Table detection ═══
  const detectedTables: DetectedTable[] = [];

  // Split OCR text into blocks (double blank lines likely separate tables/sections)
  const blocks = ocrText
    .split(/\n\s*\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  if (blocks.length === 0) {
    // Try the whole text as one block
    blocks.push(ocrText.trim());
  }

  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].split('\n').filter((l) => l.trim().length > 0).length < 2) {
      continue; // Skip single-line blocks
    }
    const table = detectTableStructure(blocks[i], `table-${i + 1}`);
    if (table.rows.length >= 2) {
      detectedTables.push(table);
    }
  }

  emit('mapping', 'Mapping values to known metrics…', 90);

  // ═══ Stage 4: Value extraction ═══
  const extraction = extractValues(detectedTables);

  // Add process-level warnings
  warnings.push(...extraction.warnings);

  // Add image quality note
  if (quality.score < 0.7) {
    warnings.push(quality.label);
  }

  // If BETA status note
  warnings.push(
    'Screenshot import is experimental. Please verify all extracted values before using in analysis.',
  );

  emit('done', 'Analysis complete', 100);

  return {
    imageDataUrl: preprocessed.dataUrl,
    tables: detectedTables,
    extraction,
    warnings,
    quality,
  };
}

/**
 * Convert a ScreenshotResult into an ImportReviewState compatible with
 * the existing Smart Import pipeline.
 */
export function screenshotResultToReviewState(
  result: ScreenshotResult,
  fileName: string,
): ImportReviewState {
  const { extraction } = result;

  // Build metric mappings
  const seenNames = new Set<string>();
  const mappings: MetricMapping[] = extraction.valueDetails
    .filter((v) => {
      if (seenNames.has(v.label)) return false;
      seenNames.add(v.label);
      return true;
    })
    .map((v) => ({
      originalLabel: v.label,
      canonicalMetric: v.metric,
      statement: extraction.statementType,
      confidence: v.confidence,
      userConfirmed: false,
      ignored: false,
    }));

  // Build metadata
  const metadata: FileMetadata = {
    company: extraction.companyName || null,
    currency: extraction.currency,
    unit: extraction.unit,
    periods: extraction.periods,
    statementTypes: [extraction.statementType],
    headerRowIndex: 0,
    metricColIndex: 0,
    valueColIndices: extraction.periods.map((_, i) => i + 1),
    periodLabels: extraction.periods,
    confidence: extraction.confidence,
  };

  // Build dataset
  const dataset: FundalystDataset = {
    id: 'ds_' + Date.now(),
    sourceType: 'ocr',
    companyName: extraction.companyName || undefined,
    currency: extraction.currency,
    unit: extraction.unit,
    periods: extraction.periods,
    facts: extraction.facts,
    tables: result.tables.map((dt) => ({
      id: dt.id,
      sourceName: fileName,
      rows: dt.rows.map((r) => r.cells.map((c) => c.text)),
      cleanedRows: dt.rows
        .filter((r) => !r.isHeader)
        .map((r) => r.cells.map((c) => c.text)),
      confidence: dt.confidence,
    })),
    warnings: result.warnings,
    missingFields: [],
    confidence: extraction.confidence,
    createdAt: new Date().toISOString(),
  };

  return {
    fileName,
    sourceType: 'ocr',
    metadata,
    rawFacts: extraction.facts,
    mappings,
    dataset,
    warnings: result.warnings,
  };
}
