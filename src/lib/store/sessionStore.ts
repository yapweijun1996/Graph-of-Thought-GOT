import { create } from 'zustand';
import type { ProviderId, ThinkingLevel } from '@/types/tree';
import { DEFAULT_MODEL } from '@/lib/models';
import { useNoticeStore } from '@/lib/store/noticeStore';
import { usePrefsStore } from '@/lib/store/prefsStore';
import { translate } from '@/lib/i18n';

// localStorage key for the opt-in API-key persistence (CLAUDE.md §2.3).
const API_KEY_LS = 'got:apiKey';

function readStoredKey(): string {
  try {
    return localStorage.getItem(API_KEY_LS) ?? '';
  } catch {
    return '';
  }
}

function writeStoredKey(value: string): void {
  try {
    if (value) localStorage.setItem(API_KEY_LS, value);
    else localStorage.removeItem(API_KEY_LS);
  } catch {
    // localStorage unavailable (private mode etc.) — degrade to session-only
  }
}

// 10.1.8 — probe whether localStorage actually accepts writes. Private /
// incognito modes throw on setItem, so "Remember key" would silently fail to
// persist; the caller warns the user instead of leaving them to discover it
// after a reload.
function canPersist(): boolean {
  try {
    localStorage.setItem('got:probe', '1');
    localStorage.removeItem('got:probe');
    return true;
  } catch {
    return false;
  }
}

// Session credentials + run settings. The API key is session-only by default;
// it is persisted to localStorage ONLY while `rememberKey` is on, which the
// user must opt into (CLAUDE.md §2.3). localStorage is plaintext and readable
// by any XSS, so the default is off.
interface SessionStore {
  apiKey: string;
  rememberKey: boolean;
  provider: ProviderId;
  model: string;
  thinkingLevel: ThinkingLevel; // Gemini thinking level / OpenAI reasoning effort
  endpoint: string; // optional base URL for an OpenAI-compatible gateway
  setApiKey: (apiKey: string) => void;
  setRememberKey: (rememberKey: boolean) => void;
  setProvider: (provider: ProviderId) => void;
  setModel: (model: string) => void;
  setThinkingLevel: (thinkingLevel: ThinkingLevel) => void;
  setEndpoint: (endpoint: string) => void;
}

const storedKey = readStoredKey();

export const useSessionStore = create<SessionStore>()((set, get) => ({
  apiKey: storedKey,
  rememberKey: storedKey.length > 0,
  provider: 'default',
  model: DEFAULT_MODEL.default,
  thinkingLevel: 'low',
  endpoint: '',
  setApiKey: (apiKey) => {
    set({ apiKey });
    if (get().rememberKey) writeStoredKey(apiKey);
  },
  setRememberKey: (rememberKey) => {
    set({ rememberKey });
    if (rememberKey && !canPersist()) {
      // toggled on but the browser blocks persistence — keep it session-only
      // and tell the user, rather than letting them assume the key is saved.
      set({ rememberKey: false });
      useNoticeStore
        .getState()
        .show(
          'warn',
          translate(
            usePrefsStore.getState().lang,
            'notice.keyNotPersisted',
          ),
        );
      return;
    }
    writeStoredKey(rememberKey ? get().apiKey : '');
  },
  // switching provider resets the model so provider/model never mismatch
  setProvider: (provider) => set({ provider, model: DEFAULT_MODEL[provider] }),
  setModel: (model) => set({ model }),
  setThinkingLevel: (thinkingLevel) => set({ thinkingLevel }),
  setEndpoint: (endpoint) => set({ endpoint }),
}));
