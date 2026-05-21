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

interface AgrunGlobal {
  requestGeminiContent: (
    request: AgrunGeminiRequest,
    fetchImpl?: typeof fetch,
  ) => Promise<AgrunGeminiResponse>;
}

declare global {
  interface Window {
    Agrun?: AgrunGlobal;
  }
}
