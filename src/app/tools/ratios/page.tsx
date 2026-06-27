'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { computeRatios } from '@/lib/calculations';
import { useRatiosStore } from '@/store';
import { useToast } from '@/components/shared/ToastProvider';
import { downloadCSV } from '@/lib/helpers';
import { useActiveDataset, extractRatiosFromModel } from '@/store/financial-model-selectors';
import {
  PageHeader,
  Card,
  Toolbar,
  MetricGrid,
  InsightCard,
  FormulaDisclosure,
  SectionTitle,
  NextLinks,
  CalcTimestamp,
  Disclaimer,
  EmptyState,
  DataQualityBar,
  TrustBadge,
} from '@/components/ui';
import ToolSpreadsheet from '@/components/input/ToolSpreadsheet';
import type { SpreadsheetRow } from '@/components/input/SpreadsheetInput';
import { useModelData } from '@/store/use-model-data';
import type { RatioInputs, RatioResult } from '@/types/financial';

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
    map[row.metric] = val ? Number(val) || 0 : null;
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
  const showToast = useToast();
  const { res, setRes, clear: clearStore } = useRatiosStore();
  const [clearVersion, setClearVersion] = useState(0);
  const [sheetRows, setSheetRows] = useState<SpreadsheetRow[]>([]);
  const [showResults, setShowResults] = useState(false);

  const modelData = useModelData((ds) => extractRatiosFromModel(ds));

  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current) return;
    if (!modelData.data || sheetRows.length > 0) return;
    const { revenue, netProfit, totalAssets, totalEquity, totalDebt, ebit } = modelData.data;
    if (revenue !== null || netProfit !== null || totalAssets !== null) {
      setSheetRows([
        { metric: 'Revenue', values: [revenue !== null ? String(revenue) : ''] },
        { metric: 'Net Profit', values: [netProfit !== null ? String(netProfit) : ''] },
        { metric: 'EBIT', values: [ebit !== null ? String(ebit) : ''] },
        { metric: 'Total Assets', values: [totalAssets !== null ? String(totalAssets) : ''] },
        { metric: 'Total Equity', values: [totalEquity !== null ? String(totalEquity) : ''] },
        { metric: 'Total Debt', values: [totalDebt !== null ? String(totalDebt) : ''] },
      ]);
      prefilledRef.current = true;
    }
  }, [modelData.data, sheetRows.length]);

  function analyze() {
    const data = rowsToRatioData(sheetRows);
    setRes(computeRatios(data));
    setShowResults(true);
    showToast('Ratios calculated');
  }

  const handleClear = useCallback(() => {
    setClearVersion(v => v + 1);
    clearStore();
    setSheetRows([]);
    setShowResults(false);
  }, [clearStore]);

  const grouped = res ? groupBySection(res) : [];

  return (
    <div>
      <PageHeader
        title="Financial Ratios"
        subtitle="Enter just 6 numbers — get 5 key ratios instantly."
        answer="What this helps you answer: Is the company financially healthy? Can it cover debts?"
      />

      <DataQualityBar source={modelData.isLoaded ? `Model: ${modelData.companyName || 'Loaded'}` : 'Manual mode'} />

      <Card label="Required (6 fields)">
        <div className="card-body">
          <ToolSpreadsheet
            tool="ratios"
            singleColumnLabel="₹ Cr"
            initialData={sheetRows.length > 0 ? sheetRows : undefined}
            resetKey={clearVersion}
            onDataChange={(rows) => setSheetRows(rows)}
            hint="Enter values in ₹ Cr. These 6 fields unlock: Net Profit Margin, ROE, Debt/Equity, Debt/Assets, Asset Turnover."
          />
        </div>
        <Toolbar onClear={handleClear} onAction={analyze} actionLabel="Calculate" hint="Fill in at least Revenue and Net Profit" />
      </Card>

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
              <TrustBadge label="Ratio Analysis" variant="source" />
              <TrustBadge label="₹ Indian Market" />
            </div>
            <Disclaimer />
          </div>
        </>
      )}

      {!showResults && (
        <EmptyState title="No ratio data yet" desc="Enter 6 key numbers in the spreadsheet above, then click Calculate. The tool unlocks Net Profit Margin, ROE, Debt/Equity, Debt/Assets, and Asset Turnover." action={{ label: 'Import data', href: '/import' }} />
      )}
    </div>
  );
}
