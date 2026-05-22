import { useState } from 'react';
import { Menu, Moon, Settings, Sun } from 'lucide-react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useTreeStore } from '@/lib/store/treeStore';
import { usePrefsStore, type Lang } from '@/lib/store/prefsStore';
import { useT, LANGUAGE_LABELS } from '@/lib/i18n';
import { MODEL_CATALOG } from '@/lib/models';
import { cn } from '@/lib/utils';
import type { ProviderId, ThinkingLevel } from '@/types/tree';

const FIELD =
  'h-8 rounded-md border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring';

// sentinel <option> value: model is a free-text custom id, not a catalog entry
const CUSTOM_MODEL = '__custom__';

// Gemini thinking levels == OpenAI reasoning-effort levels — same axis, one control.
const THINKING_LEVELS: ThinkingLevel[] = ['minimal', 'low', 'medium', 'high'];

interface TopBarProps {
  onGenerate: (topic: string, contextDocument?: string) => void;
  onOpenReport: () => void;
  onOpenSettings: () => void;
  busy?: boolean;
  reportDisabled?: boolean;
}

export default function TopBar({
  onGenerate,
  onOpenReport,
  onOpenSettings,
  busy = false,
  reportDisabled = false,
}: TopBarProps) {
  const t = useT();
  const [topic, setTopic] = useState('');
  const [keyEditable, setKeyEditable] = useState(false);
  // narrow viewports collapse the config controls behind a hamburger (6.6)
  const [menuOpen, setMenuOpen] = useState(false);
  // 16 — optional long-form context document, behind a toggle.
  const [contextDoc, setContextDoc] = useState('');
  const [showContext, setShowContext] = useState(false);

  const apiKey = useSessionStore((s) => s.apiKey);
  const setApiKey = useSessionStore((s) => s.setApiKey);
  const rememberKey = useSessionStore((s) => s.rememberKey);
  const setRememberKey = useSessionStore((s) => s.setRememberKey);
  const provider = useSessionStore((s) => s.provider);
  const setProvider = useSessionStore((s) => s.setProvider);
  const model = useSessionStore((s) => s.model);
  const setModel = useSessionStore((s) => s.setModel);
  const thinkingLevel = useSessionStore((s) => s.thinkingLevel);
  const setThinkingLevel = useSessionStore((s) => s.setThinkingLevel);
  const webGrounding = useSessionStore((s) => s.webGrounding);
  const setWebGrounding = useSessionStore((s) => s.setWebGrounding);

  const theme = usePrefsStore((s) => s.theme);
  const toggleTheme = usePrefsStore((s) => s.toggleTheme);
  const lang = usePrefsStore((s) => s.lang);
  const setLang = usePrefsStore((s) => s.setLang);

  const updateConfig = useTreeStore((s) => s.updateConfig);
  const hasTree = useTreeStore((s) => s.tree !== null);

  // B18 — when a tree is active, provider/model/thinking changes also patch
  // tree.config, so the stored config never drifts from the session controls
  // (the counterpart of hydrate syncing session ← tree.config on load).
  const changeProvider = (p: ProviderId) => {
    setProvider(p); // also resets sessionStore.model to the provider default
    if (hasTree) {
      const m = useSessionStore.getState().model;
      updateConfig({ provider: p, generatorModel: m, evaluatorModel: m });
    }
  };
  const changeModel = (m: string) => {
    setModel(m);
    if (hasTree) updateConfig({ generatorModel: m, evaluatorModel: m });
  };
  const changeThinking = (lvl: ThinkingLevel) => {
    setThinkingLevel(lvl);
    if (hasTree) updateConfig({ thinkingLevel: lvl });
  };

  const catalog = MODEL_CATALOG[provider];
  const inCatalog = catalog.some((m) => m.id === model);
  // Gemini calls it "thinking", OpenAI calls it "reasoning effort" — same control.
  const reasoningLabel = t(
    provider === 'gemini' ? 'topbar.thinking' : 'topbar.effort',
  );

  const canGenerate =
    topic.trim().length > 0 && model.trim().length > 0 && !busy;
  const submit = () => {
    if (canGenerate) onGenerate(topic.trim(), contextDoc.trim() || undefined);
  };

  // 15.1.4 — read a dropped / picked .md file into the context field.
  const readContextFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setContextDoc(reader.result);
        setShowContext(true);
      }
    };
    reader.readAsText(file);
  };

  const themeLabel = t(
    theme === 'dark' ? 'topbar.themeToLight' : 'topbar.themeToDark',
  );

  return (
    <header className="flex flex-col gap-2 border-b px-4 py-2.5 md:flex-row md:flex-wrap md:items-center">
      {/* primary row — always visible; on desktop it dissolves into the header */}
      <div className="flex items-center gap-2 md:contents">
        <h1 className="mr-1 text-sm font-semibold whitespace-nowrap">
          {t('app.title')}
        </h1>

        {/* 15.1.1 — autosizing textarea; Cmd/Ctrl+Enter submits, Enter = newline */}
        <textarea
          className={`${FIELD} min-w-0 flex-1 resize-none py-1.5 leading-snug md:min-w-[220px]`}
          name="topic"
          rows={1}
          placeholder={t('topbar.topic')}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />

        <button
          className="h-8 shrink-0 rounded-md border px-2 text-sm font-medium transition hover:bg-accent"
          onClick={() => setShowContext((v) => !v)}
          aria-expanded={showContext}
        >
          {showContext ? t('topbar.hideContext') : t('topbar.addContext')}
        </button>

        <button
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border transition hover:bg-accent md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={t('topbar.settings')}
          aria-expanded={menuOpen}
        >
          <Menu size={15} />
        </button>

        <button
          className="h-8 shrink-0 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          disabled={!canGenerate}
          onClick={submit}
        >
          {busy ? t('topbar.working') : t('topbar.generate')}
        </button>
      </div>

      {/* 15.1.2 / 15.1.4 — optional long-form context document row. */}
      {showContext && (
        <div
          className="w-full"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            readContextFile(e.dataTransfer.files[0]);
          }}
        >
          <textarea
            className="min-h-[72px] w-full resize-y rounded-md border bg-background px-2.5 py-1.5 text-sm leading-snug outline-none focus:ring-2 focus:ring-ring"
            name="context-document"
            placeholder={t('topbar.contextPlaceholder')}
            value={contextDoc}
            onChange={(e) => setContextDoc(e.target.value)}
          />
          <label className="mt-1 inline-flex cursor-pointer items-center text-[11px] text-muted-foreground underline">
            {t('topbar.contextChooseFile')}
            <input
              type="file"
              accept=".md,.markdown,.txt"
              className="hidden"
              onChange={(e) => readContextFile(e.target.files?.[0])}
            />
          </label>
        </div>
      )}

      {/* config controls — inline on desktop, collapsible drawer on mobile */}
      <div
        className={cn(
          'flex-col gap-2 md:contents',
          menuOpen ? 'flex' : 'hidden',
        )}
      >
      <select
        className={FIELD}
        name="provider"
        value={provider}
        onChange={(e) => changeProvider(e.target.value as ProviderId)}
        aria-label={t('topbar.provider')}
      >
        <option value="default">Default (Demo)</option>
        <option value="gemini">Gemini</option>
        <option value="openai" disabled>OpenAI (coming soon)</option>
      </select>

      <select
        className={FIELD}
        name="model"
        value={inCatalog ? model : CUSTOM_MODEL}
        onChange={(e) =>
          changeModel(e.target.value === CUSTOM_MODEL ? '' : e.target.value)
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
          onChange={(e) => changeModel(e.target.value)}
          autoComplete="off"
        />
      )}

      <select
        className={FIELD}
        name="thinking"
        value={thinkingLevel}
        onChange={(e) => changeThinking(e.target.value as ThinkingLevel)}
        aria-label={reasoningLabel}
      >
        {THINKING_LEVELS.map((lvl) => (
          <option key={lvl} value={lvl}>
            {reasoningLabel} · {lvl}
          </option>
        ))}
      </select>

      {/* 15 — web grounding toggle, Gemini only (the demo gateway can't ground) */}
      {provider === 'gemini' && (
        <label
          className="flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm whitespace-nowrap"
          title={t('topbar.webGroundingHint')}
        >
          <input
            type="checkbox"
            checked={webGrounding}
            onChange={(e) => setWebGrounding(e.target.checked)}
          />
          {t('topbar.webGrounding')}
        </label>
      )}

      {provider === 'default' ? (
        <span
          className="flex h-8 items-center rounded-md border border-dashed px-2.5 text-sm text-muted-foreground"
          title={t('empty.demoNote')}
        >
          {t('topbar.demoKey')}
        </span>
      ) : (
        <>
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
          <label
            className="flex items-center gap-1.5 text-sm whitespace-nowrap"
            title={t('topbar.rememberKeyHint')}
          >
            <input
              type="checkbox"
              checked={rememberKey}
              onChange={(e) => setRememberKey(e.target.checked)}
            />
            {t('topbar.rememberKey')}
          </label>
        </>
      )}

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
        onClick={onOpenSettings}
        aria-label={t('topbar.settings')}
        title={t('topbar.settings')}
      >
        <Settings size={15} />
      </button>

      <button
        className="grid h-8 w-8 place-items-center rounded-md border transition hover:bg-accent"
        onClick={toggleTheme}
        aria-label={themeLabel}
        title={themeLabel}
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>

        <button
          className="h-8 rounded-md border px-3 text-sm font-medium transition hover:bg-accent disabled:opacity-40"
          disabled={reportDisabled}
          onClick={onOpenReport}
        >
          {t('topbar.report')}
        </button>
      </div>
    </header>
  );
}
