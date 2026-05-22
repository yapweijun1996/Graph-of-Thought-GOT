import { useSessionStore } from '@/lib/store/sessionStore';
import { useT, type TranslationKey } from '@/lib/i18n';

// First-run onboarding (Phase 17.4) — shown in place of the canvas until the
// first graph exists. Explains what GOT is and offers one-click example
// topics so a new user is not staring at an empty canvas.
const EXAMPLE_KEYS: TranslationKey[] = ['empty.ex1', 'empty.ex2', 'empty.ex3'];

export default function EmptyState({
  onGenerate,
}: {
  onGenerate: (topic: string) => void;
}) {
  const t = useT();
  const provider = useSessionStore((s) => s.provider);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="max-w-md space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          {t('empty.title')}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t('empty.what')}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('empty.tryExample')}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLE_KEYS.map((k) => (
            <button
              key={k}
              className="rounded-full border px-3 py-1 text-sm transition hover:bg-accent"
              onClick={() => onGenerate(t(k))}
            >
              {t(k)}
            </button>
          ))}
        </div>
      </div>

      {/* 17.5 — BYOK note: the shared demo key is not for heavy use. */}
      {provider === 'default' && (
        <p className="max-w-sm text-[11px] text-muted-foreground">
          {t('empty.demoNote')}
        </p>
      )}
    </div>
  );
}
