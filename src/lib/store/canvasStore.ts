import { create } from 'zustand';

// Transient canvas view state (Phase 14) — none of it is persisted or saved
// with the tree. Kept out of treeStore so a hover / filter change does not
// trip the IndexedDB autosave subscription.
interface CanvasStore {
  hoveredEdgeId: string | null; // 14.5 — convergence edge under the cursor
  highlightedLayer: number | null; // 14.6 — layer isolated by the layer filter
  focusBranchId: string | null; // 14.9 — node whose branch is being focused
  setHoveredEdge: (id: string | null) => void;
  toggleHighlightedLayer: (layer: number) => void;
  clearHighlightedLayer: () => void;
  setFocusBranch: (id: string | null) => void;
}

export const useCanvasStore = create<CanvasStore>()((set) => ({
  hoveredEdgeId: null,
  highlightedLayer: null,
  focusBranchId: null,
  setHoveredEdge: (hoveredEdgeId) => set({ hoveredEdgeId }),
  toggleHighlightedLayer: (layer) =>
    set((s) => ({
      highlightedLayer: s.highlightedLayer === layer ? null : layer,
    })),
  clearHighlightedLayer: () => set({ highlightedLayer: null }),
  setFocusBranch: (focusBranchId) => set({ focusBranchId }),
}));
