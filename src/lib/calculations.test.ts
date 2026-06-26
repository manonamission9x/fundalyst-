/**
 * Tests for the core calculation engine.
 * These are pure functions — no mocking, no setup needed.
 */
import { describe, it, expect } from 'vitest';
import {
  computeDCF,
  computeDCFSensitivity,
  validateDCFInputs,
  computeWC,
  computeRatios,
  fmtNum,
  fmtINR,
} from './calculations';

// ── DCF Valuation ──

describe('computeDCF', () => {
  const defaults = { fcf: 1240, growth: 10, years: 5, discount: 10, terminal: 3, netDebt: 180, shares: 100, price: 450 };

  it('returns correct intrinsic value with default inputs', () => {
    const r = computeDCF(1240, 10, 5, 10, 3, 180, 100, 450);
    expect(r).not.toBeNull();
    expect(r!.iv).toBeCloseTo(242.66, 0);
    expect(r!.ev).toBeCloseTo(24446, -1);
    expect(r!.eq).toBeCloseTo(24266, -1);
    expect(r!.mos).toBeCloseTo(-46.1, 0);
  });

  it('returns null when shares is 0', () => {
    expect(computeDCF(1240, 10, 5, 10, 3, 180, 0, 450)).toBeNull();
  });

  it('returns null when shares is negative', () => {
    expect(computeDCF(1240, 10, 5, 10, 3, 180, -100, 450)).toBeNull();
  });

  it('returns null when years is 0', () => {
    expect(computeDCF(1240, 10, 0, 10, 3, 180, 100, 450)).toBeNull();
  });

  it('returns null when terminal growth equals WACC', () => {
    expect(computeDCF(1240, 10, 5, 10, 10, 180, 100, 450)).toBeNull();
  });

  it('returns null when terminal growth exceeds WACC', () => {
    expect(computeDCF(1240, 10, 5, 10, 12, 180, 100, 450)).toBeNull();
  });

  it('handles negative FCF (unprofitable company)', () => {
    const r = computeDCF(-500, 10, 5, 10, 3, 180, 100, 450);
    expect(r).not.toBeNull();
    expect(r!.iv).toBeLessThan(0);
  });

  it('handles zero growth', () => {
    const r = computeDCF(1000, 0, 5, 10, 3, 0, 100, 100);
    expect(r).not.toBeNull();
    expect(r!.iv).toBeGreaterThan(0);
  });

  it('handles negative terminal growth (declining perpetuity)', () => {
    const r = computeDCF(1240, 10, 5, 10, -1, 180, 100, 450);
    expect(r).not.toBeNull();
    expect(r!.iv).toBeGreaterThan(0);
  });

  it('handles net cash (negative net debt)', () => {
    const r = computeDCF(1240, 10, 5, 10, 3, -500, 100, 450);
    expect(r).not.toBeNull();
    expect(r!.eq).toBeGreaterThan(r!.ev); // equity > enterprise value when net debt is negative
  });

  it('generates correct projected cash flows', () => {
    const r = computeDCF(1000, 10, 3, 10, 3, 0, 100, 100);
    expect(r).not.toBeNull();
    // Year 1: 1000 * 1.1 = 1100
    expect(r!.projected[0].fcf).toBeCloseTo(1100, 0);
    // Year 2: 1000 * 1.1^2 = 1210
    expect(r!.projected[1].fcf).toBeCloseTo(1210, 0);
    // Year 3: 1000 * 1.1^3 = 1331
    expect(r!.projected[2].fcf).toBeCloseTo(1331, 0);
  });

  it('has 0% margin of safety when price equals intrinsic value', () => {
    const r = computeDCF(1240, 10, 5, 10, 3, 180, 100, 242.66);
    expect(r).not.toBeNull();
    expect(r!.mos).toBeCloseTo(0, 0);
  });
});

describe('computeDCFSensitivity', () => {
  it('returns correct shape', () => {
    const sens = computeDCFSensitivity(1240, 10, 5, [1, 2, 3], [8, 10, 12], 180, 100, 450);
    expect(sens).toHaveLength(3); // 3 terminal rates
    expect(sens[0].cols).toHaveLength(3); // 3 discount rates
    expect(sens[0].g).toBe(1);
    expect(sens[0].cols[0].d).toBe(8);
    expect(sens[0].cols[0].iv).toBeGreaterThan(0);
  });

  it('returns 0 for invalid combinations', () => {
    const sens = computeDCFSensitivity(1240, 10, 5, [10], [10], 180, 100, 450);
    expect(sens[0].cols[0].iv).toBe(0); // terminal == WACC → 0
  });
});

describe('validateDCFInputs', () => {
  it('returns no errors for valid inputs', () => {
    const errors = validateDCFInputs(1240, 10, 5, 10, 3, 180, 100, 450);
    expect(errors).toHaveLength(0);
  });

  it('returns error for empty FCF', () => {
    const errors = validateDCFInputs('', 10, 5, 10, 3, 180, 100, 450);
    expect(errors.some((e) => e.field === 'fcf')).toBe(true);
  });

  it('returns error for empty shares', () => {
    const errors = validateDCFInputs(1240, 10, 5, 10, 3, 180, '', 450);
    expect(errors.some((e) => e.field === 'shares')).toBe(true);
  });

  it('returns error for years outside 1-50', () => {
    const errors = validateDCFInputs(1240, 10, 0, 10, 3, 180, 100, 450);
    expect(errors.some((e) => e.field === 'years')).toBe(true);
  });

  it('returns error for terminal growth >= WACC', () => {
    const errors = validateDCFInputs(1240, 10, 5, 10, 15, 180, 100, 450);
    expect(errors.some((e) => e.field === 'terminal')).toBe(true);
  });
});

// ── Working Capital ──

describe('computeWC', () => {
  it('computes correct DSO', () => {
    const r = computeWC(5000, 3000, 1200, 800, 600, 200);
    // DSO = 1200/5000 * 365 = 87.6
    expect(r.dso).toBeCloseTo(87.6, 0);
  });

  it('computes correct CCC', () => {
    const r = computeWC(5000, 3000, 1200, 800, 600, 200);
    // DSO + DIO - DPO = 87.6 + 97.3 - 73 = 111.9
    expect(r.ccc).toBeCloseTo(111.9, 0);
  });

  it('returns null for DSO when revenue is 0', () => {
    const r = computeWC(0, 3000, 1200, 800, 600, 200);
    expect(r.dso).toBeNull();
  });
});

// ── Financial Ratios ──

describe('computeRatios', () => {
  it('computes all 9 ratios', () => {
    const data = { revenue: 5000, cogs: 3000, netProfit: 500, totalAssets: 8000, totalEquity: 4000, totalDebt: 1500, currentAssets: 3000, currentLiab: 1500, inventory: 800, interest: 200, ebit: 800 };
    const results = computeRatios(data);
    expect(results).toHaveLength(9);
  });

  it('computes correct Debt/Equity', () => {
    const data = { revenue: 5000, cogs: 3000, netProfit: 500, totalAssets: 8000, totalEquity: 4000, totalDebt: 1500, currentAssets: 3000, currentLiab: 1500, inventory: 800, interest: 200, ebit: 800 };
    const results = computeRatios(data);
    const de = results.find((r) => r.label === 'Debt/Equity');
    expect(de).toBeDefined();
    expect(de!.value).toBe('0.38x');
  });

  it('handles missing values gracefully', () => {
    const data = { revenue: 5000, cogs: 3000, netProfit: 500, totalAssets: 8000, totalEquity: 4000, totalDebt: 1500, currentAssets: null, currentLiab: null, inventory: 800, interest: 200, ebit: 800 };
    const results = computeRatios(data);
    // Current assets null → no liquidity ratios
    expect(results.filter((r) => r.section === 'Liquidity')).toHaveLength(0);
  });
});

// ── Formatting ──

describe('fmtNum', () => {
  it('formats numbers with Indian locale', () => {
    expect(fmtNum(1240)).toBe('1,240');
    expect(fmtNum(100000)).toBe('1,00,000');
  });

  it('returns — for null', () => {
    expect(fmtNum(null)).toBe('—');
  });
});

describe('fmtINR', () => {
  it('formats crores', () => {
    expect(fmtINR(10000000)).toBe('₹1.0 Cr');
  });

  it('formats lakhs', () => {
    expect(fmtINR(100000)).toBe('₹1.0 L');
  });
});
