import { findConvergenceCandidates } from '@/lib/similarity';
import { newId, useTreeStore } from '@/lib/store/treeStore';
import type { ThoughtEdge } from '@/types/tree';

// Order-independent key for a node pair — convergence is undirected, so
// A↔B and B↔A are the same edge.
function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// Scans freshly created nodes against the rest of the tree and draws a
// convergence edge wherever two nodes from different branches are
// semantically close (DESIGN.md §4.2). Threshold-only: the LLM signal/noise
// verdict (DESIGN.md §5.4) is a separate, later refinement.
//
// Must run AFTER embeddings are populated — nodes without an embedding are
// silently skipped by findConvergenceCandidates.
export function detectConvergence(newNodeIds: string[]): void {
  const live = useTreeStore.getState();
  const tree = live.tree;
  if (!tree) return;

  const threshold = tree.config.similarityThreshold.convergence;
  const allNodes = Object.values(tree.nodes);

  // Pairs that already have a convergence edge, so re-runs don't duplicate.
  const seen = new Set<string>();
  for (const edge of tree.edges) {
    if (edge.type === 'convergence') {
      seen.add(pairKey(edge.source, edge.target));
    }
  }

  const edges: ThoughtEdge[] = [];
  for (const nodeId of newNodeIds) {
    const node = tree.nodes[nodeId];
    if (!node) continue;
    for (const candidate of findConvergenceCandidates(
      node,
      allNodes,
      threshold,
    )) {
      const key = pairKey(nodeId, candidate.nodeId);
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({
        id: newId(),
        source: nodeId,
        target: candidate.nodeId,
        type: 'convergence',
        similarity: candidate.similarity,
      });
    }
  }

  if (edges.length > 0) live.addEdges(edges);
}
