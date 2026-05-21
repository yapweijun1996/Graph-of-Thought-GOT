import { create } from 'zustand';
import type { ProviderId } from '@/types/tree';
import { DEFAULT_MODEL } from '@/lib/models';

// Session-only credentials. NOT persisted to localStorage / IndexedDB —
// the API key lives in memory and is cleared on reload (CLAUDE.md §2.3).
interface SessionStore {
  apiKey: string;
  provider: ProviderId;
  model: string;
  endpoint: string; // optional base URL for an OpenAI-compatible gateway
  setApiKey: (apiKey: string) => void;
  setProvider: (provider: ProviderId) => void;
  setModel: (model: string) => void;
  setEndpoint: (endpoint: string) => void;
}

export const useSessionStore = create<SessionStore>()((set) => ({
  apiKey: '',
  provider: 'gemini',
  model: DEFAULT_MODEL.gemini,
  endpoint: '',
  setApiKey: (apiKey) => set({ apiKey }),
  // switching provider resets the model so provider/model never mismatch
  setProvider: (provider) => set({ provider, model: DEFAULT_MODEL[provider] }),
  setModel: (model) => set({ model }),
  setEndpoint: (endpoint) => set({ endpoint }),
}));
