import { useEmbedderStore } from '@/lib/store/embedderStore';
import { useT } from '@/lib/i18n';

// Floating pill shown while the in-browser embedding model loads (or if it
// fails). Hidden once the model is ready (Phase 3.5).
export default function EmbeddingStatus() {
  const status = useEmbedderStore((s) => s.status);
  const t = useT();

  if (status !== 'loading' && status !== 'error') return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div
        className={
          status === 'error'
            ? 'rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-700 shadow-md dark:border-red-800 dark:bg-red-950 dark:text-red-300'
            : 'rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-md'
        }
      >
        {status === 'loading' ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {t('embedder.loading')}
          </span>
        ) : (
          t('embedder.error')
        )}
      </div>
    </div>
  );
}
