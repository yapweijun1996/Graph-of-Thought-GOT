import { getChildren, useTreeStore } from '@/lib/store/treeStore';
import { useNoticeStore } from '@/lib/store/noticeStore';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
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
  const unfavoriteNode = useTreeStore((s) => s.unfavoriteNode);
  const toggleFocus = useTreeStore((s) => s.toggleFocus);
  const toggleCollapse = useTreeStore((s) => s.toggleCollapse);
  const focusBranchId = useCanvasStore((s) => s.focusBranchId);
  const setFocusBranch = useCanvasStore((s) => s.setFocusBranch);
  const node: ThoughtNode | undefined =
    tree && selectedNodeId ? tree.nodes[selectedNodeId] : undefined;

  const childCount = tree && node ? getChildren(tree, node.id).length : 0;
  const isIsolated = !!node && focusBranchId === node.id;

  // 10.1.7 — prune the subtree, then offer a one-click undo via a toast.
  const pruneWithUndo = (id: string) => {
    pruneNode(id);
    const count = useTreeStore.getState().lastPrune.length;
    if (count === 0) return;
    useNoticeStore
      .getState()
      .show('info', t('notice.pruned', { n: String(count) }), {
        label: t('notice.undo'),
        run: () => useTreeStore.getState().undoPrune(),
      });
  };

  const isRoot = node?.layer === 0;
  const isPruned = node?.status === 'pruned';
  const isFavorited = node?.status === 'favorited';
  const isFocused = !!(
    node && tree?.config.focusBranches?.includes(node.id)
  );

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
            {/* 17.3 — per-node (per-call) token cost. */}
            {node.metadata.tokenCost > 0 && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {t('panel.tokenCost')}:{' '}
                {node.metadata.tokenCost.toLocaleString()}
              </p>
            )}
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

          {/* 15 (14.7) — web evidence gathered for this direction. */}
          {node.evidence && node.evidence.length > 0 && (
            <section>
              <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('panel.evidence')}
              </h3>
              <ul className="flex flex-col gap-2">
                {node.evidence.map((ev, i) => (
                  <li key={i} className="rounded-md border p-2 text-xs">
                    {ev.url && /^https?:\/\//i.test(ev.url) ? (
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 underline dark:text-blue-400"
                      >
                        {ev.title}
                      </a>
                    ) : (
                      <span className="font-medium text-foreground">
                        {ev.title}
                      </span>
                    )}
                    {ev.synthetic && (
                      <span className="ml-1 text-muted-foreground">
                        ({t('panel.evidenceSynthetic')})
                      </span>
                    )}
                    {ev.snippet && (
                      <p className="mt-0.5 leading-snug text-muted-foreground">
                        {ev.snippet}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
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
                  disabled={isPruned}
                  title={isPruned ? t('panel.disabledPruned') : undefined}
                  aria-label={
                    isFavorited ? t('panel.unfavorite') : t('panel.favorite')
                  }
                  onClick={() =>
                    isFavorited
                      ? unfavoriteNode(node.id)
                      : favoriteNode(node.id)
                  }
                >
                  {isFavorited
                    ? `★ ${t('panel.unfavorite')}`
                    : `☆ ${t('panel.favorite')}`}
                </button>
                <button
                  className="h-8 flex-1 rounded-md border text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950/40"
                  disabled={isPruned}
                  title={isPruned ? t('panel.disabledPruned') : undefined}
                  aria-label={t('panel.prune')}
                  onClick={() => pruneWithUndo(node.id)}
                >
                  {isPruned ? t('panel.pruned') : t('panel.prune')}
                </button>
              </div>
              <button
                className={cn(
                  'mt-2 h-8 w-full rounded-md border text-sm font-medium transition disabled:opacity-40',
                  isFocused
                    ? 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'hover:bg-accent',
                )}
                disabled={isPruned}
                title={isPruned ? t('panel.disabledPruned') : undefined}
                aria-label={isFocused ? t('panel.focused') : t('panel.focus')}
                onClick={() => toggleFocus(node.id)}
              >
                {isFocused
                  ? `● ${t('panel.focused')}`
                  : `○ ${t('panel.focus')}`}
              </button>

              {/* 14.7.1 — collapse / expand this node's subtree on the canvas */}
              {childCount > 0 && (
                <button
                  className="mt-2 h-8 w-full rounded-md border text-sm font-medium transition hover:bg-accent"
                  onClick={() => toggleCollapse(node.id)}
                >
                  {node.collapsed
                    ? `▶ ${t('panel.expandSubtree')} (${childCount})`
                    : `▼ ${t('panel.collapse')}`}
                </button>
              )}

              {/* 14.9.1 — isolate the canvas to this branch (ancestors + kids) */}
              <button
                className={cn(
                  'mt-2 h-8 w-full rounded-md border text-sm font-medium transition',
                  isIsolated
                    ? 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'hover:bg-accent',
                )}
                onClick={() =>
                  setFocusBranch(isIsolated ? null : node.id)
                }
              >
                {isIsolated
                  ? t('panel.exitFocus')
                  : t('panel.focusBranch')}
              </button>
            </section>
          )}
        </div>
      )}
    </aside>
  );
}
