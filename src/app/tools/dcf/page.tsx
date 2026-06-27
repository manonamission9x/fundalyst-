'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { computeDCF, computeDCFSensitivity, validateDCFInputs, fmtNum } from '@/lib/calculations';
import { useDCFStore } from '@/store';
import { useActiveDataset, extractDCFInputsFromModel } from '@/store/financial-model-selectors';
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
} from '@/components/ui';
import ToolSpreadsheet from '@/components/input/ToolSpreadsheet';
import type { SpreadsheetRow } from '@/components/input/SpreadsheetInput';
import dynamic from 'next/dynamic';
import { useGlobalImportFill, extractDCFInputs, getDataSourceLabel } from '@/lib/importer/import-hooks';
import { useModelData } from '@/store/use-model-data';

const DCFChart = dynamic(() => import('@/components/tools/dcf/DCFChart'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ width: '100%', height: 300 }} />,
});

/** Map ToolSpreadsheet rows → DCF store input fields */
const METRIC_TO_FIELD: Record<string, keyof import('@/types/financial').DCFInputs> = {
  'Free Cash Flow': 'fcf',
  'Growth Rate (%)': 'growth',
  'Projection Years': 'years',
  'WACC (%)': 'discount',
  'Terminal Growth (%)': 'terminal',
  'Net Debt': 'netDebt',
  'Shares Outstanding': 'shares',
  'Current Price (₹)': 'price',
};

function rowsToDCFInputs(rows: SpreadsheetRow[]): Record<string, number | ''> {
  const result: Record<string, number | ''> = {};
  for (const row of rows) {
    const field = METRIC_TO_FIELD[row.metric.split(' (')[0]] || row.metric.toLowerCase().replace(/[^a-z]/g, '');
    const val = row.values[0]?.trim() || '';
    result[field] = val === '' ? '' : parseFloat(val) || 0;
  }
  return result;
}

export default function DCFPage() {
  const showToast = useToast();
  const { show, summary, sens, setShow, setSummary, setSens } = useDCFStore();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sheetRows, setSheetRows] = useState<SpreadsheetRow[]>([]);

  // Model pre-fill via universal hook
  const modelData = useModelData((ds) => extractDCFInputsFromModel(ds));

  // Pre-fill from canonical model when available
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current) return;
    if (!modelData.data || sheetRows.length > 0) return;
    const { fcf, shares, netDebt } = modelData.data;
    if (fcf !== null || shares !== null || netDebt !== null) {
      setSheetRows((prev) => {
        if (prev.length > 0) return prev;
        return [
          { metric: 'Free Cash Flow', values: [fcf !== null ? String(fcf) : ''] },
          { metric: 'Growth Rate (%)', values: ['8'] },
          { metric: 'Projection Years', values: ['5'] },
          { metric: 'WACC (%)', values: ['10'] },
          { metric: 'Terminal Growth (%)', values: ['3'] },
          { metric: 'Net Debt', values: [netDebt !== null ? String(netDebt) : ''] },
          { metric: 'Shares Outstanding', values: [shares !== null ? String(shares) : ''] },
          { metric: 'Current Price (₹)', values: [''] },
        ];
      });
      prefilledRef.current = true;
    }
  }, [modelData.data, sheetRows.length]);

  // Auto-demo on first visit
  const autoDemoRef = useRef(false);
  useEffect(() => {
    if (autoDemoRef.current) return;
    autoDemoRef.current = true;
    if (!show && summary === null && sheetRows.length === 0) {
      setSheetRows([
        { metric: 'Free Cash Flow', values: ['1240'] },
        { metric: 'Growth Rate (%)', values: ['8'] },
        { metric: 'Projection Years', values: ['5'] },
        { metric: 'WACC (%)', values: ['10'] },
        { metric: 'Terminal Growth (%)', values: ['3'] },
        { metric: 'Net Debt', values: ['180'] },
        { metric: 'Shares Outstanding', values: ['100'] },
        { metric: 'Current Price (₹)', values: ['450'] },
      ]);
      const timer = setTimeout(() => runDCF(), 400);
      return () => clearTimeout(timer);
    }
  }, []);

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
      if (validationErrors[0].field === 'terminal') {
        showToast(validationErrors[0].message);
      }
      return;
    }

    const r = computeDCF(
      Number(fcf), Number(growth), Number(years),
      Number(discount), Number(terminal), Number(netDebt),
      Number(shares), Number(price),
    );

    if (r === null) {
      showToast('Terminal growth too close to WACC — Gordon Growth model requires a meaningful spread');
      return;
    }

    const sensResult = computeDCFSensitivity(
      Number(fcf), Number(growth), Number(years),
      [1, 2, 3, 4, 5], [8, 10, 12, 14, 16],
      Number(netDebt), Number(shares), Number(price),
    );

    setShow(true);
    setSummary(r);
    setSens(sensResult);
    showToast('Valuation calculated');
  }

  const handleClear = useCallback(() => {
    setSheetRows([]);
    setShow(false);
    setSummary(null);
    setSens([]);
    setErrors({});
  }, [setShow, setSummary, setSens]);

  const priceVal = useMemo(() => {
    const pRow = sheetRows.find((r) => r.metric === 'Current Price (₹)');
    return pRow ? Number(pRow.values[0]) || 0 : 0;
  }, [sheetRows]);

  return (
    <div>
      <PageHeader
        title="DCF Valuation"
        subtitle="Estimate intrinsic value using projected free cash flow and terminal value."
        answer="What this helps you answer: Is the stock undervalued or overvalued? What price is fair?"
      />

      <DataQualityBar
        source={modelData.isLoaded ? `Model: ${modelData.companyName || 'Loaded'}` : 'Manual mode'}
        metrics={sheetRows.filter((r) => r.values[0]?.trim()).length}
      />

      {/* ── Unified ToolSpreadsheet input — same UX as Filing page ── */}
      <Card>
        <div className="card-body" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <SectionTitle>DCF Assumptions</SectionTitle>
          <ToolSpreadsheet
            tool="dcf"
            initialData={sheetRows.length > 0 ? sheetRows : undefined}
            singleColumnLabel="Value"
            onDataChange={(rows) => setSheetRows(rows)}
            hint="Type or paste values. Tab to navigate between rows."
          />
        </div>
        {Object.keys(errors).length > 0 && (
          <div className="card-body py-2">
            {Object.entries(errors).map(([key, msg]) => (
              <div key={key} className="err-msg">{msg}</div>
            ))}
          </div>
        )}
        <Toolbar onClear={handleClear} onAction={runDCF} actionLabel="Calculate value" />
      </Card>

      {show && summary && (
        <DCFResults
          summary={summary}
          sens={sens}
          priceVal={priceVal}
          discount={(() => { const r = sheetRows.find(r => r.metric === 'WACC (%)'); return r ? Number(r.values[0]) || 10 : 10; })()}
          years={(() => { const r = sheetRows.find(r => r.metric === 'Projection Years'); return r ? Number(r.values[0]) || 5 : 5; })()}
        />
      )}

      {!show && (
        <EmptyState
          title="Fill in the DCF assumptions above, then click Calculate value."
          desc="Defaults pre-filled with sample data. Adjust Free Cash Flow, Growth Rate, WACC, and other assumptions to see how they affect intrinsic value."
          action={{ label: 'Load from import', href: '/import' }}
        />
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
}: {
  summary: NonNullable<ReturnType<typeof useDCFStore.getState>['summary']>;
  sens: ReturnType<typeof useDCFStore.getState>['sens'];
  priceVal: number;
  discount: number;
  years: number;
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
                      const diff = c.iv - priceVal;
                      const isBaseCell = Math.abs(row.g - 3) < 0.5 && c.d === discount;
                      const cls = diff > 0 ? 'sens-td-up' : diff < 0 ? 'sens-td-down' : '';
                      return (<td key={c.d} className={`${cls}${isBaseCell ? ' sens-td-base' : ''}`}>{'₹' + fmtNum(Math.round(c.iv * 10) / 10)}</td>);
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
        <TrustBadge label="DCF - Gordon Growth" variant="source" />
        <TrustBadge label="₹ Indian Market" />
      </div>
      <Disclaimer extra="Method: DCF with Gordon Growth terminal value" />
      <NextLinks links={[{ label: 'Compare peers', href: '/tools/peer' }, { label: 'Review filings', href: '/research/filing' }]} />
    </ResultPanel>
  );
}
