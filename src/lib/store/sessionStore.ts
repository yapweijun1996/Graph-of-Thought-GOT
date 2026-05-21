import { create } from 'zustand';
import type { ProviderId } from '@/types/tree';

// Session-only credentials. NOT persisted to localStorage / IndexedDB —
// the API key lives in memory and is cleared on reload (CLAUDE.md §2.3).
interface SessionStore {
  apiKey: string;
  provider: ProviderId;
  endpoint: string; // optional base URL for an OpenAI-compatible gateway
  setApiKey: (apiKey: string) => void;
  setProvider: (provider: ProviderId) => void;
  setEndpoint: (endpoint: string) => void;
}

export const useSessionStore = create<SessionStore>()((set) => ({
  apiKey: '',
  provider: 'gemini',
  endpoint: '',
  setApiKey: (apiKey) => set({ apiKey }),
  setProvider: (provider) => set({ provider }),
  setEndpoint: (endpoint) => set({ endpoint }),
}));
