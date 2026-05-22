import dagre from '@dagrejs/dagre';
import type { ThoughtTree } from '@/types/tree';

export const NODE_WIDTH = 248;
export const NODE_HEIGHT = 104;

export interface NodePosition {
  x: number;
  y: number;
}

// Computes top-to-bottom positions for every node in the tree.
// Only tree edges drive the layout; convergence edges are drawn afterwards
// and must not affect positioning (DESIGN.md §7.4).
export function layoutTree(tree: ThoughtTree): Record<string, NodePosition> {
  const g = new dagre.graphlib.Graph();
  // 14.1 — spacing sized for wide trees (9+ nodes/layer): nodesep ~1/3 of the
  // 248px node width, ranksep clears 3-line node text. network-simplex
  // minimises edge crossings vs the default ranker on wide graphs.
  g.setGraph({
    rankdir: 'TB',
    ranksep: 150,
    nodesep: 80,
    ranker: 'network-simplex',
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of Object.values(tree.nodes)) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of tree.edges) {
    if (
      edge.type === 'tree' &&
      tree.nodes[edge.source] &&
      tree.nodes[edge.target]
    ) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  const positions: Record<string, NodePosition> = {};
  for (const node of Object.values(tree.nodes)) {
    const laid = g.node(node.id);
    // dagre returns center coordinates; React Flow wants the top-left corner.
    positions[node.id] = {
      x: laid.x - NODE_WIDTH / 2,
      y: laid.y - NODE_HEIGHT / 2,
    };
  }
  return positions;
}
