import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
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
import ThoughtNodeView, { type ThoughtFlowNode } from './ThoughtNode';

const nodeTypes = { thought: ThoughtNodeView };

function deriveFlowEdges(tree: ThoughtTree, keyInsights: Set<string>): Edge[] {
  return tree.edges.map((e) => {
    if (e.type !== 'convergence') {
      return { id: e.id, source: e.source, target: e.target };
    }
    // A convergence edge touching a KEY INSIGHT node is drawn orange + bold
    // (Phase 5.4.3); other convergence edges stay dashed teal.
    const isKey = keyInsights.has(e.source) || keyInsights.has(e.target);
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      animated: true,
      style: isKey
        ? { strokeDasharray: '6 4', stroke: '#ea580c', strokeWidth: 2.5 }
        : { strokeDasharray: '6 4', stroke: '#0f766e' },
    };
  });
}

export default function ThoughtCanvas() {
  const tree = useTreeStore((s) => s.tree);
  const selectNode = useTreeStore((s) => s.selectNode);
  const theme = usePrefsStore((s) => s.theme);
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

    const dagrePositions = layoutTree(tree);
    let hasNewNodes = false;

    for (const id of Object.keys(dagrePositions)) {
      if (!settledPositions.current.has(id)) {
        settledPositions.current.set(id, dagrePositions[id]);
        hasNewNodes = true;
      }
    }

    setNodes(
      Object.values(tree.nodes).map((node) => ({
        id: node.id,
        type: 'thought' as const,
        position:
          settledPositions.current.get(node.id) ??
          dagrePositions[node.id] ?? { x: 0, y: 0 },
        data: { node },
      })),
    );
    setEdges(deriveFlowEdges(tree, new Set(keyInsightIds)));

    // fitView only when new nodes arrive, not on every tree mutation.
    if (!hasNewNodes) return;
    const raf = requestAnimationFrame(() => {
      void fitView({ duration: 300, maxZoom: 1.2 });
    });
    return () => cancelAnimationFrame(raf);
  }, [tree, keyInsightIds, setNodes, setEdges, fitView]);

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
    </ReactFlow>
  );
}
