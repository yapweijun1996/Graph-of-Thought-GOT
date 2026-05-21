// Shared helpers for parsing agrun/Gemini text responses. Lives in its own
// module so expand.ts and evaluate.ts can both use it without an import cycle.

// Models occasionally wrap JSON in markdown fences — strip them before parsing.
export function stripCodeFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (fenced ? fenced[1] : text).trim();
}

// Reads the total token count from an agrun usage object, if present.
export function readTotalTokens(
  usage: Record<string, unknown> | null | undefined,
): number {
  if (usage) {
    const total = usage.totalTokens ?? usage.total_tokens;
    if (typeof total === 'number') return total;
  }
  return 0;
}
