import { create } from 'zustand';
import { loadAllTrees } from '@/lib/db/indexeddb';
import { useNoticeStore } from '@/lib/store/noticeStore';
import { usePrefsStore } from '@/lib/store/prefsStore';
import { translate } from '@/lib/i18n';
import type { ThoughtTree } from '@/types/tree';

// 11.5 — warn once when IndexedDB usage crosses 80% of the browser quota.
// Large embedding trees (100+ nodes × 384 floats) can fill it silently.
const QUOTA_WARN_RATIO = 0.8;
let quotaWarned = false;

async function checkStorageQuota(): Promise<void> {
  if (quotaWarned || !navigator.storage?.estimate) return;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (usage && quota && quota > 0 && usage / quota > QUOTA_WARN_RATIO) {
      quotaWarned = true;
      useNoticeStore
        .getState()
        .show(
          'warn',
          translate(usePrefsStore.getState().lang, 'notice.storageFull'),
        );
    }
  } catch {
    // storage.estimate unsupported / blocked — nothing to monitor
  }
}

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
    void checkStorageQuota();
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
