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
  CalcTimestamp,
  Disclaimer,
  EmptyState,
  DataQualityBar,
} from '@/components/ui';
import { useGlobalImportFill, extractRatiosInputs, getDataSourceLabel } from '@/lib/importer/import-hooks';
import type { RatioResult } from '@/types/financial';

// ── Essential fields only ──
const fields = [
  { k: 'revenue' as const, l: 'Revenue' },
  { k: 'netProfit' as const, l: 'Net profit' },
  { k: 'ebit' as const, l: 'EBIT' },
  { k: 'totalAssets' as const, l: 'Total assets' },
  { k: 'totalEquity' as const, l: 'Total equity' },
  { k: 'totalDebt' as const, l: 'Total debt' },
];

const keys = fields.map((f) => f.k);

// ── Unlocked ratios (available with just 6 fields) ──
const unlockedFormulas: Record<string, string> = {
  'Net Profit Margin': 'Net Profit ÷ Revenue',
  'ROE': 'Net Profit ÷ Total Equity',
  'Debt/Equity': 'Total Debt ÷ Total Equity',
  'Debt/Assets': 'Total Debt ÷ Total Assets',
  'Asset Turnover': 'Revenue ÷ Total Assets',
};

// ── Locked ratios (need more data) ──
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
        text: r.cls === 'good'
          ? 'Over 10% of revenue flows through to net profit — efficiently managed top to bottom.'
          : r.cls === 'warn'
            ? 'Net profit margin below 3% means a very small cushion against downturns.'
            : 'Net profit margin is reasonable but room for improvement exists.',
      };
    case 'ROE':
      return {
        type: r.cls === 'good' ? 'positive' : r.cls === 'warn' ? 'risk' : 'info',
        title: r.cls === 'good' ? 'Strong return on equity' : r.cls === 'warn' ? 'Weak return on equity' : 'Moderate ROE',
        text: r.cls === 'good'
          ? 'Generates more than 15% return on every rupee of equity — excellent capital efficiency.'
          : r.cls === 'warn'
            ? 'ROE below 5% suggests insufficient profit from shareholder capital.'
            : 'ROE in the 5–15% range — decent but below top-quartile.',
      };
    case 'Debt/Equity':
      return {
        type: r.cls === 'good' ? 'positive' : r.cls === 'warn' ? 'risk' : 'info',
        title: r.cls === 'good' ? 'Conservative leverage' : r.cls === 'warn' ? 'High leverage' : 'Moderate leverage',
        text: r.cls === 'good'
          ? 'Debt is well below equity — low financial risk.'
          : r.cls === 'warn'
            ? 'Debt significantly exceeds equity, increasing financial risk.'
            : 'Debt and equity are balanced — moderate leverage.',
      };
    case 'Debt/Assets':
      return {
        type: r.cls === 'good' ? 'positive' : r.cls === 'warn' ? 'risk' : 'info',
        title: r.cls === 'good' ? 'Low debt burden' : r.cls === 'warn' ? 'High debt burden' : 'Manageable debt',
        text: r.cls === 'good'
          ? 'Less than half of assets are financed by debt. Balance sheet is strong.'
          : r.cls === 'warn'
            ? 'Over 70% of assets are debt-funded — little margin for downturns.'
            : 'Moderate portion of assets financed through debt.',
      };
    case 'Asset Turnover':
      return {
        type: r.cls === 'good' ? 'positive' : r.cls === 'warn' ? 'risk' : 'info',
        title: r.cls === 'good' ? 'Efficient asset utilisation' : r.cls === 'warn' ? 'Low asset turnover' : 'Average asset turnover',
        text: r.cls === 'good'
          ? 'Revenue exceeds total assets — strong sales from asset base.'
          : r.cls === 'warn'
            ? 'Revenue is less than half of total assets — assets may be underutilised.'
            : 'Asset turnover in normal range.',
      };
    default:
      return { type: 'info', title: r.label, text: `${r.label} is ${r.value}.` };
  }
}

function groupBySection(results: RatioResult[]): { section: string; ratios: RatioResult[] }[] {
  const sections = [...new Set(results.map((r) => r.section))];
  return sections.map((s) => ({
    section: s,
    ratios: results.filter((r) => r.section === s),
  }));
}

export default function RatiosPage() {
  const showToast = useToast();
  const { data, res, setField, setRes, clear } = useRatiosStore();

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
      if (vals.length >= 6) {
        keys.forEach((k, i) => setField(k, vals[i] || 0));
        showToast('Loaded values');
      }
    } catch (err: unknown) {
      showToast('Error reading file: ' + (err instanceof Error ? err.message : 'unknown'));
    }
    e.target.value = '';
  }

  function analyze() {
    setRes(computeRatios(data));
    showToast('Ratios calculated');
    setTimeout(() => {
      const el = document.querySelector('[class*="SectionTitle"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  }

  function handleClear() { clear(); }

  const grouped = res ? groupBySection(res) : [];

  return (
    <div>
      <PageHeader
        title="Financial Ratios"
        subtitle="Enter just 6 numbers — get 5 key ratios instantly."
        answer="What this helps you answer: Is the company financially healthy? Can it cover debts?"
      />

      <DataQualityBar source={getDataSourceLabel(dataSource, companyName)} />

      <UploadBar
        onUpload={handleCsv}
        hint="CSV: Revenue, Net Profit, EBIT, Total Assets, Total Equity, Total Debt"
      />

      {/* ── Essential inputs ── */}
      <Card label="Required (6 fields)">
        <FieldGrid>
          {fields.map((f) => (
            <Field
              key={f.k}
              label={f.l}
              value={data[f.k]}
              onChange={(v) => setField(f.k, v === '' ? null : v)}
            />
          ))}
        </FieldGrid>
        <div style={{ padding: '0 20px 10px', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          These 6 fields unlock: Net Profit Margin · ROE · Debt/Equity · Debt/Assets · Asset Turnover
        </div>
        <Toolbar
          onClear={handleClear}
          onAction={analyze}
          actionLabel="Calculate"
          hint="Fill in at least Revenue and Net Profit"
        />
      </Card>

      {/* ── Results ── */}
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
                formula={unlockedFormulas[r.label] || ''}
              />
            ))}
          </div>
        </div>
      ))}

      {/* ── Locked ratio placeholders ── */}
      {res && (
        <Card label="More ratios (add data to unlock)" style={{ marginTop: '1.5rem' }}>
          <div className="card-body">
            {lockedRatios.map((l, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: i < lockedRatios.length - 1 ? '1px solid var(--border-light)' : 'none',
                fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
              }}>
                <span>{l.label}: <span style={{ color: 'var(--text-tertiary)' }}>{l.formula}</span></span>
                <span style={{ fontSize: 10, color: 'var(--border-strong)' }}>{l.hint}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Download ── */}
      {res && (
        <div className="mt-6 text-center">
          <button className="btn btn-secondary" onClick={() =>
            downloadCSV('ratios.csv', [
              ['Section', 'Metric', 'Value'],
              ...res.map((r) => [r.section, r.label, r.value]),
            ])
          }>Download CSV</button>
        </div>
      )}

      {res && (
        <div className="mt-6">
            <NextLinks links={[
            { label: 'Cash efficiency', href: '/tools/wc' },
            { label: 'Estimate value', href: '/tools/dcf' },
          ]} />
          <CalcTimestamp />
          <Disclaimer />
        </div>
      )}

      {!res && (
        <EmptyState
          title="Enter 6 key numbers to see 5 essential ratios."
          desc="Revenue, Net Profit, EBIT, Total Assets, Equity, and Debt — that's all you need."
        />
      )}
    </div>
  );
}
