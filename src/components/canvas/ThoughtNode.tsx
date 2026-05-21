import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { ThoughtNode } from '@/types/tree';
import { cn } from '@/lib/utils';
import { useTreeStore } from '@/lib/store/treeStore';
import { useT } from '@/lib/i18n';

export type ThoughtNodeData = { node: ThoughtNode };
export type ThoughtFlowNode = Node<ThoughtNodeData, 'thought'>;

// Border + fill by evaluator score (DESIGN.md §7.2), with dark-mode variants.
// score 0 means "not yet evaluated" — kept neutral rather than red.
function scoreClasses(node: ThoughtNode): string {
  if (node.status === 'pruned') return 'border-border bg-muted';
  if (node.score <= 0) return 'border-border bg-card';
  if (node.score <= 3)
    return 'border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/50';
  if (node.score <= 6)
    return 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/50';
  return 'border-emerald-500 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/50';
}

function ThoughtNodeView({ data, selected }: NodeProps) {
  const { node } = data as ThoughtNodeData;
  const t = useT();
  const pending = useTreeStore((s) => s.pendingNodeIds.includes(node.id));
  const maxLayers = useTreeStore(
    (s) => s.tree?.config.maxExpansionLayers ?? Infinity,
  );
  const isPruned = node.status === 'pruned';
  const canExpand =
    node.status === 'pending' && !pending && node.layer < maxLayers;

  return (
    <div
      className={cn(
        'w-[248px] rounded-lg border-2 px-3 py-2 shadow-sm transition',
        scoreClasses(node),
        selected && 'ring-2 ring-ring',
        isPruned && 'opacity-60',
      )}
    >
      <Handle type="target" position={Position.Top} />

      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">
          L{node.layer}
        </span>
        {node.score > 0 && (
          <span className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">
            {node.score}/10
          </span>
        )}
        {node.status === 'favorited' && <span aria-label="favorited">★</span>}
        {isPruned && (
          <span className="uppercase tracking-wide">{t('node.pruned')}</span>
        )}
      </div>

      <p className="line-clamp-3 text-sm font-medium leading-snug text-foreground">
        {node.thought}
      </p>

      {pending ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {t('node.expanding')}
        </p>
      ) : (
        canExpand && (
          <p className="mt-2 text-[11px] italic text-muted-foreground">
            {t('node.expandHint')}
          </p>
        )
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default ThoughtNodeView;
