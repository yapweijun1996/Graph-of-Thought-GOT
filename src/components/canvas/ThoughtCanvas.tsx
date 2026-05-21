import { useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ThoughtTree } from '@/types/tree';
import { useTreeStore } from '@/lib/store/treeStore';
import { usePrefsStore } from '@/lib/store/prefsStore';
import { useT } from '@/lib/i18n';
import { layoutTree } from '@/lib/layout/dagre';
import ThoughtNodeView, { type ThoughtFlowNode } from './ThoughtNode';

const nodeTypes = { thought: ThoughtNodeView };

function deriveFlowNodes(tree: ThoughtTree): ThoughtFlowNode[] {
  const positions = layoutTree(tree);
  return Object.values(tree.nodes).map((node) => ({
    id: node.id,
    type: 'thought',
    position: positions[node.id] ?? { x: 0, y: 0 },
    data: { node },
  }));
}

function deriveFlowEdges(tree: ThoughtTree): Edge[] {
  return tree.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: e.type === 'convergence',
    style:
      e.type === 'convergence'
        ? { strokeDasharray: '6 4', stroke: '#0f766e' }
        : undefined,
  }));
}

export default function ThoughtCanvas() {
  const tree = useTreeStore((s) => s.tree);
  const selectNode = useTreeStore((s) => s.selectNode);
  const theme = usePrefsStore((s) => s.theme);
  const t = useT();
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<ThoughtFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (!tree) {
      setNodes([]);
      setEdges([]);
      return;
    }
    setNodes(deriveFlowNodes(tree));
    setEdges(deriveFlowEdges(tree));
    // re-fit once React Flow has the new nodes (keeps fresh branches in view)
    const raf = requestAnimationFrame(() => {
      void fitView({ duration: 300, maxZoom: 1.2 });
    });
    return () => cancelAnimationFrame(raf);
  }, [tree, setNodes, setEdges, fitView]);

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
      colorMode={theme}
      fitView
      minZoom={0.2}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}
