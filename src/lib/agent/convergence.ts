import { buildConvergencePrompt } from '@/lib/prompts/convergence';
import { findConvergenceCandidates } from '@/lib/similarity';
import { getNodePath, newId, useTreeStore } from '@/lib/store/treeStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { stripCodeFences } from '@/lib/agent/response';
import { requestGatewayContent } from '@/lib/agent/gateway';
import type { ConvergenceVerdict, ThoughtTree } from '@/types/tree';

// At most this many LLM verdict calls per detection pass. If more candidate
// pairs clear the threshold, the strongest (highest similarity) are verified
// and the rest are dropped — keeps a burst of expansions within budget.
const MAX_VERDICTS_PER_PASS = 3;

// Order-independent key for a node pair — convergence is undirected, so
// A↔B and B↔A are the same edge.
function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// Pure: parse a raw verdict response. Throws on bad shape.
export function parseConvergenceResponse(text: string): {
  verdict: ConvergenceVerdict;
  explanation: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    throw new Error('Model did not return valid JSON.');
  }
  const obj = parsed as { verdict?: unknown; explanation?: unknown };
  if (
    obj.verdict !== 'convergence' &&
    obj.verdict !== 'redundancy' &&
    obj.verdict !== 'coincidence'
  ) {
    throw new Error('Model response has an invalid "verdict".');
  }
  const explanation =
    typeof obj.explanation === 'string' ? obj.explanation.trim() : '';
  return { verdict: obj.verdict, explanation };
}

// Calls the configured provider for a signal/noise verdict on one candidate pair.
async function getConvergenceVerdict(
  tree: ThoughtTree,
  idA: string,
  idB: string,
  similarity: number,
  apiKey: string,
): Promise<{ verdict: ConvergenceVerdict; explanation: string }> {
  // Re-read the live tree so path queries use the freshest node state.
  const liveTree = useTreeStore.getState().tree ?? tree;
  const prompt = buildConvergencePrompt({
    rootTopic: liveTree.rootTopic,
    pathA: getNodePath(liveTree, idA),
    pathB: getNodePath(liveTree, idB),
    similarity,
  });

  let text: string;

  if (tree.config.provider === 'default') {
    const r = await requestGatewayContent({
      model: tree.config.evaluatorModel,
      system: prompt.system,
      prompt: prompt.user,
      timeoutMs: 60_000,
    });
    text = r.text;
  } else if (tree.config.provider === 'gemini') {
    const agrun = window.Agrun;
    if (!agrun || typeof agrun.requestGeminiContent !== 'function') {
      throw new Error('agrun runtime is not loaded (window.Agrun missing).');
    }
    const response = await agrun.requestGeminiContent(
      {
        model: tree.config.evaluatorModel,
        apiKey,
        system: prompt.system,
        prompt: prompt.user,
        geminiThinkingConfig: { thinkingLevel: tree.config.thinkingLevel },
        timeoutMs: 60_000,
      },
      window.fetch.bind(window),
    );
    text = response.text;
  } else {
    throw new Error(
      `Provider "${tree.config.provider}" is not wired yet — switch to Default or Gemini.`,
    );
  }

  return parseConvergenceResponse(text);
}

// Scans freshly created nodes against the rest of the tree (DESIGN.md §4.2),
// then asks the model to confirm each embedding-similar pair is a meaningful
// convergence (DESIGN.md §5.4). Only "convergence"/"redundancy" verdicts draw
// an edge; "coincidence" is dropped as noise.
//
// Must run AFTER embeddings are populated. Fire-and-forget — never awaited by
// the caller, so the LLM round-trips don't block the canvas render.
export async function detectConvergence(newNodeIds: string[]): Promise<void> {
  const tree = useTreeStore.getState().tree;
  if (!tree) return;

  const threshold = tree.config.similarityThreshold.convergence;
  const allNodes = Object.values(tree.nodes);

  // Pairs that already have a convergence edge, so re-runs don't duplicate.
  const seen = new Set<string>();
  for (const edge of tree.edges) {
    if (edge.type === 'convergence') {
      seen.add(pairKey(edge.source, edge.target));
    }
  }

  // Collect unique new candidate pairs that clear the similarity threshold.
  const pairs: { a: string; b: string; similarity: number }[] = [];
  for (const nodeId of newNodeIds) {
    const node = tree.nodes[nodeId];
    if (!node) continue;
    for (const cand of findConvergenceCandidates(node, allNodes, threshold)) {
      const key = pairKey(nodeId, cand.nodeId);
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ a: nodeId, b: cand.nodeId, similarity: cand.similarity });
    }
  }
  if (pairs.length === 0) return;

  const { apiKey, provider } = useSessionStore.getState();
  // 'default' uses built-in demo key — no user key required.
  if (provider !== 'default' && !apiKey.trim()) return;

  // Verify the strongest candidates first, capped per pass.
  pairs.sort((x, y) => y.similarity - x.similarity);
  for (const pair of pairs.slice(0, MAX_VERDICTS_PER_PASS)) {
    try {
      const { verdict, explanation } = await getConvergenceVerdict(
        tree,
        pair.a,
        pair.b,
        pair.similarity,
        apiKey,
      );
      if (verdict === 'coincidence') continue; // noise — no edge
      useTreeStore.getState().addEdges([
        {
          id: newId(),
          source: pair.a,
          target: pair.b,
          type: 'convergence',
          similarity: pair.similarity,
          verdict,
          explanation,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[convergence] verdict failed:', message);
    }
  }
}
