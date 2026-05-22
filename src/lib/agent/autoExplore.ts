import {
  DEFAULT_TOT_CONFIG,
  getChildren,
  isInFocusSubtree,
  useTreeStore,
} from '@/lib/store/treeStore';
import { useAutoExploreStore } from '@/lib/store/autoExploreStore';
import { runExpansion } from '@/lib/agent/expand';

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
// the loop only deepens the strongest branches.
function pruneLowScoringChildren(parentId: string): void {
  const store = useTreeStore.getState();
  const tree = store.tree;
  if (!tree) return;
  const pendingChildren = getChildren(tree, parentId).filter(
    (c) => c.status === 'pending',
  );
  if (pendingChildren.length <= AGENTIC_KEEP_TOP) return;
  const ranked = [...pendingChildren].sort((a, b) => b.score - a.score);
  for (const loser of ranked.slice(AGENTIC_KEEP_TOP)) {
    store.pruneNode(loser.id);
  }
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
  try {
    while (useAutoExploreStore.getState().running) {
      if (budgetReached()) break;
      const targetId = nextExpandable();
      if (!targetId) break; // nothing left within depth / focus
      const agentic = useAutoExploreStore.getState().agentic;
      await runExpansion(targetId, { awaitEval: agentic });
      if (agentic) pruneLowScoringChildren(targetId);
    }
  } finally {
    useAutoExploreStore.getState().stop();
  }
}
