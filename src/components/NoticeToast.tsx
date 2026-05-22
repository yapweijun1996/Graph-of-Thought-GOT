import { useEffect } from 'react';
import { useNoticeStore } from '@/lib/store/noticeStore';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Dismissible toast for non-blocking notices (Phase 9). Auto-hides after a
// few seconds; the timer resets whenever a newer notice replaces this one
// (keyed off notice.id).
const AUTO_DISMISS_MS = 6000;

const KIND_CLASS: Record<string, string> = {
  info: 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
  warn: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
  error:
    'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
};

export default function NoticeToast() {
  const t = useT();
  const notice = useNoticeStore((s) => s.notice);
  const dismiss = useNoticeStore((s) => s.dismiss);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [notice, dismiss]);

  if (!notice) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-16 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4"
    >
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-md',
          KIND_CLASS[notice.kind],
        )}
      >
        <span className="flex-1">{notice.message}</span>
        {notice.action && (
          <button
            className="h-7 shrink-0 rounded border border-black/20 px-2 text-xs font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            onClick={() => {
              notice.action?.run();
              dismiss();
            }}
          >
            {notice.action.label}
          </button>
        )}
        <button
          className="h-7 shrink-0 rounded px-2 text-xs font-medium transition hover:bg-black/5 dark:hover:bg-white/10"
          onClick={dismiss}
        >
          {t('notice.dismiss')}
        </button>
      </div>
    </div>
  );
}
