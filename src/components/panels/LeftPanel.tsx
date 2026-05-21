import { useState } from 'react';
import { useTreeStore } from '@/lib/store/treeStore';
import { useLibraryStore } from '@/lib/store/libraryStore';
import { useT, type TranslationKey } from '@/lib/i18n';
import { exportTreeJson, exportTreeMarkdown } from '@/lib/export';
import { buildShareUrl } from '@/lib/share';
import { expandAllPending } from '@/lib/agent/expand';
import {
  deleteTree,
  loadTree,
  setCurrentTreeId,
} from '@/lib/db/indexeddb';
import { cn } from '@/lib/utils';
import type { ThoughtTree } from '@/types/tree';

interface TreeStats {
  nodes: number;
  layers: number;
  convergence: number;
  tokens: number;
  pruned: number;
  favorited: number;
  expandable: number;
}

function computeStats(tree: ThoughtTree): TreeStats {
  const nodes = Object.values(tree.nodes);
  let layers = 0;
  let tokens = 0;
  let pruned = 0;
  let favorited = 0;
  let expandable = 0;
  for (const n of nodes) {
    if (n.layer + 1 > layers) layers = n.layer + 1;
    tokens += n.metadata.tokenCost;
    if (n.status === 'pruned') pruned++;
    if (n.status === 'favorited') favorited++;
    if (n.status === 'pending' && n.layer < tree.config.maxExpansionLayers) {
      expandable++;
    }
  }
  return {
    nodes: nodes.length,
    layers,
    convergence: tree.edges.filter((e) => e.type === 'convergence').length,
    tokens,
    pruned,
    favorited,
    expandable,
  };
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

// Left sidebar — current-graph overview, one-pass expand-all, export, and the
// multi-tree library (switch / delete).
export default function LeftPanel() {
  const t = useT();
  const tree = useTreeStore((s) => s.tree);
  const busy = useTreeStore((s) => s.pendingNodeIds.length > 0);
  const hydrate = useTreeStore((s) => s.hydrate);
  const resetTree = useTreeStore((s) => s.resetTree);
  const summaries = useLibraryStore((s) => s.summaries);
  const refreshLibrary = useLibraryStore((s) => s.refresh);
  const [copied, setCopied] = useState(false);

  const stats = tree ? computeStats(tree) : null;
  const rows: { key: TranslationKey; value: string }[] = stats
    ? [
        { key: 'left.nodes', value: String(stats.nodes) },
        { key: 'left.layers', value: String(stats.layers) },
        { key: 'left.convergence', value: String(stats.convergence) },
        { key: 'left.tokens', value: stats.tokens.toLocaleString() },
        { key: 'left.prunedCount', value: String(stats.pruned) },
        { key: 'left.favoritedCount', value: String(stats.favorited) },
      ]
    : [];

  // Switching / deleting trees is blocked while an expansion is in flight:
  // runExpansion writes its result into whatever tree is live when its await
  // resolves, so swapping the tree mid-flight would land children in the
  // wrong graph.
  const switchTree = async (id: string) => {
    if (busy || id === tree?.id) return;
    const loaded = await loadTree(id);
    if (loaded) {
      hydrate(loaded);
      setCurrentTreeId(id);
    }
  };

  const shareTree = async () => {
    if (!tree) return;
    try {
      await navigator.clipboard.writeText(buildShareUrl(tree));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.error('[share] clipboard write failed:', e);
    }
  };

  const removeTree = async (id: string) => {
    if (busy) return;
    if (!window.confirm(t('left.deleteConfirm'))) return;
    await deleteTree(id);
    const trees = await refreshLibrary();
    if (tree?.id === id) {
      const next = [...trees].sort((a, b) => b.createdAt - a.createdAt)[0];
      if (next) {
        hydrate(next);
        setCurrentTreeId(next.id);
      } else {
        resetTree();
        setCurrentTreeId(null);
      }
    }
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r bg-background">
      <div className="border-b px-4 py-2.5">
        <h2 className="text-sm font-semibold">{t('left.title')}</h2>
      </div>

      {!tree || !stats ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
          {t('left.noTree')}
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-4 py-4">
          <section>
            <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('left.topic')}
            </h3>
            <p className="text-sm font-medium leading-snug text-foreground">
              {tree.rootTopic}
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            {rows.map((r) => (
              <StatRow key={r.key} label={t(r.key)} value={r.value} />
            ))}
          </section>

          {stats.expandable > 0 && (
            <button
              className="h-8 rounded-md border text-sm font-medium transition hover:bg-accent disabled:opacity-40"
              disabled={busy}
              onClick={() => void expandAllPending()}
            >
              {t('left.expandAll')} ({stats.expandable})
            </button>
          )}

          <section>
            <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('left.export')}
            </h3>
            <div className="flex gap-2">
              <button
                className="h-8 flex-1 rounded-md border text-sm font-medium transition hover:bg-accent"
                onClick={() => exportTreeJson(tree)}
              >
                {t('left.exportJson')}
              </button>
              <button
                className="h-8 flex-1 rounded-md border text-sm font-medium transition hover:bg-accent"
                onClick={() => exportTreeMarkdown(tree)}
              >
                {t('left.exportMarkdown')}
              </button>
            </div>
            <button
              className="mt-2 h-8 w-full rounded-md border text-sm font-medium transition hover:bg-accent"
              onClick={() => void shareTree()}
            >
              {copied ? t('left.shareCopied') : t('left.share')}
            </button>
          </section>

          {summaries.length > 0 && (
            <section>
              <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('left.library')}
              </h3>
              <div className="flex flex-col gap-1">
                {summaries.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      'flex items-center gap-1 rounded-md border px-2 py-1.5',
                      s.id === tree.id
                        ? 'border-primary bg-accent'
                        : 'border-border',
                      busy && 'opacity-50',
                    )}
                  >
                    <button
                      className="min-w-0 flex-1 text-left"
                      disabled={busy}
                      onClick={() => void switchTree(s.id)}
                    >
                      <span className="block truncate text-sm font-medium">
                        {s.rootTopic || '—'}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {s.nodeCount} · {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                    <button
                      className="shrink-0 px-1 text-sm text-muted-foreground transition hover:text-red-500 disabled:hover:text-muted-foreground"
                      disabled={busy}
                      onClick={() => void removeTree(s.id)}
                      aria-label="delete graph"
                      title={t('left.deleteConfirm')}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </aside>
  );
}
