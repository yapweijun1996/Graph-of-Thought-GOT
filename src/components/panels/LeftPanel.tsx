import { useState } from 'react';
import {
  DEFAULT_TOT_CONFIG,
  isInFocusSubtree,
  useTreeStore,
} from '@/lib/store/treeStore';
import { useLibraryStore } from '@/lib/store/libraryStore';
import { useAutoExploreStore } from '@/lib/store/autoExploreStore';
import { useNoticeStore } from '@/lib/store/noticeStore';
import { usePrefsStore } from '@/lib/store/prefsStore';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { useT, type TranslationKey } from '@/lib/i18n';
import { exportTreeJson, exportTreeMarkdown } from '@/lib/export';
import { buildShareUrl } from '@/lib/share';
import { expandAllPending } from '@/lib/agent/expand';
import { runAutoExplore } from '@/lib/agent/autoExplore';
import {
  deleteTree,
  loadTree,
  setCurrentTreeId,
} from '@/lib/db/indexeddb';
import { cn } from '@/lib/utils';
import type { ThoughtTree } from '@/types/tree';

interface TreeStats {
  nodes: number;
  layers: number;
  convergence: number;
  tokens: number;
  pruned: number;
  favorited: number;
  expandable: number;
  focusCount: number;
}

function computeStats(tree: ThoughtTree): TreeStats {
  const nodes = Object.values(tree.nodes);
  const focusBranches = tree.config.focusBranches ?? [];
  let layers = 0;
  let tokens = 0;
  let pruned = 0;
  let favorited = 0;
  let expandable = 0;
  for (const n of nodes) {
    if (n.layer + 1 > layers) layers = n.layer + 1;
    tokens += n.metadata.tokenCost;
    if (n.status === 'pruned') pruned++;
    if (n.status === 'favorited') favorited++;
    // expandable count honours focus mode — it must match what
    // expandAllPending actually expands (7.2.3)
    if (
      n.status === 'pending' &&
      n.layer < tree.config.maxExpansionLayers &&
      isInFocusSubtree(tree, n.id, focusBranches)
    ) {
      expandable++;
    }
  }
  return {
    nodes: nodes.length,
    layers,
    convergence: tree.edges.filter((e) => e.type === 'convergence').length,
    tokens,
    pruned,
    favorited,
    expandable,
    focusCount: focusBranches.length,
  };
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

// Left sidebar — current-graph overview, one-pass expand-all, export, and the
// multi-tree library (switch / delete).
export default function LeftPanel() {
  const t = useT();
  const tree = useTreeStore((s) => s.tree);
  const busy = useTreeStore((s) => s.pendingNodeIds.length > 0);
  const hydrate = useTreeStore((s) => s.hydrate);
  const resetTree = useTreeStore((s) => s.resetTree);
  const clearFocus = useTreeStore((s) => s.clearFocus);
  const summaries = useLibraryStore((s) => s.summaries);
  const refreshLibrary = useLibraryStore((s) => s.refresh);
  const autoRunning = useAutoExploreStore((s) => s.running);
  const agentic = useAutoExploreStore((s) => s.agentic);
  const setAgentic = useAutoExploreStore((s) => s.setAgentic);
  const hint = useAutoExploreStore((s) => s.hint);
  const setHint = useAutoExploreStore((s) => s.setHint);
  const stopAuto = useAutoExploreStore((s) => s.stop);
  const showConvergenceEdges = usePrefsStore((s) => s.showConvergenceEdges);
  const toggleConvergenceEdges = usePrefsStore(
    (s) => s.toggleConvergenceEdges,
  );
  const highlightedLayer = useCanvasStore((s) => s.highlightedLayer);
  const toggleHighlightedLayer = useCanvasStore(
    (s) => s.toggleHighlightedLayer,
  );
  const focusBranchId = useCanvasStore((s) => s.focusBranchId);
  const setFocusBranch = useCanvasStore((s) => s.setFocusBranch);
  const [copied, setCopied] = useState(false);
  const [expandingAll, setExpandingAll] = useState(false);

  const stats = tree ? computeStats(tree) : null;
  const rows: { key: TranslationKey; value: string }[] = stats
    ? [
        { key: 'left.nodes', value: String(stats.nodes) },
        { key: 'left.layers', value: String(stats.layers) },
        { key: 'left.convergence', value: String(stats.convergence) },
        { key: 'left.tokens', value: stats.tokens.toLocaleString() },
        { key: 'left.prunedCount', value: String(stats.pruned) },
        { key: 'left.favoritedCount', value: String(stats.favorited) },
      ]
    : [];

  // 11.7 — switching / deleting trees is blocked while ANY expansion is in
  // flight, including the gaps between auto-explore passes: runExpansion
  // writes its result into whatever tree is live when its await resolves, so
  // swapping the tree mid-flight would land children in the wrong graph.
  // (runExpansion's B17 guard then drops the stale write as a second line of
  // defence.)
  const locked = busy || autoRunning;
  const switchTree = async (id: string) => {
    if (locked || id === tree?.id) return;
    const loaded = await loadTree(id);
    if (loaded) {
      hydrate(loaded);
      setCurrentTreeId(id);
    }
  };

  const shareTree = async () => {
    if (!tree) return;
    try {
      await navigator.clipboard.writeText(buildShareUrl(tree));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      // 9.4 — clipboard writes fail on insecure origins / denied permission;
      // surface it instead of leaving the button stuck on "Copy link".
      console.error('[share] clipboard write failed:', e);
      useNoticeStore.getState().show('error', t('notice.shareCopyFailed'));
    }
  };

  const removeTree = async (id: string) => {
    if (locked) return;
    if (!window.confirm(t('left.deleteConfirm'))) return;
    await deleteTree(id);
    const trees = await refreshLibrary();
    if (tree?.id === id) {
      const next = [...trees].sort((a, b) => b.createdAt - a.createdAt)[0];
      if (next) {
        hydrate(next);
        setCurrentTreeId(next.id);
      } else {
        resetTree();
        setCurrentTreeId(null);
      }
    }
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r bg-background">
      <div className="border-b px-4 py-2.5">
        <h2 className="text-sm font-semibold">{t('left.title')}</h2>
      </div>

      {!tree || !stats ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
          {t('left.noTree')}
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-4 py-4">
          <section>
            <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('left.topic')}
            </h3>
            <p className="text-sm font-medium leading-snug text-foreground">
              {tree.rootTopic}
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            {rows.map((r) => (
              <StatRow key={r.key} label={t(r.key)} value={r.value} />
            ))}
          </section>

          {stats.focusCount > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-blue-500 bg-blue-50 px-2.5 py-1.5 text-[11px] dark:bg-blue-950/40">
              <span className="font-medium text-blue-700 dark:text-blue-300">
                {t('left.focusActive')} ({stats.focusCount})
              </span>
              <button
                className="shrink-0 rounded border border-blue-500 px-1.5 py-0.5 font-medium text-blue-700 transition hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/40"
                onClick={() => clearFocus()}
              >
                {t('left.clearFocus')}
              </button>
            </div>
          )}

          {stats.expandable > 0 && !autoRunning && (
            <button
              className="h-8 rounded-md border text-sm font-medium transition hover:bg-accent disabled:opacity-40"
              disabled={busy || expandingAll}
              onClick={async () => {
                // 10.1.4 — hold the button disabled for the whole pass;
                // `busy` alone flickers false between sequential expansions.
                setExpandingAll(true);
                try {
                  await expandAllPending();
                } finally {
                  setExpandingAll(false);
                }
              }}
            >
              {expandingAll
                ? t('left.expandingAll')
                : `${t('left.expandAll')} (${stats.expandable})`}
            </button>
          )}

          {/* Auto-explore (8.2) — bounded, stoppable self-expansion loop. */}
          <section className="flex flex-col gap-2 rounded-md border p-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('left.autoExplore')}
              </h3>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {t('left.autoExploreBudget', {
                  n: String(stats.nodes),
                  max: String(
                    tree.config.maxNodes ?? DEFAULT_TOT_CONFIG.maxNodes,
                  ),
                })}
              </span>
            </div>
            <input
              className="h-8 rounded-md border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder={t('left.autoExploreHint')}
              value={hint}
              onChange={(e) => setHint(e.target.value)}
            />
            <label
              className="flex items-center gap-1.5 text-sm"
              title={t('left.autoExploreAgenticHint')}
            >
              <input
                type="checkbox"
                checked={agentic}
                onChange={(e) => setAgentic(e.target.checked)}
              />
              {t('left.autoExploreAgentic')}
            </label>
            {autoRunning ? (
              <button
                className="h-8 rounded-md border border-red-500 bg-red-50 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/40"
                onClick={() => stopAuto()}
              >
                {t('left.autoExploreStop')}
              </button>
            ) : (
              <button
                className="h-8 rounded-md border text-sm font-medium transition hover:bg-accent disabled:opacity-40"
                disabled={busy}
                onClick={() => void runAutoExplore()}
              >
                {t('left.autoExplore')}
              </button>
            )}
          </section>

          {/* 14.9.3 — branch-isolation banner with an exit button. */}
          {focusBranchId && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-blue-500 bg-blue-50 px-2.5 py-1.5 text-[11px] dark:bg-blue-950/40">
              <span className="font-medium text-blue-700 dark:text-blue-300">
                {t('left.isolateActive')}
              </span>
              <button
                className="shrink-0 rounded border border-blue-500 px-1.5 py-0.5 font-medium text-blue-700 transition hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/40"
                onClick={() => setFocusBranch(null)}
              >
                {t('panel.exitFocus')}
              </button>
            </div>
          )}

          {/* 14.6.1 — layer filter chips; clicking one isolates that layer. */}
          {stats.layers > 1 && (
            <section>
              <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('left.layerFilter')}
              </h3>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: stats.layers }, (_, i) => (
                  <button
                    key={i}
                    className={cn(
                      'rounded border px-2 py-0.5 text-xs font-medium transition',
                      highlightedLayer === i
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'hover:bg-accent',
                    )}
                    aria-pressed={highlightedLayer === i}
                    onClick={() => toggleHighlightedLayer(i)}
                  >
                    L{i}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 14.4.3 — convergence edge visibility toggle with live count. */}
          {stats.convergence > 0 && (
            <button
              className="flex h-8 items-center justify-between rounded-md border px-2.5 text-sm font-medium transition hover:bg-accent"
              onClick={() => toggleConvergenceEdges()}
              aria-pressed={showConvergenceEdges}
            >
              <span>
                {t('left.convergence')} ({stats.convergence})
              </span>
              <span aria-hidden>{showConvergenceEdges ? '✓' : '○'}</span>
            </button>
          )}

          <section>
            <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('left.export')}
            </h3>
            <div className="flex gap-2">
              <button
                className="h-8 flex-1 rounded-md border text-sm font-medium transition hover:bg-accent"
                onClick={() => exportTreeJson(tree)}
              >
                {t('left.exportJson')}
              </button>
              <button
                className="h-8 flex-1 rounded-md border text-sm font-medium transition hover:bg-accent"
                onClick={() => exportTreeMarkdown(tree)}
              >
                {t('left.exportMarkdown')}
              </button>
            </div>
            <button
              className="mt-2 h-8 w-full rounded-md border text-sm font-medium transition hover:bg-accent"
              onClick={() => void shareTree()}
            >
              {copied ? t('left.shareCopied') : t('left.share')}
            </button>
          </section>

          {summaries.length > 0 && (
            <section>
              <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('left.library')}
              </h3>
              <div className="flex flex-col gap-1">
                {summaries.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      'flex items-center gap-1 rounded-md border px-2 py-1.5',
                      s.id === tree.id
                        ? 'border-primary bg-accent'
                        : 'border-border',
                      locked && 'opacity-50',
                    )}
                  >
                    <button
                      className="min-w-0 flex-1 text-left"
                      disabled={locked}
                      onClick={() => void switchTree(s.id)}
                    >
                      <span className="block truncate text-sm font-medium">
                        {s.rootTopic || '—'}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {s.nodeCount} · {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                    <button
                      className="shrink-0 px-1 text-sm text-muted-foreground transition hover:text-red-500 disabled:hover:text-muted-foreground"
                      disabled={locked}
                      onClick={() => void removeTree(s.id)}
                      aria-label={t('left.deleteGraph')}
                      title={t('left.deleteConfirm')}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </aside>
  );
}
