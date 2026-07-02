'use client';

import { useMemo, useCallback } from 'react';
import { computeDCF, computeDCFSensitivity, computeDCFScenarios, validateDCFInputs, fmtNum } from '@/lib/calculations';
import { useDCFStore, DEFAULT_DCF_SCENARIO_CONFIG, type DCFScenarioConfig } from '@/store';
import { useActiveDataset } from '@/store/financial-model-selectors';
import { useGlobalDataStore } from '@/store/global-data-store';
import { usePageTitle } from '@/lib/use-page-title';
import { useEnterpriseStore } from '@/store/enterprise-store';
import { useToast } from '@/components/shared/ToastProvider';
import {
  PageHeader,
  Card,
  Toolbar,
  SectionTitle,
  ResultPanel,
  MetricGrid,
  HeroDecision,
  InsightCard,
  EmptyState,
  Disclaimer,
  NextLinks,
  DataQualityBar,
  CalcTimestamp,
  TrustBadge,
  DataSourceBadge,
} from '@/components/ui';
import ModelBoundSpreadsheet from '@/components/input/ModelBoundSpreadsheet';
import CalculationTracePanel from '@/components/shared/CalculationTrace';
import ProvenanceBadge from '@/components/shared/ProvenanceBadge';
import dynamic from 'next/dynamic';
import { findRow, makeTraceSource } from '@/lib/calculation-trace';
import { getPeriods } from '@/store/financial-model-selectors';
import type { CalculationTrace } from '@/lib/calculation-trace';
import type { FundalystDataset } from '@/lib/importer/types';

const DCFChart = dynamic(() => import('@/components/tools/dcf/DCFChart'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ width: '100%', height: 300 }} />,
});

/** DCF assumption metric keys stored in the model with statement='assumptions' */
const DCF_ASSUMPTION_METRICS = [
  'Growth Rate (%)',
  'Projection Years',
  'WACC (%)',
  'Terminal Growth (%)',
  'Current Price (₹)',
] as const;

const METRIC_TO_FIELD: Record<string, string> = {
  'Free Cash Flow': 'fcf',
  'Growth Rate (%)': 'growth',
  'Growth Rate': 'growth',
  'Projection Years': 'years',
  'WACC (%)': 'discount',
  WACC: 'discount',
  'Terminal Growth (%)': 'terminal',
  'Terminal Growth': 'terminal',
  'Net Debt': 'netDebt',
  'Shares Outstanding': 'shares',
  'Current Price (₹)': 'price',
  'Current Price (?)': 'price',
  'Current Price': 'price',
};

/** Read DCF input values from the model */
function readDCFInputs(dataset: FundalystDataset | null): Record<string, number | ''> {
  const result: Record<string, number | ''> = {};
  if (!dataset) return result;

  const periods = getPeriods(dataset);
  const latestPeriod = periods.length > 0 ? periods[periods.length - 1] : 'Value';

  // Map each DCF metric to its value from the model
  for (const [metricLabel, field] of Object.entries(METRIC_TO_FIELD)) {
    const fact = dataset.facts.find(
      (f: { metric: string; periodLabel: string; value: number }) => f.metric === metricLabel && f.periodLabel === latestPeriod
    );
    if (fact) {
      result[field] = isFinite(fact.value) ? fact.value : '';
    } else {
      result[field] = '';
    }
  }

  return result;
}

export default function DCFPage() {
  const showToast = useToast();
  const addAuditEvent = useEnterpriseStore((s) => s.addAuditEvent);
  usePageTitle('DCF Valuation');
  const { show, summary, sens, setShow, setSummary, setSens } = useDCFStore();
  const scenarioConfig = useDCFStore((s) => s.scenarioConfig);
  const setScenarioConfig = useDCFStore((s) => s.setScenarioConfig);
  const resetScenarioConfig = useDCFStore((s) => s.resetScenarioConfig);
  const dataset = useActiveDataset();
  const hasData = dataset && dataset.facts.length > 0;

  // Read DCF inputs from the canonical model
  const inputs = useMemo(() => readDCFInputs(dataset), [dataset]);

  // Determine provenance for each DCF assumption
  const metricProvenance = useMemo(() => {
    if (!dataset) return {};
    const fcf = dataset.facts.find((f) => f.metric === 'Free Cash Flow');
    const shares = dataset.facts.find((f) => f.metric === 'Shares Outstanding');
    const netDebt = dataset.facts.find((f) => f.metric === 'Net Debt');
    const price = dataset.facts.find((f) => f.metric === 'Current Price (₹)');
    return {
      freeCashFlow: fcf ? (fcf.userOverridden ? 'manual' as const : 'imported' as const) : 'manual' as const,
      sharesOutstanding: shares ? (shares.userOverridden ? 'manual' as const : 'imported' as const) : 'manual' as const,
      netDebt: netDebt ? (netDebt.userOverridden ? 'manual' as const : 'imported' as const) : 'manual' as const,
      currentPrice: price ? (price.userOverridden ? 'manual' as const : 'imported' as const) : 'manual' as const,
      growthRate: dataset.facts.find((f) => f.metric === 'Growth Rate (%)')?.userOverridden ? 'manual' as const : 'default' as const,
      wacc: dataset.facts.find((f) => f.metric === 'WACC (%)')?.userOverridden ? 'manual' as const : 'default' as const,
      terminalGrowth: dataset.facts.find((f) => f.metric === 'Terminal Growth (%)')?.userOverridden ? 'manual' as const : 'default' as const,
      projectionYears: dataset.facts.find((f) => f.metric === 'Projection Years')?.userOverridden ? 'manual' as const : 'default' as const,
    };
  }, [dataset]);

  function runDCF() {
    if (!hasData) {
      showToast('No data available. Import a financial report first.');
      return;
    }

    const mapped = readDCFInputs(dataset);
    const fcf = mapped.fcf;
    const growth = mapped.growth;
    const years = mapped.years;
    const discount = mapped.discount;
    const terminal = mapped.terminal;
    const netDebt = mapped.netDebt;
    const shares = mapped.shares;
    const price = mapped.price;

    const validationErrors = validateDCFInputs(fcf, growth, years, discount, terminal, netDebt, shares, price);
    if (validationErrors.length > 0) {
      setShow(false);
      setSummary(null);
      setSens([]);
      showToast(validationErrors[0].message);
      return;
    }

    const fcfN = Number(fcf);
    const growthN = Number(growth);
    const yearsN = Number(years);
    const discountN = Number(discount);
    const terminalN = Number(terminal);
    const netDebtN = netDebt === '' || netDebt === undefined ? 0 : Number(netDebt);
    const sharesN = Number(shares);
    const priceN = Number(price);

    const r = computeDCF(
      fcfN, growthN, yearsN,
      discountN, terminalN, netDebtN,
      sharesN, priceN,
    );

    if (r === null) {
      setShow(false);
      setSummary(null);
      setSens([]);
      showToast('Terminal growth too close to WACC - Gordon Growth model requires a meaningful spread');
      return;
    }

    // Generate sensitivity ranges around user's inputs
    const g = growthN;
    const d = discountN;
    const t = terminalN;
    const sensGrowRates = [Math.max(1, g - 3), Math.max(1, g - 1.5), g, g + 1.5, g + 3].filter(r => r < d - 0.5);
    const sensDiscRates = [Math.max(1, d - 4), Math.max(1, d - 2), d, d + 2, d + 4].filter(r => r <= 30);
    const sensResult = computeDCFSensitivity(
      fcfN, growthN, yearsN,
      sensGrowRates.length >= 3 ? sensGrowRates : [t - 1, t, t + 1],
      sensDiscRates.length >= 3 ? sensDiscRates : [d - 2, d, d + 2],
      netDebtN, sharesN, priceN,
    );

    setShow(true);
    setSummary(r);
    setSens(sensResult);
    addAuditEvent({
      category: 'calculation',
      severity: 'info',
      action: 'DCF valuation calculated',
      target: dataset?.companyName || 'Manual DCF',
      details: `Intrinsic value/share ${Math.round(r.iv * 100) / 100}`,
    });
    showToast('Valuation calculated');
  }

  const handleClear = useCallback(() => {
    if (!dataset) return;
    // Clear all DCF assumption values
    const store = useGlobalDataStore.getState();
    for (const metric of DCF_ASSUMPTION_METRICS) {
      const fact = dataset.facts.find((f) => f.metric === metric);
      if (fact) {
        store.deleteFact(dataset.id, metric, fact.periodLabel);
      }
    }
    setShow(false);
    setSummary(null);
    setSens([]);
  }, [dataset, setShow, setSummary, setSens]);

  const companyName = dataset?.companyName || '';

  // Build calculation traces from model data
  const traceItems = useMemo<CalculationTrace[]>(() => {
    if (!dataset) return [];
    const periods = getPeriods(dataset);
    const p = periods.length > 0 ? periods[periods.length - 1] : 'Value';

    const fcfRow = findRow(
      dataset.facts.filter(f => f.metric === 'Free Cash Flow' && f.periodLabel === p).map(f => ({ metric: f.metric, values: [String(f.value)] })),
      ['Free Cash Flow']
    );
    const growthRow = findRow(
      dataset.facts.filter(f => f.metric === 'Growth Rate (%)').map(f => ({ metric: f.metric, values: [String(f.value)] })),
      ['Growth Rate (%)', 'Growth Rate']
    );
    const yearsRow = findRow(
      dataset.facts.filter(f => f.metric === 'Projection Years').map(f => ({ metric: f.metric, values: [String(f.value)] })),
      ['Projection Years']
    );
    const waccRow = findRow(
      dataset.facts.filter(f => f.metric === 'WACC (%)').map(f => ({ metric: f.metric, values: [String(f.value)] })),
      ['WACC (%)', 'WACC']
    );
    const terminalRow = findRow(
      dataset.facts.filter(f => f.metric === 'Terminal Growth (%)').map(f => ({ metric: f.metric, values: [String(f.value)] })),
      ['Terminal Growth (%)', 'Terminal Growth']
    );
    const netDebtRow = findRow(
      dataset.facts.filter(f => f.metric === 'Net Debt' && f.periodLabel === p).map(f => ({ metric: f.metric, values: [String(f.value)] })),
      ['Net Debt']
    );
    const sharesRow = findRow(
      dataset.facts.filter(f => f.metric === 'Shares Outstanding' && f.periodLabel === p).map(f => ({ metric: f.metric, values: [String(f.value)] })),
      ['Shares Outstanding']
    );
    const priceRow = findRow(
      dataset.facts.filter(f => f.metric === 'Current Price (₹)' && f.periodLabel === p).map(f => ({ metric: f.metric, values: [String(f.value)] })),
      ['Current Price (₹)', 'Current Price (?)', 'Current Price']
    );

    const formattedEv = '₹' + fmtNum(Math.round((summary?.ev ?? 0)));
    const formattedEq = '₹' + fmtNum(Math.round((summary?.eq ?? 0)));
    const formattedIv = '₹' + fmtNum(Math.round((summary?.iv ?? 0) * 100) / 100);
    const formattedMos = (summary?.mos ?? 0).toFixed(1) + '%';

    return [
      {
        label: 'Enterprise Value',
        value: formattedEv,
        formula: 'PV of projected FCF + PV of terminal value',
        sources: [
          makeTraceSource('Free Cash Flow', dataset, ['freeCashFlow', 'operatingCashFlow'], fcfRow),
          makeTraceSource('Growth Rate', dataset, ['growthRate'], growthRow),
          makeTraceSource('Projection Years', dataset, ['projectionYears'], yearsRow),
          makeTraceSource('WACC', dataset, ['wacc', 'discountRate'], waccRow),
          makeTraceSource('Terminal Growth', dataset, ['terminalGrowth'], terminalRow),
        ],
      },
      {
        label: 'Equity Value',
        value: formattedEq,
        formula: 'Enterprise Value - Net Debt',
        sources: [
          makeTraceSource('Enterprise Value', null, [], undefined, formattedEv),
          makeTraceSource('Net Debt', dataset, ['netDebt', 'totalDebt'], netDebtRow),
        ],
      },
      {
        label: 'Intrinsic Value / Share',
        value: formattedIv,
        formula: 'Equity Value / Shares Outstanding',
        sources: [
          makeTraceSource('Equity Value', null, [], undefined, formattedEq),
          makeTraceSource('Shares Outstanding', dataset, ['sharesOutstanding'], sharesRow),
        ],
      },
      {
        label: 'Margin of Safety',
        value: formattedMos,
        formula: '(Intrinsic Value - Current Price) / Current Price',
        sources: [
          makeTraceSource('Intrinsic Value / Share', null, [], undefined, formattedIv),
          makeTraceSource('Current Price', dataset, ['price', 'currentPrice'], priceRow),
        ],
      },
    ];
  }, [dataset, summary]);

  // Compute scenarios
  const scenarios = useMemo(() => {
    if (!dataset) return [];
    const mapped = readDCFInputs(dataset);
    const fcf = Number(mapped.fcf);
    const growth = Number(mapped.growth || 0);
    const years = Number(mapped.years);
    const discount = Number(mapped.discount);
    const terminal = Number(mapped.terminal);
    const netDebt = mapped.netDebt === '' || mapped.netDebt === undefined ? 0 : Number(mapped.netDebt);
    const shares = Number(mapped.shares);
    const price = Number(mapped.price);
    if (![fcf, years, discount, terminal, shares].every(Number.isFinite)) return [];
    return computeDCFScenarios(fcf, growth, years, discount, terminal, netDebt, shares, price, {
      growthDelta: scenarioConfig.growthDelta,
      waccDelta: scenarioConfig.waccDelta,
      terminalDelta: scenarioConfig.terminalDelta,
    });
  }, [dataset, scenarioConfig]);

  // Empty state — only when no dataset exists
  if (!hasData) {
    return (
      <div>
        <PageHeader
          kicker="Valuation"
          title="DCF Valuation"
          subtitle="Estimate intrinsic value using projected free cash flow and terminal value."
          answer="What this helps you answer: Is the stock undervalued or overvalued? What price is fair?"
        />
        <EmptyState
          title="No financial data"
          desc="Import a financial report to see pre-filled DCF inputs and calculate intrinsic value."
          action={{ label: 'Import data', href: '/import' }}
        />
      </div>
    );
  }

  // Read current price for display
  const priceVal = Number(inputs.price) || 0;

  return (
    <div>
      <PageHeader
        kicker="Valuation"
        title="DCF Valuation"
        subtitle="Estimate intrinsic value using projected free cash flow and terminal value."
        answer="What this helps you answer: Is the stock undervalued or overvalued? What price is fair?"
      />

      <DataQualityBar
        source={companyName || undefined}
        metrics={Object.values(inputs).filter(v => v !== '').length}
      />
      <div className="flex items-center gap-2 mb-2 mt-1">
        <DataSourceBadge variant="imported" />
      </div>

      {/* ── DCF Assumptions grid — reads from and writes to canonical model ── */}
      <Card>
        <div className="card-body" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <SectionTitle>DCF Assumptions</SectionTitle>
          <ModelBoundSpreadsheet
            statement="all"
            singleColumnLabel="Value"
            hint="Type or paste values. Tab to navigate between rows. Edits write back to the model — every surface updates live."
          />
          {/* Provenance indicators for each assumption */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-2xs text-muted">
            <span className="mr-1 font-medium" style={{ fontSize: 10 }}>Source:</span>
            <ProvenanceBadge kind={metricProvenance.freeCashFlow || 'manual'} label="Free Cash Flow" />
              <ProvenanceBadge kind={metricProvenance.sharesOutstanding || 'manual'} label="Shares" />
              <ProvenanceBadge kind={metricProvenance.netDebt || 'manual'} label="Net Debt" />
              <ProvenanceBadge kind={metricProvenance.currentPrice || 'manual'} label="Price" />
              <ProvenanceBadge kind={metricProvenance.growthRate || 'default'} label="Growth Rate" />
              <ProvenanceBadge kind={metricProvenance.wacc || 'default'} label="WACC" />
              <ProvenanceBadge kind={metricProvenance.terminalGrowth || 'default'} label="Terminal Growth" />
              <ProvenanceBadge kind={metricProvenance.projectionYears || 'default'} label="Projection Years" />
          </div>
        </div>
        <Toolbar onClear={handleClear} onAction={runDCF} actionLabel="Calculate value" />
      </Card>

      {show && summary && (
        <DCFResults
          summary={summary}
          sens={sens}
          priceVal={priceVal}
          discount={Number(inputs.discount) || 10}
          years={Number(inputs.years) || 5}
          companyName={companyName}
          traceItems={traceItems}
          scenarios={scenarios}
          priceStr={'₹' + fmtNum(priceVal)}
          scenarioConfig={scenarioConfig}
          setScenarioConfig={setScenarioConfig}
          resetScenarioConfig={resetScenarioConfig}
        />
      )}
    </div>
  );
}

// ── Results component ──

function DCFResults({
  summary,
  sens,
  priceVal,
  discount,
  years,
  companyName,
  traceItems,
  scenarios,
  priceStr,
  scenarioConfig,
  setScenarioConfig,
  resetScenarioConfig,
}: {
  summary: NonNullable<ReturnType<typeof useDCFStore.getState>['summary']>;
  sens: ReturnType<typeof useDCFStore.getState>['sens'];
  priceVal: number;
  discount: number;
  years: number;
  companyName: string;
  traceItems: CalculationTrace[];
  scenarios: ReturnType<typeof computeDCFScenarios>;
  priceStr: string;
  scenarioConfig: DCFScenarioConfig;
  setScenarioConfig: (patch: Partial<DCFScenarioConfig>) => void;
  resetScenarioConfig: () => void;
}) {
  const iv = summary.iv;
  const isUndervalued = iv > priceVal;
  const verdictType = isUndervalued ? 'positive' as const : 'warning' as const;
  const verdictTitle = isUndervalued ? 'Undervalued' : 'Overvalued';

  const formatted = useMemo(() => ({
    iv: '₹' + fmtNum(Math.round(iv * 100) / 100),
    ev: '₹' + fmtNum(Math.round(summary.ev)),
    eq: '₹' + fmtNum(Math.round(summary.eq)),
    price: priceStr,
    mos: summary.mos.toFixed(1) + '%',
  }), [iv, summary.ev, summary.eq, summary.mos, priceStr]);

  const verdictText = isUndervalued
    ? `Intrinsic value of ${formatted.iv} is above the current price of ${formatted.price}, suggesting the stock may be undervalued.`
    : `Intrinsic value of ${formatted.iv} is below the current price of ${formatted.price}, suggesting the stock may be overvalued.`;

  const mosContext = summary.mos > 20 ? 'Healthy margin of safety' : summary.mos > 10 ? 'Moderate buffer' : 'Thin margin of safety';

  return (
    <ResultPanel label="Intrinsic Value Summary">
      <Card>
        <HeroDecision
          label="Margin of safety"
          value={formatted.mos}
          sign={summary.mos > 0 ? 'positive' : summary.mos < 0 ? 'negative' : 'neutral'}
          sub={`${mosContext} · ${verdictText}`}
        />
        <MetricGrid
          metrics={[
            { label: 'Enterprise Value', value: formatted.ev },
            { label: 'Equity Value', value: formatted.eq },
            { label: 'Intrinsic Value / Share', value: formatted.iv, cls: isUndervalued ? 'good' : 'warn', context: isUndervalued ? 'Above current price' : 'Below current price', contextTrend: isUndervalued ? 'up' : 'down' },
            { label: 'Current Price', value: formatted.price },
            { label: 'Margin of Safety', value: formatted.mos, cls: summary.mos > 20 ? 'good' : summary.mos > 0 ? 'neutral' : 'warn', context: mosContext, contextTrend: summary.mos > 0 ? 'up' : 'down' },
            { label: 'Verdict', value: isUndervalued ? 'Undervalued' : 'Overvalued', cls: isUndervalued ? 'good' : 'warn' },
          ]}
        />
        <InsightCard
          type={verdictType}
          title={verdictTitle}
          text={verdictText}
          formula="Intrinsic Value = (Enterprise Value − Net Debt) / Shares Outstanding"
        />
      </Card>

      {scenarios.length === 3 && (
        <Card label="Scenario Range" className="mt-4">
          <div className="card-body">
            <p className="text-sm text-secondary" style={{ margin: 0, marginBottom: 'var(--space-2)' }}>
              Intrinsic value under bear, base, and bull cases — growth, WACC, and terminal growth flexed together.
              <br />
              <span className="text-muted">Green = above current price ({formatted.price}), red = below.</span>
            </p>
            <div className="dcf-scenario-ctrls flex flex-wrap items-end gap-3 mt-2">
              <label className="flex flex-col gap-1 text-2xs text-muted">
                <span>Growth ± (pp)</span>
                <input
                  type="number"
                  className="num-input"
                  value={scenarioConfig.growthDelta}
                  min={0}
                  step={0.5}
                  onChange={(e) => setScenarioConfig({ growthDelta: Math.max(0, Number(e.target.value) || 0) })}
                  aria-label="Growth spread in percentage points"
                />
              </label>
              <label className="flex flex-col gap-1 text-2xs text-muted">
                <span>WACC ∓ (pp)</span>
                <input
                  type="number"
                  className="num-input"
                  value={scenarioConfig.waccDelta}
                  min={0}
                  step={0.5}
                  onChange={(e) => setScenarioConfig({ waccDelta: Math.max(0, Number(e.target.value) || 0) })}
                  aria-label="WACC spread in percentage points"
                />
              </label>
              <label className="flex flex-col gap-1 text-2xs text-muted">
                <span>Terminal ± (pp)</span>
                <input
                  type="number"
                  className="num-input"
                  value={scenarioConfig.terminalDelta}
                  min={0}
                  step={0.5}
                  onChange={(e) => setScenarioConfig({ terminalDelta: Math.max(0, Number(e.target.value) || 0) })}
                  aria-label="Terminal growth spread in percentage points"
                />
              </label>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={resetScenarioConfig}
                disabled={
                  scenarioConfig.growthDelta === DEFAULT_DCF_SCENARIO_CONFIG.growthDelta &&
                  scenarioConfig.waccDelta === DEFAULT_DCF_SCENARIO_CONFIG.waccDelta &&
                  scenarioConfig.terminalDelta === DEFAULT_DCF_SCENARIO_CONFIG.terminalDelta
                }
              >
                Reset spread
              </button>
            </div>
            <p className="text-2xs text-muted mt-2" style={{ margin: 0 }}>
              Bear flexes growth/terminal down and WACC up; bull does the reverse. These assumption sets are saved on this device.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="diff-table">
              <thead>
                <tr>
                  <th>Scenario</th><th>Growth</th><th>WACC</th><th>Terminal</th>
                  <th>Intrinsic / share</th><th>Margin of safety</th><th>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => {
                  const under = s.iv != null && s.iv > priceVal;
                  const cls = s.iv == null ? '' : under ? 'sens-td-up' : 'sens-td-down';
                  return (
                    <tr key={s.key}>
                      <td>{s.key === 'base' ? <strong>{s.label} (your inputs)</strong> : s.label}</td>
                      <td>{Math.round(s.growth * 10) / 10}%</td>
                      <td>{Math.round(s.discount * 10) / 10}%</td>
                      <td>{Math.round(s.terminal * 10) / 10}%</td>
                      <td className={cls}>{s.iv == null ? '—' : '₹' + fmtNum(Math.round(s.iv * 100) / 100)}</td>
                      <td className={cls}>{s.mos == null ? '—' : s.mos.toFixed(1) + '%'}</td>
                      <td>{s.iv == null ? '—' : under ? 'Undervalued' : 'Overvalued'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <CalculationTracePanel traces={traceItems} />

      <Card label="Chart" className="mt-4">
        <div className="chart-wrap">
          <DCFChart projected={summary.projected} tv={summary.tv} pvTv={summary.pvTv} currentPrice={priceVal} />
        </div>
      </Card>

      <Card label="Projected Cash Flows" className="mt-4">
        <table className="diff-table">
          <thead><tr><th>Year</th><th>Projected FCF</th><th>Discount Factor</th><th>PV of FCF</th></tr></thead>
          <tbody>
            {summary.projected.map((p) => (
              <tr key={p.year}>
                <td>Year {p.year}</td>
                <td>{'₹' + fmtNum(Math.round(p.fcf))}</td>
                <td>{p.df.toFixed(4)}</td>
                <td>{'₹' + fmtNum(Math.round(p.pv))}</td>
              </tr>
            ))}
            <tr>
              <td><strong>Terminal value</strong></td>
              <td>{'₹' + fmtNum(Math.round(summary.tv))} →</td>
              <td>{(1 / Math.pow(1 + discount / 100, years)).toFixed(4)}</td>
              <td>{'₹' + fmtNum(Math.round(summary.pvTv))}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      {sens.length > 0 && (
        <Card label="Sensitivity Analysis" className="mt-4">
          <div className="card-body">
            <p className="text-sm text-secondary" style={{ margin: 0, marginBottom: 'var(--space-2)' }}>
              Intrinsic value per share at varying terminal growth rates (rows) vs discount rates (columns).<br />
              <span className="text-muted">Base assumption highlighted. Green = undervalued vs ₹{fmtNum(priceVal)}, Red = overvalued.</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="sens-table">
              <thead><tr><th>Growth ↓ / Disc →</th>{sens[0].cols.map((c) => (<th key={c.d}>{c.d}%</th>))}</tr></thead>
              <tbody>
                {sens.map((row) => (
                  <tr key={row.g}>
                    <td>{row.g}%</td>
                    {row.cols.map((c) => {
                      const isInvalid = isNaN(c.iv);
                      const diff = isInvalid ? NaN : c.iv - priceVal;
                      const isBaseCell = !isInvalid && Math.abs(row.g - 3) < 0.5 && c.d === discount;
                      const cls = isInvalid ? '' : (diff > 0 ? 'sens-td-up' : diff < 0 ? 'sens-td-down' : '');
                      return (<td key={c.d} className={`${cls}${isBaseCell ? ' sens-td-base' : ''}`}>{isInvalid ? '—' : '₹' + fmtNum(Math.round(c.iv * 10) / 10)}</td>);
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <CalcTimestamp />
      <div className="flex gap-2 flex-wrap mt-2">
        <TrustBadge label={`Values from: ${companyName || 'User entry'}`} variant="source" />
        <TrustBadge label="₹ Indian Market" />
      </div>
      <Disclaimer extra="Method: DCF with Gordon Growth terminal value" />
      <NextLinks links={[{ label: 'Compare peers', href: '/tools/peer' }, { label: 'Review filings', href: '/research/filing' }]} />
    </ResultPanel>
  );
}
