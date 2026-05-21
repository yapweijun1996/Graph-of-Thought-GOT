import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import TopBar from '@/components/panels/TopBar';
import LeftPanel from '@/components/panels/LeftPanel';
import RightPanel from '@/components/panels/RightPanel';
import ReportPanel from '@/components/panels/ReportPanel';
import ReportConfigModal from '@/components/panels/ReportConfigModal';
import SettingsModal from '@/components/panels/SettingsModal';
import ThoughtCanvas from '@/components/canvas/ThoughtCanvas';
import EmbeddingStatus from '@/components/EmbeddingStatus';
import { getRootNode, useTreeStore } from '@/lib/store/treeStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { usePrefsStore } from '@/lib/store/prefsStore';
import { runExpansion } from '@/lib/agent/expand';
import { loadTree, saveTree } from '@/lib/db/indexeddb';

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

  // IndexedDB: hydrate the saved tree on mount; auto-save (debounced) on change
  useEffect(() => {
    let cancelled = false;
    loadTree()
      .then((saved) => {
        if (!cancelled && saved && !useTreeStore.getState().tree) {
          useTreeStore.getState().hydrate(saved);
        }
      })
      .catch((e) => console.error('[idb] load failed:', e));

    let timer: number | undefined;
    const unsubscribe = useTreeStore.subscribe((state) => {
      if (!state.tree) return;
      const tree = state.tree;
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        saveTree(tree).catch((e) => console.error('[idb] save failed:', e));
      }, 600);
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const handleGenerate = (topic: string) => {
    const settings = useSettingsStore.getState();
    initTree(topic, {
      provider,
      generatorModel: model,
      evaluatorModel: model,
      thinkingLevel,
      initialBranches: settings.initialBranches,
      expansionBranches: settings.expansionBranches,
      maxExpansionLayers: settings.maxExpansionLayers,
      reportAudience: settings.reportAudience,
    });
    const tree = useTreeStore.getState().tree;
    const root = tree ? getRootNode(tree) : undefined;
    if (root) void runExpansion(root.id);
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
          <ReactFlowProvider>
            <ThoughtCanvas />
          </ReactFlowProvider>
        </div>
        <RightPanel />
      </main>
      <EmbeddingStatus />
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
