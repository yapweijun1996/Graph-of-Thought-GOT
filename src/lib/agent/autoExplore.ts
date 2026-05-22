import {
  DEFAULT_TOT_CONFIG,
  getChildren,
  isInFocusSubtree,
  useTreeStore,
} from '@/lib/store/treeStore';
import { useAutoExploreStore } from '@/lib/store/autoExploreStore';
import { useExplorationFeedStore } from '@/lib/store/explorationFeedStore';
import { useInsightsStore } from '@/lib/store/insightsStore';
import { usePrefsStore } from '@/lib/store/prefsStore';
import { translate, type TranslationKey } from '@/lib/i18n';
import { runExpansion } from '@/lib/agent/expand';

// 18.5 — push one translated line into the auto-explore activity feed.
function feed(key: TranslationKey, vars?: Record<string, string>): void {
  useExplorationFeedStore
    .getState()
    .push(translate(usePrefsStore.getState().lang, key, vars));
}

function shortThought(text: string): string {
  return text.length > 64 ? `${text.slice(0, 64)}…` : text;
}

// Auto-explore mode (Phase 8.2): a bounded, sequential loop that keeps
// expanding pending nodes so the graph grows on its own. Two guards make it
// safe to run unattended — the node-count budget (`maxNodes`) and the live
// Stop flag (`autoExploreStore.running`), checked between every expansion.

// 8.2.6 — in agentic mode, each expanded node keeps only its top-scoring
// children; the rest are pruned. This focuses token spend on the branches the
// evaluator rates highest (an OODA loop on the graph).
const AGENTIC_KEEP_TOP = 2;

// Picks the next pending node to expand: shallow-first, honouring the depth
// limit and any focus branches — the same target rule as expandAllPending.
function nextExpandable(): string | null {
  const tree = useTreeStore.getState().tree;
  if (!tree) return null;
  const focusBranches = tree.config.focusBranches ?? [];
  const target = Object.values(tree.nodes)
    .filter(
      (n) =>
        n.status === 'pending' &&
        n.layer < tree.config.maxExpansionLayers &&
        isInFocusSubtree(tree, n.id, focusBranches),
    )
    .sort((a, b) => a.layer - b.layer)[0];
  return target?.id ?? null;
}

// After an expansion + evaluation, prune all but the top-scoring children so
// the loop only deepens the strongest branches. Returns the prune count.
function pruneLowScoringChildren(parentId: string): number {
  const store = useTreeStore.getState();
  const tree = store.tree;
  if (!tree) return 0;
  const pendingChildren = getChildren(tree, parentId).filter(
    (c) => c.status === 'pending',
  );
  if (pendingChildren.length <= AGENTIC_KEEP_TOP) return 0;
  const ranked = [...pendingChildren].sort((a, b) => b.score - a.score);
  const losers = ranked.slice(AGENTIC_KEEP_TOP);
  for (const loser of losers) store.pruneNode(loser.id);
  return losers.length;
}

// True when the live tree has hit its node-count budget.
function budgetReached(): boolean {
  const tree = useTreeStore.getState().tree;
  if (!tree) return true;
  const cap = tree.config.maxNodes ?? DEFAULT_TOT_CONFIG.maxNodes;
  return Object.keys(tree.nodes).length >= cap;
}

// Runs the auto-explore loop to completion (or until Stop / budget / depth).
// Re-entrant-safe: a second call while already running is a no-op.
export async function runAutoExplore(): Promise<void> {
  const ae = useAutoExploreStore.getState();
  if (ae.running) return;
  if (!useTreeStore.getState().tree) return;
  ae.start();
  useExplorationFeedStore.getState().clear();
  feed('feed.started');
  try {
    while (useAutoExploreStore.getState().running) {
      if (budgetReached()) break;
      const targetId = nextExpandable();
      if (!targetId) break; // nothing left within depth / focus
      const target = useTreeStore.getState().tree?.nodes[targetId];
      feed('feed.expanding', {
        thought: shortThought(target?.thought ?? ''),
      });
      const agentic = useAutoExploreStore.getState().agentic;
      await runExpansion(targetId, { awaitEval: agentic });
      const live = useTreeStore.getState().tree;
      const added = live ? getChildren(live, targetId).length : 0;
      if (added > 0) feed('feed.added', { n: String(added) });
      if (agentic) {
        const pruned = pruneLowScoringChildren(targetId);
        if (pruned > 0) feed('feed.pruned', { n: String(pruned) });
      }
    }
  } finally {
    useAutoExploreStore.getState().stop();
    const total = Object.keys(useTreeStore.getState().tree?.nodes ?? {}).length;
    feed('feed.finished', { total: String(total) });
    // 19.3 — the loop ends in an *outcome*, not just a bigger graph: surface
    // the answer-first synthesis once exploration settles.
    useInsightsStore.getState().open();
  }
}
