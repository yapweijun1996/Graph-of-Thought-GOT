import { create } from 'zustand';

// Auto-explore activity feed (Phase 18.5). A running narrative of what the
// auto-explore loop is doing — a text channel that stays readable at any zoom,
// so the user can follow the action even while the graph itself is a dense
// overview. In-memory only; reset each run.
const MAX_ENTRIES = 40;

export interface FeedEntry {
  id: number;
  text: string;
}

interface ExplorationFeedStore {
  entries: FeedEntry[];
  push: (text: string) => void;
  clear: () => void;
}

let nextId = 1;

export const useExplorationFeedStore = create<ExplorationFeedStore>()(
  (set) => ({
    entries: [],
    push: (text) =>
      set((s) => ({
        entries: [...s.entries, { id: nextId++, text }].slice(-MAX_ENTRIES),
      })),
    clear: () => set({ entries: [] }),
  }),
);
