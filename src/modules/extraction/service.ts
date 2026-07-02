/**
 * Extraction module — financial data extraction pipeline.
 *
 * Coordinates extraction from OCR text / PDF / spreadsheet sources
 * into normalized CanonicalFact structures.
 *
 * Phase 1: placeholder — schema only.
 * Phase 2+: actual extraction logic, table detection, validation.
 */

export type ExtractionStage =
  | "raw"
  | "cleaned"
  | "tables_detected"
  | "rows_validated"
  | "facts_normalized";

export interface ExtractionProgress {
  stage: ExtractionStage;
  percentComplete: number;
  message: string;
}
