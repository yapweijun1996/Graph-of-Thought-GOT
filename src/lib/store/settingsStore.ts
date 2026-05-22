import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReportAudience } from '@/types/tree';

// GOT dimension settings (production-report.md §7): width = initialBranches,
// branching on expansion, depth = maxExpansionLayers, plus the default report
// audience. Persisted to localStorage (key `got:settings`) so a new graph
// reuses the user's last-chosen dimensions.
interface SettingsStore {
  initialBranches: number;
  expansionBranches: number;
  maxExpansionLayers: number;
  maxNodes: number; // auto-explore node-count budget cap (8.2.1)
  reportAudience: ReportAudience;
  setInitialBranches: (n: number) => void;
  setExpansionBranches: (n: number) => void;
  setMaxExpansionLayers: (n: number) => void;
  setMaxNodes: (n: number) => void;
  setReportAudience: (a: ReportAudience) => void;
}

// 9.8 — clamp into the valid range. The SettingsModal sliders already enforce
// these via min/max attributes, but a programmatic call (or a stale persisted
// value) could otherwise push e.g. maxExpansionLayers to 0, which would break
// the depth guard. NaN falls back to the floor.
function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      initialBranches: 4,
      expansionBranches: 3,
      maxExpansionLayers: 3,
      maxNodes: 40,
      reportAudience: 'manager',
      setInitialBranches: (n) => set({ initialBranches: clampInt(n, 2, 8) }),
      setExpansionBranches: (n) => set({ expansionBranches: clampInt(n, 2, 6) }),
      setMaxExpansionLayers: (n) =>
        set({ maxExpansionLayers: clampInt(n, 1, 6) }),
      setMaxNodes: (n) => set({ maxNodes: clampInt(n, 10, 120) }),
      setReportAudience: (reportAudience) => set({ reportAudience }),
    }),
    { name: 'got:settings' },
  ),
);
