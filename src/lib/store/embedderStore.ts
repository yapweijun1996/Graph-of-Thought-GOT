import { create } from 'zustand';

// Load state of the in-browser embedding model (~23MB, fetched on first use).
// Surfaced in the UI so the first convergence pass doesn't look frozen.
export type EmbedderStatus = 'idle' | 'loading' | 'ready' | 'error';

interface EmbedderStore {
  status: EmbedderStatus;
  progress: number; // 0-1 download progress of the model files
  setStatus: (status: EmbedderStatus) => void;
  setProgress: (progress: number) => void;
}

export const useEmbedderStore = create<EmbedderStore>()((set) => ({
  status: 'idle',
  progress: 0,
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
}));
