import * as XLSX from 'xlsx';
import type { RawRow, FundalystDataset, CanonicalFact, FileMetadata, ImportReviewState, MetricMapping, SourceType, StatementType } from './types';
import { detectMetadata } from './detector';
import { normalizeValue, convertToOnes } from './normalizer';
import { findBestMetricMatch } from './metric-aliases';
import { parseCsvWithDetection } from './csv-detector';

// ── Parse raw file content into rows ──

/** Parse CSV text into RawRow[] */
export function parseCSVToRows(text: string): RawRow[] {
  const rows = parseCsvWithDetection(text);
  return rows.map((cells, i) => ({ rowIndex: i, cells }));
}

/** Parse a single CSV line respecting quoted fields */
export function parseXLSXToRows(buffer: ArrayBuffer): RawRow[] {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1 });

  const rows: RawRow[] = [];
  for (let i = 0; i < json.length; i++) {
    const row = json[i];
    if (!row || row.length === 0) continue;
    const cells = row.map((cell) => {
      if (cell === null || cell === undefined) return '';
      return String(cell).trim();
    });
    // Skip completely empty rows
    if (cells.every((c) => !c)) continue;
    rows.push({ rowIndex: i, cells });
  }

  return rows;
}

// ── Read file to RawRow[] ──

export async function readFileToRows(file: File): Promise<RawRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    return parseXLSXToRows(buffer);
  }
  const text = await file.text();
  return parseCSVToRows(text);
}

// ── Convert raw rows + metadata to CanonicalFact[] ──

export function rowsToFacts(
  rows: RawRow[],
  metadata: FileMetadata,
  sourceType: SourceType
): { facts: CanonicalFact[]; warnings: string[] } {
  const facts: CanonicalFact[] = [];
  const warnings: string[] = [];

  const dataRows = rows.slice(metadata.headerRowIndex + 1);

  for (const row of dataRows) {
    // Skip rows that are clearly notes/headers
    const firstCell = row.cells[0]?.toLowerCase().trim() || '';
    if (!firstCell || firstCell.startsWith('note') || firstCell.startsWith('refer') || firstCell.startsWith('source') || firstCell === '') {
      continue;
    }
    // Skip numeric-only first cells (subtotals)
    if (/^[\d,.\-₹$£€¥%()]+$/.test(firstCell) && !/[a-zA-Z]/.test(firstCell)) {
      continue;
    }

    const labelOriginal = row.cells[metadata.metricColIndex]?.trim() || '';

    if (!labelOriginal) continue;

    // Find metric match
    const match = findBestMetricMatch(labelOriginal);

    for (let j = 0; j < metadata.valueColIndices.length; j++) {
      const colIdx = metadata.valueColIndices[j];
      const rawValue = row.cells[colIdx] || '';
      const normalized = normalizeValue(rawValue);

      if (normalized.value === null) continue;

      // Convert to base "ones" unit
      const valueInOnes = convertToOnes(normalized.value, normalized.detectedUnit);

      const fact: CanonicalFact = {
        company: metadata.company || undefined,
        sourceType,
        statement: match?.statement as StatementType || 'unknown',
        metric: match?.canonical || 'unknown',
        labelOriginal,
        value: valueInOnes,
        periodLabel: metadata.periodLabels[j] || `Col ${j + 1}`,
        currency: metadata.currency,
        unit: metadata.unit,
        confidence: match?.confidence || 0,
        sourceRow: row.rowIndex,
        sourceColumn: colIdx,
      };

      facts.push(fact);
    }

    // Warn if metric confidence is low
    if (match && match.confidence < 0.6) {
      warnings.push(`Low confidence mapping: "${labelOriginal}" → ${match.canonical} (${Math.round(match.confidence * 100)}%)`);
    }
    if (!match) {
      warnings.push(`Unrecognized metric: "${labelOriginal}". Consider adding it manually.`);
    }
  }

  return { facts, warnings };
}

// ── Build final FundalystDataset ──

export function buildDataset(
  facts: CanonicalFact[],
  metadata: FileMetadata,
  companyOverride?: string
): FundalystDataset {
  // Detect missing fields
  const present = new Set(facts.map((f) => f.metric));
  const importantMetrics = [
    'revenue', 'netProfit', 'ebit', 'totalAssets', 'totalDebt', 'equity',
    'currentAssets', 'currentLiabilities', 'inventory', 'receivables', 'payables',
    'cash', 'operatingCashFlow', 'interestExpense',
  ];
  const missingFields = importantMetrics.filter((m) => !present.has(m));

  const periods = [...new Set(facts.map((f) => f.periodLabel))];
  const confidence = facts.length > 0
    ? facts.reduce((s, f) => s + f.confidence, 0) / facts.length
    : 0;

  return {
    id: 'ds_' + Date.now(),
    sourceType: metadata.currency === 'UNKNOWN' ? 'csv' as const : 'csv' as const,
    companyName: companyOverride || metadata.company || undefined,
    currency: metadata.currency,
    unit: metadata.unit,
    periods,
    facts,
    warnings: [],
    missingFields,
    confidence: Math.round(confidence * 100) / 100,
    createdAt: new Date().toISOString(),
  };
}

// ── OCR/PDF review state builder ──

async function buildOcrReviewState(file: File, isPdf: boolean): Promise<ImportReviewState> {
  const sourceType: SourceType = isPdf ? 'pdf-text' : 'ocr';

  if (isPdf) {
    // PDF text extraction — use existing pipeline
    const { importPdf } = await import('./pdf-importer');
    const ocrResult = await importPdf(file, undefined, 'text');

    // Build facts from tables
    const facts: CanonicalFact[] = [];
    const warnings: string[] = ocrResult.warnings || [];
    let companyName: string | undefined;

    for (const table of ocrResult.tables || []) {
      // Use cleanedRows (filtered by cleanOcrText) instead of raw rows
      const sourceRows = (table.cleanedRows && table.cleanedRows.length > 0)
        ? table.cleanedRows
        : (table.rows || []).slice(1); // fallback: skip header row

      // Detect period labels from the table's header-like content
      // Look at the first data row's cells to determine how many value columns exist
      let maxColumns = 0;
      for (const row of sourceRows) {
        if (row && row.length > maxColumns) maxColumns = row.length;
      }
      const periodCount = Math.max(0, maxColumns - 1); // columns after the label

      for (let ri = 0; ri < sourceRows.length; ri++) {
        const row = sourceRows[ri];
        if (!row || row.length < 2) continue;
        const label = row[0]?.trim();
        if (!label) continue;
        // Skip rows that are purely numeric (subtotals, continuation rows)
        if (/^[\d,.₹$£€¥%()\-]+$/.test(label) && !/[a-zA-Z]/.test(label)) continue;
        // Skip rows shorter than 3 chars (likely noise)
        if (label.length < 3) continue;

        // Generate one fact per value column with proper period label
        for (let colIdx = 1; colIdx < row.length; colIdx++) {
          const rawValue = row[colIdx]?.trim() || '';
          if (!rawValue) continue;
          const value = parseFloat(rawValue.replace(/[^0-9.-]/g, ''));
          if (isNaN(value)) continue;

          const { findBestMetricMatch } = await import('./metric-aliases');
          const match = findBestMetricMatch(label);
          // Auto-ignore: skip facts where metric match is null or very low confidence
          // and the label doesn't look like a financial term
          const isFinancialTerm = /(revenue|income|profit|loss|asset|liability|equity|debt|cash|expense|cost|margin|ratio|tax|ebit|pat|sales|turnover|depreciation|interest|dividend|reserve|surplus|borrowing|payable|receivable|inventory|investment|shareholder|fund|capital|goodwill|intangible|current|fixed|tangible|operating|financing|investing|capex|eps|earnings|comprehensive)/i.test(label);
          if (!match && !isFinancialTerm) continue;
          if (match && match.confidence < 0.2 && !isFinancialTerm) continue;

          const periodLabel = periodCount > 1 ? `Period ${colIdx}` : 'Period 1';
          facts.push({
            company: companyName,
            sourceType,
            statement: (match?.statement as StatementType) || 'unknown',
            metric: match?.canonical || 'unknown',
            labelOriginal: label,
            value,
            periodLabel,
            currency: 'UNKNOWN',
            unit: 'ones',
            confidence: (match?.confidence ?? 0.3),
            sourceRow: ri,
            sourceColumn: colIdx,
          });
        }
      }
    }

    const presentMetrics = new Set(facts.map((f) => f.metric));
    const importantMetrics = [
      'revenue', 'netProfit', 'ebit', 'totalAssets', 'totalDebt', 'equity',
      'currentAssets', 'currentLiabilities', 'inventory', 'receivables', 'payables',
      'cash', 'operatingCashFlow', 'interestExpense',
    ];
    const missingFields = importantMetrics.filter((m) => !presentMetrics.has(m));

    const dataset: FundalystDataset = {
      id: 'ds_' + Date.now(),
      sourceType,
      companyName,
      currency: 'UNKNOWN',
      unit: 'ones',
      periods: ['Period 1'],
      facts,
      tables: ocrResult.tables || [],
      warnings,
      missingFields,
      confidence: facts.length > 0
        ? Math.round(facts.reduce((s, f) => s + f.confidence, 0) / facts.length * 100) / 100
        : 0,
      createdAt: new Date().toISOString(),
    };

    const mappings = facts
      .filter((f, i, arr) => arr.findIndex((x) => x.labelOriginal === f.labelOriginal) === i)
      .map((f) => ({
        originalLabel: f.labelOriginal,
        canonicalMetric: f.metric,
        statement: f.statement,
        confidence: f.confidence,
        userConfirmed: false,
        ignored: f.confidence < 0.3 && !/(revenue|income|profit|loss|asset|liability|equity|debt|cash|expense|cost|margin|ratio|tax|ebit|pat|sales|turnover|depreciation|interest|dividend|reserve|surplus|borrowing|payable|receivable|inventory|investment|shareholder|fund|capital|goodwill|intangible|current|fixed|tangible|operating|financing|investing|capex|eps|earnings|comprehensive)/i.test(f.metric),
      }));

    warnings.push('[PDF BETA] Results are experimental. Please review all mappings before confirming.');

    return {
      fileName: file.name,
      sourceType,
      metadata: {
        company: companyName || null,
        currency: 'UNKNOWN',
        unit: 'ones',
        periods: ['Period 1'],
        statementTypes: ['unknown'],
        headerRowIndex: 0,
        metricColIndex: 0,
        valueColIndices: [1],
        periodLabels: ['Period 1'],
        confidence: dataset.confidence,
      },
      rawFacts: facts,
      mappings,
      dataset,
      warnings,
    };
  }

  // ═══ Image / Screenshot — use new production-grade pipeline ═══
  const { processScreenshot, screenshotResultToReviewState } =
    await import('./screenshot/pipeline');

  const result = await processScreenshot(file);
  return screenshotResultToReviewState(result, file.name);
}

// ── Build initial review state from file ──

export async function buildReviewState(file: File): Promise<ImportReviewState> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
  const isImage = imageExts.includes(ext);
  const isPdf = ext === 'pdf';

  // Reject unsupported file types early with a clear message
  const supported = ['csv', 'tsv', 'txt', 'xlsx', 'xls', ...imageExts, 'pdf'];
  if (!supported.includes(ext)) {
    throw new Error(
      `Unsupported file type: .${ext}. Supported formats: ${supported.filter((e) => !imageExts.includes(e)).join(', ')}, and images (${imageExts.join(', ')}).`,
    );
  }

  // Route images to OCR pipeline
  if (isImage || isPdf) {
    return buildOcrReviewState(file, isPdf);
  }

  const sourceType: SourceType = (ext === 'xlsx' || ext === 'xls') ? 'xlsx' : 'csv';
  const rows = await readFileToRows(file);
  if (rows.length === 0) {
    return {
      fileName: file.name,
      sourceType,
      metadata: {
        company: null, currency: 'UNKNOWN', unit: 'ones',
        periods: [], statementTypes: ['unknown'],
        headerRowIndex: 0, metricColIndex: 0,
        valueColIndices: [], periodLabels: [],
        confidence: 0,
      },
      rawFacts: [],
      mappings: [],
      dataset: null,
      warnings: ['File is empty or could not be parsed.'],
    };
  }

  const metadata = detectMetadata(rows);
  const { facts, warnings } = rowsToFacts(rows, metadata, sourceType);

  // Build initial mappings (all unconfirmed)
  const seen = new Set<string>();
  const mappings: MetricMapping[] = [];
  for (const fact of facts) {
    const key = fact.labelOriginal;
    if (!seen.has(key)) {
      seen.add(key);
      mappings.push({
        originalLabel: fact.labelOriginal,
        canonicalMetric: fact.metric,
        statement: fact.statement,
        confidence: fact.confidence,
        userConfirmed: false,
        ignored: false,
      });
    }
  }

  // Sort by certainty (unknowns last)
  mappings.sort((a, b) => {
    if (a.canonicalMetric === 'unknown' && b.canonicalMetric !== 'unknown') return 1;
    if (a.canonicalMetric !== 'unknown' && b.canonicalMetric === 'unknown') return -1;
    return b.confidence - a.confidence;
  });

  const dataset = buildDataset(facts, metadata);

  return {
    fileName: file.name,
    sourceType,
    metadata,
    rawFacts: facts,
    mappings,
    dataset,
    warnings,
  };
}

// ── Apply user corrections to mappings and rebuild dataset ──

export function applyMappingOverrides(
  review: ImportReviewState,
  updatedMappings: MetricMapping[]
): FundalystDataset {
  // Build a map from original label to the chosen canonical metric
  const labelToMetric = new Map<string, { canonical: string; statement: string }>();
  for (const m of updatedMappings) {
    if (!m.ignored) {
      labelToMetric.set(m.originalLabel, {
        canonical: m.userOverride || m.canonicalMetric,
        statement: m.statement,
      });
    }
  }

  // Rebuild facts with updated mappings
  const updatedFacts = review.rawFacts.filter((f) => {
    const mapping = updatedMappings.find((m) => m.originalLabel === f.labelOriginal);
    return !mapping?.ignored;
  }).map((f) => {
    const override = labelToMetric.get(f.labelOriginal);
    if (override) {
      return {
        ...f,
        metric: override.canonical,
        statement: override.statement as StatementType,
      };
    }
    return f;
  });

  return buildDataset(updatedFacts, review.metadata);
}
