import { create } from 'zustand';
import { loadAllTrees } from '@/lib/db/indexeddb';
import type { ThoughtTree } from '@/types/tree';

// Lightweight summary of a saved tree, for the LeftPanel library list.
export interface TreeSummary {
  id: string;
  rootTopic: string;
  createdAt: number;
  nodeCount: number;
}

interface LibraryStore {
  summaries: TreeSummary[];
  // Reloads every saved tree from IndexedDB; returns the full trees so the
  // caller can also hydrate one. Called on mount and after create / delete.
  refresh: () => Promise<ThoughtTree[]>;
}

export const useLibraryStore = create<LibraryStore>()((set) => ({
  summaries: [],
  refresh: async () => {
    const trees = await loadAllTrees();
    const summaries = trees
      .map((t) => ({
        id: t.id,
        rootTopic: t.rootTopic,
        createdAt: t.createdAt,
        nodeCount: Object.keys(t.nodes).length,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
    set({ summaries });
    return trees;
  },
}));
