import { create } from 'zustand';

// Auto-explore mode (Phase 8.2): repeatedly expand pending nodes until the
// depth limit or the node-count budget is hit. `running` is the live abort
// flag — the loop checks it between expansions, so Stop takes effect within
// one expansion. State is in-memory only; an in-flight loop must not survive
// a reload.
interface AutoExploreStore {
  running: boolean;
  // Agentic sub-mode (8.2.6): after each expansion, keep only the top-scoring
  // children and prune the rest — an OODA loop on the graph.
  agentic: boolean;
  // Optional steering hint (8.2.5) injected into child expand prompts.
  hint: string;
  start: () => void;
  stop: () => void;
  setAgentic: (agentic: boolean) => void;
  setHint: (hint: string) => void;
}

export const useAutoExploreStore = create<AutoExploreStore>()((set) => ({
  running: false,
  agentic: false,
  hint: '',
  start: () => set({ running: true }),
  stop: () => set({ running: false }),
  setAgentic: (agentic) => set({ agentic }),
  setHint: (hint) => set({ hint }),
}));
