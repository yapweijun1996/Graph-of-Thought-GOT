import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';
export type Lang = 'en' | 'zh' | 'ms';

interface PrefsStore {
  theme: Theme;
  lang: Lang;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLang: (lang: Lang) => void;
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
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setLang: (lang) => set({ lang }),
    }),
    { name: 'got:prefs' },
  ),
);
