/**
 * Normalize raw financial values from messy CSV/XLSX cells.
 * Handles Indian comma formats, currency symbols, brackets, units, and more.
 */

/** Result of normalizing a single cell value */
export interface NormalizedValue {
  /** Parsed number in base "ones" unit */
  value: number | null;
  /** Detected unit multiplier (e.g. "crores" for ₹1,234 Cr → 1,23,40,00,000) */
  detectedUnit: 'ones' | 'thousands' | 'lakhs' | 'crores' | 'millions' | 'billions';
  /** Whether this looks like a percentage */
  isPercentage: boolean;
}

/**
 * Detect whether a number string uses Indian comma format or International.
 * Indian: 1,23,456 (last comma at position len-4, preceding at len-7)
 * International: 123,456 (commas every 3 digits from right)
 */
function isIndianCommaFormat(s: string): boolean {
  const cleaned = s.replace(/^[₹$£€¥\s]*/, '').replace(/[₹$£€¥\s]*$/, '');
  const parts = cleaned.split('.');
  const intPart = parts[0];
  const commas = intPart.match(/,/g);
  if (!commas || commas.length < 2) return false;

  // Split by comma and check lengths from right
  const groups = intPart.split(',');
  const lastLen = groups[groups.length - 1].length;
  const secondLastLen = groups[groups.length - 2].length;

  // Indian format: last group is 3 digits, second-last is 2 digits, all earlier groups up to 3
  return lastLen === 3 && secondLastLen === 2;
}

/**
 * Parse a raw cell value into a normalized number.
 */
export function normalizeValue(raw: string | number | null | undefined): NormalizedValue {
  if (raw === null || raw === undefined || raw === '') {
    return { value: null, detectedUnit: 'ones', isPercentage: false };
  }

  let s = String(raw).trim();

  // Empty, dash, n/a, nil → null
  if (!s || s === '-' || s === '--' || s === '—' || s === 'N.A.' || s === 'N.A' || s === 'NA' || s === 'n.a.' || s === 'na' || s === 'Nil' || s === 'nil' || s === 'NIL' || s === 'N/A' || s === 'n/a') {
    return { value: null, detectedUnit: 'ones', isPercentage: false };
  }

  // Detect percentage (ends with %)
  const isPercentage = s.includes('%');

  // Remove percentage sign
  s = s.replace(/%/g, '').trim();

  // Detect and remove currency symbols
  s = s.replace(/[₹$£€¥]/g, '').trim();
  s = s.replace(/^Rs\.?\s*/i, '').trim();
  s = s.replace(/^INR\s*/i, '').trim();

  // Handle brackets as negatives: (123.4)
  const bracketNegMatch = s.match(/^\(([\d,.\s]+)\)$/);
  if (bracketNegMatch) {
    s = '-' + bracketNegMatch[1];
  }

  // Detect unit suffixes: Cr, Cr., Crore, L, Lakh, Lacs, Mn, M, Bn, B, K, Thousand, Millions, Billions
  let detectedUnit: NormalizedValue['detectedUnit'] = 'ones';
  const unitMatch = s.match(/\s*(Cr\.?|Crore|Crores|Lakhs?|Lacs?|Mn|M(?![a-zA-Z])|Bn|B(?![a-zA-Z])|K|Thousand|Thousands|Millions?|Billions?|Trillions?)\s*$/i);
  if (unitMatch) {
    const unitStr = unitMatch[1].toLowerCase();
    if (unitStr.startsWith('cr')) detectedUnit = 'crores';
    else if (unitStr.startsWith('la') || unitStr.startsWith('lac')) detectedUnit = 'lakhs';
    else if (unitStr === 'mn' || unitStr.startsWith('million')) detectedUnit = 'millions';
    else if (unitStr === 'bn' || unitStr.startsWith('billion') || unitStr === 'b') detectedUnit = 'billions';
    else if (unitStr === 'k' || unitStr.startsWith('thousand')) detectedUnit = 'thousands';
    s = s.replace(unitMatch[0], '').trim();
  }

  // Remove all remaining non-numeric chars except minus, decimal point, and commas
  s = s.replace(/[^\d,.\-]/g, '').trim();

  if (!s || s === '-' || s === '.') {
    return { value: null, detectedUnit: 'ones', isPercentage: false };
  }

  // Handle commas
  let normalized: string;
  if (s.includes(',')) {
    if (isIndianCommaFormat(s)) {
      // Indian: 1,23,456 → 123456
      normalized = s.replace(/,/g, '');
    } else {
      // International: 123,456 → 123456
      normalized = s.replace(/,/g, '');
    }
  } else {
    normalized = s;
  }

  const num = parseFloat(normalized);
  if (isNaN(num)) {
    return { value: null, detectedUnit: 'ones', isPercentage: false };
  }

  return {
    value: num,
    detectedUnit,
    isPercentage,
  };
}

/**
 * Convert a value from its detected unit to base "ones".
 * E.g. 12.34 crores → 123400000
 */
export function convertToOnes(value: number, unit: string): number {
  switch (unit) {
    case 'crores': return value * 1e7;
    case 'lakhs': return value * 1e5;
    case 'millions': return value * 1e6;
    case 'billions': return value * 1e9;
    case 'thousands': return value * 1e3;
    default: return value;
  }
}

/**
 * Try to detect the unit used by values in a column.
 * Returns the most common unit found.
 */
export function detectColumnUnit(values: (string | number | null | undefined)[]): {
  unit: NormalizedValue['detectedUnit'];
  confidence: number;
} {
  const counts: Record<string, number> = {};
  let total = 0;

  for (const v of values) {
    const result = normalizeValue(v);
    if (result.value !== null) {
      counts[result.detectedUnit] = (counts[result.detectedUnit] || 0) + 1;
      total++;
    }
  }

  if (total === 0) return { unit: 'ones', confidence: 0 };

  let bestUnit: NormalizedValue['detectedUnit'] = 'ones';
  let bestCount = 0;
  for (const [unit, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      bestUnit = unit as NormalizedValue['detectedUnit'];
    }
  }

  return { unit: bestUnit, confidence: bestCount / total };
}

/**
 * Format a "ones" value back to a readable Indian format.
 */
export function formatIndianValue(value: number): string {
  if (value === 0) return '₹0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';

  if (abs >= 1e7) return sign + '₹' + (abs / 1e7).toFixed(2) + ' Cr';
  if (abs >= 1e5) return sign + '₹' + (abs / 1e5).toFixed(2) + ' L';
  return sign + '₹' + abs.toLocaleString('en-IN');
}
