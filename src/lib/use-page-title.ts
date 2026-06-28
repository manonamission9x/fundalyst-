'use client';
import { useEffect } from 'react';

/**
 * Set the page title in the browser. Simpler than per-page generateMetadata
 * for client components in static export.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} — Fundalyst`;
    return () => { document.title = prev; };
  }, [title]);
}
