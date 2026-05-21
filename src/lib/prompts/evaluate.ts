import type { ThoughtNode } from '@/types/tree';

export interface EvaluatePrompt {
  system: string;
  user: string;
}

// Scores the final node of a reasoning path 0-10 (DESIGN.md §5.3).
// As with expand, agrun's requestGeminiContent is plain text generation —
// the JSON shape is pinned by the prompt and validated by parseEvaluateResponse.
export function buildEvaluatePrompt(opts: {
  rootTopic: string;
  path: ThoughtNode[];
  target: ThoughtNode;
}): EvaluatePrompt {
  const { rootTopic, path, target } = opts;
  const breadcrumb = path.map((n, i) => `${i}. ${n.thought}`).join('\n');
  return {
    system:
      'You score reasoning quality. You assign a number 0-10 based on how ' +
      'promising a reasoning direction is toward solving the original problem.',
    user: [
      `Original problem: ${rootTopic}`,
      '',
      'Full reasoning path:',
      breadcrumb,
      '',
      `Score the FINAL node in this path:`,
      `"${target.thought}"`,
      '',
      'Scoring rubric:',
      '- 0-2: dead end, off-topic, or trivially wrong',
      '- 3-4: weak, unlikely to lead anywhere useful',
      '- 5-6: plausible but unproven',
      '- 7-8: strong, clear path forward',
      '- 9-10: exceptional insight, high conviction',
      '',
      'Output rules:',
      '- Return ONLY the raw JSON object — no markdown fences, no text before or after it.',
      '- "score" must be a number from 0 to 10.',
      '',
      'JSON shape:',
      '{ "score": <number 0-10>, "reasoning": "<one sentence justification>" }',
      '',
      'Worked example:',
      '{"score":7,"reasoning":"A clear, actionable direction with a plausible path to impact, though success still depends on execution quality."}',
    ].join('\n'),
  };
}

// Phase 7.1 — ranks N sibling reasoning directions RELATIVE to each other in
// one call. Relative ranking counters the self-enhancement bias of absolute
// single-node scoring: when the generator and evaluator are the same model it
// rates almost every node it produced 8-9/10. Forcing a comparison among
// siblings makes the model differentiate.
export function buildSiblingRankPrompt(opts: {
  rootTopic: string;
  parentPath: ThoughtNode[]; // root → shared parent (the common prefix)
  siblings: ThoughtNode[]; // the alternatives to rank against each other
}): EvaluatePrompt {
  const { rootTopic, parentPath, siblings } = opts;
  const breadcrumb =
    parentPath.length > 0
      ? parentPath.map((n, i) => `${i}. ${n.thought}`).join('\n')
      : '(root)';
  const list = siblings.map((n, i) => `[${i}] ${n.thought}`).join('\n');
  return {
    system:
      'You compare competing reasoning directions and rank them by how ' +
      'promising each is toward solving the original problem. You judge them ' +
      'RELATIVE to each other, never on an absolute scale.',
    user: [
      `Original problem: ${rootTopic}`,
      '',
      'Shared reasoning path so far:',
      breadcrumb,
      '',
      `From that point, ${siblings.length} alternative next directions were ` +
        'proposed. Rank them against each other:',
      list,
      '',
      'Ranking rules:',
      '- These are SIBLINGS competing for the same slot. One is the strongest, ' +
        'one is the weakest — your scores MUST reflect that.',
      '- Spread the scores: the strongest and weakest must differ by at least ' +
        '3 points. Do NOT cluster every sibling at 7-9.',
      '- A score is RELATIVE promise among these siblings, not absolute merit.',
      '- 0-2 weakest of the set · 3-5 weaker · 6-7 middle · 8-10 strongest.',
      '',
      'Output rules:',
      '- Return ONLY the raw JSON object — no markdown fences, no extra text.',
      `- "rankings" must contain every index 0 to ${siblings.length - 1} once.`,
      '- "score" is a number 0-10. "reasoning" is one short sentence.',
      '',
      'JSON shape:',
      '{ "rankings": [ { "index": <0-based>, "score": <0-10>, "reasoning": "<one sentence>" } ] }',
      '',
      'Worked example for 3 siblings:',
      '{"rankings":[{"index":1,"score":9,"reasoning":"Directly attacks the core constraint with a concrete mechanism."},{"index":0,"score":5,"reasoning":"Plausible but rests on an unproven assumption."},{"index":2,"score":2,"reasoning":"Restates the problem without advancing toward a solution."}]}',
    ].join('\n'),
  };
}
