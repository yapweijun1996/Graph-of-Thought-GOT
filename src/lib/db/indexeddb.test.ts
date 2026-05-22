import { describe, it, expect } from 'vitest';
import { mapEmbeddings } from './indexeddb';
import { DEFAULT_TOT_CONFIG } from '@/lib/store/treeStore';
import type { ThoughtNode, ThoughtTree } from '@/types/tree';

function treeWith(embedding: number[]): ThoughtTree {
  const n: ThoughtNode = {
    id: 'a',
    parentIds: [],
    layer: 1,
    thought: 't',
    rationale: 'r',
    score: 5,
    embedding,
    status: 'expanded',
    metadata: { generatedAt: 0, model: 'm', tokenCost: 3 },
  };
  return {
    id: 't1',
    rootTopic: 'root',
    config: DEFAULT_TOT_CONFIG,
    nodes: { a: n },
    edges: [],
    createdAt: 0,
  };
}

describe('mapEmbeddings', () => {
  it('round-trips number[] → Float32Array → number[] (B6 guard)', () => {
    const original = [0.1, 0.2, 0.3];
    const stored = mapEmbeddings(treeWith(original), (e) =>
      Float32Array.from(e),
    );
    expect(stored.nodes.a.embedding).toBeInstanceOf(Float32Array);

    const loaded = mapEmbeddings(stored, (e) => Array.from(e));
    expect(Array.isArray(loaded.nodes.a.embedding)).toBe(true);
    // Float32 rounding — compare with tolerance.
    loaded.nodes.a.embedding.forEach((v, i) => {
      expect(v).toBeCloseTo(original[i], 5);
    });
  });

  it('handles an empty embedding', () => {
    const stored = mapEmbeddings(treeWith([]), (e) => Float32Array.from(e));
    expect(stored.nodes.a.embedding).toHaveLength(0);
  });

  it('preserves all non-embedding node fields', () => {
    const stored = mapEmbeddings(treeWith([1]), (e) => Array.from(e));
    expect(stored.nodes.a.score).toBe(5);
    expect(stored.nodes.a.metadata.tokenCost).toBe(3);
    expect(stored.rootTopic).toBe('root');
  });
});
