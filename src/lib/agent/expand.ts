import {
  buildChildExpandPrompt,
  buildInitialExpandPrompt,
} from '@/lib/prompts/expand';
import { getNodePath, newId, useTreeStore } from '@/lib/store/treeStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { usePrefsStore } from '@/lib/store/prefsStore';
import { translate } from '@/lib/i18n';
import type { ThoughtEdge, ThoughtNode, ThoughtTree } from '@/types/tree';

export interface ExpandBranch {
  thought: string;
  rationale: string;
}

// Models occasionally wrap JSON in markdown fences despite JSON mode — strip them.
// Shared with the evaluator parser so both stay in sync.
export function stripCodeFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (fenced ? fenced[1] : text).trim();
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

export function readTotalTokens(
  usage: Record<string, unknown> | null | undefined,
): number {
  if (usage) {
    const total = usage.totalTokens ?? usage.total_tokens;
    if (typeof total === 'number') return total;
  }
  return 0;
}

interface ExpandResult {
  nodes: ThoughtNode[];
  edges: ThoughtEdge[];
  tokenCost: number;
}

// Calls Gemini (via agrun) to expand one node into child branches.
export async function expandNode(
  tree: ThoughtTree,
  parentId: string,
  apiKey: string,
): Promise<ExpandResult> {
  if (tree.config.provider !== 'gemini') {
    throw new Error(
      `Provider "${tree.config.provider}" is not wired yet — switch to Gemini.`,
    );
  }
  const parent = tree.nodes[parentId];
  if (!parent) throw new Error('Parent node no longer exists.');

  const agrun = window.Agrun;
  if (!agrun || typeof agrun.requestGeminiContent !== 'function') {
    throw new Error('agrun runtime is not loaded (window.Agrun missing).');
  }

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

  const response = await agrun.requestGeminiContent(
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

  const branches = parseExpandResponse(response.text);
  const { nodes, edges } = branchesToGraph(
    branches,
    parent,
    tree.config.generatorModel,
  );
  return { nodes, edges, tokenCost: readTotalTokens(response.usage) };
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
