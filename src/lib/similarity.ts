import { cosineSimilarity } from '@/lib/embedder';
import type { ThoughtNode } from '@/types/tree';

export interface ConvergenceCandidate {
  nodeId: string;
  similarity: number;
}

// 11.1 — cap on candidates returned per node. Convergence scans every node
// against every other (O(n²)); on a large graph one node can clear the
// threshold against hundreds of others. The verdict pass already caps LLM
// calls, but this keeps the candidate array (and its sort) bounded too.
const MAX_CANDIDATES = 200;

// Two nodes are siblings when they share an immediate parent. Siblings come
// from one expansion and are meant to be distinct — never a convergence.
function isSibling(a: ThoughtNode, b: ThoughtNode): boolean {
  const pa = a.parentIds[0];
  const pb = b.parentIds[0];
  return !!pa && pa === pb;
}

// Finds existing nodes whose embedding is close enough to `node` to count as
// a convergence — different reasoning branches arriving at a similar idea
// (DESIGN.md §4.2). Skips: the node itself, its siblings, and any node whose
// embedding has not been populated yet (cosineSimilarity returns 0 for those).
export function findConvergenceCandidates(
  node: ThoughtNode,
  allNodes: ThoughtNode[],
  threshold: number,
): ConvergenceCandidate[] {
  if (node.embedding.length === 0) return [];
  const out: ConvergenceCandidate[] = [];
  for (const other of allNodes) {
    if (other.id === node.id) continue;
    if (isSibling(node, other)) continue;
    const similarity = cosineSimilarity(node.embedding, other.embedding);
    if (similarity > threshold) {
      out.push({ nodeId: other.id, similarity });
    }
  }
  // Keep only the strongest candidates when a node is unusually well-connected.
  if (out.length > MAX_CANDIDATES) {
    out.sort((a, b) => b.similarity - a.similarity);
    return out.slice(0, MAX_CANDIDATES);
  }
  return out;
}
