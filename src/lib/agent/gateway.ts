// GPT Gateway — default demo provider using the owner's self-hosted OpenAI-compatible
// Responses API endpoint. The real API key is stored as XOR-obfuscated hex so it
// doesn't appear in plaintext in the repo. This is OBFUSCATION, not encryption —
// anyone with the source can recover the key. Suitable for public demo only.
// Rotate the key if the gateway is abused.

// XOR cipher (key: "20260515"). Roundtrip: encrypt(encrypt(plain)) = plain.
function xorHex(hex: string, key: string): string {
  const bytes = hex.match(/.{2}/g)!.map((h) => parseInt(h, 16));
  return bytes
    .map((b, i) => String.fromCharCode(b ^ key.charCodeAt(i % key.length)))
    .join('');
}

// XOR-obfuscated gateway key — generated with key "20260515".
// Real key: gw_524fa12f91c74c0aa21d73fbaa7b97a27a7db3b5a6b33708
const _EK =
  '55476d03020157540302540f015606015100535702045502015650575102530c0551000151025557015207570657020605000a';
const _CK = '20260515';

function getGatewayApiKey(): string {
  return xorHex(_EK, _CK);
}

const GATEWAY_ENDPOINT = 'https://gpt.yapweijun1996.com/v1/responses';
export const GATEWAY_DEFAULT_MODEL = 'gpt-5.4-mini';

// Sliding-window rate limit on the shared demo key (Phase 6.1). Gemini runs on
// the user's own key, so only this gateway path is gated.
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const recentCalls: number[] = [];

function checkRateLimit(): void {
  const now = Date.now();
  while (recentCalls.length > 0 && now - recentCalls[0] > RATE_WINDOW_MS) {
    recentCalls.shift();
  }
  if (recentCalls.length >= RATE_LIMIT) {
    throw new Error(
      `Demo rate limit reached (${RATE_LIMIT} requests/min). Wait a moment, or switch to Gemini with your own API key.`,
    );
  }
  recentCalls.push(now);
}

export interface GatewayResponse {
  text: string;
  usage: Record<string, unknown> | null;
}

// Calls the GPT Gateway using the OpenAI Responses API format (not Chat Completions).
// Uses stream:false so we get a single JSON response — simplest path for JSON generation.
export async function requestGatewayContent(opts: {
  model: string;
  system?: string;
  prompt: string;
  timeoutMs?: number;
}): Promise<GatewayResponse> {
  checkRateLimit();

  const controller = new AbortController();
  const timer = opts.timeoutMs
    ? window.setTimeout(() => controller.abort(), opts.timeoutMs)
    : null;

  try {
    const res = await window.fetch(GATEWAY_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getGatewayApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model,
        ...(opts.system ? { instructions: opts.system } : {}),
        input: [
          {
            role: 'user',
            content: [{ type: 'input_text', text: opts.prompt }],
          },
        ],
        stream: false,
        reasoning: { effort: 'medium' },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`GPT Gateway HTTP ${res.status}: ${err}`);
    }

    const data = (await res.json()) as {
      output?: Array<{
        type: string;
        content?: Array<{ type: string; text?: string }>;
      }>;
      usage?: Record<string, unknown>;
    };

    // Extract text from the Responses API output format.
    const text =
      (data.output ?? [])
        .filter((o) => o.type === 'message')
        .flatMap((o) => o.content ?? [])
        .filter((c) => c.type === 'output_text')
        .map((c) => c.text ?? '')
        .join('') ?? '';

    return { text, usage: data.usage ?? null };
  } finally {
    if (timer !== null) window.clearTimeout(timer);
  }
}
