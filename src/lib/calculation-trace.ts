import type { SpreadsheetRow } from '@/components/input/SpreadsheetInput';
import type { CanonicalFact, FundalystDataset } from '@/lib/importer/types';
import type { ProvenanceSource, ProvenanceKind } from '@/types/financial';

export interface CalculationSource {
  factId?: string;
  label: string;
  value: string;
  source: string;
  metric?: string;
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

export function getCanonicalFactId(fact: CanonicalFact, dataset?: FundalystDataset | null): string {
  return [
    dataset?.id || fact.company || '',
    fact.metric || fact.canonicalMetric || '',
    fact.periodLabel || '',
    fact.sourceTableId || '',
    fact.sourceRow,
    fact.sourceColumn,
  ].join('::');
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
      factId: getCanonicalFactId(fact, dataset),
      label,
      value: displayValue,
      source: `${dataset?.companyName || 'Imported dataset'} (${fact.sourceType})`,
      metric: fact.metric || fact.canonicalMetric,
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
    factId: fact ? getCanonicalFactId(fact, dataset) : undefined,
    label,
    value: displayValue,
    source: fact ? 'Manual override' : 'Manual input',
    metric: fact?.metric || fact?.canonicalMetric,
    period: fact?.periodLabel,
    originalLabel: fact?.labelOriginal,
    confidence: fact?.confidence,
    capturedAt: dataset?.createdAt,
    overridden: Boolean(fact),
  };
}

// ── Provenance Helpers ──

/**
 * Map a canonical fact to a ProvenanceSource for provenance labeling.
 */
export function factToProvenance(fact: CanonicalFact | null, dataset?: FundalystDataset | null): ProvenanceSource {
  if (!fact) {
    return { kind: 'unavailable', label: '', value: null };
  }

  let kind: ProvenanceKind;
  if (fact.userOverridden) {
    kind = 'manual';
  } else if (fact.sourceType === 'manual' || fact.sourceType === 'sample') {
    kind = 'manual';
  } else {
    kind = 'imported';
  }

  return {
    kind,
    label: fact.labelOriginal || fact.metric,
    value: fact.value,
    period: fact.periodLabel,
    sourceLabel: dataset ? `${dataset.companyName || 'Unknown'} (${fact.sourceType})` : undefined,
    confidence: fact.confidence,
    overridden: fact.userOverridden,
    capturedAt: dataset?.createdAt,
  };
}

/**
 * Create a provenance label for a manually-entered or defaulted value.
 */
export function makeProvenance(
  kind: ProvenanceKind,
  label: string,
  value: string | number | null,
  options?: {
    period?: string;
    sourceLabel?: string;
    confidence?: number;
    overridden?: boolean;
    capturedAt?: string;
  },
): ProvenanceSource {
  return {
    kind,
    label,
    value,
    period: options?.period,
    sourceLabel: options?.sourceLabel,
    confidence: options?.confidence,
    overridden: options?.overridden,
    capturedAt: options?.capturedAt,
  };
}

/**
 * Return a human-readable label for a provenance kind.
 */
export function provenanceKindLabel(kind: ProvenanceKind): string {
  const labels: Record<ProvenanceKind, string> = {
    imported: 'Imported from filing/document',
    manual: 'Manually entered',
    default: 'Default/assumed value',
    inferred: 'Inferred from other values',
    unavailable: 'Not available',
  };
  return labels[kind] || kind;
}
