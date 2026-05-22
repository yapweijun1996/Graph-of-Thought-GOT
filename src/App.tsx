import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import TopBar from '@/components/panels/TopBar';
import LeftPanel from '@/components/panels/LeftPanel';
import RightPanel from '@/components/panels/RightPanel';
import ReportPanel from '@/components/panels/ReportPanel';
import ReportConfigModal from '@/components/panels/ReportConfigModal';
import InsightsPanel from '@/components/panels/InsightsPanel';
import SettingsModal from '@/components/panels/SettingsModal';
import ThoughtCanvas from '@/components/canvas/ThoughtCanvas';
import EmptyState from '@/components/EmptyState';
import EmbeddingStatus from '@/components/EmbeddingStatus';
import ExpansionErrorToast from '@/components/ExpansionErrorToast';
import NoticeToast from '@/components/NoticeToast';
import { getRootNode, newId, useTreeStore } from '@/lib/store/treeStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useLibraryStore } from '@/lib/store/libraryStore';
import { usePrefsStore } from '@/lib/store/prefsStore';
import { useNoticeStore } from '@/lib/store/noticeStore';
import { translate } from '@/lib/i18n';
import { runExpansion } from '@/lib/agent/expand';
import { summarizeContext } from '@/lib/agent/context';
import { clearShareHash, readSharedTree } from '@/lib/share';
import {
  getCurrentTreeId,
  saveTree,
  setCurrentTreeId,
} from '@/lib/db/indexeddb';

export default function App() {
  const initTree = useTreeStore((s) => s.initTree);
  const pendingNodeIds = useTreeStore((s) => s.pendingNodeIds);
  const hasTree = useTreeStore((s) => s.tree !== null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const provider = useSessionStore((s) => s.provider);
  const model = useSessionStore((s) => s.model);
  const thinkingLevel = useSessionStore((s) => s.thinkingLevel);
  const theme = usePrefsStore((s) => s.theme);

  // keep the <html> theme class in sync with the prefs store
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // IndexedDB: import a shared tree (if the URL carries one), load the
  // library, hydrate the last-used tree, and auto-save (debounced) the live
  // tree under its own id on every change.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // A #tree=… link → import as a fresh library entry, then drop the hash.
        const shared = readSharedTree();
        if (shared) {
          shared.id = newId();
          useTreeStore.getState().hydrate(shared);
          setCurrentTreeId(shared.id);
          await saveTree(shared);
          clearShareHash();
        }
        const trees = await useLibraryStore.getState().refresh();
        if (cancelled || useTreeStore.getState().tree) return;
        const currentId = getCurrentTreeId();
        const pick =
          trees.find((t) => t.id === currentId) ??
          [...trees].sort((a, b) => b.createdAt - a.createdAt)[0];
        if (pick) useTreeStore.getState().hydrate(pick);
      } catch (e) {
        // 9.5 — a failed IndexedDB load otherwise leaves a blank canvas with
        // no explanation; tell the user their saved graphs could not load.
        console.error('[idb] load failed:', e);
        useNoticeStore
          .getState()
          .show(
            'error',
            translate(usePrefsStore.getState().lang, 'notice.idbLoadFailed'),
          );
      }
    })();

    let timer: number | undefined;
    const unsubscribe = useTreeStore.subscribe((state) => {
      if (!state.tree) return;
      const tree = state.tree;
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        saveTree(tree).catch((e) => console.error('[idb] save failed:', e));
        setCurrentTreeId(tree.id);
      }, 600);
    });

    // 9.6 — the 600ms autosave debounce loses the last edits if the tab is
    // closed mid-window. Flush a best-effort synchronous save on unload.
    const flushOnUnload = () => {
      const tree = useTreeStore.getState().tree;
      if (!tree) return;
      clearTimeout(timer);
      saveTree(tree).catch((e) => console.error('[idb] unload save failed:', e));
      setCurrentTreeId(tree.id);
    };
    window.addEventListener('beforeunload', flushOnUnload);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe();
      window.removeEventListener('beforeunload', flushOnUnload);
    };
  }, []);

  const handleGenerate = async (topic: string, contextDocument?: string) => {
    const settings = useSettingsStore.getState();
    initTree(
      topic,
      {
        provider,
        generatorModel: model,
        evaluatorModel: model,
        thinkingLevel,
        initialBranches: settings.initialBranches,
        expansionBranches: settings.expansionBranches,
        maxExpansionLayers: settings.maxExpansionLayers,
        maxNodes: settings.maxNodes,
        maxSessionCostUsd: settings.maxSessionCostUsd,
        reportAudience: settings.reportAudience,
      },
      contextDocument,
    );
    const tree = useTreeStore.getState().tree;
    if (!tree) return;
    const rootId = getRootNode(tree)?.id;
    // persist the new tree immediately so it shows in the library list
    setCurrentTreeId(tree.id);
    void saveTree(tree).then(() => useLibraryStore.getState().refresh());
    // 16 — summarise the context document before the first expansion so the
    // brief is available to the expand prompt.
    if (tree.contextDocument) {
      const brief = await summarizeContext(
        tree,
        useSessionStore.getState().apiKey,
      );
      if (brief && useTreeStore.getState().tree?.id === tree.id) {
        useTreeStore.getState().setContextBrief(brief);
      }
    }
    if (rootId && useTreeStore.getState().tree?.id === tree.id) {
      void runExpansion(rootId);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      <TopBar
        onGenerate={handleGenerate}
        onOpenReport={() => setReportModalOpen(true)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        busy={pendingNodeIds.length > 0}
        reportDisabled={!hasTree}
      />
      <main className="flex min-h-0 flex-1">
        <LeftPanel />
        <div className="min-w-0 flex-1">
          {hasTree ? (
            <ReactFlowProvider>
              <ThoughtCanvas />
            </ReactFlowProvider>
          ) : (
            <EmptyState onGenerate={handleGenerate} />
          )}
        </div>
        <RightPanel />
      </main>
      <EmbeddingStatus />
      <ExpansionErrorToast />
      <NoticeToast />
      <InsightsPanel />
      <ReportPanel />
      {reportModalOpen && (
        <ReportConfigModal onClose={() => setReportModalOpen(false)} />
      )}
      {settingsModalOpen && (
        <SettingsModal onClose={() => setSettingsModalOpen(false)} />
      )}
    </div>
  );
}
