import { create } from 'zustand';

// The most recent expansion failure (Phase 6.2). Keeps the parentId so the
// toast can offer a one-click retry of exactly the call that failed.
interface ExpansionError {
  parentId: string;
  message: string;
}

interface ExpansionErrorStore {
  error: ExpansionError | null;
  setError: (parentId: string, message: string) => void;
  clearError: () => void;
}

export const useExpansionErrorStore = create<ExpansionErrorStore>()((set) => ({
  error: null,
  setError: (parentId, message) => set({ error: { parentId, message } }),
  clearError: () => set({ error: null }),
}));
