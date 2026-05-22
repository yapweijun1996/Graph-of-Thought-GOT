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
import { collapsedHiddenIds, useTreeStore } from '@/lib/store/treeStore';
import { usePrefsStore } from '@/lib/store/prefsStore';
import { useReportStore } from '@/lib/store/reportStore';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { runExpansion } from '@/lib/agent/expand';
import { useT } from '@/lib/i18n';
import { layoutTree, type NodePosition } from '@/lib/layout/dagre';
import ThoughtNodeView, {
  type ThoughtFlowNode,
  type ThoughtNodeData,
} from './ThoughtNode';
import EdgeTooltip from './EdgeTooltip';

const nodeTypes = { thought: ThoughtNodeView };

const DIM_OPACITY = 0.08;

function deriveFlowEdges(
  tree: ThoughtTree,
  keyInsights: Set<string>,
  showConvergence: boolean,
  hoveredEdgeId: string | null,
  highlightedLayer: number | null,
  hidden: Set<string>,
): Edge[] {
  const out: Edge[] = [];
  for (const e of tree.edges) {
    // a collapsed subtree hides its edges too (14.7.2)
    if (hidden.has(e.source) || hidden.has(e.target)) continue;
    const srcLayer = tree.nodes[e.source]?.layer ?? -1;
    const tgtLayer = tree.nodes[e.target]?.layer ?? -1;
    // 14.5.3 / 14.6.3 — dim every edge except the hovered one, and dim edges
    // whose endpoints both sit outside the highlighted layer.
    const dimByHover = hoveredEdgeId !== null && e.id !== hoveredEdgeId;
    const dimByLayer =
      highlightedLayer !== null &&
      srcLayer !== highlightedLayer &&
      tgtLayer !== highlightedLayer;
    const dimmed = dimByHover || dimByLayer;

    if (e.type !== 'convergence') {
      out.push({
        id: e.id,
        source: e.source,
        target: e.target,
        style: dimmed ? { opacity: DIM_OPACITY } : undefined,
      });
      continue;
    }
    // 14.4.2 — convergence edges can be toggled off to cut the "hairball".
    if (!showConvergence) continue;
    // A convergence edge touching a KEY INSIGHT node is drawn orange + bold
    // (Phase 5.4.3); other convergence edges are blue (14.2.1), thinner
    // (14.2.3), and fade with weaker similarity (14.2.2).
    const isKey = keyInsights.has(e.source) || keyInsights.has(e.target);
    const similarity = e.similarity ?? 0.6;
    const opacity = dimmed ? DIM_OPACITY : 0.35 + similarity * 0.55;
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
  const hoveredEdgeId = useCanvasStore((s) => s.hoveredEdgeId);
  const highlightedLayer = useCanvasStore((s) => s.highlightedLayer);
  const setHoveredEdge = useCanvasStore((s) => s.setHoveredEdge);
  const t = useT();
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<ThoughtFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Tracks positions for each node id. Set once from dagre on first appearance,
  // then updated by user drags. Never overwritten by subsequent dagre runs.
  const settledPositions = useRef<Map<string, NodePosition>>(new Map());
  // Detects when the user starts a brand-new tree (re-generate / hydrate).
  const prevCreatedAt = useRef<number | null>(null);

  // Node effect — tree-driven only. Transient view state (hover / layer
  // filter) never rebuilds nodes; ThoughtNode reads canvasStore itself.
  useEffect(() => {
    if (!tree) {
      setNodes([]);
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
    // changed (a score/status update adds no node ids).
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

    // 14.7.2 — descendants of a collapsed node are hidden from the canvas.
    const hidden = collapsedHiddenIds(tree);
    setNodes(
      Object.values(tree.nodes)
        .filter((node) => !hidden.has(node.id))
        .map((node) => ({
          id: node.id,
          type: 'thought' as const,
          position: settledPositions.current.get(node.id) ?? { x: 0, y: 0 },
          data: { node },
        })),
    );

    if (!hasNewNodes) return;
    const raf = requestAnimationFrame(() => {
      void fitView({ duration: 300, maxZoom: 1.2 });
    });
    return () => cancelAnimationFrame(raf);
  }, [tree, setNodes, fitView]);

  // Edge effect — also re-runs on transient view state (hover, layer filter)
  // so edge dimming stays live without touching the (heavier) node effect.
  useEffect(() => {
    if (!tree) {
      setEdges([]);
      return;
    }
    setEdges(
      deriveFlowEdges(
        tree,
        new Set(keyInsightIds),
        showConvergenceEdges,
        hoveredEdgeId,
        highlightedLayer,
        collapsedHiddenIds(tree),
      ),
    );
  }, [
    tree,
    keyInsightIds,
    showConvergenceEdges,
    hoveredEdgeId,
    highlightedLayer,
    setEdges,
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
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => selectNode(node.id)}
        onNodeDoubleClick={(_, node) => void runExpansion(node.id)}
        onNodeDragStop={onNodeDragStop}
        onEdgeMouseEnter={(_, edge) => setHoveredEdge(edge.id)}
        onEdgeMouseLeave={() => setHoveredEdge(null)}
        colorMode={theme}
        fitView
        minZoom={0.2}
      >
        <Background />
        <Controls />
        {/* 14.3 — minimap for navigation; hidden on narrow screens. */}
        <MiniMap
          className="hidden md:block"
          position="bottom-right"
          pannable
          zoomable
          nodeColor={minimapNodeColor}
        />
      </ReactFlow>
      {/* 14.5.2 — convergence edge hover tooltip. */}
      <EdgeTooltip />
    </div>
  );
}
