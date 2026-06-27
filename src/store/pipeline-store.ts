'use client';
import { create } from 'zustand';

type Listener = () => void;

/**
 * PipelineStore — a lightweight pub/sub store that signals when
 * the canonical financial model has been updated.
 *
 * Any tool can subscribe to `onModelUpdate` to know when fresh
 * data is available, instead of each tool independently polling
 * via useEffect.
 */
interface PipelineState {
  /** Subscribers (tools that need to know about model changes) */
  _subscribers: Set<Listener>;
  /** Subscribe to model update notifications */
  onModelUpdate: (fn: Listener) => () => void;
  /** Called by import/upload/spreadsheet when new data arrives */
  notifyModelUpdated: () => void;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  _subscribers: new Set(),

  onModelUpdate: (fn: Listener) => {
    get()._subscribers.add(fn);
    return () => {
      get()._subscribers.delete(fn);
    };
  },

  notifyModelUpdated: () => {
    get()._subscribers.forEach((fn) => fn());
  },
}));
