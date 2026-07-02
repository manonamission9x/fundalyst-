/**
 * FUNDALYST — Grounded, local explanation engine (T14)
 *
 * Deterministic, **fully offline** natural-language generation grounded in the
 * user's own trace facts. No network calls, no external model — this honours the
 * non-negotiable privacy promise (see AGENTS.md) and "degrades gracefully
 * offline" because there is nothing to degrade: it runs entirely in-browser.
 *
 * Every sentence maps to a numbered citation that points back to a real source
 * row, so nothing is asserted that the trace does not already support. These are
 * pure functions — no side effects, no data mutation.
 */

import type { CalculationTrace, CalculationSource } from '@/lib/calculation-trace';

export interface GroundedCitation {
  ref: number;
  label: string;
  value: string;
  source: string;
}

export interface GroundedExplanation {
  /** One-paragraph explanation with inline [n] citation markers. */
  summary: string;
  citations: GroundedCitation[];
}

/** Join a list into readable prose: "a", "a and b", "a, b, and c". */
function humanJoin(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

function citationFor(source: CalculationSource, ref: number): GroundedCitation {
  const where = [source.source, source.period, source.location].filter(Boolean).join(' · ');
  return { ref, label: source.label, value: source.value, source: where || 'Manual input' };
}

/**
 * Explain a single calculation, grounded in its source rows. Each source becomes
 * a citation; the prose references them by [n].
 */
export function explainTrace(trace: CalculationTrace): GroundedExplanation {
  const citations = trace.sources.map((s, i) => citationFor(s, i + 1));
  const drivers = trace.sources.map((s, i) => `${s.label.toLowerCase()} of ${s.value} [${i + 1}]`);
  const body = drivers.length
    ? `It is derived from ${humanJoin(drivers)}.`
    : 'It was entered directly, with no upstream inputs.';
  const formula = trace.formula ? ` The method is: ${trace.formula}.` : '';
  const summary = `${trace.label} works out to ${trace.value}.${formula} ${body}`.trim();
  return { summary, citations };
}

/**
 * Draft an investment thesis from the available calculation traces. Every claim
 * carries an inline citation; the output is Markdown intended to *pre-fill* an
 * editable field — it is never auto-accepted or written to the model.
 */
export function draftThesisFromEvidence(inputs: {
  companyName: string;
  traces: CalculationTrace[];
  marginOfSafety?: number | null;
}): string {
  const { companyName, traces, marginOfSafety } = inputs;
  const lines: string[] = [];
  const name = companyName || 'The company';

  lines.push(`## Draft thesis — ${name}`);
  lines.push('');
  lines.push('_Generated locally from your accepted evidence. Edit freely; nothing here is saved until you save it._');
  lines.push('');

  // Lead with the valuation verdict when a DCF margin of safety is available.
  if (typeof marginOfSafety === 'number') {
    const stance =
      marginOfSafety > 15 ? 'appears undervalued' :
      marginOfSafety < -15 ? 'appears overvalued' :
      'appears roughly fairly valued';
    lines.push(
      `On a discounted-cash-flow basis, ${name} ${stance}, with a margin of safety of ` +
      `${marginOfSafety.toFixed(1)}% versus the current price.`,
    );
    lines.push('');
  }

  if (traces.length > 0) {
    lines.push('**Evidence:**');
    lines.push('');
    let ref = 0;
    for (const t of traces) {
      const srcRef = t.sources[0] ? ` [${(ref += 1)}]` : '';
      lines.push(`- **${t.label}:** ${t.value}${srcRef}`);
    }
    lines.push('');

    // Citation appendix, grounded in the first source of each trace.
    lines.push('**Sources:**');
    lines.push('');
    let cref = 0;
    for (const t of traces) {
      const s = t.sources[0];
      if (!s) continue;
      cref += 1;
      const where = [s.source, s.period, s.location].filter(Boolean).join(' · ');
      lines.push(`${cref}. ${s.label}: ${s.value} — ${where || 'Manual input'}`);
    }
    lines.push('');
  } else {
    lines.push('_No calculation traces are available yet. Run the analysis tools to ground this thesis in evidence._');
    lines.push('');
  }

  lines.push('**Risks & caveats:** _(add your own — where might the assumptions be wrong?)_');

  return lines.join('\n');
}
