'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { computeDCF, computeDCFSensitivity, validateDCFInputs, fmtNum } from '@/lib/calculations';
import { useDCFStore } from '@/store';
import { extractDCFInputsFromModel } from '@/store/financial-model-selectors';
import { useToast } from '@/components/shared/ToastProvider';
import {
  PageHeader,
  Card,
  Toolbar,
  SectionTitle,
  ResultPanel,
  MetricGrid,
  InsightCard,
  EmptyState,
  Disclaimer,
  NextLinks,
  DataQualityBar,
  CalcTimestamp,
  TrustBadge,
  DataSourceBadge,
} from '@/components/ui';
import ToolSpreadsheet from '@/components/input/ToolSpreadsheet';
import type { SpreadsheetRow } from '@/components/input/SpreadsheetInput';
import CalculationTracePanel from '@/components/shared/CalculationTrace';
import ProvenanceBadge from '@/components/shared/ProvenanceBadge';
import dynamic from 'next/dynamic';
import { useModelData } from '@/store/use-model-data';
import { usePageTitle } from '@/lib/use-page-title';
import { useEnterpriseStore } from '@/store/enterprise-store';
import { useActiveDataset } from '@/store/financial-model-selectors';
import { findRow, makeTraceSource, type CalculationTrace } from '@/lib/calculation-trace';
import type { FundalystDataset } from '@/lib/importer/types';

const DCFChart = dynamic(() => import('@/components/tools/dcf/DCFChart'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ width: '100%', height: 300 }} />,
});

const EMPTY_DCF_ROWS: SpreadsheetRow[] = [
  { metric: 'Free Cash Flow', values: [''] },
  { metric: 'Growth Rate (%)', values: [''] },
  { metric: 'Projection Years', values: [''] },
  { metric: 'WACC (%)', values: [''] },
  { metric: 'Terminal Growth (%)', values: [''] },
  { metric: 'Net Debt', values: [''] },
  { metric: 'Shares Outstanding', values: [''] },
  { metric: 'Current Price (₹)', values: [''] },
];

const SAMPLE_DCF_ROWS: SpreadsheetRow[] = [
  { metric: 'Free Cash Flow', values: ['1240'] },
  { metric: 'Growth Rate (%)', values: ['8'] },
  { metric: 'Projection Years', values: ['5'] },
  { metric: 'WACC (%)', values: ['10'] },
  { metric: 'Terminal Growth (%)', values: ['3'] },
  { metric: 'Net Debt', values: ['180'] },
  { metric: 'Shares Outstanding', values: ['100'] },
  { metric: 'Current Price (₹)', values: ['450'] },
];
const METRIC_TO_FIELD: Record<string, keyof import('@/types/financial').DCFInputs> = {
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
  'Current Price (?)': 'price',
  'Current Price': 'price',
};

function normalizeMetricLabel(label: string): string {
  return label
    .replace(/\s+/g, ' ')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .trim();
}

function rowsToDCFInputs(rows: SpreadsheetRow[]): Record<string, number | ''> {
  const result: Record<string, number | ''> = {};
  for (const row of rows) {
    const normalized = normalizeMetricLabel(row.metric);
    const field = METRIC_TO_FIELD[row.metric] || METRIC_TO_FIELD[normalized] || normalized.toLowerCase().replace(/[^a-z]/g, '');
    const val = row.values[0]?.trim() || '';
    const parsed = val === '' ? '' : Number(val.replace(/,/g, ''));
    result[field] = parsed === '' ? '' : Number.isFinite(parsed) ? parsed : '';
  }
  return result;
}
export default function DCFPage() {
  const showToast = useToast();
  const addAuditEvent = useEnterpriseStore((s) => s.addAuditEvent);
  usePageTitle('DCF Valuation');
  const { show, summary, sens, setShow, setSummary, setSens } = useDCFStore();
  const [clearVersion, setClearVersion] = useState<number | undefined>(undefined);
  const clearedRef = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sheetRows, setSheetRows] = useState<SpreadsheetRow[]>([]);
  const [isSampleLoaded, setIsSampleLoaded] = useState(false);

  // Model pre-fill via universal hook
  const modelData = useModelData((ds) => extractDCFInputsFromModel(ds));
  const activeDataset = useActiveDataset();

  // Pre-fill from canonical model when available
  const prefilledRef = useRef(false);
  const loadedDatasetIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!modelData.data) return;
    if (activeDataset?.id && loadedDatasetIdRef.current === activeDataset.id) return;
    const { fcf, shares, netDebt } = modelData.data;
    if (fcf !== null || shares !== null || netDebt !== null) {
      const timer = setTimeout(() => {
        setClearVersion(v => (v ?? 0) + 1);
        setSheetRows([
          { metric: 'Free Cash Flow', values: [fcf !== null ? String(fcf) : ''] },
          { metric: 'Growth Rate (%)', values: ['8'] },
          { metric: 'Projection Years', values: ['5'] },
          { metric: 'WACC (%)', values: ['10'] },
          { metric: 'Terminal Growth (%)', values: ['3'] },
          { metric: 'Net Debt', values: [netDebt !== null ? String(netDebt) : ''] },
          { metric: 'Shares Outstanding', values: [shares !== null ? String(shares) : ''] },
          { metric: 'Current Price (₹)', values: [''] },
        ]);
        setShow(false);
        setSummary(null);
        setSens([]);
        setErrors({});
        setIsSampleLoaded(false);
      }, 0);
      loadedDatasetIdRef.current = activeDataset?.id ?? null;
      prefilledRef.current = true;
      return () => clearTimeout(timer);
    }
  }, [activeDataset?.id, modelData.data, setSens, setShow, setSummary]);

  function runDCF() {
    const mapped = rowsToDCFInputs(sheetRows);
    const fcf = mapped.fcf;
    const growth = mapped.growth;
    const years = mapped.years;
    const discount = mapped.discount;
    const terminal = mapped.terminal;
    const netDebt = mapped.netDebt;
    const shares = mapped.shares;
    const price = mapped.price;

    const validationErrors = validateDCFInputs(fcf, growth, years, discount, terminal, netDebt, shares, price);
    const errorMap: Record<string, string> = {};
    for (const e of validationErrors) {
      errorMap[e.field] = e.message;
    }
    setErrors(errorMap);

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
      target: modelData.companyName || 'Manual DCF',
      details: `Intrinsic value/share ${Math.round(r.iv * 100) / 100}`,
    });
    showToast('Valuation calculated');
  }

  const handleClear = useCallback(() => {
    clearedRef.current = true;
    setClearVersion(v => (v ?? 0) + 1);
    setSheetRows([]);
    setShow(false);
    setSummary(null);
    setSens([]);
    setErrors({});
    setIsSampleLoaded(false);
  }, [setShow, setSummary, setSens]);

  function loadSample() {
    clearedRef.current = false;
    setClearVersion(v => (v ?? 0) + 1);
    setSheetRows(SAMPLE_DCF_ROWS);
    setShow(false);
    setSummary(null);
    setSens([]);
    setErrors({});
    setIsSampleLoaded(true);
  }

  const priceVal = useMemo(() => {
    const mapped = rowsToDCFInputs(sheetRows);
    return Number(mapped.price) || 0;
  }, [sheetRows]);

  // Determine provenance for each DCF assumption
  const metricProvenance = useMemo(() => {
    const { fcf, shares, netDebt, price } = modelData.data ?? {};
    return {
      freeCashFlow: fcf != null ? 'imported' as const : 'manual' as const,
      sharesOutstanding: shares != null ? 'imported' as const : 'manual' as const,
      netDebt: netDebt != null ? 'imported' as const : 'manual' as const,
      currentPrice: price != null ? 'imported' as const : 'manual' as const,
      growthRate: 'default' as const,
      wacc: 'default' as const,
      terminalGrowth: 'default' as const,
      projectionYears: 'default' as const,
    };
  }, [modelData.data]);

  return (
    <div>
      <PageHeader
        title="DCF Valuation"
        subtitle="Estimate intrinsic value using projected free cash flow and terminal value."
        answer="What this helps you answer: Is the stock undervalued or overvalued? What price is fair?"
      />

      <DataQualityBar
        source={modelData.companyName || undefined}
        metrics={sheetRows.filter((r) => r.values[0]?.trim()).length}
      />
      <div className="flex items-center gap-2 mb-2 mt-1">
        <DataSourceBadge variant={isSampleLoaded ? 'sample' : modelData.companyName ? 'imported' : 'manual'} />
      </div>

      {/* ── Unified ToolSpreadsheet input — same UX as Filing page ── */}
      <Card>
        <div className="card-body" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <SectionTitle>DCF Assumptions</SectionTitle>
          <ToolSpreadsheet
            tool="dcf"
            initialData={sheetRows.length > 0 ? sheetRows : EMPTY_DCF_ROWS}
            resetKey={clearVersion}
            singleColumnLabel="Value"
            onDataChange={(rows) => setSheetRows(rows)}
            hint="Type or paste values. Tab to navigate between rows."
          />
          {/* Provenance indicators for each assumption */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-2xs text-muted">
            <span className="mr-1 font-medium" style={{ fontSize: 10 }}>Source:</span>
            <ProvenanceBadge kind={metricProvenance.freeCashFlow} label="Free Cash Flow" />
            <ProvenanceBadge kind={metricProvenance.sharesOutstanding} label="Shares" />
            <ProvenanceBadge kind={metricProvenance.netDebt} label="Net Debt" />
            <ProvenanceBadge kind={metricProvenance.currentPrice} label="Price" />
            <ProvenanceBadge kind={metricProvenance.growthRate} label="Growth Rate" />
            <ProvenanceBadge kind={metricProvenance.wacc} label="WACC" />
            <ProvenanceBadge kind={metricProvenance.terminalGrowth} label="Terminal Growth" />
            <ProvenanceBadge kind={metricProvenance.projectionYears} label="Projection Years" />
          </div>
        </div>
        {Object.keys(errors).length > 0 && (
          <div className="card-body py-2">
            {Object.entries(errors).map(([key, msg]) => (
              <div key={key} className="err-msg">{msg}</div>
            ))}
          </div>
        )}
        <Toolbar onClear={handleClear} onAction={runDCF} actionLabel="Calculate value" />
        <div className="card-actions" style={{ borderTop: 0 }}>
          <button type="button" className="btn-ghost btn-sm" onClick={loadSample}>
            Load sample
          </button>
        </div>
      </Card>

      {show && summary && (
        <DCFResults
          summary={summary}
          sens={sens}
          priceVal={priceVal}
          discount={(() => { const r = sheetRows.find(r => r.metric === 'WACC (%)'); return r ? Number(r.values[0]) || 10 : 10; })()}
          years={(() => { const r = sheetRows.find(r => r.metric === 'Projection Years'); return r ? Number(r.values[0]) || 5 : 5; })()}
          isSampleLoaded={isSampleLoaded}
          companyName={modelData.companyName || ''}
          dataset={activeDataset}
          sheetRows={sheetRows}
        />
      )}

      {!show && (
        <>
          <EmptyState
            title="DCF Valuation"
            desc="Fill in Free Cash Flow, Growth Rate, WACC, and other assumptions above, import a file, or load the sample, then click Calculate."
            action={{ label: 'Load from import', href: '/import' }}
          />
          <div className="flex justify-center mt-3">
            <button type="button" className="btn-secondary btn-sm" onClick={loadSample}>
              Load sample
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Results component — unchanged from before ──

function DCFResults({
  summary,
  sens,
  priceVal,
  discount,
  years,
  isSampleLoaded,
  companyName,
  dataset,
  sheetRows,
}: {
  summary: NonNullable<ReturnType<typeof useDCFStore.getState>['summary']>;
  sens: ReturnType<typeof useDCFStore.getState>['sens'];
  priceVal: number;
  discount: number;
  years: number;
  isSampleLoaded: boolean;
  companyName: string;
  dataset: FundalystDataset | null;
  sheetRows: SpreadsheetRow[];
}) {
  const iv = summary.iv;
  const isUndervalued = iv > priceVal;
  const verdictType = isUndervalued ? 'positive' as const : 'warning' as const;
  const verdictTitle = isUndervalued ? 'Undervalued' : 'Overvalued';

  const formatted = useMemo(() => ({
    iv: '₹' + fmtNum(Math.round(iv * 100) / 100),
    ev: '₹' + fmtNum(Math.round(summary.ev)),
    eq: '₹' + fmtNum(Math.round(summary.eq)),
    price: '₹' + fmtNum(priceVal),
    mos: summary.mos.toFixed(1) + '%',
  }), [iv, summary.ev, summary.eq, summary.mos, priceVal]);

  const traceItems = useMemo<CalculationTrace[]>(() => {
    const fcf = findRow(sheetRows, ['Free Cash Flow']);
    const growth = findRow(sheetRows, ['Growth Rate (%)', 'Growth Rate']);
    const projectionYears = findRow(sheetRows, ['Projection Years']);
    const wacc = findRow(sheetRows, ['WACC (%)', 'WACC']);
    const terminal = findRow(sheetRows, ['Terminal Growth (%)', 'Terminal Growth']);
    const netDebt = findRow(sheetRows, ['Net Debt']);
    const shares = findRow(sheetRows, ['Shares Outstanding']);
    const price = findRow(sheetRows, ['Current Price (₹)', 'Current Price (?)', 'Current Price']);

    return [
      {
        label: 'Enterprise Value',
        value: formatted.ev,
        formula: 'PV of projected FCF + PV of terminal value',
        sources: [
          makeTraceSource('Free Cash Flow', dataset, ['freeCashFlow', 'operatingCashFlow'], fcf),
          makeTraceSource('Growth Rate', dataset, ['growthRate'], growth),
          makeTraceSource('Projection Years', dataset, ['projectionYears'], projectionYears),
          makeTraceSource('WACC', dataset, ['wacc', 'discountRate'], wacc),
          makeTraceSource('Terminal Growth', dataset, ['terminalGrowth'], terminal),
        ],
      },
      {
        label: 'Equity Value',
        value: formatted.eq,
        formula: 'Enterprise Value - Net Debt',
        sources: [
          makeTraceSource('Enterprise Value', null, [], undefined, formatted.ev),
          makeTraceSource('Net Debt', dataset, ['netDebt', 'totalDebt'], netDebt),
        ],
      },
      {
        label: 'Intrinsic Value / Share',
        value: formatted.iv,
        formula: 'Equity Value / Shares Outstanding',
        sources: [
          makeTraceSource('Equity Value', null, [], undefined, formatted.eq),
          makeTraceSource('Shares Outstanding', dataset, ['sharesOutstanding'], shares),
        ],
      },
      {
        label: 'Margin of Safety',
        value: formatted.mos,
        formula: '(Intrinsic Value - Current Price) / Current Price',
        sources: [
          makeTraceSource('Intrinsic Value / Share', null, [], undefined, formatted.iv),
          makeTraceSource('Current Price', dataset, ['price', 'currentPrice'], price),
        ],
      },
    ];
  }, [dataset, formatted.eq, formatted.ev, formatted.iv, formatted.mos, sheetRows]);

  const verdictText = isUndervalued
    ? `Intrinsic value of ${formatted.iv} is above the current price of ${formatted.price}, suggesting the stock may be undervalued.`
    : `Intrinsic value of ${formatted.iv} is below the current price of ${formatted.price}, suggesting the stock may be overvalued.`;

  const mosContext = summary.mos > 20 ? 'Healthy margin of safety' : summary.mos > 10 ? 'Moderate buffer' : 'Thin margin of safety';

  return (
    <ResultPanel label="Intrinsic Value Summary">
      <Card>
        <MetricGrid
          metrics={[
            { label: 'Enterprise Value', value: formatted.ev },
            { label: 'Equity Value', value: formatted.eq },
            { label: 'Intrinsic Value / Share', value: formatted.iv, cls: isUndervalued ? 'good' : 'warn', context: isUndervalued ? 'Above current price' : 'Below current price', contextTrend: isUndervalued ? 'up' : 'down' },
            { label: 'Current Price', value: formatted.price },
            { label: 'Margin of Safety', value: formatted.mos, cls: summary.mos > 20 ? 'good' : summary.mos > 0 ? 'neutral' : 'warn', context: mosContext, contextTrend: summary.mos > 0 ? 'up' : 'down' },
            { label: 'Verdict', value: isUndervalued ? 'Undervalued ✓' : 'Overvalued ✗', cls: isUndervalued ? 'good' : 'warn' },
          ]}
        />
        <InsightCard
          type={verdictType}
          title={verdictTitle}
          text={verdictText}
          formula="Intrinsic Value = (Enterprise Value − Net Debt) / Shares Outstanding"
        />
      </Card>

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
        <TrustBadge label={`Values from: ${isSampleLoaded ? 'Sample data' : companyName || 'User entry'}`} variant="source" />
        <TrustBadge label="₹ Indian Market" />
      </div>
      <Disclaimer extra="Method: DCF with Gordon Growth terminal value" />
      <NextLinks links={[{ label: 'Compare peers', href: '/tools/peer' }, { label: 'Review filings', href: '/research/filing' }]} />
    </ResultPanel>
  );
}
