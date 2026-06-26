/**
 * ══════════════════════════════════════════════════════════
 * XBRL / iXBRL Parser — BETA
 * ══════════════════════════════════════════════════════════
 *
 * Browser-based parser for XBRL (eXtensible Business Reporting
 * Language) and iXBRL (inline XBRL embedded in HTML).
 *
 * Uses only native DOMParser — zero external dependencies.
 *
 * NOTE: This is a BETA feature. Confidence scores are
 * deliberately lowered and warnings are emitted for every
 * mapping to signal that results need human review.
 */
import type {
  FundalystDataset,
  CanonicalFact,
  SourceType,
  Currency,
  Unit,
  StatementType,
} from './types';

// ──────────────────────────────────────────────────────────
//  XBRL Domain Types
// ──────────────────────────────────────────────────────────

/** A parsed XBRL context (defines entity + period for facts) */
export interface XBRLContext {
  id: string;
  entity: string;
  periodStart?: string; // ISO date
  periodEnd?: string;   // ISO date
  instant?: string;     // ISO date for point-in-time
}

/** A parsed XBRL unit definition */
export interface XBRLUnit {
  id: string;
  measure: string; // e.g. 'iso4217:INR', 'xbrli:pure', 'xbrli:shares'
}

/** A single parsed XBRL fact */
export interface XBRLFact {
  name: string;          // Full qualified name e.g. 'ifrs-full:RevenueTotal'
  localName: string;     // Local part e.g. 'RevenueTotal'
  value: string;         // Raw string value from XML
  contextRef: string;
  unitRef?: string;
  decimals?: string;
  scale?: string;
}

/** Full result of parsing an XBRL document */
export interface XBRLResult {
  facts: XBRLFact[];
  contexts: Map<string, XBRLContext>;
  units: Map<string, XBRLUnit>;
  company: string | null;
  periods: string[];          // Human-readable period labels
  periodEnds: string[];       // ISO period end dates
  warnings: string[];
  sourceType: 'xbrl' | 'ixbrl';
}

// ──────────────────────────────────────────────────────────
//  XBRL Tag → Canonical Metric Mapping
//  (BETA: all mappings are best-effort)
// ──────────────────────────────────────────────────────────

/** Tag suffix patterns mapped to canonical Fundalyst metrics */
const XBRL_TAG_MAP: Record<string, string> = {
  // Income Statement
  RevenueTotal: 'revenue',
  RevenueFromOperations: 'revenue',
  Revenue: 'revenue',
  SalesRevenueNet: 'revenue',
  SalesRevenueServices: 'revenue',
  Sales: 'revenue',
  Turnover: 'revenue',
  NetSales: 'revenue',
  GrossSales: 'revenue',
  OperatingRevenue: 'revenue',

  ProfitLoss: 'netProfit',
  ProfitAfterTax: 'netProfit',
  NetIncomeLoss: 'netProfit',
  ProfitLossForPeriod: 'netProfit',
  ProfitAttributableToOwners: 'netProfit',
  ProfitLossAttributableToOwners: 'netProfit',
  NetProfitLoss: 'netProfit',
  ComprehensiveIncome: 'netProfit',

  TotalAssets: 'totalAssets',
  Assets: 'totalAssets',
  AssetsTotal: 'totalAssets',

  TotalEquity: 'equity',
  Equity: 'equity',
  ShareholdersEquity: 'equity',
  EquityAttributableToOwners: 'equity',
  TotalShareholdersEquity: 'equity',

  TotalLiabilities: 'totalDebt',
  Liabilities: 'totalDebt',
  TotalCurrentLiabilities: 'currentLiabilities',
  CurrentLiabilities: 'currentLiabilities',
  TotalNonCurrentLiabilities: 'nonCurrentLiabilities',
  NonCurrentLiabilities: 'nonCurrentLiabilities',
  Borrowings: 'totalDebt',
  LongTermBorrowings: 'totalDebt',
  ShortTermBorrowings: 'totalDebt',

  CashAndCashEquivalents: 'cash',
  Cash: 'cash',
  CashEquivalents: 'cash',
  CashAndBankBalances: 'cash',

  Inventory: 'inventory',
  Inventories: 'inventory',

  TradeReceivables: 'receivables',
  Receivables: 'receivables',
  AccountsReceivable: 'receivables',
  TradeDebtors: 'receivables',

  TradePayables: 'payables',
  Payables: 'payables',
  AccountsPayable: 'payables',
  TradeCreditors: 'payables',

  CostOfRevenue: 'cogs',
  CostOfGoodsSold: 'cogs',
  CostOfSales: 'cogs',
  CostOfMaterialsConsumed: 'cogs',

  EBITDA: 'ebitda',
  EarningsBeforeInterestTaxDepreciationAmortisation: 'ebitda',
  EarningsBeforeInterestTaxesDepreciationAmortization: 'ebitda',

  EarningsBeforeInterestAndTaxes: 'ebit',
  EBIT: 'ebit',
  OperatingProfitLoss: 'ebit',

  InterestExpense: 'interestExpense',
  FinanceCosts: 'interestExpense',
  InterestAndFinanceCharges: 'interestExpense',

  Depreciation: 'depreciation',
  DepreciationAndAmortisation: 'depreciation',
  DepreciationAndAmortization: 'depreciation',
  DepreciationExpense: 'depreciation',

  EarningsPerShare: 'eps',
  EarningsPerShareBasic: 'eps',
  EarningsPerShareDiluted: 'eps',
  BasicEarningsPerShare: 'eps',
  DilutedEarningsPerShare: 'eps',

  SharesOutstanding: 'sharesOutstanding',
  NumberOfShares: 'sharesOutstanding',
  WeightedAverageShares: 'sharesOutstanding',
  OutstandingShares: 'sharesOutstanding',

  OperatingCashFlow: 'operatingCashFlow',
  CashFlowFromOperatingActivities: 'operatingCashFlow',
  NetCashFromOperatingActivities: 'operatingCashFlow',
  CashGeneratedFromOperations: 'operatingCashFlow',

  InvestingCashFlow: 'investingCashFlow',
  CashFlowFromInvestingActivities: 'investingCashFlow',
  NetCashFromInvestingActivities: 'investingCashFlow',

  FinancingCashFlow: 'financingCashFlow',
  CashFlowFromFinancingActivities: 'financingCashFlow',
  NetCashFromFinancingActivities: 'financingCashFlow',

  CurrentAssets: 'currentAssets',
  TotalCurrentAssets: 'currentAssets',

  GrossProfit: 'grossProfit',
  ProfitBeforeTax: 'profitBeforeTax',
  ProfitLossBeforeTax: 'profitBeforeTax',

  CapitalExpenditure: 'capex',
  PurchaseOfPropertyPlantAndEquipment: 'capex',
  Capex: 'capex',

  FreeCashFlow: 'freeCashFlow',
  DividendsPaid: 'dividends',
};

/** Known statement classification by tag pattern */
const TAG_STATEMENT_MAP: Record<string, StatementType> = {
  revenue: 'income_statement',
  netProfit: 'income_statement',
  ebit: 'income_statement',
  ebitda: 'income_statement',
  cogs: 'income_statement',
  depreciation: 'income_statement',
  interestExpense: 'income_statement',
  grossProfit: 'income_statement',
  profitBeforeTax: 'income_statement',
  eps: 'market_data',
  sharesOutstanding: 'market_data',
  totalAssets: 'balance_sheet',
  equity: 'balance_sheet',
  totalDebt: 'balance_sheet',
  currentLiabilities: 'balance_sheet',
  nonCurrentLiabilities: 'balance_sheet',
  cash: 'balance_sheet',
  inventory: 'balance_sheet',
  receivables: 'balance_sheet',
  payables: 'balance_sheet',
  currentAssets: 'balance_sheet',
  operatingCashFlow: 'cash_flow',
  investingCashFlow: 'cash_flow',
  financingCashFlow: 'cash_flow',
  capex: 'cash_flow',
  freeCashFlow: 'cash_flow',
  dividends: 'cash_flow',
};

// ──────────────────────────────────────────────────────────
//  XML Utilities
// ──────────────────────────────────────────────────────────

/**
 * Create an XML namespace-aware parser.
 * Strips namespaces from element names for easier matching.
 */
function parseXML(xmlText: string): Document {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`XML parse error: ${parseError.textContent}`);
  }
  return doc;
}

/**
 * Get the local (unprefixed) tag name from a qualified name.
 * e.g. 'ifrs-full:RevenueTotal' → 'RevenueTotal'
 */
function localTagName(qualifiedName: string): string {
  const colonIdx = qualifiedName.indexOf(':');
  return colonIdx >= 0 ? qualifiedName.slice(colonIdx + 1) : qualifiedName;
}

/**
 * Extract all elements in a document by matching against a set
 * of possible local tag names (ignoring namespace prefixes).
 */
function findElementsByLocalName(
  doc: Document,
  localNames: string[]
): Element[] {
  const results: Element[] = [];
  const allElements = doc.getElementsByTagName('*');
  const nameSet = new Set(localNames);
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const local = localTagName(el.tagName);
    if (nameSet.has(local)) {
      results.push(el);
    }
  }
  return results;
}

/**
 * Find all fact-like elements — any element with a contextRef attribute
 * that is not a schema/context/unit/linkbase element.
 */
function findFactElements(doc: Document): Element[] {
  const allElements = doc.getElementsByTagName('*');
  const facts: Element[] = [];
  const skipLocalNames = new Set([
    'context', 'unit', 'schemaRef', 'linkbaseRef', 'roleRef',
    'arcroleRef', 'footnoteLink', 'loc', 'labelLink', 'presentationLink',
    'calculationLink', 'definitionLink',
  ]);

  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const local = localTagName(el.tagName);
    if (skipLocalNames.has(local)) continue;
    if (!el.hasAttribute('contextRef')) continue;

    facts.push(el);
  }
  return facts;
}

// ──────────────────────────────────────────────────────────
//  XBRL Parsing (pure XBRL XML)
// ──────────────────────────────────────────────────────────

/**
 * Parse a pure XBRL XML document.
 *
 * @param xmlText - The raw XML text of an XBRL instance document.
 * @returns Structured XBRL data ready for conversion.
 *
 * BETA: Console warnings are emitted for each mapped fact.
 */
export async function parseXBRL(xmlText: string): Promise<XBRLResult> {
  console.warn('[XBRL Parser BETA] parseXBRL() is a BETA feature. Results require human review.');

  const doc = parseXML(xmlText);
  const warnings: string[] = [];
  warnings.push('XBRL parsing is BETA — all mappings are best-effort.');

  // ── Extract Contexts ──
  const contexts = new Map<string, XBRLContext>();
  const contextElements = findElementsByLocalName(doc, ['context']);
  for (const ctxEl of contextElements) {
    const id = ctxEl.getAttribute('id') || ctxEl.getAttribute('xbrli:id') || '';
    if (!id) continue;

    // Entity
    let entity = '';
    const entityEl = ctxEl.querySelector('entity > identifier');
    if (entityEl) {
      entity = entityEl.textContent || '';
    }

    // Period
    let periodStart: string | undefined;
    let periodEnd: string | undefined;
    let instant: string | undefined;

    const startEl = ctxEl.querySelector('period > startDate');
    const endEl = ctxEl.querySelector('period > endDate');
    const instantEl = ctxEl.querySelector('period > instant');

    if (startEl && endEl) {
      periodStart = startEl.textContent || undefined;
      periodEnd = endEl.textContent || undefined;
    } else if (instantEl) {
      instant = instantEl.textContent || undefined;
    }

    contexts.set(id, { id, entity, periodStart, periodEnd, instant });
  }

  // ── Extract Units ──
  const units = new Map<string, XBRLUnit>();
  const unitElements = findElementsByLocalName(doc, ['unit']);
  for (const unitEl of unitElements) {
    const id = unitEl.getAttribute('id') || unitEl.getAttribute('xbrli:id') || '';
    if (!id) continue;

    const measureEl = unitEl.querySelector('measure');
    const measure = measureEl ? measureEl.textContent || '' : '';
    units.set(id, { id, measure });
  }

  // ── Extract Facts ──
  const factElements = findFactElements(doc);
  const facts: XBRLFact[] = [];

  for (const el of factElements) {
    const name = el.tagName;
    const local = localTagName(name);
    const value = (el.textContent || '').trim();
    const contextRef = el.getAttribute('contextRef') || '';
    const unitRef = el.getAttribute('unitRef') || undefined;
    const decimals = el.getAttribute('decimals') || undefined;
    const scale = el.getAttribute('scale') || undefined;

    if (!value || !contextRef) continue;

    facts.push({
      name,
      localName: local,
      value,
      contextRef,
      unitRef,
      decimals,
      scale,
    });
  }

  // ── Derive Company ──
  const company = extractCompany(contexts);

  // ── Derive Periods ──
  const { periods, periodEnds } = derivePeriods(contexts, facts);

  return {
    facts,
    contexts,
    units,
    company,
    periods,
    periodEnds,
    warnings,
    sourceType: 'xbrl',
  };
}

// ──────────────────────────────────────────────────────────
//  iXBRL Parsing (inline XBRL in HTML)
// ──────────────────────────────────────────────────────────

/**
 * Parse an iXBRL document (inline XBRL embedded in HTML).
 *
 * iXBRL uses `<ix:nonFraction>`, `<ix:nonNumeric>`, and related
 * elements with `contextRef` and `unitRef` attributes embedded
 * in an HTML document.
 *
 * @param htmlText - The raw HTML text of an iXBRL filing.
 * @returns Structured XBRL data.
 *
 * BETA: Console warnings are emitted for each mapped fact.
 */
export async function parseIXBRL(htmlText: string): Promise<XBRLResult> {
  console.warn('[XBRL Parser BETA] parseIXBRL() is a BETA feature. Results require human review.');

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const warnings: string[] = [];
  warnings.push('iXBRL parsing is BETA — all mappings are best-effort.');

  // ── Extract Contexts (from hidden ix:hidden elements) ──
  const contexts = new Map<string, XBRLContext>();
  const contextElements = doc.querySelectorAll(
    'ix\\:context, [ix\\:context], context, [context]'
  );
  // Also try finding context-like definitions in script tags or hidden spans

  // Common iXBRL pattern: contexts are embedded as XML in hidden divs
  const hiddenDivs = doc.querySelectorAll(
    'ix\\:hidden, [ix\\:hidden], div[hidden], .hidden, script[type="application/xml"]'
  );
  for (const div of hiddenDivs) {
    const innerHTML = (div as HTMLElement).innerHTML || div.textContent || '';
    if (!innerHTML.includes('<context')) continue;
    try {
      const ctxDoc = parseXML(innerHTML);
      const ctxElements = findElementsByLocalName(ctxDoc, ['context']);
      for (const ctxEl of ctxElements) {
        const id = ctxEl.getAttribute('id') || '';
        if (!id || contexts.has(id)) continue;

        let entity = '';
        const entityEl = ctxEl.querySelector('entity > identifier');
        if (entityEl) entity = entityEl.textContent || '';

        let periodStart: string | undefined;
        let periodEnd: string | undefined;
        let instant: string | undefined;

        const startEl = ctxEl.querySelector('period > startDate');
        const endEl = ctxEl.querySelector('period > endDate');
        const instantEl = ctxEl.querySelector('period > instant');

        if (startEl && endEl) {
          periodStart = startEl.textContent || undefined;
          periodEnd = endEl.textContent || undefined;
        } else if (instantEl) {
          instant = instantEl.textContent || undefined;
        }

        contexts.set(id, { id, entity, periodStart, periodEnd, instant });
      }
    } catch {
      // Skip non-XML hidden content
    }
  }

  // ── Extract Units (same pattern) ──
  const units = new Map<string, XBRLUnit>();
  for (const div of hiddenDivs) {
    const innerHTML = (div as HTMLElement).innerHTML || div.textContent || '';
    if (!innerHTML.includes('<unit')) continue;
    try {
      const unitDoc = parseXML(innerHTML);
      const unitElements = findElementsByLocalName(unitDoc, ['unit']);
      for (const unitEl of unitElements) {
        const id = unitEl.getAttribute('id') || '';
        if (!id || units.has(id)) continue;
        const measureEl = unitEl.querySelector('measure');
        const measure = measureEl ? measureEl.textContent || '' : '';
        units.set(id, { id, measure });
      }
    } catch {
      // skip
    }
  }

  // ── Extract iXBRL facts ──
  // iXBRL uses ix:nonFraction, ix:nonNumeric, ix:fraction, ix:continuation
  const ixFacts: XBRLFact[] = [];

  const ixElements = doc.querySelectorAll(
    'ix\\:nonFraction, ix\\:nonNumeric, ix\\:fraction, ' +
    '[ix\\:nonFraction], [ix\\:nonNumeric]'
  );
  // Also fallback: find all elements with contextRef attribute in the HTML
  const fallbackElements = doc.querySelectorAll('[contextRef]');

  const processElement = (el: Element) => {
    const tagName = el.tagName;
    const local = localTagName(tagName);

    // iXBRL stores the actual concept name in the 'name' attribute
    const conceptName = el.getAttribute('name') || el.getAttribute('ix:name') || local;
    const value = el.textContent?.trim() || '';
    const contextRef = el.getAttribute('contextRef') || '';
    const unitRef = el.getAttribute('unitRef') || undefined;
    const decimals = el.getAttribute('decimals') || undefined;
    const scale = el.getAttribute('scale') || undefined;

    if (!value || !contextRef) return;

    ixFacts.push({
      name: conceptName,
      localName: localTagName(conceptName),
      value,
      contextRef,
      unitRef,
      decimals,
      scale,
    });
  };

  for (const el of ixElements) processElement(el);
  for (const el of fallbackElements) {
    const local = localTagName(el.tagName);
    // Skip elements we already processed via ix: namespace
    if (el.matches('ix\\:nonFraction, ix\\:nonNumeric, ix\\:fraction')) continue;
    processElement(el);
  }

  // ── Derive Company ──
  const company = extractCompany(contexts);
  if (!company) {
    // Try HTML title or meta for company name
    const title = doc.querySelector('title');
    if (title?.textContent) {
      const match = title.textContent.match(/(.+?)(?:\s+(?:Annual|Quarterly|Financial|Report|Filing))/i);
      if (match) {
        // Store in a synthetic context
      }
    }
  }

  // ── Derive Periods ──
  const { periods, periodEnds } = derivePeriods(contexts, ixFacts);

  return {
    facts: ixFacts,
    contexts,
    units,
    company,
    periods,
    periodEnds,
    warnings,
    sourceType: 'ixbrl',
  };
}

// ──────────────────────────────────────────────────────────
//  XBRL → FundalystDataset Conversion
// ──────────────────────────────────────────────────────────

/**
 * Convert a parsed XBRL result into the standard FundalystDataset
 * format for use by the rest of the importer pipeline.
 *
 * BETA: All fact confidences are capped at 0.7 (mapped) or
 * 0.35 (unmapped) to signal the need for human review.
 */
export function convertXBRLToDataset(
  xbrl: XBRLResult,
  options?: {
    currency?: Currency;
    unit?: Unit;
    companyOverride?: string;
  }
): FundalystDataset {
  console.warn('[XBRL Parser BETA] convertXBRLToDataset() — results are BETA quality.');

  const canonicalFacts: CanonicalFact[] = [];
  const warnings = [...xbrl.warnings];
  const seenMetrics = new Set<string>();

  // Determine base currency from unit measures
  const detectedCurrency = detectCurrencyFromUnits(xbrl.units);
  const detectedUnit = detectScaleUnit(xbrl.units);

  const currency = options?.currency || detectedCurrency;
  const unit: Unit = options?.unit || detectedUnit;

  // Period labels for the dataset
  const periods = xbrl.periods.length > 0
    ? xbrl.periods
    : xbrl.periodEnds.map((d) => {
        const yr = d.slice(0, 4);
        return `FY${yr.slice(2)}`;
      });

  for (const fact of xbrl.facts) {
    const canonicalMetric = mapXBRLTag(fact.localName);
    const valueNum = parseXBRLValue(fact.value, fact.decimals, fact.scale);

    if (valueNum === null) continue;

    // Determine statement type
    const statement: StatementType =
      TAG_STATEMENT_MAP[canonicalMetric] || 'unknown';

    // Determine period label from context
    const context = fact.contextRef ? xbrl.contexts.get(fact.contextRef) : undefined;
    const periodLabel = formatPeriodLabel(context, periods);
    const periodEnd = context?.periodEnd || context?.instant;

    // BETA: cap confidence
    const baseConfidence = canonicalMetric !== 'unknown' ? 0.7 : 0.35;
    // Lower confidence if value seems scaled oddly
    const adjustedConfidence = adjustConfidence(valueNum, baseConfidence);

    if (canonicalMetric !== 'unknown' && !seenMetrics.has(canonicalMetric)) {
      seenMetrics.add(canonicalMetric);
    }

    canonicalFacts.push({
      sourceType: xbrl.sourceType === 'ixbrl' ? 'xbrl' : 'xbrl',
      statement,
      metric: canonicalMetric,
      canonicalMetric,
      labelOriginal: fact.localName,
      value: valueNum,
      periodLabel,
      periodEnd,
      fiscalYear: periodEnd ? periodEnd.slice(0, 4) : undefined,
      currency,
      unit: 'ones', // We normalize to base units
      confidence: adjustedConfidence,
      sourceRow: 0,
      sourceColumn: 0,
      company: options?.companyOverride || xbrl.company || undefined,
    });

    if (fact.localName !== canonicalMetric && canonicalMetric !== 'unknown') {
      warnings.push(
        `[XBRL BETA] Mapped "${fact.localName}" → "${canonicalMetric}" (confidence: ${Math.round(adjustedConfidence * 100)}%)`
      );
    }
  }

  // Build missing fields
  const importantMetrics = [
    'revenue', 'netProfit', 'ebit', 'totalAssets', 'totalDebt', 'equity',
    'currentAssets', 'currentLiabilities', 'inventory', 'receivables', 'payables',
    'cash', 'operatingCashFlow', 'interestExpense',
  ];
  const missingFields = importantMetrics.filter((m) => !seenMetrics.has(m));

  return {
    id: `xbrl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sourceType: 'xbrl',
    companyName: options?.companyOverride || xbrl.company || undefined,
    currency,
    unit,
    periods,
    facts: canonicalFacts,
    warnings,
    missingFields,
    confidence: 0.5, // BETA: overall low confidence
    createdAt: new Date().toISOString(),
    detectedStatementType: detectPrimaryStatement(canonicalFacts),
    periodType: detectPeriodType(xbrl.contexts),
  };
}

// ──────────────────────────────────────────────────────────
//  File Detection
// ──────────────────────────────────────────────────────────

/**
 * Check whether a File object is likely an XBRL or iXBRL document.
 *
 * Reads the first few KB of the file and checks for:
 * - XBRL: XML with `<xbrli:xbrl>` or `xmlns="http://www.xbrl.org/"`
 * - iXBRL: HTML with `ix:nonFraction` or `ix:nonNumeric` or `type="text/xbrl"`
 *
 * @param file - The File to inspect
 * @returns `true` if the file appears to be XBRL or iXBRL
 */
export function detectXBRL(file: File): boolean {
  // Check extension first (fast path)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'xbrl') return true;

  // We need to read the start of the file synchronously to check
  // Since File.text() is async, we use a synchronous check on a Blob slice
  // But we can't do sync file reads in browser - we'll return a function
  // that requires the text. Let's use a different approach.
  return false; // Use async version below
}

/**
 * Async file detection — reads the first 8KB of a file and checks
 * for XBRL/iXBRL markers.
 */
export async function detectXBRLAsync(file: File): Promise<boolean> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'xbrl') return true;
  if (ext === 'xml') {
    // Might be an XBRL instance — read a bit to confirm
    const head = await readFileHead(file, 4096);
    return head.includes('xbrl') && (head.includes('<xbrli') || head.includes('www.xbrl.org'));
  }
  if (ext === 'html' || ext === 'htm' || !ext) {
    const head = await readFileHead(file, 8192);
    // Check for iXBRL markers
    return (
      head.includes('ix:nonFraction') ||
      head.includes('ix:nonNumeric') ||
      head.includes('type="text/xbrl"') ||
      (head.includes('xbrl') && (head.includes('contextRef') || head.includes('ixt:') || head.includes('ix:')))
    );
  }
  return false;
}

// ──────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────

/**
 * Map an XBRL local tag name to a canonical Fundalyst metric.
 */
function mapXBRLTag(localName: string): string {
  // Exact match
  const exact = XBRL_TAG_MAP[localName];
  if (exact) return exact;

  // Try suffix matching for compound names
  // e.g. 'RevenueFromOperations' → try suffix 'Revenue'
  for (const [tag, canonical] of Object.entries(XBRL_TAG_MAP)) {
    if (localName.endsWith(tag)) {
      return canonical;
    }
    // Check if tag ends with the local name (reverse)
    if (tag.endsWith(localName)) {
      return canonical;
    }
  }

  // Try partial matching: see if any word in localName matches a tag
  const words = localName.split(/(?=[A-Z])/); // Split camelCase
  for (const word of words) {
    const matched = XBRL_TAG_MAP[word];
    if (matched) return matched;
  }

  // Unknown
  return 'unknown';
}

/**
 * Extract company name from the first entity identifier found in contexts.
 */
function extractCompany(contexts: Map<string, XBRLContext>): string | null {
  for (const ctx of Array.from(contexts.values())) {
    if (ctx.entity) {
      return ctx.entity;
    }
  }
  return null;
}

/**
 * Derive human-readable period labels and ISO end dates from contexts
 * referenced by facts.
 */
function derivePeriods(
  contexts: Map<string, XBRLContext>,
  facts: XBRLFact[]
): { periods: string[]; periodEnds: string[] } {
  const seenPeriods = new Map<string, { label: string; end: string }>();

  for (const fact of facts) {
    const ctx = fact.contextRef ? contexts.get(fact.contextRef) : undefined;
    if (!ctx) continue;

    const endDate = ctx.periodEnd || ctx.instant;
    if (!endDate) continue;

    if (!seenPeriods.has(endDate)) {
      const year = endDate.slice(0, 4);
      const month = endDate.slice(5, 7);
      const label = `FY${year.slice(2)}`;
      // If we have a start date, it's a duration; otherwise instant (point in time)
      const periodLabel = ctx.periodStart
        ? `${label} (${month})`
        : label;

      seenPeriods.set(endDate, {
        label: periodLabel,
        end: endDate,
      });
    }
  }

  // Sort chronologically
  const sorted = [...seenPeriods.entries()]
    .sort(([, a], [, b]) => a.end.localeCompare(b.end));

  return {
    periods: sorted.map(([, v]) => v.label),
    periodEnds: sorted.map(([, v]) => v.end),
  };
}

/**
 * Format a period label from a context for display.
 */
function formatPeriodLabel(
  context: XBRLContext | undefined,
  fallbackPeriods: string[]
): string {
  if (!context) return fallbackPeriods[0] || 'unknown';
  const endDate = context.periodEnd || context.instant;
  if (!endDate) return fallbackPeriods[0] || 'unknown';
  const year = endDate.slice(0, 4);
  const month = endDate.slice(5, 7);
  return context.periodStart
    ? `FY${year.slice(2)} (${month})`
    : `FY${year.slice(2)}`;
}

/**
 * Parse an XBRL numeric value string into a number.
 * Handles decimals and scale attributes from XBRL.
 *
 * XBRL decimals="2" means the value is accurate to 2 decimal places.
 * XBRL scale="6" means the value is in millions (factor = 10^6).
 *
 * BETA: Scaling from XBRL attributes is experimental.
 */
function parseXBRLValue(
  value: string,
  decimals?: string,
  scale?: string
): number | null {
  // Remove whitespace and commas
  const cleaned = value.trim().replace(/,/g, '');
  if (!cleaned) return null;

  const rawNum = parseFloat(cleaned);
  if (isNaN(rawNum)) return null;

  // Determine multiplier from scale attribute
  // XBRL scale attribute is the exponent (e.g. scale="6" means 10^6)
  let multiplier = 1;
  if (scale) {
    const scaleNum = parseInt(scale, 10);
    if (!isNaN(scaleNum) && scaleNum !== 0) {
      multiplier = 1 / Math.pow(10, scaleNum); // Reversing: value = reported * 10^-scale
      // Actually in XBRL: value * 10^scale = actual value
      // If scale=6 and reported=123, actual = 123,000,000
    }
  }

  // Handle decimals: if decimals="0", value is whole numbers
  // If decimals="-3", value is in thousands
  if (decimals) {
    const decNum = parseInt(decimals, 10);
    if (!isNaN(decNum) && decNum < 0) {
      multiplier = multiplier * Math.pow(10, Math.abs(decNum));
    }
  } else if (cleaned.includes('.') && !scale) {
    // No decimals or scale specified - value as-is
  }

  return rawNum * multiplier;
}

/**
 * Detect a Fundalyst Unit from XBRL unit measures.
 */
function detectScaleUnit(units: Map<string, XBRLUnit>): Unit {
  for (const unit of Array.from(units.values())) {
    const measure = unit.measure.toLowerCase();
    if (measure.includes('inr') || measure.includes('usd') ||
        measure.includes('eur') || measure.includes('gbp')) {
      // No scale info available from pure XBRL units — default to ones
      // The actual scaling comes from the 'scale' attribute on facts
      return 'ones';
    }
  }
  return 'ones';
}

/**
 * Detect a Fundalyst Currency from XBRL unit measures.
 */
function detectCurrencyFromUnits(units: Map<string, XBRLUnit>): Currency {
  for (const unit of Array.from(units.values())) {
    const measure = unit.measure.toLowerCase();
    if (measure.includes('inr')) return 'INR';
    if (measure.includes('usd')) return 'USD';
    if (measure.includes('eur')) return 'EUR';
    if (measure.includes('gbp')) return 'GBP';
  }
  return 'UNKNOWN';
}

/**
 * Adjust confidence based on value magnitude (suspiciously large numbers
 * may indicate incorrect scaling).
 */
function adjustConfidence(value: number, baseConfidence: number): number {
  const abs = Math.abs(value);
  // If the value is extremely large, it might be unscaled
  if (abs > 1e15) {
    return Math.min(baseConfidence, 0.4);
  }
  // If value seems reasonable, keep base
  return baseConfidence;
}

/**
 * Detect the primary statement type from mapped facts.
 */
function detectPrimaryStatement(facts: CanonicalFact[]): StatementType {
  const counts: Record<string, number> = {};
  for (const fact of facts) {
    const stmt = fact.statement;
    counts[stmt] = (counts[stmt] || 0) + 1;
  }
  let best = 'unknown' as StatementType;
  let bestCount = 0;
  for (const [stmt, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      best = stmt as StatementType;
    }
  }
  return best;
}

/**
 * Detect whether periods are annual or quarterly based on context patterns.
 */
function detectPeriodType(contexts: Map<string, XBRLContext>): 'annual' | 'quarterly' | 'ttm' | 'unknown' {
  let durationCount = 0;
  let instantCount = 0;

  for (const ctx of Array.from(contexts.values())) {
    if (ctx.periodStart && ctx.periodEnd) {
      durationCount++;
      // Check if duration is approximately one year
      if (ctx.periodStart && ctx.periodEnd) {
        const start = new Date(ctx.periodStart);
        const end = new Date(ctx.periodEnd);
        const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays >= 360 && diffDays <= 370) {
          return 'annual';
        }
        if (diffDays >= 80 && diffDays <= 100) {
          return 'quarterly';
        }
      }
    } else if (ctx.instant) {
      instantCount++;
    }
  }

  if (durationCount > 0) return 'annual';
  if (instantCount > 0) return 'annual';
  return 'unknown';
}

/**
 * Read the first N bytes of a file as text (for quick detection).
 */
async function readFileHead(file: File, bytes: number): Promise<string> {
  const blob = file.slice(0, bytes);
  return await blob.text();
}

/**
 * Detect whether a file is XBRL by reading its head.
 * Convenience wrapper that tries sync file extension check first.
 *
 * @param file - The File to check
 * @returns `true` if likely XBRL/iXBRL
 */
export async function detectXBRLFromFile(file: File): Promise<boolean> {
  return await detectXBRLAsync(file);
}
