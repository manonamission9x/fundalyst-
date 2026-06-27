'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { computeDCF, computeDCFSensitivity, validateDCFInputs, fmtNum } from '@/lib/calculations';
import { useDCFStore } from '@/store';
import { useToast } from '@/components/shared/ToastProvider';
import {
  PageHeader,
  Card,
  FieldGrid,
  Field,
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
import dynamic from 'next/dynamic';
import { useGlobalImportFill, extractDCFInputs, getDataSourceLabel } from '@/lib/importer/import-hooks';

const DCFChart = dynamic(() => import('@/components/tools/dcf/DCFChart'), {
  ssr: false,
  loading: () => <div className="skeleton rounded-lg" style={{ width: '100%', height: 300 }} />,
});

export default function DCFPage() {
  const showToast = useToast();
  const { inputs, show, summary, sens, setInput, setShow, setSummary, setSens, clear } = useDCFStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { dataSource, companyName } = useGlobalImportFill(
    (vals) => {
      Object.entries(vals).forEach(([key, val]) => setInput(key as keyof typeof inputs, val));
    },
    extractDCFInputs,
  );

  // Auto-demo on first visit: run DCF with defaults if no results exist
  const autoDemoRef = useRef(false);
  useEffect(() => {
    if (autoDemoRef.current) return;
    autoDemoRef.current = true;
    if (!useDCFStore.getState().show && useDCFStore.getState().summary === null) {
      // Small timeout to let the DOM settle for toast rendering
      const timer = setTimeout(() => runDCF(), 400);
      return () => clearTimeout(timer);
    }
  }, []);

  // Plain function — not useCallback — for maximum reliability
  function runDCF() {
    // Read from store at click time to avoid stale renders
    const s = useDCFStore.getState().inputs;
    const fcf = s.fcf;
    const growth = s.growth;
    const years = s.years;
    const discount = s.discount;
    const terminal = s.terminal;
    const netDebt = s.netDebt;
    const shares = s.shares;
    const price = s.price;

    // Validate all inputs
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

    // Compute
    const r = computeDCF(
      Number(fcf), Number(growth), Number(years),
      Number(discount), Number(terminal), Number(netDebt),
      Number(shares), Number(price),
    );

    if (r === null) {
      showToast('Terminal growth too close to WACC — Gordon Growth model requires a meaningful spread');
      return;
    }

    // Sensitivity table
    const sensResult = computeDCFSensitivity(
      Number(fcf), Number(growth), Number(years),
      [1, 2, 3, 4, 5], [8, 10, 12, 14, 16],
      Number(netDebt), Number(shares), Number(price),
    );

    // Set results using hook setters
    setShow(true);
    setSummary(r);
    setSens(sensResult);
    showToast('Valuation calculated');
  }

  const handleClear = useCallback(() => {
    clear();
    setErrors({});
  }, [clear]);

  const priceVal = useMemo(
    () => typeof inputs.price === 'number' ? inputs.price : Number(inputs.price) || 0,
    [inputs.price],
  );

  return (
    <div>
      <PageHeader
        title="DCF Valuation"
        subtitle="Estimate intrinsic value using projected free cash flow and terminal value."
        answer="What this helps you answer: Is the stock undervalued or overvalued? What price is fair?"
      />

      <DataQualityBar
        source={getDataSourceLabel(dataSource, companyName)}
        metrics={useMemo(() => Object.values(inputs).filter((v) => v !== '' && v !== null && v !== 0).length, [inputs])}
      />

      {/* ── Cash Flow Assumptions ── */}
      <SectionTitle>Cash Flow Assumptions</SectionTitle>
      <Card>
        <FieldGrid>
          <Field
            label="Free Cash Flow (₹ Cr)"
            value={inputs.fcf}
            onChange={(v) => { setInput('fcf', v); setErrors((e) => ({ ...e, fcf: '' })); }}
            hint="Cash generated after expenses & investments (trailing 12 months)"
          />
          {errors.fcf && <div className="err-msg mt-1 px-4">{errors.fcf}</div>}
        </FieldGrid>
      </Card>

      {/* ── Growth Assumptions ── */}
      <SectionTitle>Growth Assumptions</SectionTitle>
      <Card>
        <FieldGrid>
          <Field
            label="Growth Rate (%)"
            value={inputs.growth}
            onChange={(v) => setInput('growth', v)}
            hint="Expected yearly growth rate of this cash flow"
          />
          <Field
            label="Projection Years"
            value={inputs.years}
            onChange={(v) => { setInput('years', v); setErrors((e) => ({ ...e, years: '' })); }}
            hint="How many years to project (typically 5–10)"
          />
        </FieldGrid>
        {errors.years && <div className="err-msg px-4 py-2">{errors.years}</div>}
      </Card>

      {/* ── Discount Assumptions ── */}
      <SectionTitle>Discount Assumptions</SectionTitle>
      <Card>
        <FieldGrid>
          <Field
            label="WACC (%)"
            value={inputs.discount}
            onChange={(v) => { setInput('discount', v); setErrors((e) => ({ ...e, discount: '' })); }}
            hint="Company's blended cost of debt and equity (typically 8–15%)"
          />
          <Field
            label="Terminal Growth (%)"
            value={inputs.terminal}
            onChange={(v) => { setInput('terminal', v); setErrors((e) => ({ ...e, terminal: '' })); }}
            hint="Long-term growth after projection years (must be below WACC)"
          />
        </FieldGrid>
        {errors.discount && <div className="err-msg px-4 py-2">{errors.discount}</div>}
        {errors.terminal && <div className="err-msg px-4 py-2">{errors.terminal}</div>}
      </Card>

      {/* ── Share Price Assumptions ── */}
      <SectionTitle>Share Price Assumptions</SectionTitle>
      <Card>
        <FieldGrid>
          <Field
            label="Net Debt (₹ Cr)"
            value={inputs.netDebt}
            onChange={(v) => setInput('netDebt', v)}
            hint="Total debt minus cash & equivalents"
          />
          <Field
            label="Shares Outstanding (Cr)"
            value={inputs.shares}
            onChange={(v) => { setInput('shares', v); setErrors((e) => ({ ...e, shares: '' })); }}
            hint="Total shares including options and warrants"
          />
          <Field
            label="Current Price (₹)"
            value={inputs.price}
            onChange={(v) => setInput('price', v)}
            hint="Current stock market price"
          />
        </FieldGrid>
        {errors.shares && <div className="err-msg px-4 py-2">{errors.shares}</div>}
      </Card>

      {/* ── Toolbar ── */}
      <div className="mt-6">
        <Toolbar
          onClear={handleClear}
          onAction={runDCF}
          actionLabel="Calculate value"
          hint="Defaults pre-filled — adjust as needed"
        />
      </div>

      {/* ── Results ── */}
      {show && summary && (
        <DCFResults
          summary={summary}
          sens={sens}
          priceVal={priceVal}
          discount={inputs.discount}
          years={inputs.years}
        />
      )}

      {/* ── Empty state ── */}
      {!show && (
        <EmptyState
          title="Adjust assumptions above, then click Calculate value."
          desc="Defaults pre-filled with sample assumptions. Adjust each value or enter real company data to see how assumptions affect intrinsic value."
          action={{ label: 'Load from import', href: '/import' }}
        />
      )}
    </div>
  );
}

// ── Extracted results component (only renders when results change) ──

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
  discount: number | '';
  years: number | '';
}) {
  const iv = summary.iv;
  const isUndervalued = iv > priceVal;
  const verdictType = isUndervalued ? 'positive' as const : 'warning' as const;
  const verdictTitle = isUndervalued ? 'Undervalued' : 'Overvalued';

  // Memoize formatted values (these are expensive string ops)
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

      {/* ── Chart ── */}
      <Card label="Chart" className="mt-4">
        <div className="chart-wrap">
          <DCFChart projected={summary.projected} tv={summary.tv} pvTv={summary.pvTv} currentPrice={priceVal} />
        </div>
      </Card>

      {/* ── Projected Cash Flows ── */}
      <Card label="Projected Cash Flows" className="mt-4">
        <table className="diff-table">
          <thead>
            <tr><th>Year</th><th>Projected FCF</th><th>Discount Factor</th><th>PV of FCF</th></tr>
          </thead>
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
              <td>{(1 / Math.pow(1 + Number(discount) / 100, Number(years))).toFixed(4)}</td>
              <td>{'₹' + fmtNum(Math.round(summary.pvTv))}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* ── Sensitivity Analysis ── */}
      {sens.length > 0 && (
        <Card label="Sensitivity Analysis" className="mt-4">
          <div className="card-body text-sm text-secondary">
            Intrinsic value per share at varying terminal growth rates (rows) vs discount rates (columns).<br />
            <span className="text-muted">Base assumption highlighted. Green = undervalued vs ₹{fmtNum(priceVal)}, Red = overvalued.</span>
          </div>
          <div className="overflow-x-auto">
            <table className="sens-table">
              <thead>
                <tr>
                  <th>Growth ↓ / Disc →</th>
                  {sens[0].cols.map((c) => (
                    <th key={c.d}>{c.d}%</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sens.map((row) => (
                  <tr key={row.g}>
                    <td>{row.g}%</td>
                    {row.cols.map((c) => {
                      const diff = c.iv - priceVal;
                      const isBaseCell = Math.abs(row.g - 3) < 0.5 && c.d === Number(discount);
                      const cls = diff > 0 ? 'sens-td-up' : diff < 0 ? 'sens-td-down' : '';
                      return (
                        <td key={c.d} className={`${cls}${isBaseCell ? ' sens-td-base' : ''}`}>
                              {'₹' + fmtNum(Math.round(c.iv * 10) / 10)}
                            </td>
                      );
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
      <NextLinks
        links={[
          { label: 'Compare peers', href: '/tools/peer' },
          { label: 'Review filings', href: '/research/filing' },
        ]}
      />
    </ResultPanel>
  );
}
