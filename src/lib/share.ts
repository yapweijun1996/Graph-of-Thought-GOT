import type { ThoughtNode, ThoughtTree } from '@/types/tree';

// Share a thought graph via a URL hash fragment (Phase 6.4). No backend — the
// whole tree is base64-encoded into `#tree=…`. The hash fragment (not a query
// string) keeps the payload out of server logs and Referer headers, and
// survives GitHub Pages routing.

// 384-float embeddings dominate the payload and are not needed by a viewer
// (convergence edges are already computed), so they are stripped before
// encoding. Rationales, reasoning and verdicts — the actual content — stay.
function stripEmbeddings(tree: ThoughtTree): ThoughtTree {
  const nodes: Record<string, ThoughtNode> = {};
  for (const [id, n] of Object.entries(tree.nodes)) {
    nodes[id] = { ...n, embedding: [] };
  }
  return { ...tree, nodes };
}

// UTF-8 safe base64 (btoa only handles Latin-1).
function encodeBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

function decodeBase64(b64: string): string {
  return decodeURIComponent(escape(atob(b64)));
}

export function buildShareUrl(tree: ThoughtTree): string {
  const json = JSON.stringify(stripEmbeddings(tree));
  const base = window.location.origin + window.location.pathname;
  return `${base}#tree=${encodeBase64(json)}`;
}

// Reads a shared tree out of the current URL hash, or null if there isn't one
// / it fails to decode. A decode failure is logged and ignored — it must never
// disturb the user's locally saved graphs.
export function readSharedTree(): ThoughtTree | null {
  const match = window.location.hash.match(/[#&]tree=([^&]+)/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeBase64(match[1])) as ThoughtTree;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.nodes !== 'object' ||
      typeof parsed.config !== 'object'
    ) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('[share] could not decode shared tree:', error);
    return null;
  }
}

// Removes the #tree=… fragment so a reload uses the locally saved copy.
export function clearShareHash(): void {
  if (window.location.hash) {
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search,
    );
  }
}
