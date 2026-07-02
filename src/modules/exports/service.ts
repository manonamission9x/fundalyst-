/**
 * Exports module — workspace data export to various formats.
 *
 * Phase 1: placeholder — schema only.
 * Phase 2+: Markdown memo export, Excel export, PDF report.
 */

export type ExportFormat = "markdown" | "excel" | "pdf" | "csv";

export interface ExportRequest {
  workspaceId: string;
  format: ExportFormat;
  includeStatements?: boolean;
  includeDCF?: boolean;
  includeRatios?: boolean;
  includeCharts?: boolean;
}

export interface ExportResult {
  format: ExportFormat;
  fileKey: string; // storage key or local path
  fileName: string;
  sizeBytes: number;
  generatedAt: string;
}
