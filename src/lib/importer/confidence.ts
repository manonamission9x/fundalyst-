/**
 * Confidence grouping for extracted financial data.
 *
 * Groups extracted values into three tiers so the review UI
 * can show the most reliable data first and flag uncertain values.
 */

export type ConfidenceTier = 'high' | 'medium' | 'low';

export interface ConfidenceResult {
  tier: ConfidenceTier;
  score: number;
  label: string;
}

/**
 * Classify a single extracted fact's confidence.
 *
 * Factors:
 *   - Metric match confidence (0-1 from alias engine)
 *   - Value plausibility (is the value in a realistic range?)
 *   - Has a valid numeric value (not null)
 *   - OCR extraction quality (if applicable)
 */
export function classifyConfidence(
  metricConfidence: number,
  hasValue: boolean,
  isPlausible: boolean,
  sourceType: string,
): ConfidenceResult {
  if (!hasValue) {
    return { tier: 'low', score: 0, label: 'No value extracted' };
  }

  // High confidence: good metric match + plausible value
  if (metricConfidence >= 0.7 && isPlausible) {
    return { tier: 'high', score: metricConfidence, label: 'High confidence' };
  }

  // Medium confidence: moderate match or plausible value
  if (metricConfidence >= 0.4 || isPlausible) {
    return { tier: 'medium', score: metricConfidence, label: 'Review recommended' };
  }

  // Low confidence: poor match or implausible value
  return { tier: 'low', score: metricConfidence, label: 'Manual verification required' };
}

/**
 * Count facts by confidence tier.
 */
export function countByTier(
  facts: { metric: string; labelOriginal: string; value: number; confidence: number }[],
): { high: number; medium: number; low: number; total: number } {
  let high = 0, medium = 0, low = 0;

  for (const f of facts) {
    if (f.metric === 'unknown') { low++; continue; }
    if (f.confidence >= 0.7) high++;
    else if (f.confidence >= 0.4) medium++;
    else low++;
  }

  return { high, medium, low, total: facts.length };
}

/**
 * Get a user-facing summary of extraction quality.
 */
export function getExtractionSummary(
  high: number,
  medium: number,
  low: number,
  total: number,
): { quality: 'good' | 'fair' | 'poor'; message: string } {
  if (total === 0) {
    return { quality: 'poor', message: 'No financial data was extracted from this document.' };
  }

  const pctHigh = high / total;
  const pctLow = low / total;

  if (pctHigh >= 0.7) {
    return {
      quality: 'good',
      message: `${high} of ${total} values extracted with high confidence. ${low} need review.`,
    };
  }

  if (pctLow <= 0.3) {
    return {
      quality: 'fair',
      message: `${high} high-confidence, ${medium} medium-confidence, ${low} low-confidence values. Review uncertain fields before confirming.`,
    };
  }

  return {
    quality: 'poor',
    message: `${low} of ${total} values have low confidence. Manual review strongly recommended.`,
  };
}
