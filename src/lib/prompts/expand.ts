import type { ThoughtNode } from '@/types/tree';

export interface ExpandPrompt {
  system: string;
  user: string;
}

// Note: agrun's requestGeminiContent is a text-generation call — it does NOT
// support Gemini structured-output / responseSchema. The prompt itself must
// pin the JSON shape; parseExpandResponse then strips fences and validates.

// Layer 1 expansion from the root topic (DESIGN.md §5.1).
export function buildInitialExpandPrompt(
  topic: string,
  count: number,
): ExpandPrompt {
  return {
    system:
      'You are a strategic reasoning engine. Given a problem, you generate ' +
      'DISTINCT, MUTUALLY EXCLUSIVE high-level directions to approach it.',
    user: [
      `Topic: ${topic}`,
      '',
      `Generate exactly ${count} different high-level directions to approach this problem.`,
      'Each direction must:',
      '- Represent a fundamentally different angle (not variations of the same idea)',
      '- Be actionable and specific',
      '- Have a clear rationale for why it matters',
      '',
      'Output rules:',
      '- Return ONLY the raw JSON object — no markdown fences, no text before or after it.',
      `- The "branches" array must contain exactly ${count} items.`,
      '',
      'JSON shape:',
      '{ "branches": [ { "thought": "<one-sentence direction>", "rationale": "<2-3 sentence explanation>" } ] }',
      '',
      `Worked example — topic "Reduce customer churn" (shows the shape with 2 branches; your output needs exactly ${count}):`,
      '{"branches":[{"thought":"Improve onboarding so new users reach value faster","rationale":"Most churn happens in the first week. A guided onboarding flow shortens time-to-value and builds an early habit loop."},{"thought":"Build a proactive health-score alerting system","rationale":"Churn is predictable from usage signals. Flagging at-risk accounts early lets the team intervene before the renewal decision."}]}',
    ].join('\n'),
  };
}

// Expansion of any non-root node (DESIGN.md §5.2).
export function buildChildExpandPrompt(opts: {
  rootTopic: string;
  path: ThoughtNode[];
  current: ThoughtNode;
  count: number;
}): ExpandPrompt {
  const { rootTopic, path, current, count } = opts;
  const breadcrumb = path.map((n, i) => `${i}. ${n.thought}`).join('\n');
  return {
    system:
      'You are extending a tree of reasoning. You are given the path from the ' +
      'root to the current node, and must generate child directions that DEEPEN ' +
      'this specific branch rather than restart from scratch.',
    user: [
      `Original topic: ${rootTopic}`,
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
