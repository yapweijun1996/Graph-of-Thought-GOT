import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { usePrefsStore, type Lang } from '@/lib/store/prefsStore';
import { useT, LANGUAGE_LABELS } from '@/lib/i18n';
import { MODEL_CATALOG } from '@/lib/models';
import type { ProviderId } from '@/types/tree';

const FIELD =
  'h-8 rounded-md border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring';

// sentinel <option> value: model is a free-text custom id, not a catalog entry
const CUSTOM_MODEL = '__custom__';

interface TopBarProps {
  onGenerate: (topic: string) => void;
  busy?: boolean;
}

export default function TopBar({ onGenerate, busy = false }: TopBarProps) {
  const t = useT();
  const [topic, setTopic] = useState('');
  const [keyEditable, setKeyEditable] = useState(false);

  const apiKey = useSessionStore((s) => s.apiKey);
  const setApiKey = useSessionStore((s) => s.setApiKey);
  const provider = useSessionStore((s) => s.provider);
  const setProvider = useSessionStore((s) => s.setProvider);
  const model = useSessionStore((s) => s.model);
  const setModel = useSessionStore((s) => s.setModel);

  const theme = usePrefsStore((s) => s.theme);
  const toggleTheme = usePrefsStore((s) => s.toggleTheme);
  const lang = usePrefsStore((s) => s.lang);
  const setLang = usePrefsStore((s) => s.setLang);

  const catalog = MODEL_CATALOG[provider];
  const inCatalog = catalog.some((m) => m.id === model);

  const canGenerate =
    topic.trim().length > 0 && model.trim().length > 0 && !busy;
  const submit = () => {
    if (canGenerate) onGenerate(topic.trim());
  };

  const themeLabel = t(
    theme === 'dark' ? 'topbar.themeToLight' : 'topbar.themeToDark',
  );

  return (
    <header className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
      <h1 className="mr-1 text-sm font-semibold whitespace-nowrap">
        {t('app.title')}
      </h1>

      <input
        className={`${FIELD} min-w-[220px] flex-1`}
        name="topic"
        placeholder={t('topbar.topic')}
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />

      <select
        className={FIELD}
        name="provider"
        value={provider}
        onChange={(e) => setProvider(e.target.value as ProviderId)}
        aria-label={t('topbar.provider')}
      >
        <option value="gemini">Gemini</option>
        <option value="openai">OpenAI</option>
      </select>

      <select
        className={FIELD}
        name="model"
        value={inCatalog ? model : CUSTOM_MODEL}
        onChange={(e) =>
          setModel(e.target.value === CUSTOM_MODEL ? '' : e.target.value)
        }
        aria-label={t('topbar.model')}
      >
        {catalog.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
        <option value={CUSTOM_MODEL}>{t('topbar.modelCustom')}</option>
      </select>

      {!inCatalog && (
        <input
          className={`${FIELD} w-[160px]`}
          name="model-custom"
          placeholder={t('topbar.modelCustomPlaceholder')}
          value={model}
          onChange={(e) => setModel(e.target.value)}
          autoComplete="off"
        />
      )}

      <input
        className={`${FIELD} w-[180px]`}
        id="got-api-key"
        type="password"
        placeholder={t('topbar.apiKey', { provider })}
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        // anti-autofill: Chrome skips readonly fields, so it cannot silently
        // inject a saved key on load; the field unlocks on first focus.
        readOnly={!keyEditable}
        onFocus={() => setKeyEditable(true)}
        autoComplete="off"
        data-1p-ignore="true"
        data-lpignore="true"
        data-bwignore="true"
      />

      <select
        className={FIELD}
        name="language"
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        aria-label={t('topbar.language')}
      >
        {(Object.keys(LANGUAGE_LABELS) as Lang[]).map((l) => (
          <option key={l} value={l}>
            {LANGUAGE_LABELS[l]}
          </option>
        ))}
      </select>

      <button
        className="grid h-8 w-8 place-items-center rounded-md border transition hover:bg-accent"
        onClick={toggleTheme}
        aria-label={themeLabel}
        title={themeLabel}
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      <button
        className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
        disabled={!canGenerate}
        onClick={submit}
      >
        {busy ? t('topbar.working') : t('topbar.generate')}
      </button>
    </header>
  );
}
