'use client';

import Link from 'next/link';
import { usePageTitle } from '@/lib/use-page-title';
import { useGlobalDataStore } from '@/store/global-data-store';
import { TOOL_BY_ID } from '@/lib/tool-metadata';
import {
  ArrowRight,
  Detective,
  Lightning,
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
  title: string;
  value: string;
  sub: string;
  tone?: 'positive';
};

const statementRows: StatementRow[] = [
  { line: 'Revenue from operations', fy24: '566,090', fy23: '518,742', yoy: '+9.1%', tone: 'pos', source: 'imported' },
  { line: 'Cost of materials', fy24: '(329,412)', fy23: '(308,044)', yoy: '-6.9%', tone: 'neg', source: 'imported' },
  { line: 'Employee benefits', fy24: '(18,706)', fy23: '(17,391)', yoy: '-7.6%', tone: 'neg', source: 'imported' },
  { line: 'EBITDA', fy24: '102,894', fy23: '87,212', yoy: '+18.0%', tone: 'pos', source: 'computed', subtotal: true },
  { line: 'Profit after tax', fy24: '69,621', fy23: '65,009', yoy: '+7.1%', tone: 'pos', source: 'imported', subtotal: true },
];

const toolCards: ToolCard[] = [
  {
    href: TOOL_BY_ID.dcf.href,
    icon: TOOL_BY_ID.dcf.icon,
    title: TOOL_BY_ID.dcf.label,
    value: TOOL_BY_ID.dcf.value,
    sub: TOOL_BY_ID.dcf.description,
  },
  {
    href: TOOL_BY_ID.filing.href,
    icon: TOOL_BY_ID.filing.icon,
    title: TOOL_BY_ID.filing.label,
    value: TOOL_BY_ID.filing.value,
    sub: TOOL_BY_ID.filing.description,
    tone: 'positive',
  },
  {
    href: TOOL_BY_ID.trends.href,
    icon: TOOL_BY_ID.trends.icon,
    title: TOOL_BY_ID.trends.label,
    value: TOOL_BY_ID.trends.value,
    sub: TOOL_BY_ID.trends.description,
  },
  {
    href: TOOL_BY_ID.ratios.href,
    icon: TOOL_BY_ID.ratios.icon,
    title: TOOL_BY_ID.ratios.label,
    value: TOOL_BY_ID.ratios.value,
    sub: TOOL_BY_ID.ratios.description,
  },
  {
    href: TOOL_BY_ID.peer.href,
    icon: TOOL_BY_ID.peer.icon,
    title: TOOL_BY_ID.peer.label,
    value: TOOL_BY_ID.peer.value,
    sub: TOOL_BY_ID.peer.description,
  },
  {
    href: TOOL_BY_ID.wc.href,
    icon: TOOL_BY_ID.wc.icon,
    title: TOOL_BY_ID.wc.label,
    value: TOOL_BY_ID.wc.value,
    sub: TOOL_BY_ID.wc.description,
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
    <div>
      {resumeName && (
        <section className="home-resume">
          <div>
            <span className="home-resume-kicker">Continue research</span>
            <h2>{resumeName}</h2>
            <p>{activeDataset?.facts.length || 0} accepted facts across {activeDataset?.periods.length || 0} period{activeDataset?.periods.length === 1 ? '' : 's'}.</p>
          </div>
          <div className="home-resume-actions">
            <Link href="/workspace" className="btn-primary home-cta-btn">
              Open workspace
              <ArrowRight size={15} weight="bold" />
            </Link>
            <button type="button" className="home-command-hint" onClick={() => window.dispatchEvent(new Event('fundalyst:open-palette'))}>
              <span className="cmdk-kbd">`</span>
              Type a command
            </button>
          </div>
        </section>
      )}

      <section className="home-hero">
        <div className="home-hero-grid">
          <div className="home-hero-copy">
            <p className="home-kicker">Annual report in. Analyst view out.</p>
            <h1>Turn filings into numbers you can defend.</h1>
            <p className="home-lede">
              Fundalyst reads the filing, normalizes the statements, and carries the
              accepted data into valuation, ratios, trends, peers, and filing comparison.
            </p>
            <div className="home-actions">
              <Link href="/import" className="btn-primary home-cta-btn">
                Import annual report
                <ArrowRight size={15} weight="bold" />
              </Link>
              {resumeName ? (
                <Link href="/research/filing" className="home-cta-ghost">
                  Resume {resumeName}
                  <ArrowRight size={14} weight="bold" />
                </Link>
              ) : (
                <Link href="/tools/dcf" className="home-cta-ghost">
                  View interactive demo
                  <ArrowRight size={14} weight="bold" />
                </Link>
              )}
            </div>
            <p className="home-trust-line">
              No sign-up. No server upload. Every number keeps its source.
            </p>
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
      </section>

      <section className="home-strip">
        <div className="home-strip-item">
          <span className="home-strip-num">0</span>
          <span className="home-strip-cap">server uploads</span>
        </div>
        <div className="home-strip-item">
          <span className="home-strip-num">100%</span>
          <span className="home-strip-cap">local processing</span>
        </div>
        <div className="home-strip-item">
          <span className="home-strip-num">&lt;60s</span>
          <span className="home-strip-cap">to first analysis</span>
        </div>
        <div className="home-strip-item">
          <span className="home-strip-num">All</span>
          <span className="home-strip-cap">output source-linked</span>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-heading">How does the filing become analysis?</div>
        <div className="home-section-sub">One review gate. Then every tool uses the same accepted dataset.</div>
        <div className="home-steps">
          <div className="home-step">
            <span className="home-step-num">1</span>
            <div className="home-step-title">Read the filing</div>
            <div className="home-step-desc">
              Drop a PDF, CSV, XLSX, screenshot, or pasted table. Fundalyst detects
              periods, metrics, units, and statement structure.
            </div>
          </div>
          <div className="home-step">
            <span className="home-step-num">2</span>
            <div className="home-step-title">Accept the numbers</div>
            <div className="home-step-desc">
              Confidence and provenance labels show which rows need attention before
              they enter the model.
            </div>
          </div>
          <div className="home-step">
            <span className="home-step-num">3</span>
            <div className="home-step-title">Move into judgment</div>
            <div className="home-step-desc">
              DCF, ratios, peers, trends, cash cycle, and filing comparison open
              pre-filled.
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-heading">What decisions can I make from it?</div>
        <div className="home-section-sub">The outputs are financial views, not disconnected widgets.</div>
        <div className="home-tools">
          {toolCards.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link href={tool.href} className="home-tool-card" key={tool.href}>
                <div className="home-tool-card-head">
                  <span className="home-tool-card-icon">
                    <Icon size={14} weight="regular" />
                  </span>
                  <span className="home-tool-card-title">{tool.title}</span>
                </div>
                <div className={`home-tool-card-value ${tool.tone || ''}`}>{tool.value}</div>
                <div className="home-tool-card-sub">{tool.sub}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-heading">Can I trust the path from source to answer?</div>
        <div className="home-section-sub">Trust comes from inspectable work.</div>
        <div className="home-trust">
          <div className="home-trust-col">
            <span className="home-trust-icon">
              <ShieldCheck size={16} weight="regular" />
            </span>
            <div className="home-trust-title">Private by design</div>
            <div className="home-trust-text">
              Parsing, review, modeling, and memo export run locally in the browser.
              There is no account gate.
            </div>
          </div>
          <div className="home-trust-col">
            <span className="home-trust-icon">
              <Detective size={16} weight="regular" />
            </span>
            <div className="home-trust-title">Source-linked calculations</div>
            <div className="home-trust-text">
              Outputs carry assumptions and source facts, so the path from filing value
              to analysis stays visible.
            </div>
          </div>
          <div className="home-trust-col">
            <span className="home-trust-icon">
              <Lightning size={16} weight="regular" />
            </span>
            <div className="home-trust-title">Built for real filings</div>
            <div className="home-trust-text">
              Indian-market units, multi-period statements, OCR warnings, and local
              backups are treated as core workflow.
            </div>
          </div>
        </div>
      </section>

      <section className="home-final-cta">
        <h2>The source document is enough.</h2>
        <p className="home-final-cta-sub">
          Import it, review the extraction, and start from numbers you can trace.
        </p>
        <div className="home-cta-row">
          <Link href="/import" className="btn-primary home-cta-btn">
            Import annual report
            <ArrowRight size={15} weight="bold" />
          </Link>
          <Link href="/tools/dcf" className="home-cta-ghost">
            View interactive demo
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
      </section>
    </div>
  );
}
