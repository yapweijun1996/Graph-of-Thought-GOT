import { buildEvaluatePrompt } from '@/lib/prompts/evaluate';
import { getNodePath, useTreeStore } from '@/lib/store/treeStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { readTotalTokens, stripCodeFences } from '@/lib/agent/expand';
import type { ThoughtTree } from '@/types/tree';

export interface EvaluationResult {
  score: number;
  reasoning: string;
  tokenCost: number;
}

// Pure: parse a raw model response into a validated score. Throws on bad shape.
export function parseEvaluateResponse(text: string): {
  score: number;
  reasoning: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    throw new Error('Model did not return valid JSON.');
  }
  const obj = parsed as { score?: unknown; reasoning?: unknown };
  if (typeof obj.score !== 'number' || !Number.isFinite(obj.score)) {
    throw new Error('Model response is missing a numeric "score".');
  }
  const reasoning =
    typeof obj.reasoning === 'string' ? obj.reasoning.trim() : '';
  return { score: obj.score, reasoning };
}

// Calls Gemini (via agrun) to score one node along its root→node path.
export async function evaluateNode(
  tree: ThoughtTree,
  nodeId: string,
  apiKey: string,
): Promise<EvaluationResult> {
  if (tree.config.provider !== 'gemini') {
    throw new Error(
      `Provider "${tree.config.provider}" is not wired yet — switch to Gemini.`,
    );
  }
  const target = tree.nodes[nodeId];
  if (!target) throw new Error('Node no longer exists.');

  const agrun = window.Agrun;
  if (!agrun || typeof agrun.requestGeminiContent !== 'function') {
    throw new Error('agrun runtime is not loaded (window.Agrun missing).');
  }

  const prompt = buildEvaluatePrompt({
    rootTopic: tree.rootTopic,
    path: getNodePath(tree, nodeId),
    target,
  });

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

  const { score, reasoning } = parseEvaluateResponse(response.text);
  return { score, reasoning, tokenCost: readTotalTokens(response.usage) };
}

// Orchestrates a single evaluation against the live store: scores the node
// and writes the result back. setNodeScore clamps to 0-10.
export async function runEvaluation(nodeId: string): Promise<void> {
  const tree = useTreeStore.getState().tree;
  if (!tree || !tree.nodes[nodeId]) return;

  const apiKey = useSessionStore.getState().apiKey.trim();
  if (!apiKey) return;

  try {
    const { score } = await evaluateNode(tree, nodeId, apiKey);
    useTreeStore.getState().setNodeScore(nodeId, score);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[evaluate] failed:', message);
  }
}

// Scores a batch of nodes one at a time. Sequential by design: keeps post-
// expansion LLM traffic to a single in-flight request (DESIGN.md §10.3).
export async function runEvaluationBatch(nodeIds: string[]): Promise<void> {
  for (const id of nodeIds) {
    await runEvaluation(id);
  }
}
