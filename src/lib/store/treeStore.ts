import { create } from 'zustand';
import { useSessionStore } from '@/lib/store/sessionStore';
import type {
  NodeStatus,
  ThoughtEdge,
  ThoughtNode,
  ThoughtTree,
  TOTConfig,
} from '@/types/tree';

export const DEFAULT_TOT_CONFIG: TOTConfig = {
  initialBranches: 4,
  expansionBranches: 3,
  maxExpansionLayers: 3,
  maxNodes: 40,
  maxSessionCostUsd: 0.5,
  // 384-dim all-MiniLM-L6-v2: distinct same-topic branches measure ≤0.52
  // cosine, paraphrases ~0.67. 0.60 sits above the noise, below paraphrase.
  // (DESIGN.md's 0.75 was sized for 768-dim text-embedding-004.) The old
  // `merge` threshold (0.92) was dropped — at 384-dim even paraphrases only
  // reach ~0.67, so a 0.92 gate could never fire (8.3.1).
  similarityThreshold: { convergence: 0.6 },
  provider: 'gemini',
  generatorModel: 'gemini-3.1-flash-lite',
  evaluatorModel: 'gemini-3.1-flash-lite',
  thinkingLevel: 'low',
  reportAudience: 'manager',
};

export function newId(): string {
  return crypto.randomUUID();
}

// Order-independent key for a node pair — convergence edges are undirected,
// so A↔B and B↔A are the same edge.
export function convergencePairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// --- pure query helpers (operate on a ThoughtTree snapshot) ---

export function getRootNode(tree: ThoughtTree): ThoughtNode | undefined {
  return Object.values(tree.nodes).find((n) => n.layer === 0);
}

export function getChildren(tree: ThoughtTree, nodeId: string): ThoughtNode[] {
  return tree.edges
    .filter((e) => e.type === 'tree' && e.source === nodeId)
    .map((e) => tree.nodes[e.target])
    .filter((n): n is ThoughtNode => Boolean(n));
}

// root → node breadcrumb, used to build expand/evaluate prompts (DESIGN.md §5)
export function getNodePath(tree: ThoughtTree, nodeId: string): ThoughtNode[] {
  const path: ThoughtNode[] = [];
  const seen = new Set<string>();
  let current = tree.nodes[nodeId] as ThoughtNode | undefined;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    const parentId = current.parentIds[0];
    current = parentId ? tree.nodes[parentId] : undefined;
  }
  return path;
}

// 7.2.3 — true when nodeId is itself focused or lies inside a focused subtree.
// With no focus branches set, everything is "in focus" so callers treat focus
// mode as off and expand the whole graph.
export function isInFocusSubtree(
  tree: ThoughtTree,
  nodeId: string,
  focusBranches: string[],
): boolean {
  if (focusBranches.length === 0) return true;
  const focusSet = new Set(focusBranches);
  return getNodePath(tree, nodeId).some((n) => focusSet.has(n.id));
}

// 14.7.2 — ids of nodes hidden because a tree-ancestor is collapsed. The
// collapsed node itself stays visible; only its descendants are hidden.
export function collapsedHiddenIds(tree: ThoughtTree): Set<string> {
  const hidden = new Set<string>();
  for (const n of Object.values(tree.nodes)) {
    if (!n.collapsed) continue;
    for (const id of collectTreeSubtree(tree, n.id)) {
      if (id !== n.id) hidden.add(id);
    }
  }
  return hidden;
}

function patchNode(
  tree: ThoughtTree,
  id: string,
  patch: Partial<ThoughtNode>,
): ThoughtTree {
  const node = tree.nodes[id];
  if (!node) return tree;
  return { ...tree, nodes: { ...tree.nodes, [id]: { ...node, ...patch } } };
}

// all node ids reachable from rootId following tree edges (rootId included)
function collectTreeSubtree(tree: ThoughtTree, rootId: string): Set<string> {
  const result = new Set<string>([rootId]);
  const frontier = [rootId];
  while (frontier.length > 0) {
    const id = frontier.pop() as string;
    for (const e of tree.edges) {
      if (e.type === 'tree' && e.source === id && !result.has(e.target)) {
        result.add(e.target);
        frontier.push(e.target);
      }
    }
  }
  return result;
}

interface TreeState {
  tree: ThoughtTree | null;
  selectedNodeId: string | null;
  pendingNodeIds: string[]; // nodes currently mid-expansion (race guard)
  // 10.1.7 — nodes newly pruned by the most recent pruneNode call, with the
  // status to restore them to. Drives the one-click undo.
  lastPrune: { id: string; prevStatus: NodeStatus }[];
}

interface TreeActions {
  initTree: (
    rootTopic: string,
    config?: Partial<TOTConfig>,
    contextDocument?: string,
  ) => void;
  hydrate: (tree: ThoughtTree) => void;
  resetTree: () => void;
  updateConfig: (patch: Partial<TOTConfig>) => void;
  setContextBrief: (brief: string) => void;

  addNodes: (nodes: ThoughtNode[]) => void;
  addEdges: (edges: ThoughtEdge[]) => void;
  updateNode: (id: string, patch: Partial<ThoughtNode>) => void;
  setNodeStatus: (id: string, status: NodeStatus) => void;
  setNodeScore: (id: string, score: number) => void;
  pruneNode: (id: string) => void;
  undoPrune: () => void;
  favoriteNode: (id: string) => void;
  unfavoriteNode: (id: string) => void;
  toggleCollapse: (id: string) => void;
  toggleFocus: (id: string) => void;
  clearFocus: () => void;

  selectNode: (id: string | null) => void;
  markPending: (id: string) => void;
  unmarkPending: (id: string) => void;
}

export type TreeStore = TreeState & TreeActions;

export const useTreeStore = create<TreeStore>()((set) => ({
  tree: null,
  selectedNodeId: null,
  pendingNodeIds: [],
  lastPrune: [],

  initTree: (rootTopic, config, contextDocument) =>
    set(() => {
      const mergedConfig: TOTConfig = {
        ...DEFAULT_TOT_CONFIG,
        ...config,
        similarityThreshold: {
          ...DEFAULT_TOT_CONFIG.similarityThreshold,
          ...config?.similarityThreshold,
        },
      };
      const root: ThoughtNode = {
        id: newId(),
        parentIds: [],
        layer: 0,
        thought: rootTopic,
        rationale: '',
        score: 0,
        embedding: [],
        status: 'pending',
        metadata: { generatedAt: Date.now(), model: '', tokenCost: 0 },
      };
      const tree: ThoughtTree = {
        id: newId(),
        rootTopic,
        config: mergedConfig,
        nodes: { [root.id]: root },
        edges: [],
        createdAt: Date.now(),
        ...(contextDocument?.trim()
          ? { contextDocument: contextDocument.trim() }
          : {}),
      };
      return {
        tree,
        selectedNodeId: root.id,
        pendingNodeIds: [],
        lastPrune: [],
      };
    }),

  hydrate: (tree) => {
    // B18 — a saved tree carries the provider/model it was created with. Sync
    // the session controls to it on load, so the TopBar, the API-key guard
    // and the expansion transport all agree on one provider. Without this, a
    // Gemini tree loaded under the Default UI passes the (Default) key guard
    // but throws inside expandNode (provider 'gemini', no key) — a silent fail.
    useSessionStore.setState({
      provider: tree.config.provider ?? DEFAULT_TOT_CONFIG.provider,
      model: tree.config.generatorModel ?? DEFAULT_TOT_CONFIG.generatorModel,
      thinkingLevel:
        tree.config.thinkingLevel ?? DEFAULT_TOT_CONFIG.thinkingLevel,
    });
    set({
      tree,
      selectedNodeId: getRootNode(tree)?.id ?? null,
      pendingNodeIds: [],
      lastPrune: [],
    });
  },

  resetTree: () =>
    set({
      tree: null,
      selectedNodeId: null,
      pendingNodeIds: [],
      lastPrune: [],
    }),

  // 16 — store the summarised context brief once it has been computed.
  setContextBrief: (brief) =>
    set((s) =>
      s.tree ? { tree: { ...s.tree, contextBrief: brief } } : s,
    ),

  updateConfig: (patch) =>
    set((s) =>
      s.tree
        ? {
            tree: {
              ...s.tree,
              config: {
                ...s.tree.config,
                ...patch,
                similarityThreshold: {
                  ...s.tree.config.similarityThreshold,
                  ...patch.similarityThreshold,
                },
              },
            },
          }
        : s,
    ),

  addNodes: (nodes) =>
    set((s) => {
      if (!s.tree) return s;
      const next = { ...s.tree.nodes };
      for (const n of nodes) next[n.id] = n;
      return { tree: { ...s.tree, nodes: next } };
    }),

  addEdges: (edges) =>
    set((s) => {
      if (!s.tree) return s;
      const existingIds = new Set(s.tree.edges.map((e) => e.id));
      // Convergence is undirected: two concurrent detection passes can find
      // the same pair and mint two edges with different ids. Dedupe by
      // ordered pair-key so a racing pass cannot draw a duplicate edge.
      const existingPairs = new Set(
        s.tree.edges
          .filter((e) => e.type === 'convergence')
          .map((e) => convergencePairKey(e.source, e.target)),
      );
      const added: ThoughtEdge[] = [];
      for (const e of edges) {
        if (existingIds.has(e.id)) continue;
        if (e.type === 'convergence') {
          const key = convergencePairKey(e.source, e.target);
          if (existingPairs.has(key)) continue;
          existingPairs.add(key);
        }
        added.push(e);
      }
      if (added.length === 0) return s;
      return { tree: { ...s.tree, edges: [...s.tree.edges, ...added] } };
    }),

  updateNode: (id, patch) =>
    set((s) => (s.tree ? { tree: patchNode(s.tree, id, patch) } : s)),

  setNodeStatus: (id, status) =>
    set((s) => (s.tree ? { tree: patchNode(s.tree, id, { status }) } : s)),

  setNodeScore: (id, score) =>
    set((s) =>
      s.tree
        ? { tree: patchNode(s.tree, id, { score: clamp(score, 0, 10) }) }
        : s,
    ),

  favoriteNode: (id) =>
    set((s) =>
      s.tree ? { tree: patchNode(s.tree, id, { status: 'favorited' }) } : s,
    ),

  // 10.1.2 — reverse a favorite. Status doubles as expansion state, so restore
  // to 'expanded' if the node has children, else 'pending'.
  unfavoriteNode: (id) =>
    set((s) => {
      if (!s.tree) return s;
      const node = s.tree.nodes[id];
      if (!node || node.status !== 'favorited') return s;
      const restored: NodeStatus =
        getChildren(s.tree, id).length > 0 ? 'expanded' : 'pending';
      return { tree: patchNode(s.tree, id, { status: restored }) };
    }),

  // 14.7.1 — collapse / expand a node's subtree on the canvas.
  toggleCollapse: (id) =>
    set((s) => {
      if (!s.tree) return s;
      const node = s.tree.nodes[id];
      if (!node) return s;
      return { tree: patchNode(s.tree, id, { collapsed: !node.collapsed }) };
    }),

  // 7.2.1 — add/remove a node from the tree's focus branches. Focus lives in
  // tree.config (node ids are tree-scoped, so it cannot be a global setting)
  // and is persisted with the tree to IndexedDB.
  toggleFocus: (id) =>
    set((s) => {
      if (!s.tree) return s;
      const current = s.tree.config.focusBranches ?? [];
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      return {
        tree: { ...s.tree, config: { ...s.tree.config, focusBranches: next } },
      };
    }),

  clearFocus: () =>
    set((s) =>
      s.tree
        ? {
            tree: {
              ...s.tree,
              config: { ...s.tree.config, focusBranches: [] },
            },
          }
        : s,
    ),

  pruneNode: (id) =>
    set((s) => {
      if (!s.tree) return s;
      const subtree = collectTreeSubtree(s.tree, id);
      const nodes = { ...s.tree.nodes };
      // record only the nodes this call newly prunes, so undo restores
      // exactly them (not any node that was already pruned beforehand).
      const lastPrune: { id: string; prevStatus: NodeStatus }[] = [];
      for (const nid of subtree) {
        const node = nodes[nid];
        if (node && node.status !== 'pruned') {
          lastPrune.push({ id: nid, prevStatus: node.status });
          nodes[nid] = { ...node, status: 'pruned' };
        }
      }
      return { tree: { ...s.tree, nodes }, lastPrune };
    }),

  // 10.1.7 — restore the subtree pruned by the most recent pruneNode call.
  undoPrune: () =>
    set((s) => {
      if (!s.tree || s.lastPrune.length === 0) return s;
      const nodes = { ...s.tree.nodes };
      for (const { id, prevStatus } of s.lastPrune) {
        const node = nodes[id];
        if (node) nodes[id] = { ...node, status: prevStatus };
      }
      return { tree: { ...s.tree, nodes }, lastPrune: [] };
    }),

  selectNode: (id) => set({ selectedNodeId: id }),

  markPending: (id) =>
    set((s) =>
      s.pendingNodeIds.includes(id)
        ? s
        : { pendingNodeIds: [...s.pendingNodeIds, id] },
    ),

  unmarkPending: (id) =>
    set((s) => ({
      pendingNodeIds: s.pendingNodeIds.filter((x) => x !== id),
    })),
}));
