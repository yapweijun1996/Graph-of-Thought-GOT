import { useMemo, useState } from 'react';
import { useT, type TranslationKey } from '@/lib/i18n';
import { usePrefsStore } from '@/lib/store/prefsStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useTreeStore } from '@/lib/store/treeStore';
import { runReportGeneration } from '@/lib/agent/report';
import type { ReportAudience, ReportConfig } from '@/types/tree';

const AUDIENCE_KEY: Record<ReportAudience, TranslationKey> = {
  engineer: 'report.audienceEngineer',
  manager: 'report.audienceManager',
  researcher: 'report.audienceResearcher',
  agent: 'report.audienceAgent',
};

const FIELD =
  'h-8 rounded-md border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring';

// Report options modal (Phase 5.1.4). Collects a ReportConfig and kicks off
// runReportGeneration. Mounted only while open, so it re-reads defaults each
// time it appears.
export default function ReportConfigModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const lang = usePrefsStore((s) => s.lang);
  const defaultAudience = useSettingsStore((s) => s.reportAudience);

  const tree = useTreeStore((s) => s.tree);

  const [audience, setAudience] = useState<ReportAudience>(defaultAudience);
  const [minScore, setMinScore] = useState(0);
  const [includeConvergence, setIncludeConvergence] = useState(true);
  const [includePruned, setIncludePruned] = useState(true);

  // 10.1.5 — live preview of how many nodes survive the current filters,
  // mirroring compactTree: root always kept, pruned dropped unless included.
  const nodeCount = useMemo(() => {
    const all = tree ? Object.values(tree.nodes) : [];
    let included = 0;
    for (const n of all) {
      if (n.status === 'pruned' && !includePruned) continue;
      // B21 — same rule as compactTree: an unscored (score 0) node is kept.
      if (n.layer > 0 && n.score > 0 && n.score < minScore) continue;
      included++;
    }
    return { included, total: all.length };
  }, [tree, minScore, includePruned]);

  const submit = () => {
    const config: ReportConfig = {
      audience,
      minScore,
      includeConvergence,
      includePruned,
      language: lang,
    };
    onClose();
    void runReportGeneration(config);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-sm font-semibold">{t('report.configTitle')}</h2>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('report.audience')}
            </span>
            <select
              className={FIELD}
              name="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as ReportAudience)}
            >
              {(Object.keys(AUDIENCE_KEY) as ReportAudience[]).map((a) => (
                <option key={a} value={a}>
                  {t(AUDIENCE_KEY[a])}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('report.minScore')}: {minScore}
            </span>
            <input
              type="range"
              name="minScore"
              min={0}
              max={10}
              step={1}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
            />
            <span className="text-[11px] text-muted-foreground">
              {t('report.nodesIncluded', {
                n: String(nodeCount.included),
                total: String(nodeCount.total),
              })}
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeConvergence}
              onChange={(e) => setIncludeConvergence(e.target.checked)}
            />
            {t('report.includeConvergence')}
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includePruned}
              onChange={(e) => setIncludePruned(e.target.checked)}
            />
            {t('report.includePruned')}
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="h-8 rounded-md border px-3 text-sm font-medium transition hover:bg-accent"
            onClick={onClose}
          >
            {t('report.cancel')}
          </button>
          <button
            className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            onClick={submit}
          >
            {t('report.generate')}
          </button>
        </div>
      </div>
    </div>
  );
}
