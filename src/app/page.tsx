'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { usePageTitle } from '@/lib/use-page-title';
import { useGlobalDataStore } from '@/store/global-data-store';
import { TOOL_BY_ID } from '@/lib/tool-metadata';
import {
  ArrowRight,
  Detective,
  Lightning,
  LockSimple,
  ShieldCheck,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

type StatementRow = {
  line: string;
  fy24: string;
  fy23: string;
  yoy: string;
  tone: 'pos' | 'neg';
  source: 'imported' | 'computed';
  subtotal?: boolean;
};

type ToolCard = {
  href: string;
  icon: Icon;
  name: string;
  question: string;
  value: string;
};

const statementRows: StatementRow[] = [
  { line: 'Revenue from operations', fy24: '566,090', fy23: '518,742', yoy: '+9.1%', tone: 'pos', source: 'imported' },
  { line: 'Cost of materials', fy24: '(329,412)', fy23: '(308,044)', yoy: '-6.9%', tone: 'neg', source: 'imported' },
  { line: 'Employee benefits', fy24: '(18,706)', fy23: '(17,391)', yoy: '-7.6%', tone: 'neg', source: 'imported' },
  { line: 'EBITDA', fy24: '102,894', fy23: '87,212', yoy: '+18.0%', tone: 'pos', source: 'computed', subtotal: true },
  { line: 'Profit after tax', fy24: '69,621', fy23: '65,009', yoy: '+7.1%', tone: 'pos', source: 'imported', subtotal: true },
];

const toolCards: ToolCard[] = (['dcf', 'filing', 'trends', 'ratios', 'peer', 'wc'] as const).map((id) => ({
  href: TOOL_BY_ID[id].href,
  icon: TOOL_BY_ID[id].icon,
  name: TOOL_BY_ID[id].shortLabel,
  question: TOOL_BY_ID[id].answer,
  value: TOOL_BY_ID[id].value,
}));

const d = (ms: number): CSSProperties => ({ ['--d']: `${ms}ms` } as CSSProperties);

const steps = [
  {
    title: 'Read the filing',
    desc: 'Drop a PDF, CSV, XLSX, screenshot, or pasted table. Fundalyst detects periods, metrics, units, and statement structure automatically.',
  },
  {
    title: 'Accept the numbers',
    desc: 'Confidence and provenance labels flag exactly which rows need a look before anything enters the model. You stay the reviewer.',
  },
  {
    title: 'Move into judgment',
    desc: 'DCF, ratios, peers, trends, cash cycle, and filing comparison all open pre-filled from the same accepted dataset.',
  },
];

const trustCols = [
  {
    icon: ShieldCheck,
    title: 'Private by design',
    text: 'Parsing, review, modeling, and memo export run locally in the browser. There is no account gate and nothing is uploaded.',
  },
  {
    icon: Detective,
    title: 'Source-linked calculations',
    text: 'Every output carries its assumptions and the source facts behind it, so the path from filing value to answer stays visible.',
  },
  {
    icon: Lightning,
    title: 'Built for real filings',
    text: 'Indian-market units, multi-period statements, OCR warnings, and local backups are treated as core workflow — not edge cases.',
  },
];

export default function HomePage() {
  usePageTitle('Home');
  const activeDataset = useGlobalDataStore((s) => {
    if (!s.activeDatasetId && s.datasets.length === 0) return null;
    return s.datasets.find((d) => d.id === s.activeDatasetId) || s.datasets[0] || null;
  });

  const resumeName =
    activeDataset?.companyName && activeDataset.companyName !== 'Unnamed Company'
      ? activeDataset.companyName
      : null;

  return (
    <div className="lp">
      {resumeName && (
        <section className="lp-resume fnd-reveal">
          <div>
            <span className="lp-resume-kicker">Continue research</span>
            <h2>{resumeName}</h2>
            <p>
              {activeDataset?.facts.length || 0} accepted facts across{' '}
              {activeDataset?.periods.length || 0} period
              {activeDataset?.periods.length === 1 ? '' : 's'}.
            </p>
          </div>
          <div className="lp-resume-actions">
            <Link href="/workspace" className="btn-primary lp-cta">
              Open workspace
              <ArrowRight size={15} weight="bold" />
            </Link>
            <button
              type="button"
              className="lp-cmd"
              onClick={() => window.dispatchEvent(new Event('fundalyst:open-palette'))}
            >
              <span className="cmdk-kbd">`</span>
              Type a command
            </button>
          </div>
        </section>
      )}

      {/* ── Hero ── v6 ── */}
      <section className="lp-hero">
        <div className="lp-hero-canvas" aria-hidden="true" />
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <span className="lp-eyebrow fnd-reveal" style={d(0)}>
              <span className="lp-eyebrow-dot" />
              Annual report in — analyst view out
            </span>
            <h1 className="lp-title fnd-reveal" style={d(60)}>
              Turn filings into numbers <em>you can defend.</em>
            </h1>
            <p className="lp-lede fnd-reveal" style={d(120)}>
              Fundalyst reads the filing, normalizes the statements, and carries every{' '}
              <strong>accepted</strong> figure into valuation, ratios, trends, peers, and
              filing comparison — each number keeping its source.
            </p>
            <div className="lp-actions fnd-reveal" style={d(180)}>
              <Link href="/import" className="btn-primary lp-cta">
                Import annual report
                <ArrowRight size={15} weight="bold" />
              </Link>
              {resumeName ? (
                <Link href="/research/filing" className="lp-ghost">
                  Resume {resumeName}
                  <ArrowRight size={14} weight="bold" />
                </Link>
              ) : (
                <Link href="/tools/dcf" className="lp-ghost">
                  Explore the interactive demo
                  <ArrowRight size={14} weight="bold" />
                </Link>
              )}
            </div>
            <button
              type="button"
              className="lp-cmd fnd-reveal"
              style={d(220)}
              onClick={() => window.dispatchEvent(new Event('fundalyst:open-palette'))}
            >
              <span className="cmdk-kbd">`</span>
              or press to run any command
            </button>
            <p className="lp-trust fnd-reveal" style={d(260)}>
              <LockSimple size={12} weight="regular" />
              Runs entirely in your browser. Your data never leaves this device.
            </p>
          </div>

          <div className="lp-stage fnd-reveal" style={d(160)}>
            <div className="lp-stage-caption">
              <span>Filing PDF</span>
              <span className="arrow">→</span>
              <span className="to">Structured, source-linked</span>
            </div>
            <div className="stmt" aria-label="Extracted annual report preview">
              <div className="stmt-head">
                <div>
                  <span className="stmt-title">Extracted statement</span>
                  <span className="stmt-meta">Reliance Industries / Consolidated / FY24</span>
                </div>
                <span className="stmt-flag">Review ready</span>
              </div>
              <table className="stmt-table">
                <thead>
                  <tr>
                    <th scope="col">Metric</th>
                    <th scope="col">FY24</th>
                    <th scope="col">FY23</th>
                    <th scope="col">YoY</th>
                  </tr>
                </thead>
                <tbody>
                  {statementRows.map((row) => (
                    <tr key={row.line} className={row.subtotal ? 'subtotal' : undefined}>
                      <th scope="row" className="stmt-line">
                        {row.line}
                        <span className={`stmt-prov ${row.source}`} />
                      </th>
                      <td className="stmt-num">{row.fy24}</td>
                      <td className="stmt-num">{row.fy23}</td>
                      <td className={`stmt-yoy ${row.tone}`}>{row.yoy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="stmt-foot">
                <span className="k">
                  <span className="d imported" />
                  Imported
                </span>
                <span className="k">
                  <span className="d computed" />
                  Computed
                </span>
                <span>75 metrics mapped</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="lp-strip">
        {[
          { num: '0', cap: 'server uploads' },
          { num: '100%', cap: 'local processing' },
          { num: '<60s', cap: 'to first analysis' },
          { num: 'All', cap: 'output source-linked' },
        ].map((item) => (
          <div className="lp-strip-item" key={item.cap}>
            <span className="lp-strip-num">{item.num}</span>
            <span className="lp-strip-cap">{item.cap}</span>
          </div>
        ))}
      </section>

      {/* ── How it works ── */}
      <section className="lp-section">
        <div className="lp-eyebrow-row">
          <span className="lp-index">01</span>
          <h2 className="lp-section-title">One review gate, then everything is filled</h2>
        </div>
        <p className="lp-section-sub">
          The filing becomes analysis through a single accept step. After that, every tool
          reads from the same reviewed dataset — no re-entry, no copy-paste drift.
        </p>
        <div className="lp-steps">
          {steps.map((step, i) => (
            <div className="lp-step" key={step.title}>
              <span className="lp-step-num">{i + 1}</span>
              <div className="lp-step-title">{step.title}</div>
              <div className="lp-step-desc">{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tools ── */}
      <section className="lp-section">
        <div className="lp-eyebrow-row">
          <span className="lp-index">02</span>
          <h2 className="lp-section-title">Each view answers a real question</h2>
        </div>
        <p className="lp-section-sub">
          The outputs are financial views built to settle a decision — not disconnected
          widgets you have to wire together yourself.
        </p>
        <div className="lp-tools">
          {toolCards.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link href={tool.href} className="lp-tool" key={tool.href}>
                <div className="lp-tool-head">
                  <span className="lp-tool-icon">
                    <Icon size={14} weight="regular" />
                  </span>
                  <span className="lp-tool-name">{tool.name}</span>
                </div>
                <div className="lp-tool-q">{tool.question}</div>
                <div className="lp-tool-value">
                  {tool.value}
                  <ArrowRight className="arw" size={13} weight="bold" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Trust ── */}
      <section className="lp-section">
        <div className="lp-eyebrow-row">
          <span className="lp-index">03</span>
          <h2 className="lp-section-title">Trust comes from inspectable work</h2>
        </div>
        <p className="lp-section-sub">
          You should never have to take an output on faith. Every figure traces back to the
          document it came from.
        </p>
        <div className="lp-trust-cols">
          {trustCols.map((col) => {
            const Icon = col.icon;
            return (
              <div className="lp-trust-col" key={col.title}>
                <span className="lp-trust-icon">
                  <Icon size={17} weight="regular" />
                </span>
                <div className="lp-trust-title">{col.title}</div>
                <div className="lp-trust-text">{col.text}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="lp-final">
        <div className="lp-final-inner">
          <h2>The source document is enough.</h2>
          <p className="lp-final-sub">
            Import it, review the extraction, and start from numbers you can trace back to
            the page they came from.
          </p>
          <div className="lp-final-row">
            <Link href="/import" className="btn-primary lp-cta">
              Import annual report
              <ArrowRight size={15} weight="bold" />
            </Link>
            <Link href="/tools/dcf" className="lp-ghost">
              Explore the interactive demo
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
