'use client';

import { useState, useCallback, useMemo } from 'react';
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
} from '@/components/ui';
import dynamic from 'next/dynamic';
import { useGlobalImportFill, extractDCFInputs, getDataSourceLabel } from '@/lib/importer/import-hooks';

const DCFChart = dynamic(() => import('@/components/tools/dcf/DCFChart'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ width: '100%', height: 300, borderRadius: 'var(--radius-md)' }} />,
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
            hint="TTM free cash flow to firm"
          />
          {errors.fcf && <div className="err-msg" style={{ gridColumn: '1 / -1', marginTop: -8 }}>{errors.fcf}</div>}
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
            hint="Projected annual FCF growth"
          />
          <Field
            label="Projection Years"
            value={inputs.years}
            onChange={(v) => { setInput('years', v); setErrors((e) => ({ ...e, years: '' })); }}
            hint="Years of projected cash flows"
          />
        </FieldGrid>
        {errors.years && <div className="err-msg" style={{ padding: '0 20px 10px' }}>{errors.years}</div>}
      </Card>

      {/* ── Discount Assumptions ── */}
      <SectionTitle>Discount Assumptions</SectionTitle>
      <Card>
        <FieldGrid>
          <Field
            label="WACC (%)"
            value={inputs.discount}
            onChange={(v) => { setInput('discount', v); setErrors((e) => ({ ...e, discount: '' })); }}
            hint="Weighted avg cost of capital"
          />
          <Field
            label="Terminal Growth (%)"
            value={inputs.terminal}
            onChange={(v) => { setInput('terminal', v); setErrors((e) => ({ ...e, terminal: '' })); }}
            hint="Perpetual growth rate (must be less than WACC)"
          />
        </FieldGrid>
        {errors.discount && <div className="err-msg" style={{ padding: '0 20px 10px' }}>{errors.discount}</div>}
        {errors.terminal && <div className="err-msg" style={{ padding: '0 20px 10px' }}>{errors.terminal}</div>}
      </Card>

      {/* ── Share Price Assumptions ── */}
      <SectionTitle>Share Price Assumptions</SectionTitle>
      <Card>
        <FieldGrid>
          <Field
            label="Net Debt (₹ Cr)"
            value={inputs.netDebt}
            onChange={(v) => setInput('netDebt', v)}
            hint="Total debt minus cash"
          />
          <Field
            label="Shares Outstanding (Cr)"
            value={inputs.shares}
            onChange={(v) => { setInput('shares', v); setErrors((e) => ({ ...e, shares: '' })); }}
            hint="Fully diluted share count"
          />
          <Field
            label="Current Price (₹)"
            value={inputs.price}
            onChange={(v) => setInput('price', v)}
            hint="Market price per share"
          />
        </FieldGrid>
        {errors.shares && <div className="err-msg" style={{ padding: '0 20px 10px' }}>{errors.shares}</div>}
      </Card>

      {/* ── Toolbar ── */}
      <div style={{ marginTop: '1.5rem' }}>
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
          title="Enter assumptions above, then click Calculate value."
          desc="Adjust the default values or enter your own — the sensitivity table shows how changes in assumptions affect intrinsic value."
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

  return (
    <ResultPanel label="Intrinsic Value Summary">
      <Card>
        <MetricGrid
          metrics={[
            { label: 'Enterprise Value', value: formatted.ev },
            { label: 'Equity Value', value: formatted.eq },
            { label: 'Intrinsic Value / Share', value: formatted.iv, cls: isUndervalued ? 'good' : 'warn' },
            { label: 'Current Price', value: formatted.price },
            { label: 'Margin of Safety', value: formatted.mos, cls: summary.mos > 20 ? 'good' : summary.mos > 0 ? 'neutral' : 'warn' },
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
      <Card label="Chart" style={{ marginTop: '1rem' }}>
        <div style={{ padding: 20, height: 300 }}>
          <DCFChart projected={summary.projected} tv={summary.tv} pvTv={summary.pvTv} />
        </div>
      </Card>

      {/* ── Projected Cash Flows ── */}
      <Card label="Projected Cash Flows" style={{ marginTop: '1rem' }}>
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
        <Card label="Sensitivity Analysis" style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Intrinsic value per share at varying terminal growth rates (rows) vs discount rates (columns)
          </div>
          <div style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    Growth ↓ / Disc →
                  </th>
                  {sens[0].cols.map((c) => (
                    <th key={c.d} style={{ padding: 8, textAlign: 'right', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {c.d}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sens.map((row) => (
                  <tr key={row.g}>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 11 }}>
                      {row.g}%
                    </td>
                    {row.cols.map((c) => (
                      <td
                        key={c.d}
                        style={{
                          padding: '6px 8px',
                          borderBottom: '1px solid var(--border)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12,
                          color: c.iv > priceVal ? 'var(--green)' : 'var(--red)',
                        }}
                      >
                        {'₹' + fmtNum(Math.round(c.iv * 10) / 10)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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
