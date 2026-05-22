import type { ThoughtTree } from '@/types/tree';

// Session cost estimation (Phase 17.1 / 17.3). The app tracks total tokens per
// node (expand + evaluate spend). $ is a deliberately rough, slightly
// conservative estimate — a safety rail, not a billing figure. Gemini
// flash-lite is ~$0.25/1M in + $1.50/1M out; $1.00/1M blended over-estimates
// a little, which is the safe direction for a hard cap.
export const USD_PER_1K_TOKENS = 0.001;

export function estimateUsd(tokens: number): number {
  return (tokens / 1000) * USD_PER_1K_TOKENS;
}

// Total tokens accumulated on a tree (sum of every node's running tokenCost).
export function treeTokens(tree: ThoughtTree): number {
  let total = 0;
  for (const n of Object.values(tree.nodes)) total += n.metadata.tokenCost;
  return total;
}

// Estimated USD spent on a tree so far.
export function treeCostUsd(tree: ThoughtTree): number {
  return estimateUsd(treeTokens(tree));
}

// Formats a USD estimate for display — 3 decimals so sub-cent spend is visible.
export function formatUsd(usd: number): string {
  return `$${usd.toFixed(3)}`;
}
