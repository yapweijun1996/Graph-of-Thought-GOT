import { create } from 'zustand';
import type { ReportConfig } from '@/types/tree';

// State for the production report (Phase 5). The report is a snapshot — its
// keyInsightIds are frozen at generation time and drive the canvas highlight,
// so later expansions do not silently rewrite a report's emphasis.
export type ReportStatus = 'idle' | 'generating' | 'ready' | 'error';

interface ReportStore {
  status: ReportStatus;
  markdown: string | null;
  error: string | null;
  isPanelOpen: boolean;
  keyInsightIds: string[];
  config: ReportConfig | null; // config of the in-flight / last report (retry)
  setGenerating: (keyInsightIds: string[], config: ReportConfig) => void;
  setReady: (markdown: string) => void;
  setError: (error: string) => void;
  openPanel: () => void;
  closePanel: () => void;
  reset: () => void;
}

export const useReportStore = create<ReportStore>()((set) => ({
  status: 'idle',
  markdown: null,
  error: null,
  isPanelOpen: false,
  keyInsightIds: [],
  config: null,
  setGenerating: (keyInsightIds, config) =>
    set({
      status: 'generating',
      error: null,
      markdown: null,
      keyInsightIds,
      config,
      isPanelOpen: true,
    }),
  setReady: (markdown) => set({ status: 'ready', markdown }),
  setError: (error) => set({ status: 'error', error }),
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  reset: () =>
    set({
      status: 'idle',
      markdown: null,
      error: null,
      isPanelOpen: false,
      keyInsightIds: [],
      config: null,
    }),
}));
