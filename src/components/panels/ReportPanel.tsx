import { useState } from 'react';
import { useReportStore } from '@/lib/store/reportStore';
import { useTreeStore } from '@/lib/store/treeStore';
import { useT } from '@/lib/i18n';

// 9.10 — a raw provider error can be a multi-line stack or HTTP body; show a
// short head by default with an opt-in "Show details" expansion.
const ERROR_PREVIEW_CHARS = 200;
import { runReportGeneration } from '@/lib/agent/report';
import {
  exportAgentBrief,
  exportAgentPlan,
  exportReportJson,
  exportReportMarkdown,
} from '@/lib/export';
import { useNoticeStore } from '@/lib/store/noticeStore';
import Markdown from '@/components/Markdown';

// Full-screen report view (Phase 5.4.1). Overlays the app while open;
// shows the generating / error / ready states of the report store.
export default function ReportPanel() {
  const t = useT();
  const status = useReportStore((s) => s.status);
  const markdown = useReportStore((s) => s.markdown);
  const error = useReportStore((s) => s.error);
  const isPanelOpen = useReportStore((s) => s.isPanelOpen);
  const config = useReportStore((s) => s.config);
  const closePanel = useReportStore((s) => s.closePanel);
  const tree = useTreeStore((s) => s.tree);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  if (!isPanelOpen) return null;

  const fullError = error ?? '';
  const errorTruncated = fullError.length > ERROR_PREVIEW_CHARS;
  const shownError =
    showErrorDetails || !errorTruncated
      ? fullError
      : `${fullError.slice(0, ERROR_PREVIEW_CHARS)}…`;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <header className="flex items-center gap-2 border-b px-4 py-2.5">
        <h2 className="text-sm font-semibold">{t('report.title')}</h2>
        {config && (
          <span className="rounded bg-black/5 px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground dark:bg-white/10">
            {config.audience}
          </span>
        )}
        <div className="flex-1" />
        {status === 'ready' &&
          markdown &&
          tree &&
          (config?.audience === 'agent' ? (
            // 16 (15.2.4) — agent-targeted exports.
            <>
              <button
                className="h-8 rounded-md border px-3 text-sm font-medium transition hover:bg-accent"
                onClick={() => {
                  navigator.clipboard
                    .writeText(markdown)
                    .then(() =>
                      useNoticeStore
                        .getState()
                        .show('info', t('report.agentCopied')),
                    )
                    .catch(() =>
                      useNoticeStore
                        .getState()
                        .show('error', t('notice.shareCopyFailed')),
                    );
                }}
              >
                {t('report.exportAgent')}
              </button>
              <button
                className="h-8 rounded-md border px-3 text-sm font-medium transition hover:bg-accent"
                onClick={() => exportAgentPlan(markdown)}
              >
                {t('report.exportPlan')}
              </button>
              <button
                className="h-8 rounded-md border px-3 text-sm font-medium transition hover:bg-accent"
                onClick={() => exportAgentBrief(tree, markdown)}
              >
                {t('report.exportAgentJson')}
              </button>
            </>
          ) : (
            <>
              <button
                className="h-8 rounded-md border px-3 text-sm font-medium transition hover:bg-accent"
                onClick={() => exportReportMarkdown(markdown, tree.rootTopic)}
              >
                {t('report.exportMd')}
              </button>
              <button
                className="h-8 rounded-md border px-3 text-sm font-medium transition hover:bg-accent"
                onClick={() =>
                  exportReportJson(
                    tree,
                    markdown,
                    config?.audience ?? 'manager',
                  )
                }
              >
                {t('report.exportJson')}
              </button>
            </>
          ))}
        <button
          className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          onClick={closePanel}
        >
          {t('report.close')}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {status === 'generating' && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {t('report.generating')}
          </div>
        )}

        {status === 'error' && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="max-w-lg whitespace-pre-wrap break-words text-sm text-red-600 dark:text-red-400">
              {t('report.failed', { message: shownError })}
            </p>
            {errorTruncated && (
              <button
                className="text-xs font-medium text-muted-foreground underline transition hover:text-foreground"
                onClick={() => setShowErrorDetails((v) => !v)}
              >
                {showErrorDetails
                  ? t('report.hideDetails')
                  : t('report.showDetails')}
              </button>
            )}
            {config && (
              <button
                className="h-8 rounded-md border px-3 text-sm font-medium transition hover:bg-accent"
                onClick={() => void runReportGeneration(config)}
              >
                {t('report.retry')}
              </button>
            )}
          </div>
        )}

        {status === 'ready' && markdown && (
          <div className="mx-auto max-w-3xl px-6 py-6">
            <Markdown source={markdown} />
          </div>
        )}

        {status === 'idle' && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t('report.empty')}
          </div>
        )}
      </div>
    </div>
  );
}
