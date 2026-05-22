import { requestGatewayContent } from '@/lib/agent/gateway';
import { stripCodeFences } from '@/lib/agent/response';
import type { ThoughtTree } from '@/types/tree';

// Long-form context summarisation (Phase 16). The raw context document is
// summarised ONCE on tree creation into a fixed-size brief, so every expand
// prompt carries bounded context instead of the full document (token cost).

// Documents at or under this size are already small enough to inject raw —
// no summarisation round-trip needed.
const MAX_RAW_FOR_INLINE = 1500;
const BRIEF_TARGET_CHARS = 1200;

// Produces the context brief for a tree. Returns '' when there is no context
// document; returns the raw document when it is already short; otherwise calls
// the configured provider to compress it. Falls back to a truncation on error.
export async function summarizeContext(
  tree: ThoughtTree,
  apiKey: string,
): Promise<string> {
  const doc = tree.contextDocument?.trim() ?? '';
  if (!doc) return '';
  if (doc.length <= MAX_RAW_FOR_INLINE) return doc;

  const system =
    'You compress a background document into a tight, factual brief. No ' +
    'preamble, no markdown headings — just the brief.';
  const user = [
    `Topic the brief will support: ${tree.rootTopic}`,
    '',
    'Background document:',
    doc,
    '',
    `Write a brief of at most ${BRIEF_TARGET_CHARS} characters capturing the ` +
      'facts, constraints, goals and terminology from the document that are ' +
      'relevant to the topic. Plain prose.',
  ].join('\n');

  try {
    let text: string;
    if (tree.config.provider === 'default') {
      text = (
        await requestGatewayContent({
          model: tree.config.generatorModel,
          system,
          prompt: user,
          timeoutMs: 60_000,
        })
      ).text;
    } else if (tree.config.provider === 'gemini') {
      const agrun = window.Agrun;
      if (!agrun || typeof agrun.requestGeminiContent !== 'function') {
        throw new Error('agrun runtime is not loaded (window.Agrun missing).');
      }
      text = (
        await agrun.requestGeminiContent(
          {
            model: tree.config.generatorModel,
            apiKey,
            system,
            prompt: user,
            geminiThinkingConfig: { thinkingLevel: tree.config.thinkingLevel },
            timeoutMs: 60_000,
          },
          window.fetch.bind(window),
        )
      ).text;
    } else {
      throw new Error(`Provider "${tree.config.provider}" is not wired.`);
    }
    const brief = stripCodeFences(text).trim();
    return brief || doc.slice(0, BRIEF_TARGET_CHARS);
  } catch (error) {
    // best-effort — a failed summary degrades to a truncated raw document.
    console.error('[context] summarisation failed:', error);
    return doc.slice(0, BRIEF_TARGET_CHARS);
  }
}
