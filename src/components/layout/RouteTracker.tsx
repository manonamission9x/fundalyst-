'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { TOOL_BY_ID, type ToolId } from '@/lib/tool-metadata';

const TRACKED_TOOLS: ToolId[] = ['filing', 'trends', 'growth', 'ratios', 'wc', 'dcf', 'peer'];
const LAST_TOOL_KEY = 'fundalyst-last-tool';

export type LastToolRecord = {
  id: ToolId;
  href: string;
  label: string;
};

export function readLastTool(): LastToolRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_TOOL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastToolRecord>;
    if (!parsed.id || !parsed.href || !parsed.label) return null;
    return parsed as LastToolRecord;
  } catch {
    return null;
  }
}

export default function RouteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const tool = TRACKED_TOOLS.map((id) => TOOL_BY_ID[id]).find((item) => item.href === pathname);
    if (!tool) return;
    const record: LastToolRecord = {
      id: tool.id,
      href: tool.href,
      label: tool.shortLabel,
    };
    localStorage.setItem(LAST_TOOL_KEY, JSON.stringify(record));
  }, [pathname]);

  return null;
}
