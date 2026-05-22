import { create } from 'zustand';

// A single transient, non-blocking notice (Phase 9). Background passes —
// evaluation, convergence, share decode, IndexedDB load — used to fail with
// only a console.error, leaving the user with no idea anything went wrong.
// They now surface here and render as a dismissible toast.
export type NoticeKind = 'info' | 'warn' | 'error';

interface Notice {
  id: number; // bumps on every show() so the toast's auto-dismiss timer resets
  kind: NoticeKind;
  message: string;
}

interface NoticeStore {
  notice: Notice | null;
  show: (kind: NoticeKind, message: string) => void;
  dismiss: () => void;
}

let nextId = 1;

export const useNoticeStore = create<NoticeStore>()((set) => ({
  notice: null,
  show: (kind, message) =>
    set({ notice: { id: nextId++, kind, message } }),
  dismiss: () => set({ notice: null }),
}));
