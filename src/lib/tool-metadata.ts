import {
  Calculator,
  ChartLineUp,
  ChartPie,
  FileText,
  Gauge,
  House,
  SquaresFour,
  UploadSimple,
  UsersThree,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

export type ToolId =
  | 'home'
  | 'workspace'
  | 'import'
  | 'filing'
  | 'trends'
  | 'growth'
  | 'dcf'
  | 'wc'
  | 'ratios'
  | 'peer';

export type ToolMetadata = {
  id: ToolId;
  label: string;
  shortLabel: string;
  href: string;
  icon: Icon;
  aliases: string[];
  keywords: string;
  value: string;
  description: string;
  answer: string;
  needsData: boolean;
};

export const TOOL_METADATA: ToolMetadata[] = [
  {
    id: 'home',
    label: 'Home',
    shortLabel: 'Home',
    href: '/',
    icon: House,
    aliases: ['home', 'start'],
    keywords: 'overview start launchpad',
    value: 'Start',
    description: 'Launch or resume company research.',
    answer: 'Start a new analysis or resume the active company.',
    needsData: false,
  },
  {
    id: 'workspace',
    label: 'Workspace',
    shortLabel: 'Workspace',
    href: '/workspace',
    icon: SquaresFour,
    aliases: ['workspace', 'ws', 'cockpit', 'memo', 'backup', 'evidence', 'coverage'],
    keywords: 'hub cockpit evidence assumptions thesis memo backup coverage source',
    value: 'Cockpit',
    description: 'Company cockpit for evidence, tools, thesis, and backup.',
    answer: 'What is the state of this research, and what should happen next?',
    needsData: false,
  },
  {
    id: 'import',
    label: 'Import Source',
    shortLabel: 'Import',
    href: '/import',
    icon: UploadSimple,
    aliases: ['import', 'upload', 'source', 'add source'],
    keywords: 'upload csv excel xlsx pdf screenshot ocr filing data source',
    value: 'Source',
    description: 'Import CSV, XLSX, PDF, screenshot, or pasted financial data.',
    answer: 'Upload messy data. We clean it. Your files stay in your browser.',
    needsData: false,
  },
  {
    id: 'filing',
    label: 'Filing Comparison',
    shortLabel: 'Filing',
    href: '/research/filing',
    icon: FileText,
    aliases: ['filing', 'compare', 'diff', 'cf'],
    keywords: 'period diff compare statements revenue margins debt risk flags',
    value: 'Period diff',
    description: 'Compare reporting periods and surface material changes.',
    answer: 'Is revenue growing? Are margins compressing? Is debt rising?',
    needsData: true,
  },
  {
    id: 'trends',
    label: 'Trend Charts',
    shortLabel: 'Trends',
    href: '/research/trends',
    icon: ChartLineUp,
    aliases: ['trends', 'trend', 'chart', 'charts'],
    keywords: 'revenue margin profit cash direction chart multi period',
    value: 'Direction',
    description: 'Visualize revenue, margin, profit, and cash direction.',
    answer: 'What direction are the company fundamentals moving?',
    needsData: true,
  },
  {
    id: 'growth',
    label: 'Growth Rates',
    shortLabel: 'Growth',
    href: '/research/growth',
    icon: ChartLineUp,
    aliases: ['growth', 'cagr', 'yoy'],
    keywords: 'cagr yoy growth rate trajectory',
    value: 'CAGR',
    description: 'Calculate CAGR and YoY growth across key metrics.',
    answer: 'How fast are the important numbers compounding?',
    needsData: true,
  },
  {
    id: 'dcf',
    label: 'DCF Valuation',
    shortLabel: 'DCF',
    href: '/tools/dcf',
    icon: Calculator,
    aliases: ['dcf', 'valuation', 'value', 'intrinsic'],
    keywords: 'intrinsic value discounted cash flow wacc terminal growth margin of safety',
    value: 'Intrinsic value',
    description: 'Estimate intrinsic value from free cash flow assumptions.',
    answer: 'Is the stock undervalued or overvalued? What price is fair?',
    needsData: true,
  },
  {
    id: 'wc',
    label: 'Cash Efficiency',
    shortLabel: 'Cash',
    href: '/tools/wc',
    icon: Gauge,
    aliases: ['cash', 'wc', 'working capital', 'ccc'],
    keywords: 'working capital cash conversion cycle dso dio dpo efficiency',
    value: 'CCC',
    description: 'Analyze working capital and cash conversion cycle.',
    answer: 'How efficiently does the business convert operations into cash?',
    needsData: true,
  },
  {
    id: 'ratios',
    label: 'Financial Ratios',
    shortLabel: 'Ratios',
    href: '/tools/ratios',
    icon: ChartPie,
    aliases: ['ratios', 'ratio', 'health'],
    keywords: 'liquidity leverage profitability roe debt equity margin asset turnover',
    value: '5 core ratios',
    description: 'Compute the five core health ratios unlocked by six inputs.',
    answer: 'Is the company financially healthy? Can it cover debts?',
    needsData: true,
  },
  {
    id: 'peer',
    label: 'Peer Comparison',
    shortLabel: 'Peers',
    href: '/tools/peer',
    icon: UsersThree,
    aliases: ['peer', 'peers', 'compare companies', 'benchmark'],
    keywords: 'benchmark industry compare relative leaders laggards',
    value: 'Benchmark',
    description: 'Benchmark companies side by side using core financial metrics.',
    answer: 'Which company is strongest? Who is lagging?',
    needsData: false,
  },
];

export const TOOL_BY_ID = Object.fromEntries(TOOL_METADATA.map((tool) => [tool.id, tool])) as Record<ToolId, ToolMetadata>;

export const ANALYSIS_TOOLS = TOOL_METADATA.filter((tool) =>
  ['filing', 'trends', 'growth', 'dcf', 'wc', 'ratios', 'peer'].includes(tool.id),
);

export function findToolByAlias(input: string): ToolMetadata | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  return TOOL_METADATA.find((tool) =>
    tool.aliases.some((alias) => q === alias || q.startsWith(`${alias} `)),
  ) || null;
}
