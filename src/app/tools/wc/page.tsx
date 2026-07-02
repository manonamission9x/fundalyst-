'use client';

import { useState, useCallback, useMemo } from 'react';
import { computeWC } from '@/lib/calculations';
import { useWCStore } from '@/store';
import { usePageTitle } from '@/lib/use-page-title';
import { useToast } from '@/components/shared/ToastProvider';
import {
  PageHeader,
  Card,
  Toolbar,
  MetricGrid,
  HeroDecision,
  InsightCard,
  WarningCard,
  EmptyState,
  ArcNextLinks,
  Disclaimer,
  DataQualityBar,
  CalcTimestamp,
  TrustBadge,
  DataSourceBadge,
} from '@/components/ui';
import ModelBoundSpreadsheet from '@/components/input/ModelBoundSpreadsheet';
import { useActiveDataset } from '@/store/financial-model-selectors';
import { useGlobalDataStore } from '@/store/global-data-store';
import { useEnterpriseStore } from '@/store/enterprise-store';
import CalculationTracePanel from '@/components/shared/CalculationTrace';
import ProvenanceBadge from '@/components/shared/ProvenanceBadge';
import { makeTraceSource } from '@/lib/calculation-trace';
import type { CalculationTrace } from '@/lib/calculation-trace';

/** WC metric keys as stored in the model */
const WC_METRICS = [
  'Revenue (annual)',
  'Cost of Goods Sold',
  'Trade Receivables',
  'Inventory',
  'Payables',
  'Cash & Equivalents',
] as const;

/** Read WC inputs from the canonical model */
function readWCInputs(dataset: NonNullable<ReturnType<typeof useActiveDataset>>) {
  const latestPeriod = dataset.periods[dataset.periods.length - 1] || 'Value';
  const find = (metric: string): number | null => {
    const f = dataset.facts.find((f) => f.metric === metric && f.periodLabel === latestPeriod);
    return f && isFinite(f.value) ? f.value : null;
  };

  return {
    revenue: find('Revenue (annual)'),
    cogs: find('Cost of Goods Sold'),
    receivables: find('Trade Receivables'),
    inventory: find('Inventory'),
    payables: find('Payables'),
    cash: find('Cash & Equivalents'),
  };
}

export default function WCPage() {
  usePageTitle('Cash Efficiency');
  const showToast = useToast();
  const addAuditEvent = useEnterpriseStore((s) => s.addAuditEvent);
  const { res, setRes, clear: clearStore } = useWCStore();
  const dataset = useActiveDataset();
  const hasData = dataset && dataset.facts.length > 0;

  const [showResults, setShowResults] = useState(false);

  function analyze() {
    if (!hasData) {
      showToast('No data available. Import a financial report first.');
      return;
    }
    const inputs = readWCInputs(dataset);
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
      target: dataset?.companyName || 'Manual working capital',
    });
    showToast('Analysis complete');
  }

  const handleClear = useCallback(() => {
    if (!dataset) return;
    const store = useGlobalDataStore.getState();
    for (const metric of WC_METRICS) {
      const fact = dataset.facts.find((f) => f.metric === metric);
      if (fact) {
        store.deleteFact(dataset.id, metric, fact.periodLabel);
      }
    }
    clearStore();
    setShowResults(false);
  }, [dataset, clearStore]);

  const traceItems: CalculationTrace[] = useMemo(() => {
    if (!res || !dataset) return [];
    const latestPeriod = dataset.periods[dataset.periods.length - 1] || 'Value';

    const findRowData = (metric: string) => {
      const f = dataset.facts.find((f) => f.metric === metric && f.periodLabel === latestPeriod);
      return f ? { metric: f.metric, values: [String(f.value)] } : undefined;
    };

    return [
      {
        label: 'DSO',
        value: res.dso !== null ? `${Math.round(res.dso)}d` : 'not available',
        formula: '(Trade Receivables / Revenue) x 365',
        sources: [
          makeTraceSource('Trade Receivables', dataset, ['receivables', 'tradeReceivables'], findRowData('Trade Receivables')),
          makeTraceSource('Revenue', dataset, ['revenue'], findRowData('Revenue (annual)')),
        ],
      },
      {
        label: 'DIO',
        value: res.dio !== null ? `${Math.round(res.dio)}d` : 'not available',
        formula: '(Inventory / COGS) x 365',
        sources: [
          makeTraceSource('Inventory', dataset, ['inventory'], findRowData('Inventory')),
          makeTraceSource('COGS', dataset, ['cogs', 'costOfGoodsSold'], findRowData('Cost of Goods Sold')),
        ],
      },
      {
        label: 'DPO',
        value: res.dpo !== null ? `${Math.round(res.dpo)}d` : 'not available',
        formula: '(Payables / COGS) x 365',
        sources: [
          makeTraceSource('Payables', dataset, ['payables', 'tradePayables'], findRowData('Payables')),
          makeTraceSource('COGS', dataset, ['cogs', 'costOfGoodsSold'], findRowData('Cost of Goods Sold')),
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
          makeTraceSource('Trade Receivables', dataset, ['receivables', 'tradeReceivables'], findRowData('Trade Receivables')),
          makeTraceSource('Inventory', dataset, ['inventory'], findRowData('Inventory')),
          makeTraceSource('Cash & Equivalents', dataset, ['cash', 'cashAndEquivalents'], findRowData('Cash & Equivalents')),
          makeTraceSource('Payables', dataset, ['payables', 'tradePayables'], findRowData('Payables')),
        ],
      },
    ];
  }, [res, dataset]);

  // Empty state — only when no dataset exists
  if (!hasData) {
    return (
      <div>
        <PageHeader
          kicker="Valuation"
          title="Cash Efficiency"
          subtitle="See whether cash is trapped in receivables, inventory, or payables — DSO, DIO, DPO, and the Cash Conversion Cycle."
          answer="What this helps you answer: How quickly does the company turn operations into cash?"
        />
        <EmptyState
          title="No financial data"
          desc="Import a financial report to see pre-filled cash efficiency inputs and analyze working capital."
          action={{ label: 'Import data', href: '/import' }}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        kicker="Valuation"
        title="Cash Efficiency"
        subtitle="See whether cash is trapped in receivables, inventory, or payables — DSO, DIO, DPO, and the Cash Conversion Cycle."
        answer="What this helps you answer: How quickly does the company turn operations into cash?"
      />

      <DataQualityBar source={dataset?.companyName || undefined} />
      <div className="flex items-center gap-2 mb-2 mt-1">
        <DataSourceBadge variant="imported" />
        <ProvenanceBadge kind="imported" />
      </div>

      <Card label="Cash Efficiency Inputs">
        <div className="card-body">
          <ModelBoundSpreadsheet
            statement="all"
            singleColumnLabel="₹ Crores"
            hint="Enter annual values in ₹ Cr. Tab to navigate. Edits write back to the model — every surface updates live."
          />
        </div>
        <Toolbar onClear={handleClear} onAction={analyze} actionLabel="Analyze" />
      </Card>

      {res && showResults && (
        <div id="wc-results">
          <HeroDecision
            label="Cash conversion cycle"
            value={`${Math.round(res.ccc)} days`}
            sign={res.ccc <= 30 ? 'positive' : res.ccc > 90 ? 'negative' : 'neutral'}
            sub="DSO + DIO − DPO. Lower means cash is freed up faster."
          />
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

          <ArcNextLinks current="wc" />
          <CalcTimestamp />
          <div className="flex gap-2 flex-wrap mt-2">
            <TrustBadge label={`Values from: ${dataset?.companyName || 'User entry'}`} variant="source" />
            <TrustBadge label="₹ Indian Market" />
          </div>
          <Disclaimer extra="CCC = DSO + DIO − DPO" />
        </div>
      )}
    </div>
  );
}
