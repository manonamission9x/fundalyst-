import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FilingAnalysis, DCFResult, DCFInputs, WCInputs, WCResult, RatioInputs, RatioResult, PeerRow, TrendRow, YoyRow } from '@/types/financial';

// ── Analysis Store (cross-tool) ──

interface AnalysisState {
  filingData: FilingAnalysis | null;
  dcfData: DCFResult | null;
  setFiling: (data: FilingAnalysis) => void;
  setDCF: (data: DCFResult) => void;
}

export const useAnalysisStore = create<AnalysisState>()((set) => ({
  filingData: null,
  dcfData: null,
  setFiling: (data) => set({ filingData: data }),
  setDCF: (data) => set({ dcfData: data }),
}));

// ── Filing Store ──

interface FilingState {
  labelA: string;
  labelB: string;
  periodA: string;
  periodB: string;
  diffs: import('@/types/financial').DiffResult[];
  flags: import('@/types/financial').RiskFlag[];
  showResults: boolean;
  errMsg: string;
  setLabelA: (v: string) => void;
  setLabelB: (v: string) => void;
  setPeriodA: (v: string) => void;
  setPeriodB: (v: string) => void;
  setDiffs: (v: import('@/types/financial').DiffResult[]) => void;
  setFlags: (v: import('@/types/financial').RiskFlag[]) => void;
  setShowResults: (v: boolean) => void;
  setErrMsg: (v: string) => void;
  clear: () => void;
}

export const useFilingStore = create<FilingState>()(
  persist(
    (set) => ({
      labelA: 'Q4 FY25',
      labelB: 'Q4 FY26',
      periodA: 'Revenue: 1240\nNet Profit: 142\nEBITDA Margin: 18.2\nTotal Debt: 410\nPromoter Holding: 72.5',
      periodB: 'Revenue: 1530\nNet Profit: 119\nEBITDA Margin: 14.6\nTotal Debt: 590\nPromoter Holding: 68.3',
      diffs: [],
      flags: [],
      showResults: false,
      errMsg: '',
      setLabelA: (v) => set({ labelA: v }),
      setLabelB: (v) => set({ labelB: v }),
      setPeriodA: (v) => set({ periodA: v }),
      setPeriodB: (v) => set({ periodB: v }),
      setDiffs: (v) => set({ diffs: v }),
      setFlags: (v) => set({ flags: v }),
      setShowResults: (v) => set({ showResults: v }),
      setErrMsg: (v) => set({ errMsg: v }),
      clear: () => {
        try { localStorage.removeItem('fundalyst-filing'); } catch {}
        set({
          labelA: '', labelB: '', periodA: '', periodB: '',
          diffs: [], flags: [], showResults: false, errMsg: '',
        });
      },
    }),
    { name: 'fundalyst-filing', version: 2 }
  )
);

// ── DCF Store ──

interface DCFState {
  inputs: DCFInputs;
  show: boolean;
  summary: DCFResult | null;
  sens: { g: number; cols: { d: number; iv: number }[] }[];
  setInput: (key: keyof DCFInputs, value: number | '') => void;
  setShow: (v: boolean) => void;
  setSummary: (v: DCFResult | null) => void;
  setSens: (v: { g: number; cols: { d: number; iv: number }[] }[]) => void;
  clear: () => void;
}

export const useDCFStore = create<DCFState>()(
  (set) => ({
    inputs: { fcf: 1240, growth: 10, years: 5, discount: 10, terminal: 3, netDebt: 180, shares: 100, price: 450 },
    show: false,
    summary: null,
    sens: [],
    setInput: (key, value) => set((s) => ({ inputs: { ...s.inputs, [key]: value } })),
    setShow: (v) => set({ show: v }),
    setSummary: (v) => set({ summary: v }),
    setSens: (v) => set({ sens: v }),
    clear: () => {
      set({
        inputs: { fcf: '', growth: '', years: '', discount: '', terminal: '', netDebt: '', shares: '', price: '' },
        show: false,
        summary: null,
        sens: [],
      });
    },
  })
);

// ── WC Store ──

interface WCState {
  inputs: WCInputs;
  res: WCResult | null;
  setInput: (key: keyof WCInputs, value: number | '') => void;
  setRes: (v: WCResult | null) => void;
  clear: () => void;
}

export const useWCStore = create<WCState>()(
  persist(
    (set) => ({
      inputs: { revenue: 5000, cogs: 3000, receivables: 1200, inventory: 800, payables: 600, cash: 200 },
      res: null,
      setInput: (key, value) => set((s) => ({ inputs: { ...s.inputs, [key]: value } })),
      setRes: (v) => set({ res: v }),
      clear: () => {
        try { localStorage.removeItem('fundalyst-wc'); } catch {}
        set({ inputs: { revenue: '', cogs: '', receivables: '', inventory: '', payables: '', cash: '' }, res: null });
      },
    }),
    { name: 'fundalyst-wc', version: 2 }
  )
);

// ── Ratios Store ──

interface RatiosState {
  data: RatioInputs;
  res: RatioResult[] | null;
  setData: (v: RatioInputs) => void;
  setField: (key: keyof RatioInputs, value: number | '' | null) => void;
  setRes: (v: RatioResult[] | null) => void;
  clear: () => void;
}

export const useRatiosStore = create<RatiosState>()(
  persist(
    (set) => ({
      data: { revenue: 5000, cogs: 3000, netProfit: 500, totalAssets: 8000, totalEquity: 4000, totalDebt: 1500, currentAssets: 3000, currentLiab: 1500, inventory: 800, interest: 200, ebit: 800 },
      res: null,
      setData: (v) => set({ data: v }),
      setField: (key, value) => set((s) => ({ data: { ...s.data, [key]: value === '' ? null : value } })),
      setRes: (v) => set({ res: v }),
      clear: () => {
        try { localStorage.removeItem('fundalyst-ratios'); } catch {}
        set({
          data: { revenue: null, cogs: null, netProfit: null, totalAssets: null, totalEquity: null, totalDebt: null, currentAssets: null, currentLiab: null, inventory: null, interest: null, ebit: null },
          res: null,
        });
      },
    }),
    { name: 'fundalyst-ratios', version: 2 }
  )
);

// ── Peer Store ──

interface PeerState {
  csv: string;
  rows: PeerRow[];
  setCsv: (v: string) => void;
  setRows: (v: PeerRow[]) => void;
  clear: () => void;
}

export const usePeerStore = create<PeerState>()(
  persist(
    (set) => ({
      csv: 'Company A, 5000, 3000, 500, 8000\nCompany B, 4200, 2800, 380, 7200\nCompany C, 3800, 2100, 420, 6500',
      rows: [],
      setCsv: (v) => set({ csv: v }),
      setRows: (v) => set({ rows: v }),
      clear: () => {
        try { localStorage.removeItem('fundalyst-peer'); } catch {}
        set({ csv: '', rows: [] });
      },
    }),
    { name: 'fundalyst-peer', version: 2 }
  )
);

// ── Trends Store ──

interface TrendsState {
  csv: string;
  headers: string[];
  rows: TrendRow[];
  setCsv: (v: string) => void;
  setHeaders: (v: string[]) => void;
  setRows: (v: TrendRow[]) => void;
  clear: () => void;
}

export const useTrendsStore = create<TrendsState>()(
  persist(
    (set) => ({
      csv: 'Period, FY22, FY23, FY24, FY25, FY26\nRevenue, 1000, 1150, 1240, 1380, 1530\nCOGS, 700, 800, 870, 980, 1100\nNet Profit, 160, 155, 142, 130, 119',
      headers: [],
      rows: [],
      setCsv: (v) => set({ csv: v }),
      setHeaders: (v) => set({ headers: v }),
      setRows: (v) => set({ rows: v }),
      clear: () => {
        try { localStorage.removeItem('fundalyst-trends'); } catch {}
        set({ csv: '', headers: [], rows: [] });
      },
    }),
    { name: 'fundalyst-trends', version: 2 }
  )
);

// ── YoY Store ──

interface YoyState {
  years: string;
  csv: string;
  rows: YoyRow[];
  setYears: (v: string) => void;
  setCsv: (v: string) => void;
  setRows: (v: YoyRow[]) => void;
  clear: () => void;
}

export const useYoyStore = create<YoyState>()(
  persist(
    (set) => ({
      years: 'FY22, FY23, FY24, FY25, FY26',
      csv: 'Metric, FY22, FY23, FY24, FY25, FY26\nRevenue, 1000, 1150, 1240, 1380, 1530\nNet Profit, 160, 155, 142, 130, 119\nEBITDA, 280, 295, 310, 290, 270',
      rows: [],
      setYears: (v) => set({ years: v }),
      setCsv: (v) => set({ csv: v }),
      setRows: (v) => set({ rows: v }),
      clear: () => {
        try { localStorage.removeItem('fundalyst-yoy'); } catch {}
        set({ years: '', csv: '', rows: [] });
      },
    }),
    { name: 'fundalyst-yoy', version: 2 }
  )
);
