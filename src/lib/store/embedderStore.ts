import { create } from 'zustand';

// Load state of the in-browser embedding model (~23MB, fetched on first use).
// Surfaced in the UI so the first convergence pass doesn't look frozen.
export type EmbedderStatus = 'idle' | 'loading' | 'ready' | 'error';

interface EmbedderStore {
  status: EmbedderStatus;
  setStatus: (status: EmbedderStatus) => void;
}

export const useEmbedderStore = create<EmbedderStore>()((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
}));
