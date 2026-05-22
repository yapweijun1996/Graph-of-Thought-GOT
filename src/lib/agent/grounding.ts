import type { EvidenceItem } from '@/types/tree';

// Web grounding (Phase 15) — a thin wrapper over agrun's Gemini Google-Search
// grounding API. Gemini-provider only: the Default demo gateway has no
// grounding path. Normalises agrun's grounding items (URL chunks AND synthetic
// no-URL answers) into the app's EvidenceItem shape.

const GROUNDING_TIMEOUT_MS = 30_000;
const DEFAULT_LIMIT = 4;

// Runs one grounded search. Throws if the agrun grounding API is unavailable
// or the request fails — callers treat grounding as best-effort and swallow.
export async function searchEvidence(opts: {
  apiKey: string;
  model: string;
  query: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<EvidenceItem[]> {
  const agrun = window.Agrun;
  if (!agrun || typeof agrun.searchGeminiGrounding !== 'function') {
    throw new Error('agrun grounding API is not available.');
  }
  const res = await agrun.searchGeminiGrounding({
    apiKey: opts.apiKey,
    model: opts.model,
    query: opts.query,
    limit: opts.limit ?? DEFAULT_LIMIT,
    timeoutMs: GROUNDING_TIMEOUT_MS,
    signal: opts.signal,
    fetch: window.fetch.bind(window),
  });
  return (res.items ?? [])
    .map((it) => ({
      url: it.url || undefined,
      title: it.title || it.source || it.domain || 'Source',
      snippet: it.snippet ?? '',
      // a synthetic item carries the model's answer but no source URL
      synthetic: !it.url,
    }))
    .filter((e) => e.title || e.snippet);
}

// Compact plain-text rendering of evidence for injection into an LLM prompt.
export function evidenceToPromptText(evidence: EvidenceItem[]): string {
  return evidence
    .map((e, i) => {
      const src = e.url ? ` <${e.url}>` : ' (no source URL)';
      return `[${i + 1}] ${e.title}${src}: ${e.snippet}`;
    })
    .join('\n');
}
