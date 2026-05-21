import { REPORT_TEMPLATES } from '@/lib/prompts/report';
import { useTreeStore } from '@/lib/store/treeStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useReportStore } from '@/lib/store/reportStore';
import { requestGatewayContent } from '@/lib/agent/gateway';
import type { ReportConfig, ThoughtNode, ThoughtTree } from '@/types/tree';

const LANGUAGE_NAMES: Record<ReportConfig['language'], string> = {
  en: 'English',
  zh: 'Chinese (中文)',
  ms: 'Bahasa Melayu',
};

// 5.3.1 / 7.1.4 — KEY INSIGHT nodes: independently validated conclusions.
// A node qualifies when it is BOTH a top-percentile scorer and the meeting
// point of ≥ 2 convergence edges. The score gate is relative (top 20% of
// scored nodes), not the old fixed score ≥ 7 — with the generator and
// evaluator sharing a model, an absolute threshold flagged nearly everything.
const KEY_INSIGHT_PERCENTILE = 0.8; // keep the top 20% by score
const KEY_INSIGHT_SCORE_FLOOR = 5; // never flag a genuinely weak node

export function findKeyInsightIds(tree: ThoughtTree): string[] {
  const convCount = new Map<string, number>();
  for (const e of tree.edges) {
    if (e.type !== 'convergence') continue;
    convCount.set(e.source, (convCount.get(e.source) ?? 0) + 1);
    convCount.set(e.target, (convCount.get(e.target) ?? 0) + 1);
  }

  // percentile cutoff over scored, non-root nodes (score 0 = unscored/root)
  const scores = Object.values(tree.nodes)
    .filter((n) => n.layer > 0 && n.score > 0)
    .map((n) => n.score)
    .sort((a, b) => a - b);
  if (scores.length === 0) return [];
  const cutoffIndex = Math.floor(KEY_INSIGHT_PERCENTILE * (scores.length - 1));
  const threshold = Math.max(scores[cutoffIndex], KEY_INSIGHT_SCORE_FLOOR);

  return Object.values(tree.nodes)
    .filter(
      (n) =>
        n.layer > 0 &&
        n.score >= threshold &&
        (convCount.get(n.id) ?? 0) >= 2,
    )
    .map((n) => n.id);
}

// 5.3.2 — one closed-loop descriptor per convergence edge: two independent
// reasoning paths that arrived at the same conclusion.
export interface ClosedLoop {
  thoughtA: string;
  thoughtB: string;
  verdict: string;
  explanation: string;
}

export function buildClosedLoops(tree: ThoughtTree): ClosedLoop[] {
  const loops: ClosedLoop[] = [];
  for (const e of tree.edges) {
    if (e.type !== 'convergence') continue;
    const a = tree.nodes[e.source];
    const b = tree.nodes[e.target];
    if (!a || !b) continue;
    loops.push({
      thoughtA: a.thought,
      thoughtB: b.thought,
      verdict: e.verdict ?? 'convergence',
      explanation: e.explanation ?? '',
    });
  }
  return loops;
}

interface CompactNode {
  id: string;
  layer: number;
  thought: string;
  rationale: string;
  score: number;
  status: string;
  parentId: string | null;
}

export interface CompactTree {
  nodeCount: number;
  layerCount: number;
  nodes: CompactNode[];
}

// 5.2.4 — strips the tree down to what the report prompt needs. Critically it
// drops the 384-float embedding on every node (the real token-overflow risk)
// and honours the report's minScore / includePruned filters.
export function compactTree(tree: ThoughtTree, cfg: ReportConfig): CompactTree {
  const all = Object.values(tree.nodes);
  let layerCount = 0;
  for (const n of all) layerCount = Math.max(layerCount, n.layer + 1);

  const nodes: CompactNode[] = [];
  for (const n of all) {
    if (n.status === 'pruned' && !cfg.includePruned) continue;
    // root (layer 0) is always kept so the tree stays connected
    if (n.layer > 0 && n.score < cfg.minScore) continue;
    nodes.push({
      id: n.id,
      layer: n.layer,
      thought: n.thought,
      rationale: n.rationale,
      score: n.score,
      status: n.status,
      parentId: n.parentIds[0] ?? null,
    });
  }
  return { nodeCount: all.length, layerCount, nodes };
}

// 5.2.1 — assembles the system + user prompt for one report generation.
export function buildReportPrompt(opts: {
  tree: ThoughtTree;
  config: ReportConfig;
  compact: CompactTree;
  closedLoops: ClosedLoop[];
  keyInsights: ThoughtNode[];
}): { system: string; user: string } {
  const { tree, config, compact, closedLoops, keyInsights } = opts;
  const template = REPORT_TEMPLATES[config.audience];
  const language = LANGUAGE_NAMES[config.language];

  const loopLines =
    closedLoops.length > 0
      ? closedLoops
          .map(
            (l) =>
              `- "${l.thoughtA}" ↔ "${l.thoughtB}" [${l.verdict}]: ${l.explanation}`,
          )
          .join('\n')
      : '(no convergence detected yet)';

  const keyLines =
    keyInsights.length > 0
      ? keyInsights
          .map((n) => `- "${n.thought}" (score ${n.score}/10)`)
          .join('\n')
      : '(none — no node is both a top-percentile scorer and a ≥ 2-convergence meeting point)';

  return {
    system: template.system,
    user: [
      `Topic: ${tree.rootTopic}`,
      `Audience: ${config.audience}`,
      `Total nodes: ${compact.nodeCount} · Layers: ${compact.layerCount} · Convergence edges: ${closedLoops.length}`,
      '',
      'KEY INSIGHT nodes (independently validated — top-percentile score and ≥ 2 convergence edges):',
      keyLines,
      '',
      'Closed-loop convergence pairs (independent reasoning paths that met):',
      loopLines,
      '',
      'Full reasoning tree (compact JSON — each node links to its parentId):',
      JSON.stringify(compact.nodes),
      '',
      `Write a ${config.audience}-targeted report in ${language}.`,
      'Produce exactly these sections, translating the headings into the target language:',
      template.sections,
      '',
      'Rules:',
      '- Output GitHub-flavoured Markdown only — do NOT wrap the whole report in a code fence.',
      '- Start with one metadata line: generated date, audience, node count, convergence count.',
      '- The Executive Summary MUST make the closed loop (闭环) explicit: state how independent reasoning paths converge on the same conclusions and why that cross-path agreement raises confidence.',
      '- Be concrete: cite node thoughts verbatim. Never invent nodes that are not in the tree.',
    ].join('\n'),
  };
}

// Strips an outer ```markdown … ``` fence if the model wrapped the whole
// report (inner fences for code samples are left intact).
function stripOuterFence(text: string): string {
  const t = text.trim();
  if (!t.startsWith('```')) return t;
  const firstNewline = t.indexOf('\n');
  const lastFence = t.lastIndexOf('```');
  if (firstNewline !== -1 && lastFence > firstNewline) {
    return t.slice(firstNewline + 1, lastFence).trim();
  }
  return t;
}

// 5.2.3 — orchestrates a report generation against the live stores: compacts
// the tree, builds the prompt, calls the configured provider, writes the
// Markdown (or an error) into the report store.
export async function runReportGeneration(config: ReportConfig): Promise<void> {
  const tree = useTreeStore.getState().tree;
  const report = useReportStore.getState();
  if (!tree) return;

  const { apiKey, provider } = useSessionStore.getState();
  if (provider !== 'default' && !apiKey.trim()) {
    report.setGenerating([], config);
    report.setError('Enter your API key in the top bar first.');
    return;
  }

  const compact = compactTree(tree, config);
  const closedLoops = buildClosedLoops(tree);
  const keyInsightIds = findKeyInsightIds(tree);
  const keyInsights = keyInsightIds
    .map((id) => tree.nodes[id])
    .filter((n): n is ThoughtNode => Boolean(n));

  report.setGenerating(keyInsightIds, config);

  try {
    const prompt = buildReportPrompt({
      tree,
      config,
      compact,
      closedLoops,
      keyInsights,
    });

    let text: string;
    if (tree.config.provider === 'default') {
      const r = await requestGatewayContent({
        model: tree.config.generatorModel,
        system: prompt.system,
        prompt: prompt.user,
        timeoutMs: 90_000,
      });
      text = r.text;
    } else if (tree.config.provider === 'gemini') {
      const agrun = window.Agrun;
      if (!agrun || typeof agrun.requestGeminiContent !== 'function') {
        throw new Error('agrun runtime is not loaded (window.Agrun missing).');
      }
      const r = await agrun.requestGeminiContent(
        {
          model: tree.config.generatorModel,
          apiKey,
          system: prompt.system,
          prompt: prompt.user,
          geminiThinkingConfig: { thinkingLevel: tree.config.thinkingLevel },
          timeoutMs: 90_000,
        },
        window.fetch.bind(window),
      );
      text = r.text;
    } else {
      throw new Error(
        `Provider "${tree.config.provider}" is not wired yet — switch to Default or Gemini.`,
      );
    }

    const markdown = stripOuterFence(text);
    if (!markdown) throw new Error('The model returned an empty report.');
    useReportStore.getState().setReady(markdown);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[report] generation failed:', message);
    useReportStore.getState().setError(message);
  }
}
