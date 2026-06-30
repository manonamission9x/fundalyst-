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
      labelA: '',
      labelB: '',
      periodA: '',
      periodB: '',
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
    inputs: { fcf: '', growth: '', years: '', discount: '', terminal: '', netDebt: '', shares: '', price: '' },
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
      inputs: { revenue: '', cogs: '', receivables: '', inventory: '', payables: '', cash: '' },
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
      data: { revenue: null, cogs: null, netProfit: null, totalAssets: null, totalEquity: null, totalDebt: null, currentAssets: null, currentLiab: null, inventory: null, interest: null, ebit: null },
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
      csv: '',
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
      csv: '',
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
      years: '',
      csv: '',
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

export function clearAllToolStores(): void {
  useFilingStore.getState().clear();
  useDCFStore.getState().clear();
  useWCStore.getState().clear();
  useRatiosStore.getState().clear();
  usePeerStore.getState().clear();
  useTrendsStore.getState().clear();
  useYoyStore.getState().clear();
  useAnalysisStore.setState({ filingData: null, dcfData: null });
}
