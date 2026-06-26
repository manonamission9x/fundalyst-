'use client';

import { computeWC, fmtNum } from '@/lib/calculations';
import { readFile } from '@/lib/helpers';
import { useWCStore } from '@/store';
import { useToast } from '@/components/shared/ToastProvider';
import {
  PageHeader,
  Card,
  UploadBar,
  FieldGrid,
  Field,
  Toolbar,
  MetricGrid,
  InsightCard,
  WarningCard,
  EmptyState,
  NextLinks,
  Disclaimer,
  DataQualityBar,
} from '@/components/ui';
import { useGlobalImportFill, extractWCInputs, getDataSourceLabel } from '@/lib/importer/import-hooks';

export default function WCPage() {
  const showToast = useToast();
  const { inputs, res, setInput, setRes, clear } = useWCStore();

  const dataInfo = useGlobalImportFill(
    (vals) => {
      Object.entries(vals).forEach(([key, val]) => setInput(key as keyof typeof inputs, val));
    },
    extractWCInputs
  );

  async function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFile(file);
      const rows = text.split('\n').filter(Boolean);
      if (rows.length < 2) return;
      const vals = rows[1].split(',').map((s) => parseFloat(s.trim()));
      if (vals.length >= 6) {
        setInput('revenue', vals[0] || 0);
        setInput('cogs', vals[1] || 0);
        setInput('receivables', vals[2] || 0);
        setInput('inventory', vals[3] || 0);
        setInput('payables', vals[4] || 0);
        setInput('cash', vals[5] || 0);
        showToast('Loaded ' + vals.length + ' values');
      }
    } catch (err: unknown) {
      showToast('Error reading file: ' + (err instanceof Error ? err.message : 'unknown'));
    }
    e.target.value = '';
  }

  function analyze() {
    setRes(computeWC(
      inputs.revenue === '' ? null : Number(inputs.revenue),
      inputs.cogs === '' ? null : Number(inputs.cogs),
      inputs.receivables === '' ? null : Number(inputs.receivables),
      inputs.inventory === '' ? null : Number(inputs.inventory),
      inputs.payables === '' ? null : Number(inputs.payables),
      inputs.cash === '' ? null : Number(inputs.cash)
    ));
  }

  function handleClear() {
    clear();
  }

  return (
    <div>
      <PageHeader
        title="Cash Efficiency"
        subtitle="See whether cash is trapped in receivables, inventory, or payables — DSO, DIO, DPO, and the Cash Conversion Cycle."
        answer="What this helps you answer: How quickly does the company turn operations into cash?"
      />

      <DataQualityBar
        source={getDataSourceLabel(dataInfo.dataSource, dataInfo.companyName)}
        periods={dataInfo.companyName ? `Company: ${dataInfo.companyName}` : undefined}
        metrics={dataInfo.dataSource !== 'none' ? undefined : undefined}
      />

      <UploadBar onUpload={handleCsv} hint="CSV: Revenue, COGS, Receivables, Inventory, Payables, Cash" />

      <Card label="Inputs (₹ Cr)">
        <FieldGrid>
          {[
            { l: 'Revenue (annual)', key: 'revenue' as const },
            { l: 'Cost of goods sold', key: 'cogs' as const },
            { l: 'Trade receivables', key: 'receivables' as const },
            { l: 'Inventory', key: 'inventory' as const },
            { l: 'Payables', key: 'payables' as const },
            { l: 'Cash & equivalents', key: 'cash' as const },
          ].map((f) => (
            <Field key={f.key} label={f.l} value={inputs[f.key]} onChange={(v) => setInput(f.key, v)} />
          ))}
        </FieldGrid>
        <Toolbar onClear={handleClear} onAction={analyze} actionLabel="Analyze" />
      </Card>

      {res && (
        <>
          <Card label="Cash Conversion Metrics">
            <MetricGrid
              metrics={[
                {
                  label: 'DSO',
                  value: (res.dso !== null ? Math.round(res.dso) : '—') + 'd',
                  sub: 'Days to collect from customers',
                  cls: res.dso !== null && res.dso > 90 ? 'warn' : res.dso !== null && res.dso < 45 ? 'good' : '',
                },
                {
                  label: 'DIO',
                  value: (res.dio !== null ? Math.round(res.dio) : '—') + 'd',
                  sub: 'Days inventory sits before sold',
                  cls: res.dio !== null && res.dio > 120 ? 'warn' : res.dio !== null && res.dio < 60 ? 'good' : '',
                },
                {
                  label: 'DPO',
                  value: (res.dpo !== null ? Math.round(res.dpo) : '—') + 'd',
                  sub: 'Days to pay suppliers',
                  cls: res.dpo !== null && res.dpo < 15 ? 'warn' : res.dpo !== null && res.dpo > 45 ? 'good' : '',
                },
                {
                  label: 'CCC',
                  value: Math.round(res.ccc) + 'd',
                  sub: 'DSO + DIO − DPO. Lower is better.',
                  cls: res.ccc > 90 ? 'warn' : res.ccc < 30 ? 'good' : '',
                },
              ]}
            />
          </Card>

          <Card style={{ marginTop: '1.5rem' }}>
            {res.dso !== null && res.dso > 90 && (
              <WarningCard
                level="danger"
                label="High DSO"
                text={`Customers take ${Math.round(res.dso)} days on average to pay. This strains working capital. Consider tighter credit terms.`}
              />
            )}
            {res.dso !== null && res.dso < 45 && res.dso >= 0 && (
              <InsightCard
                type="positive"
                title="Healthy DSO"
                text={`At ${Math.round(res.dso)} days, the company collects from customers quickly, keeping cash flowing.`}
                formula="DSO = (Receivables ÷ Revenue) × 365"
              />
            )}
            {res.dio !== null && res.dio > 120 && (
              <WarningCard
                level="danger"
                label="High DIO"
                text={`Inventory sits for ${Math.round(res.dio)} days before being sold. This may signal slow-moving stock or overstocking.`}
              />
            )}
            {res.dio !== null && res.dio < 60 && res.dio >= 0 && (
              <InsightCard
                type="positive"
                title="Efficient Inventory"
                text={`Inventory turns over in ${Math.round(res.dio)} days — the company isn't tying up cash in unsold goods.`}
                formula="DIO = (Inventory ÷ COGS) × 365"
              />
            )}
            {res.dpo !== null && res.dpo < 15 && (
              <WarningCard
                level="caution"
                label="Low DPO"
                text={`Suppliers are paid in just ${Math.round(res.dpo)} days. The company may be missing out on free financing by paying too early.`}
              />
            )}
            {res.dpo !== null && res.dpo > 45 && (
              <InsightCard
                type="positive"
                title="Favourable DPO"
                text={`Taking ${Math.round(res.dpo)} days to pay suppliers helps conserve cash. This is beneficial as long as supplier relationships aren't strained.`}
                formula="DPO = (Payables ÷ COGS) × 365"
              />
            )}
            {res.ccc > 60 && (
              <InsightCard
                type="warning"
                title="Long Cash Conversion Cycle"
                text={`At ${Math.round(res.ccc)} days, cash is locked up for a long time. Focus on reducing DSO/DIO or negotiating longer payment terms.`}
                formula="CCC = DSO + DIO − DPO"
              />
            )}
            {res.ccc < 0 && (
              <InsightCard
                type="positive"
                title="Negative CCC"
                text={`A negative CCC (${Math.round(res.ccc)} days) means the company gets paid by customers before it has to pay suppliers — a strong cash position.`}
              />
            )}
            {res.nwc < 0 && (
              <WarningCard
                level="caution"
                label="Negative Net Working Capital"
                text="Payables exceed receivables + inventory + cash. While this can signal efficiency, it may also indicate liquidity pressure if demand slows."
              />
            )}
            {res.dso !== null && res.dso >= 45 && res.dso <= 90 && (
              <InsightCard
                type="info"
                title="DSO in Check"
                text={`At ${Math.round(res.dso)} days, DSO is within a reasonable range. Monitor for any upward trend.`}
                formula="DSO = (Receivables ÷ Revenue) × 365"
              />
            )}
            {res.dio !== null && res.dio >= 60 && res.dio <= 120 && (
              <InsightCard
                type="info"
                title="DIO Within Range"
                text={`Inventory sits for ${Math.round(res.dio)} days — typical for many industries. Compare with peers for context.`}
                formula="DIO = (Inventory ÷ COGS) × 365"
              />
            )}
            {res.dpo !== null && res.dpo >= 15 && res.dpo <= 45 && (
              <InsightCard
                type="info"
                title="DPO at Typical Levels"
                text={`Paying suppliers in ${Math.round(res.dpo)} days is within the normal range.`}
                formula="DPO = (Payables ÷ COGS) × 365"
              />
            )}
            {res.ccc >= 0 && res.ccc <= 60 && (
              <InsightCard
                type="positive"
                title="Healthy CCC"
                text={`At ${Math.round(res.ccc)} days, the cash conversion cycle is well-managed. Cash isn't tied up for too long.`}
                formula="CCC = DSO + DIO − DPO"
              />
            )}
          </Card>

          <NextLinks
            links={[
              { label: 'Financial ratios', href: '/tools/ratios' },
              { label: 'Estimate value', href: '/tools/dcf' },
            ]}
          />
          <Disclaimer extra="CCC = DSO + DIO − DPO" />
        </>
      )}

      {!res && (
        <EmptyState
          title="Enter revenue, COGS, and balance sheet figures above, then click Analyze."
          desc="Or upload a CSV with: Revenue, COGS, Receivables, Inventory, Payables, Cash"
        />
      )}
    </div>
  );
}
