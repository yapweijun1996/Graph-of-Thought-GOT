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
      'You score how much a node is a concrete, usable ANSWER to the ' +
      'problem — not how sophisticated, thorough, or rigorous its method ' +
      'sounds. A node that only describes how to investigate the problem is ' +
      'not an answer.',
    user: [
      `Original problem: ${rootTopic}`,
      '',
      'Full reasoning path:',
      breadcrumb,
      '',
      `Score the FINAL node in this path:`,
      `"${target.thought}"`,
      '',
      'Test for an answer: does the node contain specific commitments a ' +
        'practitioner could act on WITHOUT further synthesis — concrete ' +
        'decisions, named values, named tools or examples? A framework, ' +
        'matrix, taxonomy, or methodology counts as an answer ONLY if its ' +
        'contents are fully specified; if it merely defers the answer ("build ' +
        'a system to decide X", "define criteria for Y"), it is NOT an answer.',
      '',
      'Scoring rubric (reward concreteness, not method):',
      '- 0-2: off-topic, trivially wrong, or just restates the problem',
      '- 3-4: only a method/plan/framework — describes HOW to find the answer, never gives it',
      '- 5-6: a real position, but still abstract — no concrete decisions, values, or examples',
      '- 7-8: a concrete recommendation a practitioner could act on, with real specifics',
      '- 9-10: a fully-specified answer — concrete decisions/values/named examples, nothing left to synthesise',
      '',
      'Output rules:',
      '- Return ONLY the raw JSON object — no markdown fences, no text before or after it.',
      '- "score" must be a number from 0 to 10.',
      '',
      'JSON shape:',
      '{ "score": <number 0-10>, "reasoning": "<one sentence justification>" }',
      '',
      'Worked example:',
      '{"score":8,"reasoning":"Commits to a specific, actionable recommendation with concrete parameters a practitioner could apply directly."}',
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
      'You compare competing answers and rank them by how concrete and ' +
      'directly usable each is — not by how thorough or rigorous its method ' +
      'sounds. You judge them RELATIVE to each other, never on an absolute scale.',
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
      '- Rank by concreteness: a sibling that commits to specific values, ' +
        'decisions, or named examples MUST outrank a sibling that only ' +
        'proposes a framework / matrix / methodology to decide those things — ' +
        'even if the framework sounds more thorough or rigorous.',
      '- A score is RELATIVE usefulness among these siblings, not absolute merit.',
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
      '{"rankings":[{"index":1,"score":9,"reasoning":"Commits to specific values and named choices a practitioner can apply directly."},{"index":0,"score":5,"reasoning":"A real position but still abstract — no concrete specifics."},{"index":2,"score":2,"reasoning":"Only proposes a framework to decide the answer; defers the actual decision."}]}',
    ].join('\n'),
  };
}
