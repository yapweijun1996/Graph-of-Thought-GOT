import {
  buildChildExpandPrompt,
  buildInitialExpandPrompt,
} from '@/lib/prompts/expand';
import { rolesForBranches } from '@/lib/prompts/roles';
import {
  getChildren,
  getNodePath,
  isInFocusSubtree,
  newId,
  useTreeStore,
} from '@/lib/store/treeStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { usePrefsStore } from '@/lib/store/prefsStore';
import { useExpansionErrorStore } from '@/lib/store/expansionErrorStore';
import { useAutoExploreStore } from '@/lib/store/autoExploreStore';
import { translate } from '@/lib/i18n';
import { readTotalTokens, stripCodeFences } from '@/lib/agent/response';
import { runEvaluationBatch } from '@/lib/agent/evaluate';
import { detectConvergence } from '@/lib/agent/convergence';
import { getEmbedding } from '@/lib/embedder';
import { requestGatewayContent } from '@/lib/agent/gateway';
import { searchEvidence } from '@/lib/agent/grounding';
import type {
  EvidenceItem,
  RoleId,
  ThoughtEdge,
  ThoughtNode,
  ThoughtTree,
} from '@/types/tree';

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
// Embedding is left empty here and populated asynchronously after the node is
// created (populateEmbeddings); convergence detection then runs on the filled
// embeddings. Nodes are never merged away — see 8.3.1.
// `roles[i]` (8.1) is the analytical persona for branch i; undefined leaves
// the node role-less (e.g. the root has no role to inherit).
export function branchesToGraph(
  branches: ExpandBranch[],
  parent: ThoughtNode,
  model: string,
  roles?: (RoleId | undefined)[],
): { nodes: ThoughtNode[]; edges: ThoughtEdge[] } {
  const nodes: ThoughtNode[] = [];
  const edges: ThoughtEdge[] = [];
  branches.forEach((branch, i) => {
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
      role: roles?.[i],
      metadata: { generatedAt: Date.now(), model, tokenCost: 0 },
    });
    edges.push({ id: newId(), source: parent.id, target: id, type: 'tree' });
  });
  return { nodes, edges };
}

interface ExpandResult {
  nodes: ThoughtNode[];
  edges: ThoughtEdge[];
  tokenCost: number;
}

// Calls the configured provider to expand one node into child branches.
// `hint` (8.2.5) is an optional steering instruction folded into child prompts.
// `evidence` (15) is optional web grounding woven into the expand prompt.
export async function expandNode(
  tree: ThoughtTree,
  parentId: string,
  apiKey: string,
  hint?: string,
  evidence?: EvidenceItem[],
): Promise<ExpandResult> {
  const parent = tree.nodes[parentId];
  if (!parent) throw new Error('Parent node no longer exists.');

  const count =
    parent.layer === 0
      ? tree.config.initialBranches
      : tree.config.expansionBranches;
  // 8.1: initial branches each get a distinct persona; children inherit the
  // parent's persona so a subtree keeps one analytical voice. The same `roles`
  // array drives the prompt and the node attribution, so branch i ↔ role i.
  const initialRoles = rolesForBranches(count);
  const roles: (RoleId | undefined)[] =
    parent.layer === 0
      ? initialRoles
      : Array.from({ length: count }, () => parent.role);
  const prompt =
    parent.layer === 0
      ? buildInitialExpandPrompt(
          tree.rootTopic,
          count,
          initialRoles,
          evidence,
        )
      : buildChildExpandPrompt({
          rootTopic: tree.rootTopic,
          path: getNodePath(tree, parentId),
          current: parent,
          count,
          role: parent.role,
          hint,
          evidence,
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
    roles,
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
// When the tree has focus branches set (7.2.3), only pending nodes inside a
// focused subtree are expanded.
export async function expandAllPending(): Promise<void> {
  const tree = useTreeStore.getState().tree;
  if (!tree) return;
  const focusBranches = tree.config.focusBranches ?? [];
  const targets = Object.values(tree.nodes)
    .filter(
      (n) =>
        n.status === 'pending' &&
        n.layer < tree.config.maxExpansionLayers &&
        isInFocusSubtree(tree, n.id, focusBranches),
    )
    .map((n) => n.id);
  for (const id of targets) {
    await runExpansion(id);
  }
}

// Orchestrates a full expansion against the live stores: guards re-entry,
// marks the node pending, calls Gemini, writes results back into the tree.
// `awaitEval` (8.2.6) makes the call wait for the children's scores before
// resolving — the agentic auto-explore loop needs scores to prune on.
export async function runExpansion(
  parentId: string,
  opts?: { awaitEval?: boolean },
): Promise<void> {
  const treeStore = useTreeStore.getState();
  const tree = treeStore.tree;
  if (!tree) return;
  if (treeStore.pendingNodeIds.includes(parentId)) return; // already expanding

  const parentNode = tree.nodes[parentId];
  if (!parentNode) return;
  // a user-pruned node never expands, even if it has no children
  if (parentNode.status === 'pruned') return;
  // idempotency guard: a node expands at most once. Check for existing tree
  // children, not status — a node favorited *after* expanding has status
  // 'favorited', which a status-only check would let re-expand into
  // duplicate children (bug B16).
  if (getChildren(tree, parentId).length > 0) return;
  // depth guard: a node at the deepest allowed layer cannot expand (5.5.2).
  // Silent no-op — the canvas already hides the expand hint past this layer.
  if (parentNode.layer >= tree.config.maxExpansionLayers) return;

  const { apiKey, provider } = useSessionStore.getState();
  // 'default' uses built-in demo key — no user key required.
  if (provider !== 'default' && !apiKey.trim()) {
    window.alert(translate(usePrefsStore.getState().lang, 'expand.needApiKey'));
    return;
  }

  treeStore.markPending(parentId);
  useExpansionErrorStore.getState().clearError();
  try {
    const hint = useAutoExploreStore.getState().hint.trim();
    // 15 (14.6) — grounded expansion: when web grounding is on (Gemini only),
    // search this direction first and weave the evidence into the prompt.
    // Best-effort — a grounding failure falls back to an ungrounded expand.
    let evidence: EvidenceItem[] | undefined;
    if (
      useSessionStore.getState().webGrounding &&
      provider === 'gemini' &&
      apiKey.trim()
    ) {
      try {
        evidence = await searchEvidence({
          apiKey,
          model: tree.config.generatorModel,
          query: parentNode.thought,
        });
        if (evidence.length > 0) {
          useTreeStore.getState().updateNode(parentId, { evidence });
        }
      } catch (e) {
        console.error('[grounding] expansion search failed:', e);
      }
    }
    const { nodes, edges } = await expandNode(
      tree,
      parentId,
      apiKey,
      hint || undefined,
      evidence,
    );
    const live = useTreeStore.getState();
    // B17: the await above may have outlived this tree. If the user clicked
    // Generate mid-flight, a new tree now sits in the store — writing this
    // expansion's nodes (with stale parent ids) would orphan them. Abort.
    if (live.tree?.id !== tree.id) return;
    live.addNodes(nodes);
    live.addEdges(edges);
    live.setNodeStatus(parentId, 'expanded');
    // Background passes — none block the canvas render. Convergence detection
    // needs embeddings, so it waits for populateEmbeddings; scoring is
    // independent and runs in parallel (DESIGN.md §4.1 step 5, §4.2).
    const newIds = nodes.map((n) => n.id);
    void populateEmbeddings(nodes).then(() => detectConvergence(newIds));
    const evalPass = runEvaluationBatch(newIds);
    // Agentic auto-explore awaits scores so it can prune; everyone else lets
    // evaluation run in the background.
    if (opts?.awaitEval) await evalPass;
    else void evalPass;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[expand] failed:', message);
    // Surface as a dismissible toast with a retry, not a blocking alert.
    useExpansionErrorStore.getState().setError(parentId, message);
  } finally {
    useTreeStore.getState().unmarkPending(parentId);
  }
}
