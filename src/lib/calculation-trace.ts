import type { SpreadsheetRow } from '@/components/input/SpreadsheetInput';
import type { CanonicalFact, FundalystDataset } from '@/lib/importer/types';

export interface CalculationSource {
  label: string;
  value: string;
  source: string;
  period?: string;
  originalLabel?: string;
  rawValue?: string;
  confidence?: number;
  location?: string;
  capturedAt?: string;
  overridden?: boolean;
}

export interface CalculationTrace {
  label: string;
  value: string;
  formula: string;
  sources: CalculationSource[];
}

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'not provided';
  return typeof value === 'number' ? String(value) : value;
}

function parseRowValue(row?: SpreadsheetRow): number | null {
  const raw = row?.values[0]?.trim();
  if (!raw) return null;
  const parsed = Number(raw.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function valuesMatch(row?: SpreadsheetRow, fact?: CanonicalFact): boolean {
  const parsed = parseRowValue(row);
  if (parsed === null || !fact) return true;
  return Math.abs(parsed - fact.value) <= Math.max(0.0001, Math.abs(fact.value) * 0.0001);
}

export function findRow(rows: SpreadsheetRow[], labels: string[]): SpreadsheetRow | undefined {
  const wanted = new Set(labels.map(normalizeLabel));
  return rows.find((row) => wanted.has(normalizeLabel(row.metric)));
}

export function findTraceFact(
  dataset: FundalystDataset | null,
  metricKeys: string[],
): CanonicalFact | null {
  if (!dataset) return null;
  const wanted = new Set(metricKeys.map(normalizeLabel));
  const candidates = dataset.facts.filter((fact) => {
    const metric = normalizeLabel(fact.metric);
    const canonical = normalizeLabel(fact.canonicalMetric || '');
    const original = normalizeLabel(fact.labelOriginal);
    return wanted.has(metric) || wanted.has(canonical) || metricKeys.some((key) => original.includes(normalizeLabel(key)));
  });
  if (candidates.length === 0) return null;
  return candidates.reduce((best, fact) => (fact.confidence > best.confidence ? fact : best));
}

export function makeTraceSource(
  label: string,
  dataset: FundalystDataset | null,
  metricKeys: string[],
  row?: SpreadsheetRow,
  fallbackValue?: string | number | null,
): CalculationSource {
  const fact = findTraceFact(dataset, metricKeys);
  const rowValue = row?.values[0]?.trim();
  const displayValue = rowValue || formatValue(fallbackValue ?? fact?.value);
  const table = fact?.sourceTableId
    ? dataset?.tables?.find((t) => t.id === fact.sourceTableId)
    : undefined;

  if (fact && valuesMatch(row, fact)) {
    return {
      label,
      value: displayValue,
      source: `${dataset?.companyName || 'Imported dataset'} (${fact.sourceType})`,
      period: fact.periodLabel,
      originalLabel: fact.labelOriginal,
      rawValue: fact.rawValue !== undefined ? String(fact.rawValue) : undefined,
      confidence: fact.confidence,
      location: table
        ? `${table.sourceName}, row ${fact.sourceRow + 1}, col ${fact.sourceColumn + 1}`
        : `row ${fact.sourceRow + 1}, col ${fact.sourceColumn + 1}`,
      capturedAt: dataset?.createdAt,
      overridden: fact.userOverridden,
    };
  }

  return {
    label,
    value: displayValue,
    source: fact ? 'Manual override' : 'Manual input',
    period: fact?.periodLabel,
    originalLabel: fact?.labelOriginal,
    confidence: fact?.confidence,
    capturedAt: dataset?.createdAt,
    overridden: Boolean(fact),
  };
}
