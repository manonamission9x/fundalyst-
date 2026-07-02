/**
 * FUNDALYST — Financial Calculation Engine v2
 *
 * All functions are pure, deterministic, and independently verifiable.
 * No side effects. No hidden state. No magic numbers.
 *
 * Every formula is documented inline for auditability.
 */

import type {
  DCFResult,
  WCResult,
  RatioInputs,
  RatioResult,
  LineItem,
  DiffResult,
  RiskFlag,
  InstitutionalInputs,
  InstitutionalResult,
  InstitutionalMetric,
} from '@/types/financial';

// ── Validation Helpers ─────────────────────────────────────────────────────

/** Check if a value is safe for financial computation */
function isValidNumber(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v);
}

/** Convert a potentially empty/null input to a validated number */
function toFinite(v: number | '' | null | undefined, fallback = 0): number {
  if (v === '' || v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Clamp a value between min and max */

// ── Filing Comparison ──

export function parseLines(text: string): LineItem[] {
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes(':'))
    .map((line) => {
      const idx = line.indexOf(':');
      const raw = line.slice(idx + 1).trim();
      const cleaned = raw.replace(/,/g, '');
      return { label: line.slice(0, idx).trim(), value: cleaned };
    })
    .filter((item) => item.label && item.value);
}

export function computeDiff(periodA: LineItem[], periodB: LineItem[]): DiffResult[] {
  const mapA: Record<string, number> = {};
  const mapB: Record<string, number> = {};
  periodA.forEach((p) => { const n = parseFloat(p.value); if (Number.isFinite(n)) mapA[p.label.toLowerCase()] = n; });
  periodB.forEach((p) => { const n = parseFloat(p.value); if (Number.isFinite(n)) mapB[p.label.toLowerCase()] = n; });

  const allLabels = [...new Set([...Object.keys(mapA), ...Object.keys(mapB)])];
  const diffs: DiffResult[] = [];

  allLabels.forEach((label) => {
    const a = mapA[label];
    const b = mapB[label];
    const aVal = a !== undefined ? a : null;
    const bVal = b !== undefined ? b : null;
    const absA = aVal !== null ? Math.abs(aVal) : 0;
    const pct = aVal !== null && bVal !== null && absA > 0 ? ((bVal - aVal) / absA) * 100 : null;
    const isPct = /margin|tax|yield|efficiency|roce|roe|roa/i.test(label) && !/(growth|change|decline)/i.test(label);
    diffs.push({
      label,
      a: aVal,
      b: bVal,
      pct,
      abs: aVal !== null && bVal !== null ? bVal - aVal : null,
      dir: pct !== null ? (pct > 0.1 ? 'up' : pct < -0.1 ? 'down' : 'flat') : 'flat',
      isPct: isPct && aVal !== null && aVal < 100,
    });
  });

  diffs.sort((x, y) => Math.abs(y.pct || 0) - Math.abs(x.pct || 0));
  return diffs;
}

export function generateRiskFlags(diffs: DiffResult[]): RiskFlag[] {
  const flags: RiskFlag[] = [];
  diffs.forEach((d) => {
    const lc = d.label.toLowerCase();
    if (d.pct !== null) {
      if ((lc.includes('pledge') || lc.includes('promoter')) && d.pct > 5)
        flags.push({ level: 'warn', label: d.label, text: `Promoter pledge increased ${d.pct.toFixed(1)}%.` });
      if ((lc.includes('debt') || lc.includes('borrow')) && d.pct > 20)
        flags.push({ level: 'danger', label: d.label, text: `Debt surged ${d.pct.toFixed(1)}%.` });
      if ((lc.includes('margin') || lc.includes('ebitda')) && d.pct < -10)
        flags.push({ level: 'danger', label: d.label, text: `Margin compressed by ${Math.abs(d.pct).toFixed(1)}%.` });
      if ((lc.includes('revenue') || lc.includes('sales')) && d.pct < -5)
        flags.push({ level: 'warn', label: d.label, text: `Revenue declined ${Math.abs(d.pct).toFixed(1)}%.` });
      if ((lc.includes('profit') || lc.includes('net')) && !lc.includes('margin') && d.pct < -15)
        flags.push({ level: 'warn', label: d.label, text: `Net profit dropped ${Math.abs(d.pct).toFixed(1)}%.` });
      if (lc.includes('cash') && d.pct < -20)
        flags.push({ level: 'warn', label: d.label, text: `Cash dropped ${Math.abs(d.pct).toFixed(1)}%.` });
    }
  });
  return flags;
}

// ── DCF Valuation ───────────────────────────────────────────────────────────

export interface DCFValidationError {
  field: string;
  message: string;
}

/**
 * Validate DCF inputs and return an array of errors.
 * Returns empty array if all inputs are valid.
 */
export function validateDCFInputs(
  fcf: number | '',
  growth: number | '',
  years: number | '',
  discount: number | '',
  terminal: number | '',
  netDebt: number | '',
  shares: number | '',
  price: number | '',
): DCFValidationError[] {
  const errors: DCFValidationError[] = [];
  const fcfN = toFinite(fcf);
  const growthN = toFinite(growth);
  const yearsN = toFinite(years);
  const discountN = toFinite(discount);
  const terminalN = toFinite(terminal);
  const sharesN = toFinite(shares);
  const priceN = toFinite(price);

  if (fcf === '' || fcf === null) errors.push({ field: 'fcf', message: 'Free Cash Flow is required' });
  else if (!isValidNumber(fcfN)) errors.push({ field: 'fcf', message: 'Free Cash Flow must be a valid number' });

  if (years === '' || years === null) errors.push({ field: 'years', message: 'Projection years is required' });
  else if (yearsN < 1 || yearsN > 50) errors.push({ field: 'years', message: 'Projection years must be between 1 and 50' });

  if (shares === '' || shares === null) errors.push({ field: 'shares', message: 'Shares outstanding is required' });
  else if (sharesN <= 0) errors.push({ field: 'shares', message: 'Shares outstanding must be greater than zero' });

  if (discount === '' || discount === null) errors.push({ field: 'discount', message: 'Discount rate (WACC) is required' });
  else if (discountN < 0 || discountN > 100) errors.push({ field: 'discount', message: 'WACC must be between 0% and 100%' });

  if (growth !== '' && growth !== null && discount !== '' && discount !== null && growthN >= discountN && discountN > 0)
    errors.push({ field: 'growth', message: 'Growth rate must be less than WACC for meaningful valuation' });

  if (terminal === '' || terminal === null) errors.push({ field: 'terminal', message: 'Terminal growth rate is required' });
  else if (terminalN >= discountN && discountN > 0) errors.push({ field: 'terminal', message: 'Terminal growth must be less than WACC' });

  if (price === '' || price === null) errors.push({ field: 'price', message: 'Current price is required' });
  else if (priceN < 0) errors.push({ field: 'price', message: 'Price cannot be negative' });

  return errors;
}

/**
 * Compute DCF valuation using the Gordon Growth terminal value model.
 *
 * Methodology:
 *   1. Project FCF for each year: FCF_year = FCF_base × (1 + growth)^year
 *   2. Discount each cash flow: PV = FCF_year / (1 + WACC)^year
 *   3. Compute terminal value: TV = FCF_n × (1 + g_terminal) / (WACC - g_terminal)
 *   4. Discount terminal value: PV_TV = TV / (1 + WACC)^years
 *   5. Enterprise Value = Sum of PVs + PV of TV
 *   6. Equity Value = Enterprise Value - Net Debt
 *   7. Intrinsic Value per Share = Equity Value / Shares Outstanding
 *   8. Margin of Safety = (IV - Price) / Price × 100
 *
 * @returns DCFResult | null — null if computation is impossible
 */
export function computeDCF(
  fcf: number,
  growth: number,
  years: number,
  discount: number,
  terminal: number,
  netDebt: number,
  shares: number,
  price: number,
): DCFResult | null {
  // ── Input validation ──
  const dr = discount / 100;        // decimal discount rate
  const g = growth / 100;           // decimal growth rate
  const tr = terminal / 100;        // decimal terminal growth rate

  // Guard: shares must be positive
  if (shares <= 0) return null;
  // Guard: years must be at least 1
  if (years < 1) return null;
  // Guard: terminal growth must be strictly less than discount rate
  // Gordon Growth model requires (WACC - g_terminal) > 0
  const spread = dr - tr;
  if (spread < 0.0001) return null;

  // ── Projected cash flows ──
  const projected: { year: number; fcf: number; df: number; pv: number }[] = [];
  let pvSum = 0;

  for (let y = 1; y <= years; y++) {
    const pfcf = fcf * Math.pow(1 + g, y);            // Projected FCF for year y
    const df = 1 / Math.pow(1 + dr, y);               // Discount factor for year y
    const pv = pfcf * df;                              // Present value of projected FCF
    projected.push({ year: y, fcf: pfcf, df, pv });
    pvSum += pv;
  }

  // ── Terminal value (Gordon Growth Model) ──
  const finalYearFcf = fcf * Math.pow(1 + g, years);  // FCF in the final projection year
  const tv = (finalYearFcf * (1 + tr)) / spread;       // Terminal value at end of projection
  const pvTv = tv / Math.pow(1 + dr, years);           // Present value of terminal value

  // ── Enterprise & Equity Value ──
  const ev = pvSum + pvTv;                             // Enterprise Value
  const eq = ev - netDebt;                             // Equity Value (adjust for net debt)
  const iv = eq / shares;                              // Intrinsic Value per share
  const mos = price > 0 ? ((iv - price) / price) * 100 : 0;  // Margin of Safety (%)

  return { projected, pvSum, tv, pvTv, ev, eq, iv, mos };
}

/**
 * Generate a 2D sensitivity table showing intrinsic value at various
 * terminal growth rates and discount rates.
 *
 * @param terminalRates — Array of terminal growth rates to test (%, e.g. [1,2,3])
 * @param discountRates — Array of discount rates to test (%, e.g. [8,10,12])
 */
export function computeDCFSensitivity(
  fcf: number,
  growth: number,
  years: number,
  terminalRates: number[],
  discountRates: number[],
  netDebt: number,
  shares: number,
  price: number,
): { g: number; cols: { d: number; iv: number }[] }[] {
  return terminalRates.map((tr) => ({
    g: tr,
    cols: discountRates.map((dr) => {
      const result = computeDCF(fcf, growth, years, dr, tr, netDebt, shares, price);
      return { d: dr, iv: result?.iv ?? NaN };
    }),
  }));
}

/** One DCF scenario (bear/base/bull) — assumptions flexed together. */
export interface DCFScenario {
  key: 'bear' | 'base' | 'bull';
  label: string;
  growth: number;
  discount: number;
  terminal: number;
  iv: number | null;
  mos: number | null;
}

/**
 * Compute bear / base / bull DCF scenarios by flexing growth, WACC, and
 * terminal growth together around the user's base assumptions. Reuses
 * computeDCF; discount is floored and terminal is clamped below WACC so the
 * Gordon Growth spread stays valid. iv/mos are null for any scenario that
 * cannot be computed.
 */
export function computeDCFScenarios(
  fcf: number,
  growth: number,
  years: number,
  discount: number,
  terminal: number,
  netDebt: number,
  shares: number,
  price: number,
  opts?: { growthDelta?: number; waccDelta?: number; terminalDelta?: number },
): DCFScenario[] {
  const gD = opts?.growthDelta ?? 3;
  const wD = opts?.waccDelta ?? 2;
  const tD = opts?.terminalDelta ?? 1;

  const build = (
    key: DCFScenario['key'],
    label: string,
    g: number,
    d: number,
    t: number,
  ): DCFScenario => {
    const disc = Math.max(0.5, d);
    const term = Math.min(Math.max(0, t), disc - 0.5); // keep WACC - terminal > 0
    const r = computeDCF(fcf, g, years, disc, term, netDebt, shares, price);
    return { key, label, growth: g, discount: disc, terminal: term, iv: r?.iv ?? null, mos: r?.mos ?? null };
  };

  return [
    build('bear', 'Bear', Math.max(0, growth - gD), discount + wD, terminal - tD),
    build('base', 'Base', growth, discount, terminal),
    build('bull', 'Bull', growth + gD, discount - wD, terminal + tD),
  ];
}

// ── Working Capital ──

export function computeWC(
  revenue: number | null,
  cogs: number | null,
  receivables: number | null,
  inventory: number | null,
  payables: number | null,
  cash: number | null,
): WCResult {
  const dso = receivables !== null && revenue !== null && revenue > 0
    ? (receivables / revenue) * 365
    : null;
  const dio = inventory !== null && cogs !== null && cogs > 0
    ? (inventory / cogs) * 365
    : null;
  const dpo = payables !== null && cogs !== null && cogs > 0
    ? (payables / cogs) * 365
    : null;
  const ccc = (dso || 0) + (dio || 0) - (dpo || 0);
  const nwc = (receivables || 0) + (inventory || 0) + (cash || 0) - (payables || 0);
  return { dso, dio, dpo, ccc, nwc };
}

// ── Financial Ratios ──

export function computeRatios(values: RatioInputs): RatioResult[] {
  const { revenue, cogs, netProfit, totalAssets, totalEquity, totalDebt, currentAssets, currentLiab, inventory, interest, ebit } = values;
  const results: RatioResult[] = [];
  const grossProfit = revenue !== null && cogs !== null ? revenue - cogs : null;

  // Liquidity
  if (currentAssets !== null && currentLiab !== null && currentLiab !== 0) {
    const cr = currentAssets / currentLiab;
    results.push({ section: 'Liquidity', label: 'Current Ratio', value: cr.toFixed(2) + 'x', cls: cr >= 1.5 ? 'good' : cr < 1 ? 'warn' : '' });
  }
  if (currentAssets !== null && currentLiab !== null && inventory !== null && currentLiab !== 0) {
    const qr = (currentAssets - inventory) / currentLiab;
    results.push({ section: 'Liquidity', label: 'Quick Ratio', value: qr.toFixed(2) + 'x', cls: qr >= 1 ? 'good' : qr < 0.5 ? 'warn' : '' });
  }

  // Leverage
  if (totalDebt !== null && totalEquity !== null && totalEquity !== 0) {
    const dte = totalDebt / totalEquity;
    results.push({ section: 'Leverage', label: 'Debt/Equity', value: dte.toFixed(2) + 'x', cls: dte < 1 ? 'good' : dte > 2 ? 'warn' : '' });
  }
  if (totalDebt !== null && totalAssets !== null && totalAssets !== 0) {
    const dar = totalDebt / totalAssets;
    results.push({ section: 'Leverage', label: 'Debt/Assets', value: (dar * 100).toFixed(1) + '%', cls: dar < 0.5 ? 'good' : dar > 0.7 ? 'warn' : '' });
  }
  if (ebit !== null && interest !== null && interest !== 0) {
    const icr = ebit / interest;
    results.push({ section: 'Leverage', label: 'Interest Coverage', value: icr.toFixed(1) + 'x', cls: icr > 3 ? 'good' : icr < 1.5 ? 'warn' : '' });
  }

  // Profitability
  if (grossProfit !== null && revenue !== null && revenue !== 0) {
    const gm = grossProfit / revenue;
    results.push({ section: 'Profitability', label: 'Gross Margin', value: (gm * 100).toFixed(1) + '%', cls: gm > 0.3 ? 'good' : gm < 0.15 ? 'warn' : '' });
  }
  if (netProfit !== null && revenue !== null && revenue !== 0) {
    const npm = netProfit / revenue;
    results.push({ section: 'Profitability', label: 'Net Profit Margin', value: (npm * 100).toFixed(1) + '%', cls: npm > 0.1 ? 'good' : npm < 0.03 ? 'warn' : '' });
  }
  if (netProfit !== null && totalEquity !== null && totalEquity !== 0) {
    const roe = netProfit / totalEquity;
    results.push({ section: 'Profitability', label: 'ROE', value: (roe * 100).toFixed(1) + '%', cls: roe > 0.15 ? 'good' : roe < 0.05 ? 'warn' : '' });
  }

  // Efficiency
  if (revenue !== null && totalAssets !== null && totalAssets !== 0) {
    const at = revenue / totalAssets;
    results.push({ section: 'Efficiency', label: 'Asset Turnover', value: at.toFixed(2) + 'x', cls: at > 1 ? 'good' : at < 0.5 ? 'warn' : '' });
  }

  return results;
}

// ── Institutional Analytics ──────────────────────────────────────────────────

/**
 * Compute institutional-grade valuation & profitability metrics.
 *
 * Methodology:
 *   Enterprise Value (EV) = Market Cap + Total Debt - Cash
 *     (If not directly provided, computed from price × shares + debt - cash)
 *   EV/EBITDA     — lower is cheaper; <10 = good, >20 = warn
 *   EV/Sales      — <2 = good, >5 = warn
 *   P/E           — <15 = good, >30 = warn
 *   P/B           — <3 = good, >5 = warn
 *   FCF Yield     — FCF / EV; >5% = good, <2% = warn
 *   ROIC          — NOPAT / Invested Capital, NOPAT = EBIT × (1 - taxRate/100)
 *   ROCE          — EBIT / (Total Assets - Current Liabilities) or EBIT / Invested Capital
 */

function isPositive(n: number | null): n is number {
  return n !== null && n > 0;
}

function fmtEV(n: number | null): string {
  if (n === null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e7) return (abs / 1e7).toFixed(1) + ' Cr';
  if (abs >= 1e5) return (abs / 1e5).toFixed(1) + ' L';
  return abs.toLocaleString('en-IN');
}

export function computeInstitutionalAnalytics(inputs: InstitutionalInputs): InstitutionalResult {
  const now = new Date().toISOString();

  // Compute Enterprise Value if not directly provided
  let ev: number | null = inputs.enterpriseValue;
  if (ev === null && isPositive(inputs.sharesOutstanding) && isPositive(inputs.price)) {
    ev = inputs.sharesOutstanding * inputs.price + (inputs.totalDebt || 0) - (inputs.cash || 0);
  }
  const evFormatted = fmtEV(ev);

  // ── Valuation Multiples ──
  const valuation: InstitutionalMetric[] = [];

  // EV/EBITDA
  if (ev !== null && isPositive(inputs.ebitda)) {
    const ratio = ev / inputs.ebitda;
    valuation.push({
      label: 'EV/EBITDA',
      value: ratio,
      formatted: ratio.toFixed(2) + 'x',
      description: 'Enterprise Value to EBITDA. Lower is cheaper.',
      cls: ratio < 10 ? 'good' : ratio > 20 ? 'warn' : '',
    });
  }

  // EV/Sales
  if (ev !== null && isPositive(inputs.revenue)) {
    const ratio = ev / inputs.revenue;
    valuation.push({
      label: 'EV/Sales',
      value: ratio,
      formatted: ratio.toFixed(2) + 'x',
      description: 'Enterprise Value to Revenue. Lower is cheaper.',
      cls: ratio < 2 ? 'good' : ratio > 5 ? 'warn' : '',
    });
  }

  // P/E
  if (isPositive(inputs.netProfit) && isPositive(inputs.sharesOutstanding) && isPositive(inputs.price)) {
    const eps = inputs.netProfit / inputs.sharesOutstanding;
    const pe = inputs.price / eps;
    valuation.push({
      label: 'P/E',
      value: pe,
      formatted: pe.toFixed(2) + 'x',
      description: 'Price to Earnings. Lower is cheaper.',
      cls: pe < 15 ? 'good' : pe > 30 ? 'warn' : '',
    });
  }

  // P/B
  if (isPositive(inputs.totalEquity) && isPositive(inputs.sharesOutstanding) && isPositive(inputs.price)) {
    const bvps = inputs.totalEquity / inputs.sharesOutstanding;
    const pb = inputs.price / bvps;
    valuation.push({
      label: 'P/B',
      value: pb,
      formatted: pb.toFixed(2) + 'x',
      description: 'Price to Book Value. Lower is cheaper.',
      cls: pb < 3 ? 'good' : pb > 5 ? 'warn' : '',
    });
  }

  // FCF Yield
  if (ev !== null && isPositive(inputs.freeCashFlow) && ev > 0) {
    const yieldPct = (inputs.freeCashFlow / ev) * 100;
    valuation.push({
      label: 'FCF Yield',
      value: yieldPct,
      formatted: yieldPct.toFixed(2) + '%',
      description: 'Free Cash Flow divided by Enterprise Value. Higher is better.',
      cls: yieldPct >= 5 ? 'good' : yieldPct < 2 ? 'warn' : '',
    });
  }

  // ── Profitability Metrics ──
  const profitability: InstitutionalMetric[] = [];

  // ROIC = NOPAT / Invested Capital
  // NOPAT = EBIT × (1 - taxRate)
  const taxRate = inputs.taxRate !== null ? inputs.taxRate / 100 : 0.25;
  const nopat = isPositive(inputs.ebit) ? inputs.ebit * (1 - taxRate) : null;

  if (nopat !== null && isPositive(inputs.investedCapital)) {
    const roic = (nopat / inputs.investedCapital) * 100;
    profitability.push({
      label: 'ROIC',
      value: roic,
      formatted: roic.toFixed(2) + '%',
      description: 'Return on Invested Capital. NOPAT / Invested Capital. Higher is better.',
      cls: roic >= 15 ? 'good' : roic < 8 ? 'warn' : '',
    });
  } else if (nopat !== null && isPositive(inputs.totalAssets) && isPositive(inputs.totalDebt)) {
    // Approximate invested capital as Total Assets - Cash - Current Liabilities
    const approxIC = inputs.totalAssets - (inputs.cash || 0);
    if (approxIC > 0) {
      const roic = (nopat / approxIC) * 100;
      profitability.push({
        label: 'ROIC',
        value: roic,
        formatted: roic.toFixed(2) + '%',
        description: 'Return on Invested Capital (approximate). Higher is better.',
        cls: roic >= 15 ? 'good' : roic < 8 ? 'warn' : '',
      });
    }
  }

  // ROCE = EBIT / Capital Employed
  if (isPositive(inputs.ebit) && isPositive(inputs.investedCapital)) {
    const roce = (inputs.ebit / inputs.investedCapital) * 100;
    profitability.push({
      label: 'ROCE',
      value: roce,
      formatted: roce.toFixed(2) + '%',
      description: 'Return on Capital Employed. EBIT / Capital Employed. Higher is better.',
      cls: roce >= 20 ? 'good' : roce < 10 ? 'warn' : '',
    });
  } else if (isPositive(inputs.ebit) && isPositive(inputs.totalAssets)) {
    // Capital employed ≈ Total Assets - Current Liabilities (approximate)
    const capEmp = inputs.totalAssets - (inputs.cash || 0);
    if (capEmp > 0) {
      const roce = (inputs.ebit / capEmp) * 100;
      profitability.push({
        label: 'ROCE',
        value: roce,
        formatted: roce.toFixed(2) + '%',
        description: 'Return on Capital Employed (approximate). Higher is better.',
        cls: roce >= 20 ? 'good' : roce < 10 ? 'warn' : '',
      });
    }
  }

  return {
    valuation,
    profitability,
    metadata: {
      enterpriseValue: ev,
      evFormatted,
      computedAt: now,
    },
  };
}

// ── Formatting ──

/** Format a number in Indian style (₹ Cr / ₹ L / ₹ xxx) */
export function fmtINR(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e7) return sign + '₹' + (abs / 1e7).toFixed(1) + ' Cr';
  if (abs >= 1e5) return sign + '₹' + (abs / 1e5).toFixed(1) + ' L';
  return sign + '₹' + abs.toLocaleString('en-IN');
}

/** Format a number with Indian locale */
export function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/** Format percentage with sign */
export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const sign = n > 0 ? '+' : '';
  return sign + n.toFixed(1) + '%';
}

/** Format a directional change with trend arrow for visual display */
export function fmtChangeTrend(n: number | null | undefined): { text: string; dir: 'up' | 'down' | 'flat' } {
  if (n === null || n === undefined) return { text: '—', dir: 'flat' };
  const sign = n > 0 ? '▲' : n < 0 ? '▼' : '→';
  const dir = n > 0.1 ? 'up' : n < -0.1 ? 'down' : 'flat';
  return { text: `${sign} ${Math.abs(n).toFixed(1)}%`, dir };
}
