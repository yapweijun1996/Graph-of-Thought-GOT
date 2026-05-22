import { describe, it, expect } from 'vitest';
import { estimateUsd, formatUsd, treeTokens, treeCostUsd } from './cost';
import { DEFAULT_TOT_CONFIG } from '@/lib/store/treeStore';
import type { ThoughtNode, ThoughtTree } from '@/types/tree';

function node(id: string, tokenCost: number): ThoughtNode {
  return {
    id,
    parentIds: [],
    layer: 1,
    thought: 't',
    rationale: 'r',
    score: 0,
    embedding: [],
    status: 'expanded',
    metadata: { generatedAt: 0, model: 'm', tokenCost },
  };
}

function tree(nodes: ThoughtNode[]): ThoughtTree {
  return {
    id: 't1',
    rootTopic: 'root',
    config: DEFAULT_TOT_CONFIG,
    nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
    edges: [],
    createdAt: 0,
  };
}

describe('estimateUsd', () => {
  it('returns 0 for 0 tokens', () => {
    expect(estimateUsd(0)).toBe(0);
  });

  it('scales linearly with token count', () => {
    expect(estimateUsd(1000)).toBeCloseTo(estimateUsd(500) * 2, 9);
  });
});

describe('formatUsd', () => {
  it('formats with a leading $ and 3 decimals', () => {
    expect(formatUsd(0)).toBe('$0.000');
    expect(formatUsd(0.0125)).toBe('$0.013');
  });
});

describe('treeTokens / treeCostUsd', () => {
  it('sums every node tokenCost', () => {
    expect(treeTokens(tree([node('a', 100), node('b', 250)]))).toBe(350);
  });

  it('treeCostUsd matches estimateUsd of the token total', () => {
    const t = tree([node('a', 1000), node('b', 1000)]);
    expect(treeCostUsd(t)).toBeCloseTo(estimateUsd(2000), 9);
  });
});
