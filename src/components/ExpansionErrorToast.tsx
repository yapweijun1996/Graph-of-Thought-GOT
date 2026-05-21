import { useExpansionErrorStore } from '@/lib/store/expansionErrorStore';
import { runExpansion } from '@/lib/agent/expand';
import { useT } from '@/lib/i18n';

// Dismissible toast for expansion failures (Phase 6.2). Offers a one-click
// retry of exactly the expansion that failed.
export default function ExpansionErrorToast() {
  const t = useT();
  const error = useExpansionErrorStore((s) => s.error);
  const clearError = useExpansionErrorStore((s) => s.clearError);

  if (!error) return null;

  const retry = () => {
    const { parentId } = error;
    clearError();
    void runExpansion(parentId);
  };

  return (
    <div className="fixed left-1/2 top-14 z-50 w-full max-w-md -translate-x-1/2 px-4">
      <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 shadow-md dark:border-red-800 dark:bg-red-950 dark:text-red-200">
        <span className="flex-1">
          {t('expand.failed', { message: error.message })}
        </span>
        <button
          className="h-7 shrink-0 rounded border border-red-300 px-2 text-xs font-medium transition hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900"
          onClick={retry}
        >
          {t('expand.retry')}
        </button>
        <button
          className="h-7 shrink-0 rounded px-2 text-xs font-medium transition hover:bg-red-100 dark:hover:bg-red-900"
          onClick={clearError}
        >
          {t('expand.dismiss')}
        </button>
      </div>
    </div>
  );
}
