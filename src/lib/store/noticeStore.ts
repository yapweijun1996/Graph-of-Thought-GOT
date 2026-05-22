import { create } from 'zustand';

// A single transient, non-blocking notice (Phase 9). Background passes —
// evaluation, convergence, share decode, IndexedDB load — used to fail with
// only a console.error, leaving the user with no idea anything went wrong.
// They now surface here and render as a dismissible toast.
export type NoticeKind = 'info' | 'warn' | 'error';

// Optional one-click action on a notice — e.g. the "Undo" on a prune (10.1.7).
export interface NoticeAction {
  label: string;
  run: () => void;
}

interface Notice {
  id: number; // bumps on every show() so the toast's auto-dismiss timer resets
  kind: NoticeKind;
  message: string;
  action?: NoticeAction;
}

interface NoticeStore {
  notice: Notice | null;
  show: (kind: NoticeKind, message: string, action?: NoticeAction) => void;
  dismiss: () => void;
}

let nextId = 1;

export const useNoticeStore = create<NoticeStore>()((set) => ({
  notice: null,
  show: (kind, message, action) =>
    set({ notice: { id: nextId++, kind, message, action } }),
  dismiss: () => set({ notice: null }),
}));
