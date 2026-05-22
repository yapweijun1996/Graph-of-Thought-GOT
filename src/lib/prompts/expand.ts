import type { EvidenceItem, RoleId, ThoughtNode } from '@/types/tree';
import { ROLE_BY_ID } from '@/lib/prompts/roles';
import { evidenceToPromptText } from '@/lib/agent/grounding';

export interface ExpandPrompt {
  system: string;
  user: string;
}

// 15 — optional web-evidence block woven into an expand prompt.
function evidenceBlock(evidence?: EvidenceItem[]): string[] {
  if (!evidence || evidence.length === 0) return [];
  return [
    '',
    'Relevant web evidence (ground your directions in this; cite nothing the evidence does not support):',
    evidenceToPromptText(evidence),
  ];
}

// Note: agrun's requestGeminiContent is a text-generation call — it does NOT
// support Gemini structured-output / responseSchema. The prompt itself must
// pin the JSON shape; parseExpandResponse then strips fences and validates.

// Layer 1 expansion from the root topic (DESIGN.md §5.1). Each branch is
// generated from a distinct analytical persona (Phase 8.1) — `roles[i]` drives
// branch i, in order, so the caller can attribute roles back by index.
export function buildInitialExpandPrompt(
  topic: string,
  count: number,
  roles: RoleId[],
  evidence?: EvidenceItem[],
): ExpandPrompt {
  const roster = roles
    .map((id, i) => `${i + 1}. ${ROLE_BY_ID[id].persona}`)
    .join('\n');
  return {
    system:
      'You are a strategic reasoning engine. Given a problem, you generate ' +
      'DISTINCT, MUTUALLY EXCLUSIVE high-level directions to approach it. ' +
      'Each direction is argued from a specific analytical persona.',
    user: [
      `Topic: ${topic}`,
      ...evidenceBlock(evidence),
      '',
      `Generate exactly ${count} different high-level directions to approach this problem.`,
      'Each branch must be argued from a DIFFERENT persona. Use these personas,',
      'in this exact order — branch 1 from persona 1, branch 2 from persona 2, …:',
      roster,
      '',
      'Each direction must:',
      '- Genuinely reflect its assigned persona (an Optimist branch and a Skeptic branch must read differently)',
      '- Represent a fundamentally different angle (not variations of the same idea)',
      '- Be actionable and specific, with a clear rationale for why it matters',
      '',
      'Output rules:',
      '- Return ONLY the raw JSON object — no markdown fences, no text before or after it.',
      `- The "branches" array must contain exactly ${count} items, in persona order.`,
      '',
      'JSON shape:',
      '{ "branches": [ { "thought": "<one-sentence direction>", "rationale": "<2-3 sentence explanation>" } ] }',
      '',
      `Worked example — topic "Reduce customer churn" (shows the shape with 2 branches; your output needs exactly ${count}):`,
      '{"branches":[{"thought":"Improve onboarding so new users reach value faster","rationale":"Most churn happens in the first week. A guided onboarding flow shortens time-to-value and builds an early habit loop."},{"thought":"Build a proactive health-score alerting system","rationale":"Churn is predictable from usage signals. Flagging at-risk accounts early lets the team intervene before the renewal decision."}]}',
    ].join('\n'),
  };
}

// Expansion of any non-root node (DESIGN.md §5.2). Children stay in the
// parent's persona (8.1) so a subtree keeps a consistent analytical voice and
// cross-role convergence stays meaningful at any depth.
export function buildChildExpandPrompt(opts: {
  rootTopic: string;
  path: ThoughtNode[];
  current: ThoughtNode;
  count: number;
  role?: RoleId;
  hint?: string;
  evidence?: EvidenceItem[];
}): ExpandPrompt {
  const { rootTopic, path, current, count, role, hint, evidence } = opts;
  const breadcrumb = path.map((n, i) => `${i}. ${n.thought}`).join('\n');
  const personaLine = role
    ? `Continue reasoning as ${ROLE_BY_ID[role].persona}`
    : '';
  // 8.2.5 — optional user steer; advisory, never overrides the JSON contract.
  const hintLine = hint
    ? `Steering hint from the user (bias the directions toward this, but stay on-topic): ${hint}`
    : '';
  return {
    system:
      'You are extending a tree of reasoning. You are given the path from the ' +
      'root to the current node, and must generate child directions that DEEPEN ' +
      'this specific branch rather than restart from scratch.',
    user: [
      `Original topic: ${rootTopic}`,
      ...(personaLine ? ['', personaLine] : []),
      ...(hintLine ? ['', hintLine] : []),
      ...evidenceBlock(evidence),
      '',
      'Reasoning path so far (root → current node):',
      breadcrumb,
      '',
      `Current node to expand: "${current.thought}"`,
      `Rationale: ${current.rationale}`,
      '',
      `Generate exactly ${count} child directions that build ON this specific node.`,
      'Each child must:',
      '- Logically follow from the current node (not jump to a different topic)',
      '- Explore a different sub-aspect',
      '- Be more concrete and specific than the parent',
      '',
      'Output rules:',
      '- Return ONLY the raw JSON object — no markdown fences, no text before or after it.',
      `- The "branches" array must contain exactly ${count} items.`,
      '',
      'JSON shape:',
      '{ "branches": [ { "thought": "<sub-direction>", "rationale": "<why this sub-direction>" } ] }',
      '',
      `Worked example — for a parent node "Improve onboarding so new users reach value faster" (shows the shape with 2 branches; your output needs exactly ${count}):`,
      '{"branches":[{"thought":"Add an interactive product tour triggered on first login","rationale":"A tour shows core features in context, so users act instead of reading documentation."},{"thought":"Pre-fill the workspace with sample data","rationale":"An empty state hides the value; sample data lets users see a working result immediately."}]}',
    ].join('\n'),
  };
}
