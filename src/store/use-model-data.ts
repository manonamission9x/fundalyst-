'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useActiveDataset } from './financial-model-selectors';
import { usePipelineStore } from './pipeline-store';

/**
 * useModelData — universal hook for any tool to consume canonical model data.
 *
 * Subscribes to pipeline notifications so every tool re-extracts
 * automatically when the model is updated (import, filing, spreadsheet write).
 *
 * @param extractor — function that takes the active dataset and returns tool-specific data
 * @returns { data, isLoaded, companyName }
 */
export function useModelData<T>(
  extractor: (dataset: NonNullable<ReturnType<typeof useActiveDataset>>) => T,
): { data: T | null; isLoaded: boolean; companyName: string } {
  const dataset = useActiveDataset();
  const extractorRef = useRef(extractor);
  // Keep ref current in effect, not render body
  useEffect(() => { extractorRef.current = extractor; }, [extractor]);
  const [data, setData] = useState<T | null>(null);

  const isLoaded = dataset !== null && dataset.facts.length > 0;
  const companyName = dataset?.companyName || '';

  const extract = useCallback(() => {
    if (!dataset || dataset.facts.length < 3) {
      setData(null);
      return;
    }
    try {
      const result = extractorRef.current(dataset);
      setData(result);
    } catch (err) {
      console.warn('[useModelData] extractor failed:', err);
      setData(null);
    }
  }, [dataset]);

  // Extract on mount and when dataset changes
  useEffect(() => {
    const timer = setTimeout(() => extract(), 0);
    return () => clearTimeout(timer);
  }, [extract]);

  // Subscribe to pipeline notifications (import, spreadsheet write, etc.)
  useEffect(() => {
    const unsub = usePipelineStore.getState().onModelUpdate(extract);
    return unsub;
  }, [extract]);

  return { data, isLoaded, companyName };
}
