import type { ThoughtNode } from '@/types/tree';

export interface ConvergencePrompt {
  system: string;
  user: string;
}

function breadcrumb(path: ThoughtNode[]): string {
  return path.map((n, i) => `${i}. ${n.thought}`).join('\n');
}

// Asks the model whether two embedding-similar branches are a meaningful
// convergence (signal) or accidental overlap (noise) — DESIGN.md §5.4.
// The embedding similarity is only a pre-filter; this verdict is the real gate.
export function buildConvergencePrompt(opts: {
  rootTopic: string;
  pathA: ThoughtNode[];
  pathB: ThoughtNode[];
  similarity: number;
}): ConvergencePrompt {
  const { rootTopic, pathA, pathB, similarity } = opts;
  return {
    system:
      'Two different reasoning branches have arrived at similar conclusions. ' +
      'You determine whether this is meaningful convergence (signal) or ' +
      'accidental overlap (noise).',
    user: [
      `Original topic: ${rootTopic}`,
      '',
      'Branch A (root → node):',
      breadcrumb(pathA),
      '',
      'Branch B (root → node):',
      breadcrumb(pathB),
      '',
      `Embedding similarity score: ${similarity.toFixed(3)}`,
      '',
      'Verdict definitions:',
      '- "convergence": the same insight reached via genuinely different paths — meaningful signal',
      '- "redundancy": the two branches restate the same point — near-duplicates',
      '- "coincidence": only superficially similar wording, not the same idea — noise',
      '',
      'Output rules:',
      '- Return ONLY the raw JSON object — no markdown fences, no text before or after it.',
      '- "verdict" must be exactly one of: convergence, redundancy, coincidence.',
      '',
      'JSON shape:',
      '{ "verdict": "convergence" | "redundancy" | "coincidence", "explanation": "<one sentence>" }',
      '',
      'Worked example:',
      '{"verdict":"convergence","explanation":"Both branches independently land on reducing onboarding friction as the key retention lever, one via pricing analysis and one via UX analysis."}',
    ].join('\n'),
  };
}
