import { useTreeStore } from '@/lib/store/treeStore';
import { useT, type TranslationKey } from '@/lib/i18n';
import type { ThoughtTree } from '@/types/tree';

interface TreeStats {
  nodes: number;
  layers: number;
  convergence: number;
  tokens: number;
  pruned: number;
  favorited: number;
}

function computeStats(tree: ThoughtTree): TreeStats {
  const nodes = Object.values(tree.nodes);
  let layers = 0;
  let tokens = 0;
  let pruned = 0;
  let favorited = 0;
  for (const n of nodes) {
    if (n.layer + 1 > layers) layers = n.layer + 1;
    tokens += n.metadata.tokenCost;
    if (n.status === 'pruned') pruned++;
    if (n.status === 'favorited') favorited++;
  }
  return {
    nodes: nodes.length,
    layers,
    convergence: tree.edges.filter((e) => e.type === 'convergence').length,
    tokens,
    pruned,
    favorited,
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

// Left sidebar — current-graph overview: node/layer/convergence counts and
// the running token cost (Σ node.metadata.tokenCost).
export default function LeftPanel() {
  const t = useT();
  const tree = useTreeStore((s) => s.tree);

  const rows: { key: TranslationKey; value: string }[] = tree
    ? (() => {
        const s = computeStats(tree);
        return [
          { key: 'left.nodes', value: String(s.nodes) },
          { key: 'left.layers', value: String(s.layers) },
          { key: 'left.convergence', value: String(s.convergence) },
          { key: 'left.tokens', value: s.tokens.toLocaleString() },
          { key: 'left.prunedCount', value: String(s.pruned) },
          { key: 'left.favoritedCount', value: String(s.favorited) },
        ];
      })()
    : [];

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r bg-background">
      <div className="border-b px-4 py-2.5">
        <h2 className="text-sm font-semibold">{t('left.title')}</h2>
      </div>

      {!tree ? (
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
        </div>
      )}
    </aside>
  );
}
