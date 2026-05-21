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
      'Return a JSON object of the shape:',
      '{ "score": <number 0-10>, "reasoning": "<one sentence justification>" }',
    ].join('\n'),
  };
}
