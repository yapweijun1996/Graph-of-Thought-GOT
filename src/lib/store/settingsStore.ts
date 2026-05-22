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

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      initialBranches: 4,
      expansionBranches: 3,
      maxExpansionLayers: 3,
      maxNodes: 40,
      reportAudience: 'manager',
      setInitialBranches: (initialBranches) => set({ initialBranches }),
      setExpansionBranches: (expansionBranches) => set({ expansionBranches }),
      setMaxExpansionLayers: (maxExpansionLayers) => set({ maxExpansionLayers }),
      setMaxNodes: (maxNodes) => set({ maxNodes }),
      setReportAudience: (reportAudience) => set({ reportAudience }),
    }),
    { name: 'got:settings' },
  ),
);
