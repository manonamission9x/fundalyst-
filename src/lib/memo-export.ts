/**
 * FUNDALYST — Investment Memo Export Engine
 *
 * Generates structured investment memos from company data, thesis,
 * financial analysis outputs, and source provenance metadata.
 *
 * Pure functions — no side effects, no DOM dependencies.
 */

import type {
  MemoExport,
  MemoSection,
  MemoSummary,
  MemoProvenance,
  MemoProvenanceKind,
  DCFResult,
  RatioResult,
  DiffResult,
  RiskFlag,
  InstitutionalResult,
  InstitutionalMetric,
  FilingAnalysis,
  ProvenanceSource,
  ProvenanceKind,
} from '@/types/financial';
import type { FundalystDataset } from '@/lib/importer/types';

// ── Helpers ──

import { fmtINR, fmtPct, fmtNum } from '@/lib/format';

let _memoCounter = 0;

function makeMemoId(): string {
  _memoCounter++;
  return `memo_${Date.now()}_${_memoCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function mapKind(kind: ProvenanceKind): MemoProvenanceKind {
  if (kind === 'default') return 'assumed';
  if (kind === 'unavailable') return 'assumed';
  return kind as MemoProvenanceKind;
}

function provItem(label: string, value: string | number, kind: MemoProvenanceKind): MemoProvenance {
  return { label, value: String(value), kind };
}

// ── Section Builders ──

/** Build the Company Overview section */
function buildCompanySection(
  companyName: string,
  dataset: FundalystDataset | null,
  thesis?: string,
): MemoSection {
  const subsections: MemoSection['subsections'] = [];

  // Company Profile
  const profileProvenance: MemoProvenance[] = [];
  if (dataset) {
    const srcKind: MemoProvenanceKind = dataset.sourceType === 'manual' ? 'manual' : 'imported';
    profileProvenance.push(provItem('Company Name', dataset.companyName || companyName, srcKind));
    profileProvenance.push(provItem('Data Source', dataset.sourceType, srcKind));
    profileProvenance.push(provItem('Periods', dataset.periods.join(', '), srcKind));
    profileProvenance.push(provItem('Facts Imported', dataset.facts.length, srcKind));
    profileProvenance.push(provItem('Data Confidence', (dataset.confidence * 100).toFixed(0) + '%', srcKind));
  }

  subsections.push({
    heading: 'Company Profile',
    body: [
      `**Company:** ${companyName}`,
      dataset ? `**Source:** ${dataset.sourceType.toUpperCase()} — ${dataset.companyName || companyName}` : '**Source:** Manual entry',
      dataset ? `**Periods:** ${dataset.periods.join(', ')}` : '',
      dataset ? `**Facts Imported:** ${dataset.facts.length}` : '',
      dataset ? `**Overall Confidence:** ${(dataset.confidence * 100).toFixed(0)}%` : '',
      dataset?.createdAt ? `**Data Captured:** ${new Date(dataset.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}` : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
    provenance: profileProvenance.length > 0 ? profileProvenance : undefined,
  });

  // Investment Thesis
  if (thesis) {
    subsections.push({
      heading: 'Investment Thesis',
      body: thesis,
      provenance: [provItem('Thesis', 'User provided', 'manual')],
    });
  }

  return {
    title: 'Company Overview',
    subsections,
  };
}

/** Build the Filing Comparison section */
function buildFilingSection(
  diffs: DiffResult[],
  flags: RiskFlag[],
  filingAnalysis?: FilingAnalysis,
): MemoSection | null {
  if (diffs.length === 0 && flags.length === 0) return null;

  const subsections: MemoSection['subsections'] = [];

  // Material Changes
  const materialDiffs = diffs
    .filter((d) => d.pct !== null && Math.abs(d.pct) > 5)
    .slice(0, 20);

  if (materialDiffs.length > 0) {
    const rows = materialDiffs.map((d) => {
      const direction = d.dir === 'up' ? '↑ Increased' : d.dir === 'down' ? '↓ Decreased' : '→ Stable';
      return `| ${d.label} | ${fmtINR(d.a)} → ${fmtINR(d.b)} | ${fmtPct(d.pct)} | ${direction} |`;
    });

    subsections.push({
      heading: 'Material Period-over-Period Changes',
      body: [
        '| Metric | Change | % Change | Direction |',
        '|--------|--------|----------|-----------|',
        ...rows,
      ].join('\n'),
      provenance: materialDiffs.map((d) =>
        provItem(d.label, `${fmtINR(d.a)} → ${fmtINR(d.b)} (${fmtPct(d.pct)})`, 'computed'),
      ),
    });
  }

  // Risk Flags
  if (flags.length > 0) {
    subsections.push({
      heading: 'Risk Flags',
      body: flags
        .map((f) => {
          // Reuse the in-app RiskFlag vocabulary (level: 'danger' | 'warn'),
          // surfaced as reader-facing severity tags. No emoji (§7/§3).
          const severity = f.level === 'danger' ? 'CRITICAL' : 'WATCH';
          return `- **${severity}** · **${f.label}:** ${f.text}`;
        })
        .join('\n'),
      provenance: flags.map((f) => provItem(f.label, f.text, 'computed')),
    });
  }

  // Filing metadata
  if (filingAnalysis) {
    subsections.push({
      heading: 'Comparison Periods',
      body: filingAnalysis.labels || 'No period labels available',
      provenance: [provItem('Periods', filingAnalysis.labels || 'N/A', 'manual')],
    });
  }

  return {
    title: 'Period-over-Period Comparison',
    subsections,
  };
}

/** Build the Ratio Analysis section */
function buildRatiosSection(ratios: RatioResult[]): MemoSection | null {
  if (ratios.length === 0) return null;

  const bySection: Record<string, RatioResult[]> = {};
  for (const r of ratios) {
    if (!bySection[r.section]) bySection[r.section] = [];
    bySection[r.section].push(r);
  }

  const subsections: MemoSection['subsections'] = [];
  const sectionOrder = ['Liquidity', 'Leverage', 'Profitability', 'Efficiency'];

  for (const section of sectionOrder) {
    const items = bySection[section];
    if (!items || items.length === 0) continue;

    const rows = items.map((r) => {
      const status = r.cls === 'good' ? 'GOOD' : r.cls === 'warn' ? 'WARN' : 'NEUTRAL';
      return `| ${r.label} | ${r.value} | ${status} |`;
    });

    subsections.push({
      heading: section,
      body: ['| Metric | Value | Status |', '|--------|-------|--------|', ...rows].join('\n'),
      provenance: items.map((r) =>
        provItem(r.label, r.value, r.cls === 'good' ? 'computed' : 'computed'),
      ),
    });
  }

  return {
    title: 'Financial Ratios',
    subsections,
  };
}

/** Build the DCF Valuation section */
function buildDCFSection(
  dcfResult: DCFResult | null,
  dcfInputs?: {
    fcf: number;
    growth: number;
    years: number;
    discount: number;
    terminal: number;
    netDebt: number;
    shares: number;
    price: number;
  },
  provenanceMap?: Record<string, ProvenanceSource>,
): MemoSection | null {
  if (!dcfResult && !dcfInputs) return null;

  const subsections: MemoSection['subsections'] = [];
  const prov = (key: string): MemoProvenance[] => {
    if (!provenanceMap?.[key]) return [];
    const p = provenanceMap[key];
    return [provItem(p.label, String(p.value ?? ''), mapKind(p.kind))];
  };

  // Input Assumptions
  if (dcfInputs) {
    subsections.push({
      heading: 'Assumptions',
      body: [
        `| Parameter | Value |`,
        `|-----------|-------|`,
        `| Free Cash Flow (base) | ${fmtINR(dcfInputs.fcf)} |`,
        `| Growth Rate | ${dcfInputs.growth}% |`,
        `| Projection Years | ${dcfInputs.years} |`,
        `| Discount Rate (WACC) | ${dcfInputs.discount}% |`,
        `| Terminal Growth Rate | ${dcfInputs.terminal}% |`,
        `| Net Debt | ${fmtINR(dcfInputs.netDebt)} |`,
        `| Shares Outstanding | ${fmtNum(dcfInputs.shares)} |`,
        `| Current Price | ${fmtINR(dcfInputs.price)} |`,
      ].join('\n'),
      provenance: [
        ...prov('fcf'),
        ...prov('growth'),
        ...prov('years'),
        ...prov('discount'),
        ...prov('terminal'),
        ...prov('netDebt'),
        ...prov('shares'),
        ...prov('price'),
      ],
    });
  }

  // Results
  if (dcfResult) {
    subsections.push({
      heading: 'Valuation Results',
      body: [
        `| Metric | Value |`,
        `|--------|-------|`,
        `| Sum of PV (Projected FCFs) | ${fmtINR(dcfResult.pvSum)} |`,
        `| Terminal Value (PV) | ${fmtINR(dcfResult.pvTv)} |`,
        `| Enterprise Value | ${fmtINR(dcfResult.ev)} |`,
        `| Equity Value | ${fmtINR(dcfResult.eq)} |`,
        `| **Intrinsic Value / Share** | **${fmtINR(dcfResult.iv)}** |`,
        `| Margin of Safety | ${fmtPct(dcfResult.mos)} |`,
        `| Current Price | ${fmtINR(dcfInputs?.price ?? null)} |`,
      ].join('\n'),
      provenance: [
        provItem('Intrinsic Value', fmtINR(dcfResult.iv), 'computed'),
        provItem('Margin of Safety', fmtPct(dcfResult.mos), 'computed'),
      ],
    });

    // Projected cash flows summary
    const pfcfRows = dcfResult.projected.map(
      (y) => `| Year ${y.year} | ${fmtINR(y.fcf)} | ${y.df.toFixed(4)} | ${fmtINR(y.pv)} |`,
    );
    subsections.push({
      heading: 'Projected Cash Flows',
      body: ['| Year | Projected FCF | Discount Factor | PV of FCF |', '|------|---------------|-----------------|-----------|', ...pfcfRows].join('\n'),
      provenance: dcfResult.projected.map((y) =>
        provItem(`Year ${y.year} FCF`, fmtINR(y.fcf), 'computed'),
      ),
    });
  }

  return {
    title: 'DCF Valuation',
    subsections,
  };
}

/** Build the Institutional Analytics section */
function buildInstitutionalSection(
  institutional: InstitutionalResult | null,
): MemoSection | null {
  if (!institutional || (!institutional.valuation.length && !institutional.profitability.length)) return null;

  const subsections: MemoSection['subsections'] = [];

  // Enterprise Value
  subsections.push({
    heading: 'Enterprise Value',
    body: `**EV:** ${institutional.metadata.evFormatted}`,
    provenance: [provItem('Enterprise Value', institutional.metadata.evFormatted, 'computed')],
  });

  // Valuation Multiples
  if (institutional.valuation.length > 0) {
    const rows = institutional.valuation.map((m: InstitutionalMetric) => {
      const status = m.cls === 'good' ? 'GOOD' : m.cls === 'warn' ? 'WARN' : 'NEUTRAL';
      return `| ${m.label} | ${m.formatted} | ${status} | ${m.description} |`;
    });
    subsections.push({
      heading: 'Valuation Multiples',
      body: ['| Metric | Value | Status | Description |', '|--------|-------|--------|-------------|', ...rows].join('\n'),
      provenance: institutional.valuation.map((m: InstitutionalMetric) =>
        provItem(m.label, m.formatted, 'computed'),
      ),
    });
  }

  // Profitability Metrics
  if (institutional.profitability.length > 0) {
    const rows = institutional.profitability.map((m: InstitutionalMetric) => {
      const status = m.cls === 'good' ? 'GOOD' : m.cls === 'warn' ? 'WARN' : 'NEUTRAL';
      return `| ${m.label} | ${m.formatted} | ${status} | ${m.description} |`;
    });
    subsections.push({
      heading: 'Profitability Metrics',
      body: ['| Metric | Value | Status | Description |', '|--------|-------|--------|-------------|', ...rows].join('\n'),
      provenance: institutional.profitability.map((m: InstitutionalMetric) =>
        provItem(m.label, m.formatted, 'computed'),
      ),
    });
  }

  return {
    title: 'Institutional Analytics',
    subsections,
  };
}

/** Build the Data Provenance section */
function buildProvenanceSection(provenanceMap?: Record<string, ProvenanceSource>): MemoSection | null {
  if (!provenanceMap || Object.keys(provenanceMap).length === 0) return null;

  const items = Object.values(provenanceMap);
  const subsections: MemoSection['subsections'] = [];

  const rows = items.map((p) => {
    const kindLabel: Record<ProvenanceKind, string> = {
      imported: 'Imported',
      manual: 'Manual',
      default: 'Default',
      inferred: 'Inferred',
      unavailable: 'Unavailable',
    };
    const label = kindLabel[p.kind] || p.kind;
    return `| ${p.label || '—'} | ${String(p.value ?? '—')} | ${label} | ${p.period || '—'} | ${p.confidence !== undefined ? (p.confidence * 100).toFixed(0) + '%' : '—'} |${p.overridden ? ' (overridden)' : ''}`;
  });

  subsections.push({
    heading: 'Input Sources',
    body: [
      '| Label | Value | Source | Period | Confidence |',
      '|-------|-------|--------|--------|------------|',
      ...rows,
    ].join('\n'),
    provenance: items.map((p) =>
      provItem(p.label, String(p.value ?? ''), mapKind(p.kind)),
    ),
  });

  return {
    title: 'Data Provenance',
    subsections,
  };
}

/** Build the Disclaimers section */
function buildDisclaimersSection(): MemoSection {
  return {
    title: 'Disclaimers & Methodology',
    subsections: [
      {
        heading: 'Important Notes',
        body: [
          '**This investment memo is for informational purposes only. It does not constitute investment advice.**',
          '',
          'All calculations are performed client-side using the Fundalyst analysis engine.',
          'Values and assumptions are sourced from imported documents, user input, or default values as labeled in the Data Provenance section.',
          '',
          'Key methodologies used:',
          '',
          '- **DCF Valuation:** Gordon Growth Model for terminal value. Requires WACC > terminal growth rate.',
          '- **Institutional Analytics:** EV = Market Cap + Total Debt − Cash. Enterprise multiples are compared against standard market thresholds.',
          '- **Financial Ratios:** Standard accounting ratios computed from period-over-period data.',
          '',
          'Past performance and historical data do not guarantee future results.',
          'All investment decisions should be made with consideration of your individual risk tolerance and financial situation.',
        ].join('\n'),
      },
    ],
  };
}

// ── Public API ──

/**
 * Generate a complete investment memo from all available analysis outputs.
 *
 * @param inputs - Object containing all analysis data and metadata
 * @returns A structured MemoExport ready for rendering or serialization
 */
export function generateMemo(inputs: {
  companyName: string;
  analyst?: string;
  projectName?: string;
  thesis?: string;
  dataset?: FundalystDataset | null;
  filingAnalysis?: FilingAnalysis | null;
  diffs?: DiffResult[];
  riskFlags?: RiskFlag[];
  ratios?: RatioResult[];
  dcfResult?: DCFResult | null;
  dcfInputs?: {
    fcf: number;
    growth: number;
    years: number;
    discount: number;
    terminal: number;
    netDebt: number;
    shares: number;
    price: number;
  };
  institutional?: InstitutionalResult | null;
  provenanceMap?: Record<string, ProvenanceSource>;
}): MemoExport {
  const sections: MemoSection[] = [];

  // 1. Company Overview
  sections.push(buildCompanySection(inputs.companyName, inputs.dataset ?? null, inputs.thesis));

  // 2. Period-over-Period Comparison
  const filingSection = buildFilingSection(
    inputs.diffs ?? [],
    inputs.riskFlags ?? [],
    inputs.filingAnalysis ?? undefined,
  );
  if (filingSection) sections.push(filingSection);

  // 3. Financial Ratios
  const ratiosSection = buildRatiosSection(inputs.ratios ?? []);
  if (ratiosSection) sections.push(ratiosSection);

  // 4. DCF Valuation
  const dcfSection = buildDCFSection(
    inputs.dcfResult ?? null,
    inputs.dcfInputs,
    inputs.provenanceMap,
  );
  if (dcfSection) sections.push(dcfSection);

  // 5. Institutional Analytics
  const instSection = buildInstitutionalSection(inputs.institutional ?? null);
  if (instSection) sections.push(instSection);

  // 6. Data Provenance
  const provSection = buildProvenanceSection(inputs.provenanceMap);
  if (provSection) sections.push(provSection);

  // 7. Disclaimers
  sections.push(buildDisclaimersSection());

  const dataset = inputs.dataset ?? null;

  // Lead-with-the-decision summary (§2/§7): margin of safety is the hero figure.
  let summary: MemoSummary | undefined;
  if (inputs.dcfResult && typeof inputs.dcfResult.mos === 'number') {
    const mos = inputs.dcfResult.mos;
    summary = {
      heroLabel: 'Margin of safety',
      heroValue: fmtPct(mos),
      heroSign: mos > 0 ? 'positive' : mos < 0 ? 'negative' : 'neutral',
    };
  }

  return {
    id: makeMemoId(),
    title: `Investment Memo — ${inputs.companyName}`,
    companyName: inputs.companyName,
    generatedAt: nowISO(),
    analyst: inputs.analyst || 'Local Analyst',
    projectName: inputs.projectName || 'Local Research Project',
    summary,
    sections,
    metadata: {
      datasetId: dataset?.id ?? null,
      datasetPeriods: dataset?.periods ?? [],
      factCount: dataset?.facts.length ?? 0,
    },
  };
}

/**
 * Export a MemoExport as formatted Markdown text.
 */
export function exportMemoMarkdown(memo: MemoExport): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${memo.title}`);
  lines.push('');
  lines.push(`**Generated:** ${new Date(memo.generatedAt).toLocaleString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
  lines.push(`**Analyst:** ${memo.analyst}`);
  lines.push(`**Project:** ${memo.projectName}`);
  if (memo.metadata.factCount > 0) {
    lines.push(`**Data Points:** ${memo.metadata.factCount} facts across ${memo.metadata.datasetPeriods.length} periods`);
  }
  lines.push('');

  // Lead with the decision (§7) — the number that matters, before the data dump.
  if (memo.summary) {
    lines.push('---');
    lines.push('');
    lines.push(`## ${memo.companyName} — ${memo.summary.heroLabel}`);
    lines.push('');
    lines.push(`# ${memo.summary.heroValue}`);
    lines.push('');
  }

  // Separator
  lines.push('---');
  lines.push('');

  // Sections
  for (const section of memo.sections) {
    lines.push(`## ${section.title}`);
    lines.push('');

    for (const sub of section.subsections) {
      lines.push(`### ${sub.heading}`);
      lines.push('');
      lines.push(sub.body);
      lines.push('');

      if (sub.provenance && sub.provenance.length > 0) {
        // Add compact provenance footnotes
        const provenanceNotes = sub.provenance.map(
          (p) => `- *${p.label}:* ${p.value} _(${p.kind})_`,
        );
        lines.push('**Sources:**');
        lines.push(...provenanceNotes);
        lines.push('');
      }
    }
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('_Generated by Fundalyst — all calculations are client-side and for informational purposes only._');

  return lines.join('\n');
}

/**
 * Export a MemoExport as a downloadable HTML document (self-contained).
 */
export function exportMemoHTML(memo: MemoExport): string {
  const encodedTitle = escapeHtml(memo.title);
  const dateStr = new Date(memo.generatedAt).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  function renderBody(md: string): string {
    // Very basic Markdown → HTML conversion for the memo body
    let html = escapeHtml(md);
    // Tables
    html = html.replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(Boolean).map((c) => c.trim());
      if (cells.every((c) => /^[-]+$/.test(c))) return '<tr class="sep"><td colspan="99"></td></tr>';
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
    });
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Bullet lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    // Line breaks
    html = html.replace(/\n/g, '<br>\n');
    return html;
  }

  const sectionAnchor = (title: string): string =>
    'sec-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  // Anchored table of contents (HTML only) — this is a multi-page document (§7).
  const tocHtml = `
    <nav class="toc" aria-label="Contents">
      <div class="toc-title">Contents</div>
      <ol>
        ${memo.sections
          .map((sctn) => `<li><a href="#${sectionAnchor(sctn.title)}">${escapeHtml(sctn.title)}</a></li>`)
          .join('\n        ')}
      </ol>
    </nav>`;

  const sectionsHtml = memo.sections
    .map(
      (section) => `
    <section class="section" id="${sectionAnchor(section.title)}">
      <h2>${escapeHtml(section.title)}</h2>
      ${section.subsections
        .map(
          (sub) => `
        <div class="subsection">
          <h3>${escapeHtml(sub.heading)}</h3>
          <div class="body">${renderBody(sub.body)}</div>
          ${sub.provenance && sub.provenance.length > 0
            ? `<details class="provenance"><summary>Sources (${sub.provenance.length})</summary><ul>${sub.provenance.map((p) => `<li><strong>${escapeHtml(p.label)}:</strong> <span class="num">${escapeHtml(String(p.value))}</span> <span class="prov-tag prov-${p.kind}">${escapeHtml(p.kind)}</span></li>`).join('')}</ul></details>`
            : ''}
        </div>`,
        )
        .join('\n')}
    </section>`,
    )
    .join('\n');

  const heroSignClass = memo.summary
    ? memo.summary.heroSign === 'positive'
      ? 'hero-pos'
      : memo.summary.heroSign === 'negative'
        ? 'hero-neg'
        : 'hero-neutral'
    : '';

  const summaryHtml = memo.summary
    ? `
  <section class="summary">
    <div class="summary-company">${escapeHtml(memo.companyName)}</div>
    <div class="summary-hero-label">${escapeHtml(memo.summary.heroLabel)}</div>
    <div class="summary-hero-value num ${heroSignClass}">${escapeHtml(memo.summary.heroValue)}</div>
    <div class="summary-meta">${escapeHtml(dateStr)} · ${escapeHtml(memo.analyst)}</div>
  </section>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${encodedTitle}</title>
<style>
  /* Paper-toned document theme — ink on paper, NOT the app's dark surface (§7).
     Palette defined as CSS variables in hsl() so the sheet contains zero hardcoded hex
     and every color derives from a single set of relationships. */
  :root {
    --paper: hsl(40 24% 97%);
    --paper-raised: hsl(40 30% 99%);
    --ink: hsl(240 12% 12%);
    --ink-secondary: hsl(240 6% 34%);
    --ink-muted: hsl(240 5% 52%);
    --rule: hsl(40 12% 84%);
    --rule-strong: hsl(40 10% 72%);
    --gain: hsl(150 55% 30%);
    --loss: hsl(2 62% 44%);
    --warn: hsl(28 68% 40%);
    --radius-sm: 4px;
    --radius-md: 8px;
    --font-sans: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
    --font-mono: 'SF Mono', 'Cascadia Code', 'Consolas', 'Liberation Mono', Menlo, monospace;
  }
  * { box-sizing: border-box; }
  body { font-family: var(--font-sans); max-width: 900px; margin: 40px auto; padding: 0 24px; background: var(--paper); color: var(--ink); line-height: 1.6; }
  .num, td, th, code { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  h1, h2, h3 { font-family: var(--font-sans); letter-spacing: -0.015em; }
  h1 { font-weight: 600; color: var(--ink); border-bottom: 1px solid var(--rule-strong); padding-bottom: 10px; margin-bottom: 8px; }
  h2 { font-weight: 600; color: var(--ink); margin-top: 36px; padding-top: 8px; border-top: 1px solid var(--rule); }
  h3 { font-weight: 600; color: var(--ink-secondary); margin-top: 20px; font-size: 1em; }
  .meta { color: var(--ink-muted); font-size: 0.9em; margin-bottom: 24px; }
  .meta .num { color: var(--ink-secondary); }
  .summary { margin: 24px 0 8px; padding: 20px 24px; background: var(--paper-raised); border: 1px solid var(--rule); border-radius: var(--radius-md); }
  .summary-company { font-size: 0.95em; font-weight: 600; color: var(--ink); }
  .summary-hero-label { font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-muted); margin-top: 10px; }
  .summary-hero-value { font-size: 40px; font-weight: 600; line-height: 1.1; margin-top: 2px; color: var(--ink); }
  .summary-hero-value.hero-pos { color: var(--gain); }
  .summary-hero-value.hero-neg { color: var(--loss); }
  .summary-meta { font-size: 0.82em; color: var(--ink-muted); margin-top: 10px; font-family: var(--font-mono); }
  .toc { margin: 20px 0 8px; padding: 14px 20px; border: 1px solid var(--rule); border-radius: var(--radius-md); background: var(--paper-raised); }
  .toc-title { font-size: 0.78em; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-muted); margin-bottom: 6px; }
  .toc ol { margin: 0; padding-left: 20px; columns: 2; }
  .toc a { color: var(--ink-secondary); text-decoration: none; }
  .toc a:hover { color: var(--ink); text-decoration: underline; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 0.9em; }
  td { border: 1px solid var(--rule); padding: 7px 12px; text-align: left; }
  tr.sep td { border: none; height: 4px; padding: 0; }
  ul { padding-left: 20px; }
  li { margin: 4px 0; }
  .section { margin-bottom: 28px; }
  .subsection { margin: 14px 0; padding: 12px 16px; background: var(--paper-raised); border: 1px solid var(--rule); border-radius: var(--radius-md); page-break-inside: avoid; break-inside: avoid; }
  .provenance { margin-top: 8px; font-size: 0.85em; color: var(--ink-muted); }
  .provenance summary { cursor: pointer; color: var(--ink-secondary); }
  .provenance ul { margin: 4px 0; padding-left: 16px; }
  .prov-tag { display: inline-block; padding: 0 6px; border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: 0.82em; text-transform: capitalize; border: 1px solid var(--rule-strong); color: var(--ink-secondary); }
  .prov-imported { color: var(--gain); border-color: var(--gain); }
  .prov-manual { color: var(--ink-secondary); }
  .prov-assumed { color: var(--warn); border-color: var(--warn); }
  .prov-computed { color: var(--ink); }
  .body { overflow-x: auto; }
  .footer { margin-top: 44px; padding-top: 16px; border-top: 1px solid var(--rule); color: var(--ink-muted); font-size: 0.8em; text-align: center; }
  strong { font-weight: 600; }
  @media print {
    body { margin: 0; padding: 16px; background: hsl(0 0% 100%); }
    .subsection, table, tr { page-break-inside: avoid; break-inside: avoid; }
    .toc { page-break-after: avoid; }
    h2, h3 { page-break-after: avoid; }
  }
</style>
</head>
<body>
  <h1>${encodedTitle}</h1>
  <div class="meta">
    <div><strong>Generated:</strong> <span class="num">${escapeHtml(dateStr)}</span></div>
    <div><strong>Analyst:</strong> ${escapeHtml(memo.analyst)}</div>
    <div><strong>Project:</strong> ${escapeHtml(memo.projectName)}</div>
    ${memo.metadata.factCount > 0 ? `<div><strong>Data Points:</strong> <span class="num">${memo.metadata.factCount}</span> facts across <span class="num">${memo.metadata.datasetPeriods.length}</span> periods</div>` : ''}
  </div>
  ${summaryHtml}
  ${tocHtml}
  ${sectionsHtml}
  <div class="footer">
    <p><em>Generated by Fundalyst — all calculations are client-side and for informational purposes only. This does not constitute investment advice.</em></p>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Download a memo as a Markdown file (browser-friendly helper).
 * Creates a downloadable Blob URL and triggers a click.
 */
export function downloadMemoMarkdown(memo: MemoExport, filename?: string): void {
  if (typeof window === 'undefined') return;
  const md = exportMemoMarkdown(memo);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `memo-${memo.companyName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download a memo as an HTML file (browser-friendly helper).
 */
export function downloadMemoHTML(memo: MemoExport, filename?: string): void {
  if (typeof window === 'undefined') return;
  const html = exportMemoHTML(memo);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `memo-${memo.companyName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
