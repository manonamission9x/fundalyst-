'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { computeWC } from '@/lib/calculations';
import { useWCStore } from '@/store';
import { usePageTitle } from '@/lib/use-page-title';
import { useToast } from '@/components/shared/ToastProvider';
import {
  PageHeader,
  Card,
  Toolbar,
  MetricGrid,
  InsightCard,
  WarningCard,
  EmptyState,
  NextLinks,
  Disclaimer,
  DataQualityBar,
  CalcTimestamp,
  TrustBadge,
  DataSourceBadge,
} from '@/components/ui';
import ToolSpreadsheet from '@/components/input/ToolSpreadsheet';
import type { SpreadsheetRow } from '@/components/input/SpreadsheetInput';
import { extractWCFromModel } from '@/store/financial-model-selectors';
import { useModelData } from '@/store/use-model-data';
import { useEnterpriseStore } from '@/store/enterprise-store';
import CalculationTracePanel from '@/components/shared/CalculationTrace';
import ProvenanceBadge from '@/components/shared/ProvenanceBadge';
import { useActiveDataset } from '@/store/financial-model-selectors';
import { findRow, makeTraceSource, type CalculationTrace } from '@/lib/calculation-trace';

function rowsToWCInputs(rows: SpreadsheetRow[]) {
  const result: Record<string, number | null> = {};
  for (const row of rows) {
    const val = row.values[0]?.trim();
    const parsed = val ? Number(val.replace(/,/g, '')) : null;
    result[row.metric] = parsed !== null && Number.isFinite(parsed) ? parsed : null;
  }
  return {
    revenue: result['Revenue (annual)'],
    cogs: result['Cost of Goods Sold'],
    receivables: result['Trade Receivables'],
    inventory: result['Inventory'],
    payables: result['Payables'],
    cash: result['Cash & Equivalents'],
  };
}

export default function WCPage() {
  usePageTitle('Cash Efficiency');
  const showToast = useToast();
  const addAuditEvent = useEnterpriseStore((s) => s.addAuditEvent);
  const { res, setRes, clear: clearStore } = useWCStore();
  const [clearVersion, setClearVersion] = useState<number | undefined>(undefined);
  const clearedRef = useRef(false);
  const [cleared, setCleared] = useState(false);
  const [sheetRows, setSheetRows] = useState<SpreadsheetRow[]>([]);
  const [showResults, setShowResults] = useState(false);

  const modelData = useModelData((ds) => extractWCFromModel(ds));
  const activeDataset = useActiveDataset();

  const prefilledRef = useRef(false);
  const loadedDatasetIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (clearedRef.current) return;
    if (!modelData.data) return;
    if (activeDataset?.id && loadedDatasetIdRef.current === activeDataset.id) return;
    const { revenue, cogs, receivables, inventory, payables, cash } = modelData.data;
    if (revenue !== null || cogs !== null || receivables !== null) {
      const timer = setTimeout(() => {
        setClearVersion(v => (v ?? 0) + 1);
        setSheetRows([
          { metric: 'Revenue (annual)', values: [revenue !== null ? String(revenue) : ''] },
          { metric: 'Cost of Goods Sold', values: [cogs !== null ? String(cogs) : ''] },
          { metric: 'Trade Receivables', values: [receivables !== null ? String(receivables) : ''] },
          { metric: 'Inventory', values: [inventory !== null ? String(inventory) : ''] },
          { metric: 'Payables', values: [payables !== null ? String(payables) : ''] },
          { metric: 'Cash & Equivalents', values: [cash !== null ? String(cash) : ''] },
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
    const inputs = rowsToWCInputs(sheetRows);
    if (inputs.revenue === null && inputs.cogs === null) {
      setRes(null);
      setShowResults(false);
      showToast('Add revenue or COGS plus working-capital values before analyzing.');
      return;
    }
    setRes(computeWC(inputs.revenue, inputs.cogs, inputs.receivables, inputs.inventory, inputs.payables, inputs.cash));
    setShowResults(true);
    addAuditEvent({
      category: 'calculation',
      severity: 'info',
      action: 'Cash efficiency analyzed',
      target: modelData.companyName || 'Manual working capital',
    });
    showToast('Analysis complete');
  }

  const handleClear = useCallback(() => {
    clearedRef.current = true;
    setCleared(true);
    setClearVersion(v => (v ?? 0) + 1);
    clearStore();
    setSheetRows([]);
    setShowResults(false);
  }, [clearStore]);

  const traceItems: CalculationTrace[] = res ? [
    {
      label: 'DSO',
      value: res.dso !== null ? `${Math.round(res.dso)}d` : 'not available',
      formula: '(Trade Receivables / Revenue) x 365',
      sources: [
        makeTraceSource('Trade Receivables', activeDataset, ['receivables', 'tradeReceivables'], findRow(sheetRows, ['Trade Receivables'])),
        makeTraceSource('Revenue', activeDataset, ['revenue'], findRow(sheetRows, ['Revenue (annual)', 'Revenue'])),
      ],
    },
    {
      label: 'DIO',
      value: res.dio !== null ? `${Math.round(res.dio)}d` : 'not available',
      formula: '(Inventory / COGS) x 365',
      sources: [
        makeTraceSource('Inventory', activeDataset, ['inventory'], findRow(sheetRows, ['Inventory'])),
        makeTraceSource('COGS', activeDataset, ['cogs', 'costOfGoodsSold'], findRow(sheetRows, ['Cost of Goods Sold'])),
      ],
    },
    {
      label: 'DPO',
      value: res.dpo !== null ? `${Math.round(res.dpo)}d` : 'not available',
      formula: '(Payables / COGS) x 365',
      sources: [
        makeTraceSource('Payables', activeDataset, ['payables', 'tradePayables'], findRow(sheetRows, ['Payables'])),
        makeTraceSource('COGS', activeDataset, ['cogs', 'costOfGoodsSold'], findRow(sheetRows, ['Cost of Goods Sold'])),
      ],
    },
    {
      label: 'CCC',
      value: `${Math.round(res.ccc)}d`,
      formula: 'DSO + DIO - DPO',
      sources: [
        makeTraceSource('DSO', null, [], undefined, res.dso !== null ? `${Math.round(res.dso)}d` : '0d'),
        makeTraceSource('DIO', null, [], undefined, res.dio !== null ? `${Math.round(res.dio)}d` : '0d'),
        makeTraceSource('DPO', null, [], undefined, res.dpo !== null ? `${Math.round(res.dpo)}d` : '0d'),
      ],
    },
    {
      label: 'Net Working Capital',
      value: String(Math.round(res.nwc)),
      formula: 'Receivables + Inventory + Cash - Payables',
      sources: [
        makeTraceSource('Trade Receivables', activeDataset, ['receivables', 'tradeReceivables'], findRow(sheetRows, ['Trade Receivables'])),
        makeTraceSource('Inventory', activeDataset, ['inventory'], findRow(sheetRows, ['Inventory'])),
        makeTraceSource('Cash & Equivalents', activeDataset, ['cash', 'cashAndEquivalents'], findRow(sheetRows, ['Cash & Equivalents'])),
        makeTraceSource('Payables', activeDataset, ['payables', 'tradePayables'], findRow(sheetRows, ['Payables'])),
      ],
    },
  ] : [];

  return (
    <div>
      <PageHeader
        title="Cash Efficiency"
        subtitle="See whether cash is trapped in receivables, inventory, or payables — DSO, DIO, DPO, and the Cash Conversion Cycle."
        answer="What this helps you answer: How quickly does the company turn operations into cash?"
      />

      <DataQualityBar
        source={modelData.companyName || undefined}
        periods={modelData.companyName ? `Company: ${modelData.companyName}` : undefined}
      />
      <div className="flex items-center gap-2 mb-2 mt-1">
        <DataSourceBadge variant={modelData.companyName ? 'imported' : 'none'} />
        <ProvenanceBadge kind={modelData.companyName ? 'imported' : 'unavailable'} />
      </div>


      <Card label="Cash Efficiency Inputs">
        <div className="card-body">
          <ToolSpreadsheet
            tool="wc"
            singleColumnLabel="₹ Crores"
            initialData={cleared ? undefined : (sheetRows.length > 0 ? sheetRows : undefined)}
            resetKey={clearVersion}
            onDataChange={(rows) => setSheetRows(rows)}
            hint="Enter annual values in ₹ Cr. Tab to navigate."
          />
        </div>
        <Toolbar onClear={handleClear} onAction={analyze} actionLabel="Analyze" />
      </Card>

      {res && showResults && (
        <div id="wc-results">
          <Card label="Cash Conversion Metrics">
            <MetricGrid
              metrics={[
                { label: 'DSO', value: (res.dso !== null ? Math.round(res.dso) : '—') + 'd', sub: 'Days to collect from customers', cls: res.dso !== null && res.dso > 90 ? 'warn' : res.dso !== null && res.dso < 45 ? 'good' : '' },
                { label: 'DIO', value: (res.dio !== null ? Math.round(res.dio) : '—') + 'd', sub: 'Days inventory sits before sold', cls: res.dio !== null && res.dio > 120 ? 'warn' : res.dio !== null && res.dio < 60 ? 'good' : '' },
                { label: 'DPO', value: (res.dpo !== null ? Math.round(res.dpo) : '—') + 'd', sub: 'Days to pay suppliers', cls: res.dpo !== null && res.dpo < 15 ? 'warn' : res.dpo !== null && res.dpo > 45 ? 'good' : '' },
                { label: 'CCC', value: Math.round(res.ccc) + 'd', sub: 'DSO + DIO − DPO. Lower is better.', cls: res.ccc > 90 ? 'warn' : res.ccc < 30 ? 'good' : '' },
              ]}
            />
          </Card>

          <Card className="mt-4">
            {res.dso !== null && res.dso > 90 && <WarningCard level="danger" label="High DSO" text={`Customers take ${Math.round(res.dso)} days on average to pay. This strains working capital.`} />}
            {res.dso !== null && res.dso < 45 && res.dso >= 0 && <InsightCard type="positive" title="Healthy DSO" text={`At ${Math.round(res.dso)} days, the company collects from customers quickly.`} formula="DSO = (Receivables ÷ Revenue) × 365" />}
            {res.dio !== null && res.dio > 120 && <WarningCard level="danger" label="High DIO" text={`Inventory sits for ${Math.round(res.dio)} days before being sold.`} />}
            {res.dio !== null && res.dio < 60 && res.dio >= 0 && <InsightCard type="positive" title="Efficient Inventory" text={`Inventory turns over in ${Math.round(res.dio)} days.`} formula="DIO = (Inventory ÷ COGS) × 365" />}
            {res.dpo !== null && res.dpo < 15 && <WarningCard level="caution" label="Low DPO" text={`Suppliers are paid in just ${Math.round(res.dpo)} days.`} />}
            {res.dpo !== null && res.dpo > 45 && <InsightCard type="positive" title="Favourable DPO" text={`Taking ${Math.round(res.dpo)} days to pay suppliers conserves cash.`} formula="DPO = (Payables ÷ COGS) × 365" />}
            {res.ccc > 60 && <InsightCard type="warning" title="Long Cash Conversion Cycle" text={`At ${Math.round(res.ccc)} days, cash is locked up for a long time.`} formula="CCC = DSO + DIO − DPO" />}
            {res.ccc < 0 && <InsightCard type="positive" title="Negative CCC" text={`A negative CCC (${Math.round(res.ccc)} days) is a strong cash position.`} />}
            {res.nwc < 0 && <WarningCard level="caution" label="Negative Net Working Capital" text="Payables exceed receivables + inventory + cash." />}
          </Card>

          <CalculationTracePanel traces={traceItems} />

          <NextLinks links={[{ label: 'Financial ratios', href: '/tools/ratios' }, { label: 'Estimate value', href: '/tools/dcf' }]} />
          <CalcTimestamp />
          <div className="flex gap-2 flex-wrap mt-2">
            <TrustBadge label={`Values from: ${modelData.companyName || 'User entry'}`} variant="source" />
            <TrustBadge label="₹ Indian Market" />
          </div>
          <Disclaimer extra="CCC = DSO + DIO − DPO" />
        </div>
      )}

      {!showResults && (
        <EmptyState
          title="Cash Efficiency"
          desc="Enter revenue, COGS, and balance sheet figures in the spreadsheet, or import a file, then click Analyze. The tool calculates DSO, DIO, DPO, and the Cash Conversion Cycle."
          action={{ label: 'Import data', href: '/import' }}
        />
      )}
    </div>
  );
}
