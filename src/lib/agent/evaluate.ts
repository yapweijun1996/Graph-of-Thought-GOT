import {
  buildEvaluatePrompt,
  buildSiblingRankPrompt,
} from '@/lib/prompts/evaluate';
import { getNodePath, useTreeStore } from '@/lib/store/treeStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { usePrefsStore } from '@/lib/store/prefsStore';
import { useNoticeStore } from '@/lib/store/noticeStore';
import { readTotalTokens, stripCodeFences } from '@/lib/agent/response';
import { requestGatewayContent } from '@/lib/agent/gateway';
import { translate } from '@/lib/i18n';
import type { ThoughtNode, ThoughtTree } from '@/types/tree';

// Surfaces an evaluation failure as a non-blocking warning toast (9.1) — the
// node keeps score 0, but the user is no longer left without any signal.
function reportEvaluateFailure(message: string): void {
  console.error('[evaluate] failed:', message);
  useNoticeStore
    .getState()
    .show(
      'warn',
      translate(usePrefsStore.getState().lang, 'notice.evaluateFailed', {
        message,
      }),
    );
}

export interface EvaluationResult {
  score: number;
  reasoning: string;
  tokenCost: number;
}

type ModelResponse = { text: string; usage?: Record<string, unknown> | null };

function clampScore(n: number): number {
  return Math.max(0, Math.min(10, n));
}

// Shared transport: routes one evaluator prompt to the configured provider.
// Both evaluateNode (absolute) and runEvaluationBatch (relative) use it.
async function requestEvaluatorModel(
  tree: ThoughtTree,
  prompt: { system: string; user: string },
  apiKey: string,
): Promise<ModelResponse> {
  if (tree.config.provider === 'default') {
    return requestGatewayContent({
      model: tree.config.evaluatorModel,
      system: prompt.system,
      prompt: prompt.user,
      timeoutMs: 60_000,
    });
  }
  if (tree.config.provider === 'gemini') {
    const agrun = window.Agrun;
    if (!agrun || typeof agrun.requestGeminiContent !== 'function') {
      throw new Error('agrun runtime is not loaded (window.Agrun missing).');
    }
    return agrun.requestGeminiContent(
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
  }
  throw new Error(
    `Provider "${tree.config.provider}" is not wired yet — switch to Default or Gemini.`,
  );
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

// Calls the configured provider to score one node along its root→node path.
// Absolute single-node scoring — used only as the fallback when a node has no
// siblings to rank against (see runEvaluationBatch).
export async function evaluateNode(
  tree: ThoughtTree,
  nodeId: string,
  apiKey: string,
): Promise<EvaluationResult> {
  const target = tree.nodes[nodeId];
  if (!target) throw new Error('Node no longer exists.');

  const prompt = buildEvaluatePrompt({
    rootTopic: tree.rootTopic,
    path: getNodePath(tree, nodeId),
    target,
  });
  const response = await requestEvaluatorModel(tree, prompt, apiKey);
  const { score, reasoning } = parseEvaluateResponse(response.text);
  return { score, reasoning, tokenCost: readTotalTokens(response.usage) };
}

// Orchestrates a single evaluation against the live store: scores the node
// and writes the result back. setNodeScore clamps to 0-10.
export async function runEvaluation(nodeId: string): Promise<void> {
  const tree = useTreeStore.getState().tree;
  if (!tree || !tree.nodes[nodeId]) return;

  const { apiKey, provider } = useSessionStore.getState();
  // 'default' uses built-in demo key — no user key required.
  if (provider !== 'default' && !apiKey.trim()) return;

  try {
    const { score, reasoning, tokenCost } = await evaluateNode(
      tree,
      nodeId,
      apiKey,
    );
    useTreeStore.getState().setNodeScore(nodeId, score);
    // Persist the evaluator's reasoning + fold its token cost into the node's
    // running total (the node already carries its share of the expansion cost).
    const node = useTreeStore.getState().tree?.nodes[nodeId];
    if (node) {
      useTreeStore.getState().updateNode(nodeId, {
        reasoning,
        metadata: {
          ...node.metadata,
          tokenCost: node.metadata.tokenCost + tokenCost,
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reportEvaluateFailure(message);
  }
}

// --- Phase 7.1: sibling-relative scoring ---

export interface SiblingRanking {
  index: number;
  score: number;
  reasoning: string;
}

// Pure: parse a sibling-ranking response. Accepts a partial list — the caller
// leaves any unranked sibling unscored — but throws if nothing usable is
// returned. Indices are validated against the expected sibling count and
// de-duplicated; scores are clamped to 0-10.
export function parseSiblingRankResponse(
  text: string,
  expectedCount: number,
): SiblingRanking[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    throw new Error('Model did not return valid JSON.');
  }
  const rankings = (parsed as { rankings?: unknown }).rankings;
  if (!Array.isArray(rankings)) {
    throw new Error('Model response is missing a "rankings" array.');
  }
  const out: SiblingRanking[] = [];
  const seen = new Set<number>();
  for (const r of rankings) {
    if (!r || typeof r !== 'object') continue;
    const index = (r as SiblingRanking).index;
    const score = (r as SiblingRanking).score;
    if (!Number.isInteger(index) || index < 0 || index >= expectedCount) {
      continue;
    }
    if (seen.has(index)) continue;
    if (typeof score !== 'number' || !Number.isFinite(score)) continue;
    const reasoning =
      typeof (r as SiblingRanking).reasoning === 'string'
        ? (r as SiblingRanking).reasoning.trim()
        : '';
    seen.add(index);
    out.push({ index, score: clampScore(score), reasoning });
  }
  if (out.length === 0) {
    throw new Error('Model returned no usable rankings.');
  }
  return out;
}

// Pure: guarantees a usable spread of scores. The prompt asks the model to
// differentiate siblings, but models still collapse to 7-9. When the parsed
// spread is under 3 points, deterministically remap from the model's own
// rank order so the percentile-based KEY INSIGHT selector (7.1.4) still has
// a real signal to work with. A genuine spread is left untouched.
export function applyScoreSpread(rankings: SiblingRanking[]): SiblingRanking[] {
  if (rankings.length <= 1) return rankings;
  const scores = rankings.map((r) => r.score);
  const spread = Math.max(...scores) - Math.min(...scores);
  if (spread >= 3) return rankings;
  const n = rankings.length;
  return [...rankings]
    .sort((a, b) => b.score - a.score)
    .map((r, position) => ({
      ...r,
      score: Math.round(10 - (position * 9) / (n - 1)),
    }));
}

// Phase 7.1.2/7.1.3 — scores a freshly created sibling set in ONE call by
// ranking the siblings relative to each other. Replaces the old per-node
// absolute scoring, which let the generator-as-evaluator inflate every node
// it produced to 8-9. Falls back to single-node absolute scoring when there
// is only one sibling (nothing to rank against).
export async function runEvaluationBatch(nodeIds: string[]): Promise<void> {
  const tree = useTreeStore.getState().tree;
  if (!tree) return;
  const siblings = nodeIds
    .map((id) => tree.nodes[id])
    .filter((n): n is ThoughtNode => Boolean(n));
  if (siblings.length === 0) return;
  if (siblings.length === 1) {
    await runEvaluation(siblings[0].id);
    return;
  }

  const { apiKey, provider } = useSessionStore.getState();
  // 'default' uses built-in demo key — no user key required.
  if (provider !== 'default' && !apiKey.trim()) return;

  const parentId = siblings[0].parentIds[0];
  const parentPath = parentId ? getNodePath(tree, parentId) : [];
  const prompt = buildSiblingRankPrompt({
    rootTopic: tree.rootTopic,
    parentPath,
    siblings,
  });

  try {
    const response = await requestEvaluatorModel(tree, prompt, apiKey);
    const ranked = applyScoreSpread(
      parseSiblingRankResponse(response.text, siblings.length),
    );
    // One call covers N siblings — attribute its token cost evenly across them.
    const tokenCost = readTotalTokens(response.usage);
    const perNode = Math.round(tokenCost / siblings.length);
    for (const r of ranked) {
      const target = siblings[r.index];
      useTreeStore.getState().setNodeScore(target.id, r.score);
      const live = useTreeStore.getState().tree?.nodes[target.id];
      if (live) {
        useTreeStore.getState().updateNode(target.id, {
          reasoning: r.reasoning,
          metadata: {
            ...live.metadata,
            tokenCost: live.metadata.tokenCost + perNode,
          },
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reportEvaluateFailure(message);
  }
}
