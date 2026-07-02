'use client';

import { useState, useMemo, useCallback } from 'react';
import { computeRatios } from '@/lib/calculations';
import { useRatiosStore } from '@/store';
import { usePageTitle } from '@/lib/use-page-title';
import { useToast } from '@/components/shared/ToastProvider';
import { downloadCSV } from '@/lib/helpers';
import { TOOL_BY_ID } from '@/lib/tool-metadata';
import {
  PageHeader,
  Card,
  Toolbar,
  MetricGrid,
  HeroDecision,
  InsightCard,
  FormulaDisclosure,
  SectionTitle,
  ArcNextLinks,
  CalcTimestamp,
  Disclaimer,
  EmptyState,
  DataQualityBar,
  TrustBadge,
  DataSourceBadge,
} from '@/components/ui';
import ModelBoundSpreadsheet from '@/components/input/ModelBoundSpreadsheet';
import type { RatioInputs, RatioResult } from '@/types/financial';
import { useActiveDataset } from '@/store/financial-model-selectors';
import { useGlobalDataStore } from '@/store/global-data-store';
import { useEnterpriseStore } from '@/store/enterprise-store';
import CalculationTracePanel from '@/components/shared/CalculationTrace';
import { makeTraceSource, type CalculationTrace } from '@/lib/calculation-trace';
import ProvenanceBadge from '@/components/shared/ProvenanceBadge';

const RATIOS_TOOL = TOOL_BY_ID.ratios;
const RATIOS_COUNT = RATIOS_TOOL.count ?? RATIOS_TOOL.value;
const RATIOS_INPUTS = RATIOS_TOOL.inputs ?? '6 inputs';

/** Ratio metric keys as stored in the model */
const RATIO_METRICS = [
  'Revenue',
  'Net Profit',
  'EBIT',
  'Total Assets',
  'Total Equity',
  'Total Debt',
] as const;

const unlockedFormulas: Record<string, string> = {
  'Net Profit Margin': 'Net Profit ÷ Revenue',
  'ROE': 'Net Profit ÷ Total Equity',
  'Debt/Equity': 'Total Debt ÷ Total Equity',
  'Debt/Assets': 'Total Debt ÷ Total Assets',
  'Asset Turnover': 'Revenue ÷ Total Assets',
};

const lockedRatios = [
  { label: 'Current Ratio', formula: 'Current Assets ÷ Current Liabilities', hint: 'Add current assets & liabilities' },
  { label: 'Quick Ratio', formula: '(Current Assets − Inventory) ÷ Current Liabilities', hint: 'Add current assets, inventory & liabilities' },
  { label: 'Interest Coverage', formula: 'EBIT ÷ Interest Expense', hint: 'Add interest expense' },
  { label: 'Gross Margin', formula: '(Revenue − COGS) ÷ Revenue', hint: 'Add COGS' },
];

const ratioTraceConfig: Record<string, { formula: string; sources: { label: string; rowLabels: string[]; metricKeys: string[] }[] }> = {
  'Net Profit Margin': {
    formula: 'Net Profit / Revenue',
    sources: [
      { label: 'Net Profit', rowLabels: ['Net Profit'], metricKeys: ['netProfit'] },
      { label: 'Revenue', rowLabels: ['Revenue'], metricKeys: ['revenue'] },
    ],
  },
  ROE: {
    formula: 'Net Profit / Total Equity',
    sources: [
      { label: 'Net Profit', rowLabels: ['Net Profit'], metricKeys: ['netProfit'] },
      { label: 'Total Equity', rowLabels: ['Total Equity'], metricKeys: ['equity', 'totalEquity'] },
    ],
  },
  'Debt/Equity': {
    formula: 'Total Debt / Total Equity',
    sources: [
      { label: 'Total Debt', rowLabels: ['Total Debt'], metricKeys: ['totalDebt'] },
      { label: 'Total Equity', rowLabels: ['Total Equity'], metricKeys: ['equity', 'totalEquity'] },
    ],
  },
  'Debt/Assets': {
    formula: 'Total Debt / Total Assets',
    sources: [
      { label: 'Total Debt', rowLabels: ['Total Debt'], metricKeys: ['totalDebt'] },
      { label: 'Total Assets', rowLabels: ['Total Assets'], metricKeys: ['totalAssets'] },
    ],
  },
  'Asset Turnover': {
    formula: 'Revenue / Total Assets',
    sources: [
      { label: 'Revenue', rowLabels: ['Revenue'], metricKeys: ['revenue'] },
      { label: 'Total Assets', rowLabels: ['Total Assets'], metricKeys: ['totalAssets'] },
    ],
  },
};

function insightFor(r: RatioResult): { type: 'positive' | 'risk' | 'warning' | 'info'; title: string; text: string } {
  switch (r.label) {
    case 'Net Profit Margin':
      return {
        type: r.cls === 'good' ? 'positive' : r.cls === 'warn' ? 'risk' : 'info',
        title: r.cls === 'good' ? 'Healthy net profitability' : r.cls === 'warn' ? 'Low net margin' : 'Moderate net margin',
        text: r.cls === 'good' ? 'Over 10% of revenue flows through to net profit.' : r.cls === 'warn' ? 'Net profit margin below 3% — very small cushion against downturns.' : 'Net profit margin is reasonable.',
      };
    case 'ROE':
      return {
        type: r.cls === 'good' ? 'positive' : r.cls === 'warn' ? 'risk' : 'info',
        title: r.cls === 'good' ? 'Strong return on equity' : r.cls === 'warn' ? 'Weak return on equity' : 'Moderate ROE',
        text: r.cls === 'good' ? 'Generates more than 15% return on every rupee of equity.' : r.cls === 'warn' ? 'ROE below 5% suggests insufficient profit from shareholder capital.' : 'ROE in the 5–15% range.',
      };
    case 'Debt/Equity':
      return {
        type: r.cls === 'good' ? 'positive' : r.cls === 'warn' ? 'risk' : 'info',
        title: r.cls === 'good' ? 'Conservative leverage' : r.cls === 'warn' ? 'High leverage' : 'Moderate leverage',
        text: r.cls === 'good' ? 'Debt is well below equity — low financial risk.' : r.cls === 'warn' ? 'Debt significantly exceeds equity.' : 'Debt and equity are balanced.',
      };
    case 'Debt/Assets':
      return {
        type: r.cls === 'good' ? 'positive' : r.cls === 'warn' ? 'risk' : 'info',
        title: r.cls === 'good' ? 'Low debt burden' : r.cls === 'warn' ? 'High debt burden' : 'Manageable debt',
        text: r.cls === 'good' ? 'Less than half of assets are debt-financed.' : r.cls === 'warn' ? 'Over 70% of assets are debt-funded.' : 'Moderate debt financing.',
      };
    case 'Asset Turnover':
      return {
        type: r.cls === 'good' ? 'positive' : r.cls === 'warn' ? 'risk' : 'info',
        title: r.cls === 'good' ? 'Efficient asset utilisation' : r.cls === 'warn' ? 'Low asset turnover' : 'Average asset turnover',
        text: r.cls === 'good' ? 'Revenue exceeds total assets — strong sales from asset base.' : r.cls === 'warn' ? 'Revenue is less than half of total assets.' : 'Asset turnover in normal range.',
      };
    default:
      return { type: 'info', title: r.label, text: `${r.label} is ${r.value}.` };
  }
}

function groupBySection(results: RatioResult[]): { section: string; ratios: RatioResult[] }[] {
  const sections = [...new Set(results.map((r) => r.section))];
  return sections.map((s) => ({ section: s, ratios: results.filter((r) => r.section === s) }));
}

/** Read ratio inputs from the canonical model */
function readRatioData(dataset: NonNullable<ReturnType<typeof useActiveDataset>>): RatioInputs {
  const latestPeriod = dataset.periods[dataset.periods.length - 1] || 'Value';
  const find = (metric: string): number | null => {
    const f = dataset.facts.find((f) => f.metric === metric && f.periodLabel === latestPeriod);
    return f && isFinite(f.value) ? f.value : null;
  };

  return {
    revenue: find('Revenue') ?? null,
    netProfit: find('Net Profit') ?? null,
    ebit: find('EBIT') ?? null,
    totalAssets: find('Total Assets') ?? null,
    totalEquity: find('Total Equity') ?? null,
    totalDebt: find('Total Debt') ?? null,
    cogs: null, currentAssets: null, currentLiab: null, inventory: null, interest: null,
  };
}

export default function RatiosPage() {
  usePageTitle('Financial Ratios');
  const showToast = useToast();
  const addAuditEvent = useEnterpriseStore((s) => s.addAuditEvent);
  const { res, setRes, clear: clearStore } = useRatiosStore();
  const dataset = useActiveDataset();
  const hasData = dataset && dataset.facts.length > 0;

  const [showResults, setShowResults] = useState(false);

  function analyze() {
    if (!hasData) {
      showToast('No data available. Import a financial report first.');
      return;
    }
    const data = readRatioData(dataset);
    const next = computeRatios(data);
    if (next.length === 0) {
      setRes(null);
      setShowResults(false);
      showToast('Add enough data to calculate at least one ratio.');
      return;
    }
    setRes(next);
    setShowResults(true);
    addAuditEvent({
      category: 'calculation',
      severity: 'info',
      action: 'Ratios calculated',
      target: dataset?.companyName || 'Manual ratios',
      details: `${next.length} ratio(s)`,
    });
    showToast('Ratios calculated');
  }

  const handleClear = useCallback(() => {
    if (!dataset) return;
    const store = useGlobalDataStore.getState();
    for (const metric of RATIO_METRICS) {
      const fact = dataset.facts.find((f) => f.metric === metric);
      if (fact) {
        store.deleteFact(dataset.id, metric, fact.periodLabel);
      }
    }
    clearStore();
    setShowResults(false);
  }, [dataset, clearStore]);

  // ── Traces ──
  const traceItems = useMemo(() => {
    if (!res || !dataset) return [];
    const latestPeriod = dataset.periods[dataset.periods.length - 1] || 'Value';

    const findRowData = (metric: string) => {
      const f = dataset.facts.find((f) => f.metric === metric && f.periodLabel === latestPeriod);
      return f ? { metric: f.metric, values: [String(f.value)] } : undefined;
    };

    return res.map((ratio): CalculationTrace | null => {
      const config = ratioTraceConfig[ratio.label];
      if (!config) return null;
      return {
        label: ratio.label,
        value: ratio.value,
        formula: config.formula,
        sources: config.sources.map((source) => makeTraceSource(
          source.label,
          dataset,
          source.metricKeys,
          findRowData(source.rowLabels[0]),
        )),
      };
    }).filter((item): item is CalculationTrace => item !== null);
  }, [res, dataset]);

  const grouped = res ? groupBySection(res) : [];

  // Empty state — only when no dataset exists
  if (!hasData) {
    return (
      <div>
        <PageHeader
          kicker="Valuation"
          title={RATIOS_TOOL.label}
          subtitle={`${RATIOS_INPUTS} unlock ${RATIOS_COUNT}.`}
          answer={RATIOS_TOOL.answer}
        />
        <EmptyState
          title="No financial data"
          desc="Import a financial report to see pre-filled ratio inputs and calculate financial ratios."
          action={{ label: 'Import data', href: '/import' }}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        kicker="Valuation"
        title={RATIOS_TOOL.label}
        subtitle={`${RATIOS_INPUTS} unlock ${RATIOS_COUNT}.`}
        answer={RATIOS_TOOL.answer}
      />

      <DataQualityBar source={dataset?.companyName || undefined} />
      <div className="flex items-center gap-2 mb-2 mt-1">
        <DataSourceBadge variant="imported" />
        <ProvenanceBadge kind="imported" />
      </div>

      <Card label={`Required (${RATIOS_INPUTS})`}>
        <div className="card-body">
          <ModelBoundSpreadsheet
            statement="all"
            singleColumnLabel="₹ Cr"
            hint={`${RATIOS_INPUTS} unlock: Net Profit Margin, ROE, Debt/Equity, Debt/Assets, Asset Turnover. Edits write back to the model.`}
          />
        </div>
        <Toolbar onClear={handleClear} onAction={analyze} actionLabel="Calculate" hint={`Add the ${RATIOS_INPUTS} to calculate ${RATIOS_COUNT}.`} />
      </Card>

      {res && showResults && (() => {
        const flagged = res.find((r) => r.cls === 'warn');
        return flagged ? (
          <HeroDecision
            label={`${flagged.label} — needs attention`}
            value={flagged.value}
            sign="negative"
            sub="Most out-of-range ratio for this company."
          />
        ) : (
          <HeroDecision
            label="Ratios within healthy range"
            value={`${res.length} / ${res.length}`}
            sign="positive"
            sub="No ratio flagged out of range."
          />
        );
      })()}

      {grouped.map(({ section, ratios }) => (
        <div key={section} className="mt-6">
          <SectionTitle>{section}</SectionTitle>
          <Card className="mt-3">
            <MetricGrid metrics={ratios.map((r) => ({ label: r.label, value: r.value, cls: r.cls === '' ? undefined : (r.cls as 'good' | 'warn' | 'neutral' | undefined) }))} />
          </Card>
          <div className="flex flex-col gap-2 mt-3">
            {ratios.map((r, i) => { const insight = insightFor(r); return <InsightCard key={i} type={insight.type} title={insight.title} text={insight.text} />; })}
          </div>
          <div className="mt-2 pl-1">
            {ratios.map((r, i) => <FormulaDisclosure key={i} label={r.label} formula={unlockedFormulas[r.label] || ''} />)}
          </div>
        </div>
      ))}

      {showResults && <CalculationTracePanel traces={traceItems} />}

      {res && showResults && (
        <>
          <Card label="More ratios (add data to unlock)" className="mt-4">
            <div className="card-body">
              {lockedRatios.map((l, i) => (
                <div key={i} className="flex justify-between items-center py-2" style={{ borderBottom: i < lockedRatios.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <span className="text-mono text-xs text-muted">{l.label}: <span className="text-tertiary">{l.formula}</span></span>
                  <span className="text-2xs" style={{ color: 'var(--border-strong)' }}>{l.hint}</span>
                </div>
              ))}
            </div>
          </Card>
          <div className="flex justify-center mt-4">
            <button className="btn-secondary btn-sm" onClick={() => downloadCSV('ratios.csv', [['Section', 'Metric', 'Value'], ...res.map((r) => [r.section, r.label, r.value])])}>Download CSV</button>
          </div>
          <div className="mt-4">
            <ArcNextLinks current="ratios" />
            <CalcTimestamp />
            <div className="flex gap-2 flex-wrap mt-2">
              <TrustBadge label={`Values from: ${dataset?.companyName || 'User entry'}`} variant="source" />
              <TrustBadge label="₹ Indian Market" />
            </div>
            <Disclaimer />
          </div>
        </>
      )}
    </div>
  );
}
