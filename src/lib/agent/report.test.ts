import { describe, it, expect } from 'vitest';
import {
  findKeyInsightIds,
  buildClosedLoops,
  compactTree,
  recommendedPath,
  extractNextSteps,
} from './report';
import { DEFAULT_TOT_CONFIG } from '@/lib/store/treeStore';
import type {
  ReportConfig,
  ThoughtEdge,
  ThoughtNode,
  ThoughtTree,
} from '@/types/tree';

function node(id: string, patch: Partial<ThoughtNode> = {}): ThoughtNode {
  return {
    id,
    parentIds: [],
    layer: 1,
    thought: `thought ${id}`,
    rationale: `rationale ${id}`,
    score: 0,
    embedding: [],
    status: 'expanded',
    metadata: { generatedAt: 0, model: 'test', tokenCost: 0 },
    ...patch,
  };
}

function tree(nodes: ThoughtNode[], edges: ThoughtEdge[]): ThoughtTree {
  return {
    id: 't1',
    rootTopic: 'root',
    config: DEFAULT_TOT_CONFIG,
    nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
    edges,
    createdAt: 0,
  };
}

function convEdge(source: string, target: string): ThoughtEdge {
  return { id: `${source}-${target}`, source, target, type: 'convergence' };
}

function treeEdge(source: string, target: string): ThoughtEdge {
  return { id: `${source}-${target}`, source, target, type: 'tree' };
}

describe('findKeyInsightIds', () => {
  it('returns [] when there are no scored nodes', () => {
    const t = tree([node('root', { layer: 0 }), node('a')], []);
    expect(findKeyInsightIds(t)).toEqual([]);
  });

  it('requires at least 2 convergence edges', () => {
    // High score but only one convergence edge → not a key insight.
    const t = tree(
      [node('a', { score: 9 }), node('b', { score: 9 })],
      [convEdge('a', 'b')],
    );
    expect(findKeyInsightIds(t)).toEqual([]);
  });

  it('flags a top-percentile node that meets >= 2 convergence edges', () => {
    const t = tree(
      [
        node('a', { score: 9 }),
        node('b', { score: 8 }),
        node('c', { score: 3 }),
      ],
      [convEdge('a', 'b'), convEdge('a', 'c')],
    );
    expect(findKeyInsightIds(t)).toContain('a');
  });

  it('never flags a node below the score floor', () => {
    const t = tree(
      [
        node('a', { score: 2 }),
        node('b', { score: 2 }),
        node('c', { score: 2 }),
      ],
      [convEdge('a', 'b'), convEdge('a', 'c')],
    );
    // All scores equal and below the floor of 5 → no key insight.
    expect(findKeyInsightIds(t)).toEqual([]);
  });
});

describe('buildClosedLoops', () => {
  it('builds one loop per convergence edge', () => {
    const t = tree(
      [node('a'), node('b')],
      [
        { ...convEdge('a', 'b'), verdict: 'convergence', explanation: 'why' },
        { id: 'tree-edge', source: 'a', target: 'b', type: 'tree' },
      ],
    );
    const loops = buildClosedLoops(t);
    expect(loops).toHaveLength(1);
    expect(loops[0].verdict).toBe('convergence');
  });

  it('skips convergence edges whose endpoints are missing', () => {
    const t = tree([node('a')], [convEdge('a', 'ghost')]);
    expect(buildClosedLoops(t)).toHaveLength(0);
  });

  it('defaults the verdict to "convergence" when unset', () => {
    const t = tree([node('a'), node('b')], [convEdge('a', 'b')]);
    expect(buildClosedLoops(t)[0].verdict).toBe('convergence');
  });
});

describe('compactTree', () => {
  const cfg: ReportConfig = {
    audience: 'engineer',
    minScore: 0,
    includeConvergence: true,
    includePruned: false,
    language: 'en',
  };

  it('always keeps the root regardless of minScore', () => {
    const t = tree(
      [node('root', { layer: 0, score: 0 }), node('a', { score: 1 })],
      [],
    );
    const compact = compactTree(t, { ...cfg, minScore: 5 });
    expect(compact.nodes.some((n) => n.id === 'root')).toBe(true);
  });

  it('drops non-root nodes below minScore', () => {
    const t = tree(
      [node('root', { layer: 0 }), node('a', { score: 2 }), node('b', { score: 8 })],
      [],
    );
    const compact = compactTree(t, { ...cfg, minScore: 5 });
    expect(compact.nodes.some((n) => n.id === 'a')).toBe(false);
    expect(compact.nodes.some((n) => n.id === 'b')).toBe(true);
  });

  it('keeps unscored (score 0) non-root nodes regardless of minScore (B21)', () => {
    const t = tree(
      [
        node('root', { layer: 0 }),
        node('a', { score: 0 }), // not yet evaluated — must be kept
        node('b', { score: 2 }), // genuinely low — dropped
      ],
      [],
    );
    const compact = compactTree(t, { ...cfg, minScore: 5 });
    expect(compact.nodes.some((n) => n.id === 'a')).toBe(true);
    expect(compact.nodes.some((n) => n.id === 'b')).toBe(false);
  });

  it('excludes pruned nodes unless includePruned is set', () => {
    const t = tree(
      [node('root', { layer: 0 }), node('a', { status: 'pruned', score: 9 })],
      [],
    );
    expect(compactTree(t, cfg).nodes.some((n) => n.id === 'a')).toBe(false);
    expect(
      compactTree(t, { ...cfg, includePruned: true }).nodes.some(
        (n) => n.id === 'a',
      ),
    ).toBe(true);
  });
});

describe('recommendedPath (19.4)', () => {
  it('follows the highest-scoring child at each layer', () => {
    const t = tree(
      [
        node('root', { layer: 0 }),
        node('a', { layer: 1, parentIds: ['root'], score: 4 }),
        node('b', { layer: 1, parentIds: ['root'], score: 9 }),
        node('b1', { layer: 2, parentIds: ['b'], score: 6 }),
        node('b2', { layer: 2, parentIds: ['b'], score: 2 }),
      ],
      [
        treeEdge('root', 'a'),
        treeEdge('root', 'b'),
        treeEdge('b', 'b1'),
        treeEdge('b', 'b2'),
      ],
    );
    expect(recommendedPath(t).map((n) => n.id)).toEqual(['root', 'b', 'b1']);
  });

  it('skips pruned children', () => {
    const t = tree(
      [
        node('root', { layer: 0 }),
        node('a', { layer: 1, parentIds: ['root'], score: 9, status: 'pruned' }),
        node('b', { layer: 1, parentIds: ['root'], score: 5 }),
      ],
      [treeEdge('root', 'a'), treeEdge('root', 'b')],
    );
    expect(recommendedPath(t).map((n) => n.id)).toEqual(['root', 'b']);
  });
});

describe('extractNextSteps (19.6)', () => {
  it('pulls the body of a "Next Steps" section', () => {
    const md =
      '# Report\n\nIntro.\n\n## Next Steps\n\n- Do A\n- Do B\n\n## Risks\n\nstuff';
    expect(extractNextSteps(md)).toBe('- Do A\n- Do B');
  });

  it('returns null when no such section exists', () => {
    expect(extractNextSteps('# Report\n\nJust prose.')).toBe(null);
  });
});
