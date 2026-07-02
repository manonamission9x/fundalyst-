'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { computeRatios } from '@/lib/calculations';
import { useRatiosStore } from '@/store';
import { usePageTitle } from '@/lib/use-page-title';
import { useToast } from '@/components/shared/ToastProvider';
import { downloadCSV } from '@/lib/helpers';
import { extractRatiosFromModel } from '@/store/financial-model-selectors';
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
  NextLinks,
  CalcTimestamp,
  Disclaimer,
  EmptyState,
  DataQualityBar,
  TrustBadge,
  DataSourceBadge,
} from '@/components/ui';
import ToolSpreadsheet from '@/components/input/ToolSpreadsheet';
import type { SpreadsheetRow } from '@/components/input/SpreadsheetInput';
import { useModelData } from '@/store/use-model-data';
import type { RatioInputs, RatioResult } from '@/types/financial';
import { useEnterpriseStore } from '@/store/enterprise-store';
import CalculationTracePanel from '@/components/shared/CalculationTrace';
import { useActiveDataset } from '@/store/financial-model-selectors';
import { findRow, makeTraceSource, type CalculationTrace } from '@/lib/calculation-trace';
import ProvenanceBadge from '@/components/shared/ProvenanceBadge';

const RATIOS_TOOL = TOOL_BY_ID.ratios;
const RATIOS_COUNT = RATIOS_TOOL.count ?? RATIOS_TOOL.value;
const RATIOS_INPUTS = RATIOS_TOOL.inputs ?? '6 inputs';

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

function rowsToRatioData(rows: SpreadsheetRow[]): RatioInputs {
  const map: Record<string, number | null> = {};
  for (const row of rows) {
    const val = row.values[0]?.trim();
    const parsed = val ? Number(val.replace(/,/g, '')) : null;
    map[row.metric] = parsed !== null && Number.isFinite(parsed) ? parsed : null;
  }
  return {
    revenue: map['Revenue'] ?? null,
    netProfit: map['Net Profit'] ?? null,
    ebit: map['EBIT'] ?? null,
    totalAssets: map['Total Assets'] ?? null,
    totalEquity: map['Total Equity'] ?? null,
    totalDebt: map['Total Debt'] ?? null,
    cogs: null, currentAssets: null, currentLiab: null, inventory: null, interest: null,
  };
}

export default function RatiosPage() {
  usePageTitle('Financial Ratios');
  const showToast = useToast();
  const addAuditEvent = useEnterpriseStore((s) => s.addAuditEvent);
  const { res, setRes, clear: clearStore } = useRatiosStore();
  const [clearVersion, setClearVersion] = useState<number | undefined>(undefined);
  const clearedRef = useRef(false);
  const [cleared, setCleared] = useState(false);
  const [sheetRows, setSheetRows] = useState<SpreadsheetRow[]>([]);
  const [showResults, setShowResults] = useState(false);

  const modelData = useModelData((ds) => extractRatiosFromModel(ds));
  const activeDataset = useActiveDataset();

  const prefilledRef = useRef(false);
  const loadedDatasetIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (clearedRef.current) return;
    if (!modelData.data) return;
    if (activeDataset?.id && loadedDatasetIdRef.current === activeDataset.id) return;
    const { revenue, netProfit, totalAssets, totalEquity, totalDebt, ebit } = modelData.data;
    if (revenue !== null || netProfit !== null || totalAssets !== null) {
      const timer = setTimeout(() => {
        setClearVersion(v => (v ?? 0) + 1);
        setSheetRows([
          { metric: 'Revenue', values: [revenue !== null ? String(revenue) : ''] },
          { metric: 'Net Profit', values: [netProfit !== null ? String(netProfit) : ''] },
          { metric: 'EBIT', values: [ebit !== null ? String(ebit) : ''] },
          { metric: 'Total Assets', values: [totalAssets !== null ? String(totalAssets) : ''] },
          { metric: 'Total Equity', values: [totalEquity !== null ? String(totalEquity) : ''] },
          { metric: 'Total Debt', values: [totalDebt !== null ? String(totalDebt) : ''] },
        ]);
        setRes(null);
        setShowResults(false);
        loadedDatasetIdRef.current = activeDataset?.id ?? null;
      }, 0);
      prefilledRef.current = true;
      return () => clearTimeout(timer);
    }
  }, [activeDataset?.id, modelData.data, setRes]);

  function analyze() {
    const data = rowsToRatioData(sheetRows);
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
      target: modelData.companyName || 'Manual ratios',
      details: `${next.length} ratio(s)`,
    });
    showToast('Ratios calculated');
  }

  const handleClear = useCallback(() => {
    clearedRef.current = true;
    setCleared(true);
    setClearVersion(v => (v ?? 0) + 1);
    clearStore();
    setSheetRows([]);
    setShowResults(false);
  }, [clearStore]);

  const grouped = res ? groupBySection(res) : [];
  const traceItems = res
    ? res.map((ratio): CalculationTrace | null => {
        const config = ratioTraceConfig[ratio.label];
        if (!config) return null;
        return {
          label: ratio.label,
          value: ratio.value,
          formula: config.formula,
          sources: config.sources.map((source) => makeTraceSource(
            source.label,
            activeDataset,
            source.metricKeys,
            findRow(sheetRows, source.rowLabels),
          )),
        };
      }).filter((item): item is CalculationTrace => item !== null)
    : [];

  return (
    <div>
      <PageHeader
        kicker="Valuation"
        title={RATIOS_TOOL.label}
        subtitle={`${RATIOS_INPUTS} unlock ${RATIOS_COUNT}.`}
        answer={RATIOS_TOOL.answer}
      />

      <DataQualityBar source={modelData.companyName || undefined} />
      <div className="flex items-center gap-2 mb-2 mt-1">
        <DataSourceBadge variant={modelData.companyName ? 'imported' : 'none'} />
        <ProvenanceBadge kind={modelData.companyName ? 'imported' : 'unavailable'} />
      </div>
      {modelData.companyName && (
        <p className="text-2xs text-muted mb-3">
          ✓ Ratios sourced from imported dataset ({modelData.companyName}). Clear the form to enter values manually.
        </p>
      )}

      <Card label={`Required (${RATIOS_INPUTS})`}>
        <div className="card-body">
          <ToolSpreadsheet
            tool="ratios"
            singleColumnLabel="₹ Cr"
            initialData={cleared ? undefined : (sheetRows.length > 0 ? sheetRows : undefined)}
            resetKey={clearVersion}
            onDataChange={(rows) => setSheetRows(rows)}
            hint={`${RATIOS_INPUTS} unlock: Net Profit Margin, ROE, Debt/Equity, Debt/Assets, Asset Turnover.`}
          />
        </div>
        <Toolbar onClear={handleClear} onAction={analyze} actionLabel="Calculate" hint={`Add the ${RATIOS_INPUTS} to calculate ${RATIOS_COUNT}.`} />
      </Card>

      {res && showResults && (() => {
        // Hero decision (§2): the one ratio most out of range.
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
            <NextLinks links={[{ label: 'Cash efficiency', href: '/tools/wc' }, { label: 'Estimate value', href: '/tools/dcf' }]} />
            <CalcTimestamp />
            <div className="flex gap-2 flex-wrap mt-2">
              <TrustBadge label={`Values from: ${modelData.companyName || 'User entry'}`} variant="source" />
              <TrustBadge label="₹ Indian Market" />
            </div>
            <Disclaimer />
          </div>
        </>
      )}

      {!showResults && (
        <EmptyState title={RATIOS_TOOL.label} desc={RATIOS_TOOL.description} action={{ label: 'Import data', href: '/import' }} />
      )}
    </div>
  );
}
