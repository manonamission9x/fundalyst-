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
  parseLines,
  computeDiff,
  generateRiskFlags,
} from './calculations';

// ── DCF Valuation ──

describe('computeDCF', () => {

  it('returns correct intrinsic value with default inputs', () => {
    const r = computeDCF(1240, 8, 5, 10, 3, 180, 100, 450);
    expect(r).not.toBeNull();
    expect(r!.iv).toBeCloseTo(223.36, 1);
    expect(r!.ev).toBeCloseTo(22516, 0);
    expect(r!.eq).toBeCloseTo(22336, 0);
    expect(r!.mos).toBeCloseTo(-50.4, 1);
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

  it('returns NaN for invalid combinations', () => {
    const sens = computeDCFSensitivity(1240, 10, 5, [10], [10], 180, 100, 450);
    expect(sens[0].cols[0].iv).toBeNaN(); // terminal == WACC → NaN
  });
});

describe('validateDCFInputs', () => {
  it('returns no errors for valid inputs', () => {
    const errors = validateDCFInputs(1240, 8, 5, 10, 3, 180, 100, 450);
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

// ── Parsing & Diff ──

describe('parseLines', () => {
  it('parses colon-separated lines', () => {
    const result = parseLines('Revenue: 1240\nNet Profit: 500\n');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ label: 'Revenue', value: '1240' });
    expect(result[1]).toEqual({ label: 'Net Profit', value: '500' });
  });

  it('returns empty array for empty input', () => {
    expect(parseLines('')).toEqual([]);
  });

  it('skips lines without colons', () => {
    expect(parseLines('Revenue 1240\n')).toEqual([]);
  });

  it('strips commas from values', () => {
    const result = parseLines('Revenue: 1,24,000\n');
    expect(result[0].value).toBe('124000');
  });
});

describe('computeDiff', () => {
  it('computes percentage change between periods', () => {
    const periodA = [{ label: 'Revenue', value: '1000' }];
    const periodB = [{ label: 'Revenue', value: '1200' }];
    const diffs = computeDiff(periodA, periodB);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].pct).toBeCloseTo(20, 0);
    expect(diffs[0].dir).toBe('up');
  });

  it('handles missing items in period A', () => {
    const periodA: { label: string; value: string }[] = [];
    const periodB = [{ label: 'Revenue', value: '1200' }];
    const diffs = computeDiff(periodA, periodB);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].a).toBeNull();
  });
});

describe('generateRiskFlags', () => {
  it('generates debt warning when debt surges >20%', () => {
    const diffs = [{
      label: 'Total Debt', a: 100, b: 130, pct: 30, abs: 30, dir: 'up' as const, isPct: false,
    }];
    const flags = generateRiskFlags(diffs);
    expect(flags.some((f) => f.level === 'danger' && f.label === 'Total Debt')).toBe(true);
  });

  it('generates revenue warning when revenue declines >5%', () => {
    const diffs = [{
      label: 'Revenue', a: 1000, b: 900, pct: -10, abs: -100, dir: 'down' as const, isPct: false,
    }];
    const flags = generateRiskFlags(diffs);
    expect(flags.some((f) => f.level === 'warn' && f.label === 'Revenue')).toBe(true);
  });

  it('returns empty array for no significant changes', () => {
    const diffs = [{
      label: 'Revenue', a: 1000, b: 1010, pct: 1, abs: 10, dir: 'flat' as const, isPct: false,
    }];
    expect(generateRiskFlags(diffs)).toHaveLength(0);
  });
});

// ── DCF Edge Cases ──

describe('validateDCFInputs edge cases', () => {
  it('returns error when WACC equals terminal growth', () => {
    const errors = validateDCFInputs(1240, 8, 5, 10, 10, 180, 100, 450);
    expect(errors.some((e) => e.field === 'terminal')).toBe(true);
  });

  it('returns error for negative price', () => {
    const errors = validateDCFInputs(1240, 8, 5, 10, 3, 180, 100, -5);
    expect(errors.some((e) => e.field === 'price')).toBe(true);
  });

  it('returns error for zero shares', () => {
    const errors = validateDCFInputs(1240, 8, 5, 10, 3, 180, 0, 450);
    expect(errors.some((e) => e.field === 'shares')).toBe(true);
  });

  it('returns error for years > 50', () => {
    const errors = validateDCFInputs(1240, 8, 99, 10, 3, 180, 100, 450);
    expect(errors.some((e) => e.field === 'years')).toBe(true);
  });
});

describe('computeDCF edge cases', () => {
  it('handles zero FCF', () => {
    const r = computeDCF(0, 10, 5, 10, 3, 0, 100, 100);
    expect(r).not.toBeNull();
    // With zero FCF, intrinsic value should be negative or zero depending on net debt
    expect(r!.iv).toBe(0);
  });

  it('handles very large FCF values', () => {
    const r = computeDCF(10000000, 5, 3, 10, 3, 50000, 1000, 500);
    expect(r).not.toBeNull();
    expect(r!.iv).toBeGreaterThan(0);
    expect(Number.isFinite(r!.iv)).toBe(true);
  });

  it('handles zero discount rate with negative terminal growth', () => {
    // WACC=0 and terminal=-1 gives spread=1%, which is valid
    const r = computeDCF(1000, 5, 3, 0, -1, 0, 100, 100);
    expect(r).not.toBeNull();
    expect(r!.iv).toBeGreaterThan(0);
  });

  it('returns null when terminal growth >= WACC with 0 WACC', () => {
    expect(computeDCF(1240, 10, 5, 5, 5, 180, 100, 450)).toBeNull();
  });
});

// ── Working Capital Edge Cases ──

describe('computeWC edge cases', () => {
  it('handles zero revenue', () => {
    const r = computeWC(0, 3000, 1200, 800, 600, 200);
    expect(r.dso).toBeNull();
    expect(r.ccc).toBeGreaterThan(0);
  });

  it('handles all zero inputs', () => {
    const r = computeWC(0, 0, 0, 0, 0, 0);
    expect(r.dso).toBeNull();
    expect(r.dio).toBeNull();
    expect(r.dpo).toBeNull();
    expect(r.ccc).toBe(0);
    expect(r.nwc).toBe(0);
  });

  it('handles negative receivables (customer returns)', () => {
    const r = computeWC(5000, 3000, -200, 800, 600, 100);
    expect(r.dso).toBeCloseTo(-14.6, 0);
    // DSO is negative, but DIO and DPO are positive, making CCC positive
    expect(r.ccc).toBeGreaterThan(0);
  });

  it('handles null inputs', () => {
    const r = computeWC(null, null, null, null, null, null);
    expect(r.dso).toBeNull();
    expect(r.dio).toBeNull();
    expect(r.dpo).toBeNull();
    expect(r.ccc).toBe(0);
    expect(r.nwc).toBe(0);
  });
});

// ── Ratio Edge Cases ──

describe('computeRatios edge cases', () => {
  it('handles zero equity (division by zero guard)', () => {
    const data = {
      revenue: 5000, cogs: 3000, netProfit: 500, totalAssets: 8000,
      totalEquity: 0, totalDebt: 1500, currentAssets: 3000, currentLiab: 1500,
      inventory: 800, interest: 200, ebit: 800,
    };
    const results = computeRatios(data);
    // Debt/Equity should be skipped (division by zero)
    expect(results.some((r) => r.label === 'Debt/Equity')).toBe(false);
  });

  it('handles all null inputs', () => {
    const data = {
      revenue: null, cogs: null, netProfit: null, totalAssets: null,
      totalEquity: null, totalDebt: null, currentAssets: null, currentLiab: null,
      inventory: null, interest: null, ebit: null,
    };
    const results = computeRatios(data);
    expect(results).toHaveLength(0);
  });

  it('handles zero revenue for profitability ratios', () => {
    const data = {
      revenue: 0, cogs: 0, netProfit: 0, totalAssets: 8000,
      totalEquity: 4000, totalDebt: 1500, currentAssets: 3000, currentLiab: 1500,
      inventory: 800, interest: 200, ebit: 800,
    };
    const results = computeRatios(data);
    // Revenue-based ratios (Gross Margin, Net Profit Margin) should be skipped
    // But ROE (equity-based) should still compute
    expect(results.some((r) => r.label === 'Gross Margin')).toBe(false);
    expect(results.some((r) => r.label === 'Net Profit Margin')).toBe(false);
    // Leverage and efficiency ratios still computed
    expect(results.length).toBeGreaterThan(0);
  });
});

// ── spreadsheetToDataset ──

import { spreadsheetToDataset } from '@/store/canonical-helpers';
import type { SpreadsheetRow } from '@/components/input';

describe('spreadsheetToDataset', () => {
  it('converts spreadsheet rows to canonical dataset', () => {
    const rows: SpreadsheetRow[] = [
      { metric: 'Revenue', values: ['5000', '6000'] },
      { metric: 'Net Profit', values: ['500', '600'] },
    ];
    const periods = ['FY24', 'FY25'];
    const dataset = spreadsheetToDataset(rows, periods, 'TestCo');

    expect(dataset.companyName).toBe('TestCo');
    expect(dataset.periods).toEqual(['FY24', 'FY25']);
    expect(dataset.sourceType).toBe('manual');
    expect(dataset.facts).toHaveLength(4);

    // Each fact should have correct structure
    expect(dataset.facts[0].metric).toBe('revenue');
    expect(dataset.facts[0].value).toBe(5000);
    expect(dataset.facts[0].periodLabel).toBe('FY24');
    expect(dataset.facts[1].metric).toBe('revenue');
    expect(dataset.facts[1].value).toBe(6000);
    expect(dataset.facts[1].periodLabel).toBe('FY25');
  });

  it('skips empty metric rows', () => {
    const rows: SpreadsheetRow[] = [
      { metric: '', values: ['5000'] },
    ];
    const dataset = spreadsheetToDataset(rows, ['FY24']);
    expect(dataset.facts).toHaveLength(0);
  });

  it('skips empty value cells', () => {
    const rows: SpreadsheetRow[] = [
      { metric: 'Revenue', values: ['', '6000'] },
    ];
    const dataset = spreadsheetToDataset(rows, ['FY24', 'FY25']);
    expect(dataset.facts).toHaveLength(1);
    expect(dataset.facts[0].value).toBe(6000);
    expect(dataset.facts[0].periodLabel).toBe('FY25');
  });

  it('handles comma-formatted number values', () => {
    const rows: SpreadsheetRow[] = [
      { metric: 'Revenue', values: ['1,24,000'] },
    ];
    const dataset = spreadsheetToDataset(rows, ['FY24']);
    expect(dataset.facts[0].value).toBe(124000);
  });

  it('handles empty periods array', () => {
    const rows: SpreadsheetRow[] = [
      { metric: 'Revenue', values: ['5000'] },
    ];
    const dataset = spreadsheetToDataset(rows, []);
    expect(dataset.facts).toHaveLength(0);
  });
});
