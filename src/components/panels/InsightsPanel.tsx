import { useInsightsStore } from '@/lib/store/insightsStore';
import { useTreeStore } from '@/lib/store/treeStore';
import { useReportStore } from '@/lib/store/reportStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { usePrefsStore } from '@/lib/store/prefsStore';
import {
  buildClosedLoops,
  extractNextSteps,
  findKeyInsightIds,
  isCrossRoleLoop,
  recommendedPath,
  runReportGeneration,
} from '@/lib/agent/report';
import { ROLE_BY_ID } from '@/lib/prompts/roles';
import { useT } from '@/lib/i18n';
import Markdown from '@/components/Markdown';

// 19.1 — answer-first results view. Synthesises the graph into the actual
// outcome (top path, key insights, convergence) with NO LLM call, so the user
// gets the answer without decoding a 40-node graph. The full LLM Report is one
// click away (19.2). Auto-explore opens this on finish (19.3).
export default function InsightsPanel() {
  const t = useT();
  const isOpen = useInsightsStore((s) => s.isOpen);
  const close = useInsightsStore((s) => s.close);
  const tree = useTreeStore((s) => s.tree);
  const reportMarkdown = useReportStore((s) => s.markdown);
  const reportAudience = useSettingsStore((s) => s.reportAudience);
  const lang = usePrefsStore((s) => s.lang);

  if (!isOpen) return null;

  const path = tree ? recommendedPath(tree) : [];
  const keyInsights = tree
    ? findKeyInsightIds(tree)
        .map((id) => tree.nodes[id])
        .filter((n): n is NonNullable<typeof n> => Boolean(n))
    : [];
  const loops = tree ? buildClosedLoops(tree) : [];
  const nextSteps = reportMarkdown ? extractNextSteps(reportMarkdown) : null;
  // a graph worth synthesising has at least one expansion layer
  const hasGraph = path.length > 1;

  const generateReport = () => {
    close();
    void runReportGeneration({
      audience: reportAudience,
      minScore: 0,
      includeConvergence: true,
      includePruned: false,
      language: lang,
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <header className="flex items-center gap-2 border-b px-4 py-2.5">
        <h2 className="text-sm font-semibold">{t('insights.title')}</h2>
        <div className="flex-1" />
        {hasGraph && (
          <button
            className="h-8 rounded-md border px-3 text-sm font-medium transition hover:bg-accent"
            onClick={generateReport}
          >
            {t('insights.generateReport')}
          </button>
        )}
        <button
          className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          onClick={close}
        >
          {t('insights.close')}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {!hasGraph ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            {t('insights.empty')}
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-6">
            {tree && (
              <p className="text-sm text-muted-foreground">{tree.rootTopic}</p>
            )}

            {/* Recommended path — the single best root→leaf chain (19.4). */}
            <section>
              <h3 className="mb-2 text-sm font-semibold">
                {t('insights.recommendedPath')}
              </h3>
              <ol className="flex flex-col gap-2">
                {path.slice(1).map((n, i) => (
                  <li
                    key={n.id}
                    className="rounded-md border-l-4 border-amber-400 bg-amber-50/60 px-3 py-2 dark:bg-amber-950/30"
                  >
                    <div className="mb-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="font-semibold">{i + 1}</span>
                      {n.role && <span>{ROLE_BY_ID[n.role].label}</span>}
                      {n.score > 0 && <span>· {n.score}/10</span>}
                    </div>
                    <p className="text-sm leading-snug text-foreground">
                      {n.thought}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            {/* Key insights — top-percentile, multiply-converged nodes. */}
            <section>
              <h3 className="mb-2 text-sm font-semibold">
                {t('insights.keyInsights')}
              </h3>
              {keyInsights.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {keyInsights.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-md border px-3 py-2 text-sm leading-snug"
                    >
                      <span className="mr-1 text-orange-500">★</span>
                      {n.thought}
                      <span className="ml-1 text-[11px] text-muted-foreground">
                        ({n.score}/10)
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('insights.noKeyInsights')}
                </p>
              )}
            </section>

            {/* Convergence — independent paths that met (the 闭环). */}
            <section>
              <h3 className="mb-2 text-sm font-semibold">
                {t('insights.convergence')}
              </h3>
              {loops.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {loops.map((l, i) => (
                    <li
                      key={i}
                      className="rounded-md border px-3 py-2 text-sm leading-snug"
                    >
                      {isCrossRoleLoop(l) && (
                        <span className="mr-1 font-medium text-blue-600 dark:text-blue-400">
                          [{ROLE_BY_ID[l.roleA!].label} ↔{' '}
                          {ROLE_BY_ID[l.roleB!].label}]
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {l.explanation || `${l.thoughtA} ↔ ${l.thoughtB}`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('insights.noConvergence')}
                </p>
              )}
            </section>

            {/* 19.6 — next steps lifted out of the full report, when one exists. */}
            {nextSteps && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">
                  {t('insights.nextSteps')}
                </h3>
                <div className="rounded-md border px-3 py-2">
                  <Markdown source={nextSteps} />
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
