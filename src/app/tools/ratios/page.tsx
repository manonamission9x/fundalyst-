'use client';

import { computeRatios } from '@/lib/calculations';
import { useRatiosStore } from '@/store';
import { useToast } from '@/components/shared/ToastProvider';
import { downloadCSV, readFile } from '@/lib/helpers';
import {
  PageHeader,
  Card,
  UploadBar,
  FieldGrid,
  Field,
  Toolbar,
  MetricGrid,
  InsightCard,
  FormulaDisclosure,
  SectionTitle,
  NextLinks,
  Disclaimer,
  EmptyState,
  DataQualityBar,
} from '@/components/ui';
import { useGlobalImportFill, extractRatiosInputs, getDataSourceLabel } from '@/lib/importer/import-hooks';
import type { RatioResult } from '@/types/financial';

const fields = [
  { k: 'revenue' as const, l: 'Revenue' },
  { k: 'cogs' as const, l: 'COGS' },
  { k: 'netProfit' as const, l: 'Net profit' },
  { k: 'totalAssets' as const, l: 'Total assets' },
  { k: 'totalEquity' as const, l: 'Total equity' },
  { k: 'totalDebt' as const, l: 'Total debt' },
  { k: 'currentAssets' as const, l: 'Current assets' },
  { k: 'currentLiab' as const, l: 'Current liabilities' },
  { k: 'inventory' as const, l: 'Inventory' },
  { k: 'interest' as const, l: 'Interest expense' },
  { k: 'ebit' as const, l: 'EBIT' },
];

const keys = fields.map((f) => f.k);

/** Formula string for each ratio label */
const formulaFor: Record<string, string> = {
  'Current Ratio': 'Current Assets ÷ Current Liabilities',
  'Quick Ratio': '(Current Assets − Inventory) ÷ Current Liabilities',
  'Debt/Equity': 'Total Debt ÷ Total Equity',
  'Debt/Assets': 'Total Debt ÷ Total Assets',
  'Interest Coverage': 'EBIT ÷ Interest Expense',
  'Gross Margin': '(Revenue − COGS) ÷ Revenue',
  'Net Profit Margin': 'Net Profit ÷ Revenue',
  'ROE': 'Net Profit ÷ Total Equity',
  'Asset Turnover': 'Revenue ÷ Total Assets',
};

/** Insight data for each ratio label */
function insightFor(r: RatioResult): { type: 'positive' | 'risk' | 'warning' | 'info'; title: string; text: string } {
  switch (r.label) {
    case 'Current Ratio':
      return {
        type: r.cls === 'good' ? 'positive' : r.cls === 'warn' ? 'risk' : 'info',
        title: r.cls === 'good' ? 'Healthy liquidity buffer' : r.cls === 'warn' ? 'Liquidity risk' : 'Neutral liquidity',
        text: r.cls === 'good'
          ? 'Current assets comfortably cover short-term liabilities. The company can meet its obligations without strain.'
          : r.cls === 'warn'
            ? 'Current assets may fall short of current liabilities, signalling potential cash flow pressure.'
            : 'Current assets adequately cover liabilities, but there is limited headroom for unexpected shocks.',
      };
    case 'Quick Ratio':
      return {
        type: r.cls === 'good' ? 'positive' : r.cls === 'warn' ? 'risk' : 'info',
        title: r.cls === 'good' ? 'Strong quick liquidity' : r.cls === 'warn' ? 'Acid-test concern' : 'Adequate acid-test',
        text: r.cls === 'good'
          ? 'Even after excluding inventory, liquid assets cover short-term debts. The company is well-positioned for emergencies.'
          : r.cls === 'warn'
            ? 'The company relies heavily on inventory to meet obligations. A sales slowdown could cause liquidity issues.'
            : 'Quick assets are roughly on par with current liabilities — adequate but not comfortable.',
      };
    case 'Debt/Equity':
      return {
        type: r.cls === 'good' ? 'positive' : r.cls === 'warn' ? 'risk' : 'info',
        title: r.cls === 'good' ? 'Conservative leverage' : r.cls === 'warn' ? 'High leverage' : 'Moderate leverage',
        text: r.cls === 'good'
          ? 'Debt is well below equity, meaning the company finances itself mostly through shareholder funds. Low financial risk.'
          : r.cls === 'warn'
            ? 'Debt significantly exceeds equity, increasing financial risk and interest burden.'
            : 'Debt and equity are balanced. The company uses moderate leverage.',
      };
    case 'Debt/Assets':
      return {
        type: r.cls === 'good' ? 'positive' : r.cls === 'warn' ? 'risk' : 'info',
        title: r.cls === 'good' ? 'Low debt burden' : r.cls === 'warn' ? 'High debt burden' : 'Manageable debt',
        text: r.cls === 'good'
          ? 'Less than half of assets are financed by debt. The balance sheet is strong.'
          : r.cls === 'warn'
            ? 'Over 70% of assets are debt-funded, leaving little margin for downturns.'
            : 'A moderate portion of assets is financed through debt — within typical ranges.',
      };
    case 'Interest Coverage':
      return {
        type: r.cls === 'good' ? 'positive' : r.cls === 'warn' ? 'risk' : 'info',
        title: r.cls === 'good' ? 'Earnings cover interest comfortably' : r.cls === 'warn' ? 'Interest coverage concern' : 'Adequate coverage',
        text: r.cls === 'good'
          ? 'Operating earnings are more than 3× the interest expense, leaving a wide safety margin.'
          : r.cls === 'warn'
            ? 'Earnings barely cover interest payments. A small dip in profits could threaten debt servicing.'
            : 'Interest payments are covered, but with limited spare capacity.',
      };
    case 'Gross Margin':
      return {
        type: r.cls === 'good' ? 'positive' : r.cls === 'warn' ? 'risk' : 'info',
        title: r.cls === 'good' ? 'Strong gross profitability' : r.cls === 'warn' ? 'Thin gross margin' : 'Average gross margin',
        text: r.cls === 'good'
          ? 'The company retains more than 30% of revenue after direct costs, indicating strong pricing power or cost control.'
          : r.cls === 'warn'
            ? 'Gross margin is below 15%, leaving little room for operating expenses and shocks.'
            : 'Gross margin is in a reasonable range — watch for cost inflation.',
      };
    case 'Net Profit Margin':
      return {
        type: r.cls === 'good' ? 'positive' : r.cls === 'warn' ? 'risk' : 'info',
        title: r.cls === 'good' ? 'Healthy net profitability' : r.cls === 'warn' ? 'Low net margin' : 'Moderate net margin',
        text: r.cls === 'good'
          ? 'Over 10% of revenue flows through to net profit — the company is efficiently managed top to bottom.'
          : r.cls === 'warn'
            ? 'Net profit margin below 3% means a very small cushion against downturns.'
            : 'Net profit margin is reasonable but room for improvement exists.',
      };
    case 'ROE':
      return {
        type: r.cls === 'good' ? 'positive' : r.cls === 'warn' ? 'risk' : 'info',
        title: r.cls === 'good' ? 'Strong return on equity' : r.cls === 'warn' ? 'Weak return on equity' : 'Moderate ROE',
        text: r.cls === 'good'
          ? 'The company generates more than 15% return on every rupee of equity — excellent capital efficiency.'
          : r.cls === 'warn'
            ? 'ROE below 5% suggests the company is not generating sufficient profit from shareholder capital.'
            : 'ROE in the 5–15% range — decent but below top-quartile performance.',
      };
    case 'Asset Turnover':
      return {
        type: r.cls === 'good' ? 'positive' : r.cls === 'warn' ? 'risk' : 'info',
        title: r.cls === 'good' ? 'Efficient asset utilisation' : r.cls === 'warn' ? 'Low asset turnover' : 'Average asset turnover',
        text: r.cls === 'good'
          ? 'Revenue exceeds total assets, meaning the company generates strong sales from its asset base.'
          : r.cls === 'warn'
            ? 'Revenue is less than half of total assets — assets may be underutilised or the business is asset-heavy.'
            : 'Asset turnover is in a normal range — neither outstanding nor alarming.',
      };
    default:
      return { type: 'info', title: r.label, text: `${r.label} is ${r.value}.` };
  }
}

/** Group ratios by section */
function groupBySection(results: RatioResult[]): { section: string; ratios: RatioResult[] }[] {
  const sections = [...new Set(results.map((r) => r.section))];
  return sections.map((s) => ({
    section: s,
    ratios: results.filter((r) => r.section === s),
  }));
}

// ── Input grouping ──

const incomeStatementFields = ['revenue', 'cogs', 'netProfit', 'ebit'] as const;
const balanceSheetFields = ['totalAssets', 'totalEquity', 'totalDebt'] as const;
const workingCapitalFields = ['currentAssets', 'currentLiab', 'inventory', 'interest'] as const;

interface InputSection {
  title: string;
  fieldKeys: readonly (typeof fields[number]['k'])[];
}

const inputSections: InputSection[] = [
  { title: 'Income Statement', fieldKeys: incomeStatementFields },
  { title: 'Balance Sheet', fieldKeys: balanceSheetFields },
  { title: 'Working Capital', fieldKeys: workingCapitalFields },
];

export default function RatiosPage() {
  const showToast = useToast();
  const { data, res, setField, setRes, clear } = useRatiosStore();

  // Pre-fill from imported data via global data pipeline
  const { dataSource, companyName } = useGlobalImportFill(
    (vals) => {
      Object.entries(vals).forEach(([key, val]) => setField(key as keyof typeof data, val as any));
    },
    extractRatiosInputs
  );

  async function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFile(file);
      const rows = text.split('\n').filter(Boolean);
      if (rows.length < 2) return;
      const vals = rows[1].split(',').map((s) => parseFloat(s.trim()));
      if (vals.length >= 11) {
        keys.forEach((k, i) => setField(k, vals[i] || 0));
        showToast('Loaded all values');
      }
    } catch (err: unknown) {
      showToast('Error reading file: ' + (err instanceof Error ? err.message : 'unknown'));
    }
    e.target.value = '';
  }

  function analyze() {
    setRes(computeRatios(data));
  }

  function handleClear() {
    clear();
  }

  const grouped = res ? groupBySection(res) : [];

  return (
    <div>
      <PageHeader
        title="Financial Ratios"
        subtitle="Check liquidity, leverage, profitability, and efficiency in one view — 9 ratios with color-coded health indicators."
        answer="What this helps you answer: Is the company financially healthy? Can it cover debts?"
      />

      <DataQualityBar source={getDataSourceLabel(dataSource, companyName)} />

      <UploadBar
          onUpload={handleCsv}
          hint="CSV: Revenue, COGS, Net Profit, Assets, Equity, Debt, Current Assets, Current Liab, Inventory, Interest, EBIT"
        />

        {/* ── Input sections ── */}
        {inputSections.map((sec) => (
          <Card key={sec.title} label={sec.title} style={{ marginTop: '1.5rem' }}>
            <FieldGrid>
              {fields
                .filter((f) => (sec.fieldKeys as readonly string[]).includes(f.k))
                .map((f) => (
                  <Field
                    key={f.k}
                    label={f.l}
                    value={data[f.k]}
                    onChange={(v) => setField(f.k, v === '' ? null : v)}
                  />
                ))}
            </FieldGrid>
          </Card>
        ))}

        <Toolbar
          onClear={handleClear}
          onAction={analyze}
          actionLabel="Calculate"
          hint="Fill in at least one field per section"
        />

        {/* ── Results per section ── */}
        {grouped.map(({ section, ratios }) => (
          <div key={section} style={{ marginTop: '2rem' }}>
            <SectionTitle>{section}</SectionTitle>

            <Card style={{ marginTop: '0.75rem' }}>
              <MetricGrid
                metrics={ratios.map((r) => ({
                  label: r.label,
                  value: r.value,
                  cls: r.cls === '' ? undefined : (r.cls as 'good' | 'warn' | 'neutral' | undefined),
                }))}
              />
            </Card>

            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {ratios.map((r, i) => {
                const insight = insightFor(r);
                return (
                  <InsightCard
                    key={i}
                    type={insight.type}
                    title={insight.title}
                    text={insight.text}
                  />
                );
              })}
            </div>

            <div style={{ marginTop: '0.5rem', paddingLeft: '0.25rem' }}>
              {ratios.map((r, i) => (
                <FormulaDisclosure
                  key={i}
                  label={r.label}
                  formula={formulaFor[r.label] || ''}
                />
              ))}
            </div>
          </div>
        ))}

        {/* ── Download CSV ── */}
        {res && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={() =>
                downloadCSV('ratios.csv', [
                  ['Section', 'Metric', 'Value'],
                  ...res.map((r) => [r.section, r.label, r.value]),
                ])
              }
            >
              Download CSV
            </button>
          </div>
        )}

        {/* ── Next + Disclaimer ── */}
        {res && (
          <div style={{ marginTop: '1.5rem' }}>
            <NextLinks
              links={[
                { label: 'Cash efficiency', href: '/tools/wc' },
                { label: 'Estimate value', href: '/tools/dcf' },
              ]}
            />
            <Disclaimer />
          </div>
        )}

        {/* ── EmptyState ── */}
        {!res && (
          <EmptyState
            title="Enter balance sheet and income data above, then click Calculate."
            desc="Or upload a CSV with all 11 values in the order shown above."
          />
        )}
    </div>
  );
}
