import { useTreeStore } from '@/lib/store/treeStore';
import { useT } from '@/lib/i18n';
import type { ThoughtNode } from '@/types/tree';

// Score text colour, mirroring the node border buckets (DESIGN.md §7.2).
function scoreColor(score: number): string {
  if (score <= 0) return 'text-muted-foreground';
  if (score <= 3) return 'text-red-500 dark:text-red-400';
  if (score <= 6) return 'text-amber-500 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

// Detail panel for the selected node — shows the full thought + rationale
// (the canvas node truncates the thought to 3 lines and hides the rationale).
export default function RightPanel() {
  const t = useT();
  const tree = useTreeStore((s) => s.tree);
  const selectedNodeId = useTreeStore((s) => s.selectedNodeId);
  const pruneNode = useTreeStore((s) => s.pruneNode);
  const favoriteNode = useTreeStore((s) => s.favoriteNode);
  const node: ThoughtNode | undefined =
    tree && selectedNodeId ? tree.nodes[selectedNodeId] : undefined;

  const isRoot = node?.layer === 0;
  const isPruned = node?.status === 'pruned';
  const isFavorited = node?.status === 'favorited';

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l bg-background">
      <div className="border-b px-4 py-2.5">
        <h2 className="text-sm font-semibold">{t('panel.title')}</h2>
      </div>

      {!node ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
          {t('panel.empty')}
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-4 py-4">
          <span className="w-fit rounded bg-black/5 px-1.5 py-0.5 text-[11px] text-muted-foreground dark:bg-white/10">
            L{node.layer}
          </span>

          <section>
            <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('panel.thought')}
            </h3>
            <p className="text-sm leading-snug text-foreground">
              {node.thought}
            </p>
          </section>

          {node.rationale && (
            <section>
              <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('panel.rationale')}
              </h3>
              <p className="text-sm leading-snug text-foreground">
                {node.rationale}
              </p>
            </section>
          )}

          <section>
            <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('panel.score')}
            </h3>
            <p className={`text-sm font-semibold ${scoreColor(node.score)}`}>
              {node.score > 0 ? `${node.score}/10` : t('panel.notScored')}
            </p>
          </section>

          {node.reasoning && (
            <section>
              <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('panel.reasoning')}
              </h3>
              <p className="text-sm leading-snug text-muted-foreground">
                {node.reasoning}
              </p>
            </section>
          )}

          {!isRoot && (
            <section>
              <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('panel.actions')}
              </h3>
              <div className="flex gap-2">
                <button
                  className="h-8 flex-1 rounded-md border text-sm font-medium transition hover:bg-accent disabled:opacity-40"
                  disabled={isFavorited || isPruned}
                  onClick={() => favoriteNode(node.id)}
                >
                  {isFavorited
                    ? `★ ${t('panel.favorited')}`
                    : `☆ ${t('panel.favorite')}`}
                </button>
                <button
                  className="h-8 flex-1 rounded-md border text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950/40"
                  disabled={isPruned}
                  onClick={() => pruneNode(node.id)}
                >
                  {isPruned ? t('panel.pruned') : t('panel.prune')}
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </aside>
  );
}
