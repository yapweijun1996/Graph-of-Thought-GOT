import { create } from 'zustand';

// Open/close state for the answer-first Insights panel (Phase 19.1). Kept as
// its own store so the auto-explore loop can open it on finish (19.3) without
// threading a callback through.
interface InsightsStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useInsightsStore = create<InsightsStore>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
