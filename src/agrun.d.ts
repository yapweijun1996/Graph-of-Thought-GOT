// Type surface for the agrun.js UMD bundle loaded via <script> in index.html.
// Only the parts GOT actually uses are declared. See CLAUDE.md §2.4.
export {};

interface AgrunGeminiRequest {
  model: string;
  apiKey: string;
  prompt?: string;
  system?: string;
  endpoint?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  geminiThinkingConfig?: {
    thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
    thinkingBudget?: number;
    includeThoughts?: boolean;
  };
}

interface AgrunGeminiResponse {
  text: string;
  model?: string;
  endpoint?: string | null;
  durationMs?: number;
  finishReason?: string | null;
  status?: number;
  usage?: Record<string, unknown> | null;
}

// Gemini Google-Search grounding (Phase 15). Unlike requestGeminiContent the
// fetch impl is passed inside the request object.
interface AgrunGroundingRequest {
  apiKey: string;
  model: string;
  query: string;
  fetch?: typeof fetch;
  endpoint?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  limit?: number;
  authMode?: 'client' | 'server';
}

interface AgrunGroundingItem {
  domain?: string;
  engine?: string;
  snippet?: string;
  source?: string;
  title?: string;
  url?: string;
}

interface AgrunGroundingResponse {
  groundingQueries: string[];
  groundingSupportsCount: number;
  items: AgrunGroundingItem[];
  provider: string;
  status: number;
  // true when Gemini returned only a synthetic answer (no source URLs)
  synthetic: boolean;
}

interface AgrunGlobal {
  requestGeminiContent: (
    request: AgrunGeminiRequest,
    fetchImpl?: typeof fetch,
  ) => Promise<AgrunGeminiResponse>;
  searchGeminiGrounding?: (
    request: AgrunGroundingRequest,
  ) => Promise<AgrunGroundingResponse>;
}

declare global {
  interface Window {
    Agrun?: AgrunGlobal;
  }
}
