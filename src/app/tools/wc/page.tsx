'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { computeWC, fmtNum } from '@/lib/calculations';
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
} from '@/components/ui';
import ToolSpreadsheet from '@/components/input/ToolSpreadsheet';
import type { SpreadsheetRow } from '@/components/input/SpreadsheetInput';
import { useActiveDataset, extractWCFromModel } from '@/store/financial-model-selectors';
import { useModelData } from '@/store/use-model-data';

const WC_METRICS = ['Revenue (annual)', 'Cost of Goods Sold', 'Trade Receivables', 'Inventory', 'Payables', 'Cash & Equivalents'];

function rowsToWCInputs(rows: SpreadsheetRow[]) {
  const result: Record<string, number | null> = {};
  for (const row of rows) {
    const val = row.values[0]?.trim();
    result[row.metric] = val ? Number(val) || 0 : null;
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
  const { res, setRes, clear: clearStore } = useWCStore();
  const [clearVersion, setClearVersion] = useState(0);
  const clearedRef = useRef(false);
  const [sheetRows, setSheetRows] = useState<SpreadsheetRow[]>([]);
  const [showResults, setShowResults] = useState(false);

  const modelData = useModelData((ds) => extractWCFromModel(ds));

  const prefilledRef = useRef(false);
  useEffect(() => {
    if (clearedRef.current) return;
    if (prefilledRef.current) return;
    if (!modelData.data || sheetRows.length > 0) return;
    const { revenue, cogs, receivables, inventory, payables, cash } = modelData.data;
    if (revenue !== null || cogs !== null || receivables !== null) {
      setSheetRows([
        { metric: 'Revenue (annual)', values: [revenue !== null ? String(revenue) : ''] },
        { metric: 'Cost of Goods Sold', values: [cogs !== null ? String(cogs) : ''] },
        { metric: 'Trade Receivables', values: [receivables !== null ? String(receivables) : ''] },
        { metric: 'Inventory', values: [inventory !== null ? String(inventory) : ''] },
        { metric: 'Payables', values: [payables !== null ? String(payables) : ''] },
        { metric: 'Cash & Equivalents', values: [cash !== null ? String(cash) : ''] },
      ]);
      prefilledRef.current = true;
    }
  }, [modelData.data, sheetRows.length]);

  function analyze() {
    const inputs = rowsToWCInputs(sheetRows);
    setRes(computeWC(inputs.revenue, inputs.cogs, inputs.receivables, inputs.inventory, inputs.payables, inputs.cash));
    setShowResults(true);
    showToast('Analysis complete');
  }

  const handleClear = useCallback(() => {
    clearedRef.current = true;
    setClearVersion(v => v + 1);
    clearStore();
    setSheetRows([]);
    setShowResults(false);
  }, [clearStore]);

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

      <Card label="Cash Efficiency Inputs">
        <div className="card-body">
          <ToolSpreadsheet
            tool="wc"
            singleColumnLabel="₹ Crores"
            initialData={clearedRef.current ? undefined : (sheetRows.length > 0 ? sheetRows : undefined)}
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

          <NextLinks links={[{ label: 'Financial ratios', href: '/tools/ratios' }, { label: 'Estimate value', href: '/tools/dcf' }]} />
          <CalcTimestamp />
          <div className="flex gap-2 flex-wrap mt-2">
            <TrustBadge label="Cash Conversion Cycle" variant="source" />
            <TrustBadge label="₹ Indian Market" />
          </div>
          <Disclaimer extra="CCC = DSO + DIO − DPO" />
        </div>
      )}

      {!showResults && (
        <EmptyState
          title="No cash efficiency data yet"
          desc="Enter revenue, COGS, and balance sheet figures in the spreadsheet above, then click Analyze. The tool calculates DSO, DIO, DPO, and the Cash Conversion Cycle."
          action={{ label: 'Import data', href: '/import' }}
        />
      )}
    </div>
  );
}
