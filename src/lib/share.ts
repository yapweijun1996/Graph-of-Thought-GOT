import type {
  ProviderId,
  ThoughtNode,
  ThoughtTree,
  TOTConfig,
} from '@/types/tree';
import { DEFAULT_TOT_CONFIG } from '@/lib/store/treeStore';
import { useNoticeStore } from '@/lib/store/noticeStore';
import { usePrefsStore } from '@/lib/store/prefsStore';
import { translate } from '@/lib/i18n';

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

// UTF-8 safe base64 (btoa only handles Latin-1). B20 — uses TextEncoder /
// TextDecoder instead of the deprecated escape/unescape. This is byte-for-byte
// identical to the old `unescape(encodeURIComponent(...))` trick, so links
// shared by an earlier build still decode.
export function encodeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  // chunked to keep the per-char loop cheap and avoid a spread-arg stack blow
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeBase64(b64: string): string {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function buildShareUrl(tree: ThoughtTree): string {
  const json = JSON.stringify(stripEmbeddings(tree));
  const base = window.location.origin + window.location.pathname;
  return `${base}#tree=${encodeBase64(json)}`;
}

const VALID_PROVIDERS: ProviderId[] = ['default', 'gemini', 'openai'];

// 9.7 — backfills a possibly-incomplete imported config from the defaults, so
// a shared tree carrying `config: {}` (B10) cannot crash on first expansion
// when a nested field like `similarityThreshold.convergence` is read.
function sanitizeConfig(raw: unknown): TOTConfig {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Partial<TOTConfig>;
  const provider =
    typeof c.provider === 'string' &&
    VALID_PROVIDERS.includes(c.provider as ProviderId)
      ? (c.provider as ProviderId)
      : DEFAULT_TOT_CONFIG.provider;
  return {
    ...DEFAULT_TOT_CONFIG,
    ...c,
    provider,
    similarityThreshold: {
      ...DEFAULT_TOT_CONFIG.similarityThreshold,
      ...(c.similarityThreshold ?? {}),
    },
  };
}

// 9.3 — surfaces a decode/validation failure as an error toast so the user
// is not left staring at a blank canvas with no explanation.
function noticeShareFailure(): void {
  useNoticeStore
    .getState()
    .show(
      'error',
      translate(usePrefsStore.getState().lang, 'notice.shareDecodeFailed'),
    );
}

// Reads a shared tree out of the current URL hash, or null if there isn't one
// / it fails to decode. A decode failure now raises an error toast (9.3) — it
// must never silently disturb the user's locally saved graphs.
export function readSharedTree(): ThoughtTree | null {
  const match = window.location.hash.match(/[#&]tree=([^&]+)/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeBase64(match[1])) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      noticeShareFailure();
      return null;
    }
    const p = parsed as Partial<ThoughtTree>;
    // 9.7 — nodes must be an object and edges an array; anything else is a
    // corrupt payload, not a graph.
    if (!p.nodes || typeof p.nodes !== 'object' || !Array.isArray(p.edges)) {
      noticeShareFailure();
      return null;
    }
    return {
      id: typeof p.id === 'string' ? p.id : '',
      rootTopic: typeof p.rootTopic === 'string' ? p.rootTopic : '',
      config: sanitizeConfig(p.config),
      nodes: p.nodes as ThoughtTree['nodes'],
      edges: p.edges as ThoughtTree['edges'],
      createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
    };
  } catch (error) {
    console.error('[share] could not decode shared tree:', error);
    noticeShareFailure();
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
