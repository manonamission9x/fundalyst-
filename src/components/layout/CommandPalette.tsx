'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalDataStore } from '@/store/global-data-store';
import { generateMemo, downloadMemoMarkdown } from '@/lib/memo-export';
import { ANALYSIS_TOOLS, TOOL_METADATA, findToolByAlias } from '@/lib/tool-metadata';
import { canonicalDisplayName } from '@/lib/importer/metric-aliases';

// Public helper: any component can open the palette by dispatching this event.
export const PALETTE_EVENT = 'fundalyst:open-palette';
export function openCommandPalette() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PALETTE_EVENT));
}

interface Command {
  id: string;
  section: 'Commands' | 'Companies' | 'Navigate' | 'Actions';
  label: string;
  keywords?: string;
  meta?: string;
  active?: boolean;
  glyph?: 'dot' | 'arrow' | 'action';
  run: () => void;
}

const NAV_TARGETS: { label: string; href: string; keywords: string }[] = [
  ...TOOL_METADATA.map((tool) => ({
    label: tool.label,
    href: tool.href,
    keywords: `${tool.keywords} ${tool.aliases.join(' ')}`,
  })),
  { label: 'About', href: '/about', keywords: 'methodology info docs limits privacy' },
];

const GO_TO: Record<string, string> = {
  w: '/workspace',
  i: '/import',
  f: '/research/filing',
  t: '/research/trends',
  g: '/research/growth',
  d: '/tools/dcf',
  r: '/tools/ratios',
  c: '/tools/wc',
  p: '/tools/peer',
};

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

/** Lower score = tighter match. Returns -1 if the query isn't a subsequence. */
function fuzzyScore(text: string, q: string): number {
  if (!q) return 0;
  const t = text.toLowerCase();
  const query = q.toLowerCase();
  let ti = 0;
  let score = 0;
  let last = -1;
  for (const c of query) {
    const idx = t.indexOf(c, ti);
    if (idx === -1) return -1;
    score += idx - (last + 1); // penalize gaps
    ti = idx + 1;
    last = idx;
  }
  return score + last * 0.01; // mild preference for earlier completion
}

/** Best dataset match for a free-text company arg (direct-substring beats fuzzy). */
function matchDataset<T extends { id: string; companyName?: string; sourceType?: string; periods: string[] }>(
  datasets: T[],
  q: string,
): T | null {
  const needle = q.trim().toLowerCase();
  if (!needle) return null;
  return (
    datasets
      .map((d) => {
        const haystack = `${d.companyName || ''} ${d.id} ${d.sourceType || ''} ${d.periods.join(' ')}`;
        const directScore = haystack.toLowerCase().includes(needle) ? 0 : Number.POSITIVE_INFINITY;
        const fuzzy = fuzzyScore(haystack, needle);
        const score = Math.min(directScore, fuzzy >= 0 ? fuzzy + 1 : Number.POSITIVE_INFINITY);
        return { dataset: d, score };
      })
      .filter(({ score }) => Number.isFinite(score))
      .sort((a, b) => a.score - b.score)[0]?.dataset ?? null
  );
}

// Verbs that resolve to an action rather than a tool route. Tool verbs come from
// TOOL_METADATA aliases; these are the extra ones from the command language (T1).
const SPECIAL_VERBS = new Set(['memo', 'thesis', 'evidence', 'theme', 'clear', 'help']);

function sourceMetricQuery(input: string): string | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  for (const prefix of ['source ', 'evidence ', 'metric ']) {
    if (q.startsWith(prefix)) return q.slice(prefix.length).trim();
  }
  return null;
}

function cycleTheme() {
  if (typeof window === 'undefined') return;
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'light' ? 'dark' : cur === 'dark' ? null : 'light';
  if (next === null) {
    localStorage.removeItem('fundalyst-theme');
    document.documentElement.removeAttribute('data-theme');
  } else {
    localStorage.setItem('fundalyst-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [goMode, setGoMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const datasets = useGlobalDataStore((s) => s.datasets);
  const activeDatasetId = useGlobalDataStore((s) => s.activeDatasetId);
  const setActiveDataset = useGlobalDataStore((s) => s.setActiveDataset);
  const clearAllData = useGlobalDataStore((s) => s.clearAllData);
  const getToolReadiness = useGlobalDataStore((s) => s.getToolReadiness);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIdx(0);
  }, []);

  // Build the command registry from current state.
  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [];
    const hasData = datasets.length > 0;
    const normalizedQuery = query.trim().toLowerCase();
    const commandTool = findToolByAlias(normalizedQuery);
    const openCompanyQuery = normalizedQuery.startsWith('open ')
      ? normalizedQuery.slice(5).trim()
      : '';
    const metricQuery = sourceMetricQuery(normalizedQuery);
    const toolReadiness = ANALYSIS_TOOLS.map((tool) => getToolReadiness(tool.id));
    const missingMetrics = [...new Set(toolReadiness.flatMap((readiness) => readiness.missingMetrics))];

    for (const d of datasets) {
      const name = d.companyName || `${d.facts.length} metrics`;
      cmds.push({
        id: `co-${d.id}`,
        section: 'Companies',
        label: name,
        keywords: `${d.sourceType} ${d.periods.join(' ')}`,
        meta: d.id === activeDatasetId ? 'active' : `${d.periods.length}p · ${d.facts.length}f`,
        active: d.id === activeDatasetId,
        glyph: 'dot',
        run: () => setActiveDataset(d.id),
      });
    }

    // Command language (T1): parse `<verb> <company?>`. First token is the verb;
    // the remainder is an optional entity that switches the active dataset.
    const firstToken = normalizedQuery.split(/\s+/)[0] || '';
    const restArg = normalizedQuery.slice(firstToken.length).trim();
    const isSpecialVerb = SPECIAL_VERBS.has(firstToken);

    // Tool verb (dcf, ratios, filing, trends, growth, peer, wc, import, …), with an
    // optional company arg. Skip when a workspace-lens special verb owns the token.
    if (commandTool && !(isSpecialVerb && commandTool.id === 'workspace')) {
      // Strip the longest matching alias to get the entity portion (e.g. "ratios reliance").
      const matchedAlias = commandTool.aliases
        .filter((a) => normalizedQuery === a || normalizedQuery.startsWith(`${a} `))
        .sort((a, b) => b.length - a.length)[0];
      const entityArg = matchedAlias ? normalizedQuery.slice(matchedAlias.length).trim() : '';
      const entity = entityArg ? matchDataset(datasets, entityArg) : null;
      cmds.push({
        id: `cmd-tool-${commandTool.id}`,
        section: 'Commands',
        label: entity
          ? `${commandTool.label} · ${entity.companyName || 'company'}`
          : `Open ${commandTool.label}`,
        keywords: `${commandTool.aliases.join(' ')} ${commandTool.keywords} ${entityArg}`,
        meta: entity
          ? 'switch + open'
          : entityArg && hasData
            ? `no match: ${entityArg}`
            : commandTool.needsData && !hasData
              ? 'no data yet'
              : commandTool.value,
        glyph: 'action',
        run: () => {
          if (entity) setActiveDataset(entity.id);
          router.push(commandTool.href);
        },
      });
    }

    // Special verbs (memo, thesis, evidence, theme, clear, help), each with an
    // optional company arg where a dataset switch makes sense.
    if (isSpecialVerb) {
      const entity = restArg ? matchDataset(datasets, restArg) : null;
      const entitySuffix = entity ? ` · ${entity.companyName || 'company'}` : '';
      const switchFirst = () => { if (entity) setActiveDataset(entity.id); };
      if (firstToken === 'memo') {
        cmds.push({
          id: 'verb-memo', section: 'Commands', glyph: 'action',
          label: `Export investment memo${entitySuffix}`,
          keywords: 'memo investment export download tearsheet report markdown',
          meta: hasData ? undefined : 'no data',
          run: () => {
            switchFirst();
            const ds = entity ?? useGlobalDataStore.getState().getActiveDataset();
            if (!ds) { router.push('/import'); return; }
            downloadMemoMarkdown(generateMemo({ companyName: ds.companyName || 'Company', dataset: ds }));
          },
        });
      } else if (firstToken === 'thesis') {
        cmds.push({
          id: 'verb-thesis', section: 'Commands', glyph: 'action',
          label: `Open investment thesis${entitySuffix}`,
          keywords: 'thesis conclusion memo notes verdict',
          run: () => { switchFirst(); router.push('/workspace?step=thesis'); },
        });
      } else if (firstToken === 'evidence') {
        cmds.push({
          id: 'verb-evidence', section: 'Commands', glyph: 'action',
          label: `Open evidence & assumptions${entitySuffix}`,
          keywords: 'evidence source accepted facts assumptions audit provenance',
          run: () => { switchFirst(); router.push('/workspace?lens=evidence'); },
        });
      } else if (firstToken === 'theme') {
        cmds.push({
          id: 'verb-theme', section: 'Commands', glyph: 'action',
          label: 'Toggle theme (light / dark / auto)',
          keywords: 'theme dark light appearance',
          run: cycleTheme,
        });
      } else if (firstToken === 'clear') {
        cmds.push({
          id: 'verb-clear', section: 'Commands', glyph: 'action',
          label: 'Clear all data',
          keywords: 'clear reset delete wipe',
          meta: hasData ? undefined : 'nothing to clear',
          run: () => clearAllData(),
        });
      } else if (firstToken === 'help') {
        cmds.push({
          id: 'verb-help', section: 'Commands', glyph: 'action',
          label: 'Show keyboard shortcuts',
          keywords: 'help shortcuts keyboard cheat sheet',
          run: () => setShortcutsOpen(true),
        });
      }
    }

    if (openCompanyQuery) {
      const match = datasets
        .map((d) => {
          const haystack = `${d.companyName || ''} ${d.id} ${d.sourceType} ${d.periods.join(' ')}`;
          const directScore = haystack.toLowerCase().includes(openCompanyQuery) ? 0 : Number.POSITIVE_INFINITY;
          const fuzzy = fuzzyScore(haystack, openCompanyQuery);
          const score = Math.min(directScore, fuzzy >= 0 ? fuzzy + 1 : Number.POSITIVE_INFINITY);
          return { dataset: d, score };
        })
        .filter(({ score }) => Number.isFinite(score))
        .sort((a, b) => a.score - b.score)[0]?.dataset;
      if (match) {
        cmds.push({
          id: `cmd-open-${match.id}`,
          section: 'Commands',
          label: `Open ${match.companyName || 'selected company'}`,
          keywords: `open company dataset ${match.companyName || ''}`,
          meta: `${match.periods.length}p · ${match.facts.length}f`,
          glyph: 'action',
          run: () => {
            setActiveDataset(match.id);
            router.push('/workspace');
          },
        });
      }
    }

    if (metricQuery) {
      cmds.push({
        id: `cmd-source-${metricQuery}`,
        section: 'Commands',
        label: `Source ${canonicalDisplayName(metricQuery)}`,
        keywords: `source evidence metric accepted fact ${metricQuery}`,
        meta: 'workspace evidence',
        glyph: 'action',
        run: () => router.push(`/workspace?metric=${encodeURIComponent(metricQuery)}`),
      });
    }

    for (const t of NAV_TARGETS) {
      cmds.push({
        id: `nav-${t.href}`,
        section: 'Navigate',
        label: t.label,
        keywords: t.keywords,
        glyph: 'arrow',
        run: () => router.push(t.href),
      });
    }

    cmds.push({
      id: 'act-memo',
      section: 'Actions',
      label: 'Export investment memo',
      keywords: 'memo investment export download tearsheet report markdown',
      meta: hasData ? undefined : 'no data',
      glyph: 'action',
      run: () => {
        const ds = useGlobalDataStore.getState().getActiveDataset();
        if (!ds) {
          router.push('/import');
          return;
        }
        const memo = generateMemo({ companyName: ds.companyName || 'Company', dataset: ds });
        downloadMemoMarkdown(memo);
      },
    });
    cmds.push({
      id: 'act-backup',
      section: 'Actions',
      label: 'Open workspace backup',
      keywords: 'backup restore export workspace data json',
      glyph: 'action',
      run: () => router.push('/workspace?lens=backup'),
    });
    cmds.push({
      id: 'act-evidence',
      section: 'Actions',
      label: 'Open evidence review',
      keywords: 'evidence source accepted facts assumptions audit',
      glyph: 'action',
      run: () => router.push('/workspace?lens=evidence'),
    });
    cmds.push({
      id: 'act-coverage',
      section: 'Actions',
      label: 'Open coverage list',
      keywords: 'coverage saved companies source dataset active',
      meta: hasData ? `${datasets.length} saved` : 'no data',
      glyph: 'action',
      run: () => router.push('/workspace?lens=coverage'),
    });
    cmds.push({
      id: 'act-show-missing',
      section: 'Actions',
      label: 'Show missing metrics',
      keywords: 'show missing needs incomplete data required metrics',
      meta: hasData ? `${missingMetrics.length} missing` : 'import first',
      glyph: 'action',
      run: () => {
        const firstMissing = missingMetrics[0];
        router.push(firstMissing ? `/workspace?metric=${encodeURIComponent(firstMissing)}` : '/workspace?lens=evidence');
      },
    });
    cmds.push({
      id: 'act-compare-saved',
      section: 'Actions',
      label: 'Compare saved companies',
      keywords: 'compare saved coverage peer benchmark companies',
      meta: hasData ? `${datasets.length} saved` : 'needs companies',
      glyph: 'action',
      run: () => router.push('/tools/peer'),
    });
    cmds.push({
      id: 'act-export-dcf',
      section: 'Actions',
      label: 'Export DCF',
      keywords: 'export dcf valuation model download formulas',
      meta: hasData ? 'open valuation' : 'needs data',
      glyph: 'action',
      run: () => router.push('/tools/dcf?export=1'),
    });
    cmds.push({
      id: 'act-theme',
      section: 'Actions',
      label: 'Toggle theme (light / dark / auto)',
      keywords: 'dark light appearance gold',
      glyph: 'action',
      run: cycleTheme,
    });
    cmds.push({
      id: 'act-shortcuts',
      section: 'Actions',
      label: 'Show keyboard shortcuts',
      keywords: 'help shortcuts keyboard question mark',
      glyph: 'action',
      run: () => setShortcutsOpen(true),
    });
    if (hasData) {
      cmds.push({
        id: 'act-clear',
        section: 'Actions',
        label: 'Clear all data',
        keywords: 'reset delete wipe',
        glyph: 'action',
        run: () => clearAllData(),
      });
    }
    return cmds;
  }, [datasets, activeDatasetId, setActiveDataset, clearAllData, getToolReadiness, router, query]);

  // Filter + sort by fuzzy score, preserving section grouping order.
  const filtered = useMemo(() => {
    const scored = commands
      .map((c) => ({ c, s: Math.min(...[fuzzyScore(c.label, query), fuzzyScore(c.keywords || '', query)].filter((n) => n >= 0).concat(query ? [] : [0])) }))
      .filter(({ s }) => Number.isFinite(s));
    if (query) scored.sort((a, b) => a.s - b.s);
    return scored.map(({ c }) => c);
  }, [commands, query]);

  // Group while keeping the (possibly score-sorted) order.
  const groups = useMemo(() => {
    const order: Command['section'][] = ['Commands', 'Companies', 'Navigate', 'Actions'];
    const map = new Map<string, Command[]>();
    for (const c of filtered) {
      if (!map.has(c.section)) map.set(c.section, []);
      map.get(c.section)!.push(c);
    }
    return order.filter((o) => map.has(o)).map((o) => ({ section: o, items: map.get(o)! }));
  }, [filtered]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Open via Cmd/Ctrl+K and via the custom event (nav trigger).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (e.key === 'Escape' && shortcutsOpen) {
        e.preventDefault();
        setShortcutsOpen(false);
        setGoMode(false);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setActiveIdx(0);
        setOpen((v) => !v);
        setGoMode(false);
        return;
      }
      if (e.key === '`' || e.key === '/') {
        e.preventDefault();
        setQuery('');
        setActiveIdx(0);
        setOpen(true);
        setGoMode(false);
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }
      if (!goMode && (e.key === 'e' || e.key === 'E') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const ds = useGlobalDataStore.getState().getActiveDataset();
        if (!ds) { router.push('/import'); return; }
        downloadMemoMarkdown(generateMemo({ companyName: ds.companyName || 'Company', dataset: ds }));
        return;
      }
      if (goMode) {
        const href = GO_TO[e.key.toLowerCase()];
        if (href) {
          e.preventDefault();
          router.push(href);
        }
        setGoMode(false);
        return;
      }
      if (e.key.toLowerCase() === 'g') {
        setGoMode(true);
        window.setTimeout(() => setGoMode(false), 1200);
      }
    }
    function onOpen() { setActiveIdx(0); setOpen(true); }
    window.addEventListener('keydown', onKey);
    window.addEventListener(PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(PALETTE_EVENT, onOpen);
    };
  }, [goMode, router, shortcutsOpen]);

  // Focus input + lock scroll while open.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { clearTimeout(t); document.body.style.overflow = prev; };
  }, [open]);


  // Keep the active row in view.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  if (!open && !shortcutsOpen && !goMode) return null;

  const exec = (c?: Command) => { if (!c) return; c.run(); close(); };

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); exec(flat[activeIdx]); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  }

  let runningIdx = -1;

  return (
    <>
    {goMode && !open && !shortcutsOpen && (
      <div className="shortcut-toast" role="status">Go to: d DCF · r Ratios · f Filing · t Trends · p Peers · w Workspace · i Import</div>
    )}

    {shortcutsOpen && (
      <div className="cmdk-backdrop" onMouseDown={() => setShortcutsOpen(false)} role="presentation">
        <div
          className="cmdk-panel shortcuts-panel"
          onMouseDown={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
        >
          <div className="cmdk-input-row">
            <span className="cmdk-label">Keyboard shortcuts</span>
            <button type="button" className="btn-ghost btn-sm ml-auto" onClick={() => setShortcutsOpen(false)}>Close</button>
          </div>
          <div className="shortcuts-grid">
            <Shortcut k="` or /" v="Open command bar" />
            <Shortcut k="Cmd/Ctrl K" v="Toggle command bar" />
            <Shortcut k="g d" v="Go to DCF" />
            <Shortcut k="g r" v="Go to ratios" />
            <Shortcut k="g f" v="Go to filing comparison" />
            <Shortcut k="g t" v="Go to trends" />
            <Shortcut k="g p" v="Go to peers" />
            <Shortcut k="g w" v="Go to workspace" />
            <Shortcut k="g i" v="Go to import" />
            <Shortcut k="e" v="Export investment memo" />
            <Shortcut k="?" v="Show shortcuts" />
            <Shortcut k="Esc" v="Close overlays" />
          </div>
        </div>
      </div>
    )}

    {open && (
    <div className="cmdk-backdrop" onMouseDown={close} role="presentation">
      <div
        className="cmdk-panel"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="cmdk-input-row">
          <svg className="cmdk-search-icon" width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="4" /><path d="M13 13l-3-3" />
          </svg>
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Type a command, company, tool, or action..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            onKeyDown={onInputKey}
            aria-label="Search commands"
          />
          <span className="cmdk-kbd">esc</span>
        </div>

        {query.trim() && flat[activeIdx] && (
          <div className="cmdk-interpretation" role="status" aria-live="polite">
            <span className="cmdk-interpretation-key">↵</span>
            <span className="cmdk-interpretation-text">
              {flat[activeIdx].label}
              {flat[activeIdx].meta ? <span className="cmdk-interpretation-meta"> · {flat[activeIdx].meta}</span> : null}
            </span>
          </div>
        )}

        <div className="cmdk-list" ref={listRef}>
          {flat.length === 0 && (
            <div className="cmdk-empty">
              <div>No matches</div>
              <div className="cmdk-empty-examples">Try: source revenue, show missing, compare saved, export dcf</div>
            </div>
          )}
          {groups.map((g) => (
            <div key={g.section}>
              <div className="cmdk-section">{g.section}</div>
              {g.items.map((c) => {
                runningIdx += 1;
                const idx = runningIdx;
                return (
                  <div
                    key={c.id}
                    data-idx={idx}
                    className={`cmdk-item${idx === activeIdx ? ' active' : ''}`}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => exec(c)}
                    role="option"
                    aria-selected={idx === activeIdx}
                  >
                    <span className="cmdk-icon" aria-hidden="true">
                      {c.glyph === 'dot' ? (
                        <span className={`cmdk-dot${c.active ? '' : ' muted'}`} />
                      ) : c.glyph === 'arrow' ? (
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h8M8 4l3 3-3 3" /></svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="5" /><path d="M7 4.5v5M4.5 7h5" /></svg>
                      )}
                    </span>
                    <span className="cmdk-label">{c.label}</span>
                    {c.meta && <span className="cmdk-meta">{c.meta}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
    )}
    </>
  );
}

function Shortcut({ k, v }: { k: string; v: string }) {
  return (
    <div className="shortcut-row">
      <span className="cmdk-kbd">{k}</span>
      <span>{v}</span>
    </div>
  );
}
