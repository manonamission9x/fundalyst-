/**
 * Canonical Model Helpers
 *
 * Convert between SpreadsheetInput rows and FundalystDataset (canonical model).
 * This is how manual data entry feeds into the single source of truth.
 */

import type { FundalystDataset, CanonicalFact } from '@/lib/importer/types';
import type { SpreadsheetRow } from '@/components/input';
import { generateDatasetId, useGlobalDataStore } from './global-data-store';

/**
 * Convert spreadsheet rows + periods into a canonical FundalystDataset.
 * Each period becomes a set of facts with confidence=1.0 (manual entry).
 */
export function spreadsheetToDataset(
  rows: SpreadsheetRow[],
  periods: string[],
  companyName?: string,
): FundalystDataset {
  const facts: CanonicalFact[] = [];

  for (const row of rows) {
    if (!row.metric || row.values.every((v) => !v.trim())) continue;

    const canonicalKey = row.metric
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    for (let pi = 0; pi < periods.length; pi++) {
      const rawVal = row.values[pi]?.trim();
      if (!rawVal) continue;

      const numVal = parseFloat(rawVal.replace(/,/g, ''));
      if (isNaN(numVal)) continue;

      facts.push({
        company: companyName,
        sourceType: 'manual',
        statement: 'mixed',
        metric: canonicalKey,
        canonicalMetric: canonicalKey,
        labelOriginal: row.metric,
        value: numVal,
        periodLabel: periods[pi],
        currency: 'INR',
        unit: 'crores',
        confidence: 1.0,
        sourceRow: pi,
        sourceColumn: pi,
      });
    }
  }

  return {
    id: generateDatasetId(),
    sourceType: 'manual',
    companyName: companyName || 'Unnamed Company',
    currency: 'INR',
    unit: 'crores',
    periods: [...periods],
    facts,
    warnings: [],
    missingFields: [],
    confidence: 1.0,
    createdAt: new Date().toISOString(),
    detectedStatementType: 'mixed',
    periodType: 'unknown',
  };
}

/**
 * Write spreadsheet data to the global data store.
 * This is the single entry point for manual data entry.
 */
export function writeSpreadsheetToModel(
  rows: SpreadsheetRow[],
  periods: string[],
  companyName?: string,
): void {
  const dataset = spreadsheetToDataset(rows, periods, companyName);
  useGlobalDataStore.getState().addDataset(dataset);
}
