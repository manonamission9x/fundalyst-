'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalDataStore } from '@/store/global-data-store';
import { generateMemo, downloadMemoMarkdown } from '@/lib/memo-export';
import { TOOL_METADATA, findToolByAlias } from '@/lib/tool-metadata';

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

    if (commandTool) {
      cmds.push({
        id: `cmd-tool-${commandTool.id}`,
        section: 'Commands',
        label: `Open ${commandTool.label}`,
        keywords: `${commandTool.aliases.join(' ')} ${commandTool.keywords}`,
        meta: commandTool.needsData && !hasData ? 'no data yet' : commandTool.value,
        glyph: 'action',
        run: () => router.push(commandTool.href),
      });
    }

    if (openCompanyQuery) {
      const match = datasets.find((d) =>
        (d.companyName || '').toLowerCase().includes(openCompanyQuery) ||
        d.id.toLowerCase().includes(openCompanyQuery),
      );
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
  }, [datasets, activeDatasetId, setActiveDataset, clearAllData, router, query]);

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
      <div className="shortcut-toast" role="status">Go to: d DCF · r Ratios · f Filing · w Workspace · i Import</div>
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
            <Shortcut k="g w" v="Go to workspace" />
            <Shortcut k="g i" v="Go to import" />
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

        <div className="cmdk-list" ref={listRef}>
          {flat.length === 0 && <div className="cmdk-empty">No matches</div>}
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
