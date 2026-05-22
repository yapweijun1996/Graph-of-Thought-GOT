import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';
export type Lang = 'en' | 'zh' | 'ms';

interface PrefsStore {
  theme: Theme;
  lang: Lang;
  // 14.4 — canvas toggle: hide convergence edges to cut the "hairball".
  showConvergenceEdges: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLang: (lang: Lang) => void;
  toggleConvergenceEdges: () => void;
}

function systemTheme(): Theme {
  // Guarded so the module is importable outside a browser (unit tests, SSR).
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

// theme + lang persisted to localStorage (key `got:prefs`) via zustand persist.
// On first visit (no stored value) theme falls back to the OS preference.
export const usePrefsStore = create<PrefsStore>()(
  persist(
    (set) => ({
      theme: systemTheme(),
      lang: 'en',
      showConvergenceEdges: true,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setLang: (lang) => set({ lang }),
      toggleConvergenceEdges: () =>
        set((s) => ({ showConvergenceEdges: !s.showConvergenceEdges })),
    }),
    { name: 'got:prefs' },
  ),
);
