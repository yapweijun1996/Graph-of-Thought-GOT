import {
  buildChildExpandPrompt,
  buildInitialExpandPrompt,
} from '@/lib/prompts/expand';
import { getNodePath, newId, useTreeStore } from '@/lib/store/treeStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { usePrefsStore } from '@/lib/store/prefsStore';
import { translate } from '@/lib/i18n';
import { readTotalTokens, stripCodeFences } from '@/lib/agent/response';
import { runEvaluationBatch } from '@/lib/agent/evaluate';
import { detectConvergence } from '@/lib/agent/convergence';
import { getEmbedding } from '@/lib/embedder';
import { requestGatewayContent } from '@/lib/agent/gateway';
import type { ThoughtEdge, ThoughtNode, ThoughtTree } from '@/types/tree';

export interface ExpandBranch {
  thought: string;
  rationale: string;
}

// Pure: parse a raw model response into validated branches. Throws on bad shape.
export function parseExpandResponse(text: string): ExpandBranch[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    throw new Error('Model did not return valid JSON.');
  }
  const branches = (parsed as { branches?: unknown }).branches;
  if (!Array.isArray(branches)) {
    throw new Error('Model response is missing a "branches" array.');
  }
  const out: ExpandBranch[] = [];
  for (const b of branches) {
    if (
      b &&
      typeof b === 'object' &&
      typeof (b as ExpandBranch).thought === 'string' &&
      typeof (b as ExpandBranch).rationale === 'string'
    ) {
      const thought = (b as ExpandBranch).thought.trim();
      const rationale = (b as ExpandBranch).rationale.trim();
      if (thought) out.push({ thought, rationale });
    }
  }
  if (out.length === 0) {
    throw new Error('Model returned no usable branches.');
  }
  return out;
}

// Pure: turn branches into child nodes + tree edges hanging off a parent.
// NOTE: embedding is left empty here and filled in asynchronously after the
// node is created. When similarity detection lands, the order must flip —
// embed first, then decide merge/convergence BEFORE creating the node
// (DESIGN.md §4.1 steps 4a-4e).
export function branchesToGraph(
  branches: ExpandBranch[],
  parent: ThoughtNode,
  model: string,
): { nodes: ThoughtNode[]; edges: ThoughtEdge[] } {
  const nodes: ThoughtNode[] = [];
  const edges: ThoughtEdge[] = [];
  for (const branch of branches) {
    const id = newId();
    nodes.push({
      id,
      parentIds: [parent.id],
      layer: parent.layer + 1,
      thought: branch.thought,
      rationale: branch.rationale,
      score: 0,
      embedding: [], // filled in Phase 2 by the embedder
      status: 'pending',
      metadata: { generatedAt: Date.now(), model, tokenCost: 0 },
    });
    edges.push({ id: newId(), source: parent.id, target: id, type: 'tree' });
  }
  return { nodes, edges };
}

interface ExpandResult {
  nodes: ThoughtNode[];
  edges: ThoughtEdge[];
  tokenCost: number;
}

// Calls the configured provider to expand one node into child branches.
export async function expandNode(
  tree: ThoughtTree,
  parentId: string,
  apiKey: string,
): Promise<ExpandResult> {
  const parent = tree.nodes[parentId];
  if (!parent) throw new Error('Parent node no longer exists.');

  const count =
    parent.layer === 0
      ? tree.config.initialBranches
      : tree.config.expansionBranches;
  const prompt =
    parent.layer === 0
      ? buildInitialExpandPrompt(tree.rootTopic, count)
      : buildChildExpandPrompt({
          rootTopic: tree.rootTopic,
          path: getNodePath(tree, parentId),
          current: parent,
          count,
        });

  let response: { text: string; usage?: Record<string, unknown> | null };

  if (tree.config.provider === 'default') {
    response = await requestGatewayContent({
      model: tree.config.generatorModel,
      system: prompt.system,
      prompt: prompt.user,
      timeoutMs: 60_000,
    });
  } else if (tree.config.provider === 'gemini') {
    const agrun = window.Agrun;
    if (!agrun || typeof agrun.requestGeminiContent !== 'function') {
      throw new Error('agrun runtime is not loaded (window.Agrun missing).');
    }
    response = await agrun.requestGeminiContent(
      {
        model: tree.config.generatorModel,
        apiKey,
        system: prompt.system,
        prompt: prompt.user,
        geminiThinkingConfig: { thinkingLevel: tree.config.thinkingLevel },
        timeoutMs: 60_000,
      },
      window.fetch.bind(window),
    );
  } else {
    throw new Error(
      `Provider "${tree.config.provider}" is not wired yet — switch to Default or Gemini.`,
    );
  }

  const branches = parseExpandResponse(response.text);
  const { nodes, edges } = branchesToGraph(
    branches,
    parent,
    tree.config.generatorModel,
  );
  // One expansion call produces N children — attribute its token cost evenly
  // across them so Σ node.tokenCost equals the actual spend (LeftPanel total).
  const tokenCost = readTotalTokens(response.usage);
  const perNode = nodes.length > 0 ? Math.round(tokenCost / nodes.length) : 0;
  for (const n of nodes) n.metadata.tokenCost = perNode;
  return { nodes, edges, tokenCost };
}

// Fire-and-forget: fills in embeddings for freshly created nodes. Runs after
// the nodes are already on screen, so it never blocks the canvas render.
// Sequential so the in-browser WASM model handles one input at a time.
async function populateEmbeddings(nodes: ThoughtNode[]): Promise<void> {
  for (const node of nodes) {
    try {
      const embedding = await getEmbedding(node.thought);
      useTreeStore.getState().updateNode(node.id, { embedding });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[embed] failed for node', node.id, message);
    }
  }
}

// Expands every currently-pending node one layer deeper, respecting the depth
// limit (5.5.4). One pass — newly created children are left for the next
// click. Sequential, so post-expansion LLM traffic stays bounded.
export async function expandAllPending(): Promise<void> {
  const tree = useTreeStore.getState().tree;
  if (!tree) return;
  const targets = Object.values(tree.nodes)
    .filter(
      (n) =>
        n.status === 'pending' && n.layer < tree.config.maxExpansionLayers,
    )
    .map((n) => n.id);
  for (const id of targets) {
    await runExpansion(id);
  }
}

// Orchestrates a full expansion against the live stores: guards re-entry,
// marks the node pending, calls Gemini, writes results back into the tree.
export async function runExpansion(parentId: string): Promise<void> {
  const treeStore = useTreeStore.getState();
  const tree = treeStore.tree;
  if (!tree) return;
  if (treeStore.pendingNodeIds.includes(parentId)) return; // already expanding

  const parentNode = tree.nodes[parentId];
  if (!parentNode) return;
  // idempotency guard: a node expands at most once — a stray trigger is a no-op
  if (parentNode.status === 'expanded' || parentNode.status === 'pruned') return;
  // depth guard: a node at the deepest allowed layer cannot expand (5.5.2).
  // Silent no-op — the canvas already hides the expand hint past this layer.
  if (parentNode.layer >= tree.config.maxExpansionLayers) return;

  const apiKey = useSessionStore.getState().apiKey.trim();
  if (!apiKey) {
    window.alert(translate(usePrefsStore.getState().lang, 'expand.needApiKey'));
    return;
  }

  treeStore.markPending(parentId);
  try {
    const { nodes, edges } = await expandNode(tree, parentId, apiKey);
    const live = useTreeStore.getState();
    live.addNodes(nodes);
    live.addEdges(edges);
    live.setNodeStatus(parentId, 'expanded');
    // Background passes — none block the canvas render. Convergence detection
    // needs embeddings, so it waits for populateEmbeddings; scoring is
    // independent and runs in parallel (DESIGN.md §4.1 step 5, §4.2).
    const newIds = nodes.map((n) => n.id);
    void populateEmbeddings(nodes).then(() => detectConvergence(newIds));
    void runEvaluationBatch(newIds);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[expand] failed:', message);
    window.alert(
      translate(usePrefsStore.getState().lang, 'expand.failed', { message }),
    );
  } finally {
    useTreeStore.getState().unmarkPending(parentId);
  }
}
