import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ThoughtTree } from '@/types/tree';
import { useTreeStore } from '@/lib/store/treeStore';
import { usePrefsStore } from '@/lib/store/prefsStore';
import { useReportStore } from '@/lib/store/reportStore';
import { runExpansion } from '@/lib/agent/expand';
import { useT } from '@/lib/i18n';
import { layoutTree, type NodePosition } from '@/lib/layout/dagre';
import ThoughtNodeView, {
  type ThoughtFlowNode,
  type ThoughtNodeData,
} from './ThoughtNode';

const nodeTypes = { thought: ThoughtNodeView };

function deriveFlowEdges(
  tree: ThoughtTree,
  keyInsights: Set<string>,
  showConvergence: boolean,
): Edge[] {
  const out: Edge[] = [];
  for (const e of tree.edges) {
    if (e.type !== 'convergence') {
      out.push({ id: e.id, source: e.source, target: e.target });
      continue;
    }
    // 14.4.2 — convergence edges can be toggled off to cut the "hairball".
    if (!showConvergence) continue;
    // A convergence edge touching a KEY INSIGHT node is drawn orange + bold
    // (Phase 5.4.3); other convergence edges are blue (14.2.1), thinner
    // (14.2.3), and fade with weaker similarity (14.2.2).
    const isKey = keyInsights.has(e.source) || keyInsights.has(e.target);
    const similarity = e.similarity ?? 0.6;
    const opacity = 0.35 + similarity * 0.55;
    // `pathOptions.curvature` (14.2.4) is read at runtime by React Flow's
    // built-in bezier edge; the generic Edge type doesn't surface it, hence
    // the cast.
    out.push({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: true,
      pathOptions: { curvature: 0.2 },
      style: isKey
        ? {
            strokeDasharray: '6 4',
            stroke: '#ea580c',
            strokeWidth: 2.5,
            opacity,
          }
        : {
            strokeDasharray: '6 4',
            stroke: '#2563eb',
            strokeWidth: 1.5,
            opacity,
          },
    } as Edge);
  }
  return out;
}

// 14.3.2 — minimap node colour mirrors the ThoughtNode score buckets.
function minimapNodeColor(node: Node): string {
  const tn = (node.data as ThoughtNodeData).node;
  if (tn.status === 'pruned') return '#9ca3af';
  if (tn.score <= 0) return '#cbd5e1';
  if (tn.score <= 3) return '#f87171';
  if (tn.score <= 6) return '#fbbf24';
  return '#34d399';
}

export default function ThoughtCanvas() {
  const tree = useTreeStore((s) => s.tree);
  const selectNode = useTreeStore((s) => s.selectNode);
  const theme = usePrefsStore((s) => s.theme);
  const showConvergenceEdges = usePrefsStore((s) => s.showConvergenceEdges);
  const keyInsightIds = useReportStore((s) => s.keyInsightIds);
  const t = useT();
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<ThoughtFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Tracks positions for each node id. Set once from dagre on first appearance,
  // then updated by user drags. Never overwritten by subsequent dagre runs.
  const settledPositions = useRef<Map<string, NodePosition>>(new Map());
  // Detects when the user starts a brand-new tree (re-generate / hydrate).
  const prevCreatedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!tree) {
      setNodes([]);
      setEdges([]);
      settledPositions.current.clear();
      prevCreatedAt.current = null;
      return;
    }

    // New tree → discard stale positions so fresh dagre coords are used.
    if (tree.createdAt !== prevCreatedAt.current) {
      settledPositions.current.clear();
      prevCreatedAt.current = tree.createdAt;
    }

    // 11.3 — only recompute the dagre layout when the node set actually
    // changed. A score/status update mutates `tree` but adds no node ids, so
    // skipping the layout (and the fitView below) avoids re-panning the canvas
    // on every metadata tick.
    const hasNewNodes = Object.keys(tree.nodes).some(
      (id) => !settledPositions.current.has(id),
    );
    if (hasNewNodes) {
      const dagrePositions = layoutTree(tree);
      for (const id of Object.keys(dagrePositions)) {
        if (!settledPositions.current.has(id)) {
          settledPositions.current.set(id, dagrePositions[id]);
        }
      }
    }

    setNodes(
      Object.values(tree.nodes).map((node) => ({
        id: node.id,
        type: 'thought' as const,
        position: settledPositions.current.get(node.id) ?? { x: 0, y: 0 },
        data: { node },
      })),
    );
    setEdges(
      deriveFlowEdges(tree, new Set(keyInsightIds), showConvergenceEdges),
    );

    // fitView only when new nodes arrive, not on every tree mutation.
    if (!hasNewNodes) return;
    const raf = requestAnimationFrame(() => {
      void fitView({ duration: 300, maxZoom: 1.2 });
    });
    return () => cancelAnimationFrame(raf);
  }, [
    tree,
    keyInsightIds,
    showConvergenceEdges,
    setNodes,
    setEdges,
    fitView,
  ]);

  // Persist drag-end positions so the next re-render doesn't reset them.
  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    settledPositions.current.set(node.id, node.position);
  }, []);

  if (!tree) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
        {t('canvas.empty')}
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => selectNode(node.id)}
      onNodeDoubleClick={(_, node) => void runExpansion(node.id)}
      onNodeDragStop={onNodeDragStop}
      colorMode={theme}
      fitView
      minZoom={0.2}
    >
      <Background />
      <Controls />
      {/* 14.3 — minimap for navigation; hidden on narrow screens (14.3.3). */}
      <MiniMap
        className="hidden md:block"
        position="bottom-right"
        pannable
        zoomable
        nodeColor={minimapNodeColor}
      />
    </ReactFlow>
  );
}
