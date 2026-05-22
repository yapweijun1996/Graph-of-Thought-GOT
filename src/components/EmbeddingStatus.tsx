import { useEmbedderStore } from '@/lib/store/embedderStore';
import { useT } from '@/lib/i18n';

// Floating pill shown while the in-browser embedding model loads (or if it
// fails). Hidden once the model is ready (Phase 3.5).
export default function EmbeddingStatus() {
  const status = useEmbedderStore((s) => s.status);
  const progress = useEmbedderStore((s) => s.progress);
  const t = useT();

  if (status !== 'loading' && status !== 'error') return null;

  const pct = Math.round(progress * 100);

  return (
    // role/aria-live (10.2.1) so screen readers announce load progress.
    // pointer-events-none (10.1.6) is intentional: the pill has no interactive
    // content, so it passes every click straight through to the canvas behind
    // it — it never blocks the UI (confirmed non-issue B8).
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2"
    >
      {status === 'error' ? (
        <div className="rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-700 shadow-md dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {t('embedder.error')}
        </div>
      ) : (
        <div className="w-64 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground shadow-md">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span>{t('embedder.loading')}</span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
