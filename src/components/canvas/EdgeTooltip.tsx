import { useCanvasStore } from '@/lib/store/canvasStore';
import { useTreeStore } from '@/lib/store/treeStore';
import { useT, type TranslationKey } from '@/lib/i18n';
import type { ConvergenceVerdict } from '@/types/tree';

// 14.5.2 — floating panel describing the convergence edge under the cursor:
// the two reasoning paths that met, their similarity, the LLM verdict and its
// explanation. Sits bottom-left so it never obscures the hovered edge.

const VERDICT_KEY: Record<ConvergenceVerdict, TranslationKey> = {
  convergence: 'edge.verdictConvergence',
  redundancy: 'edge.verdictRedundancy',
  coincidence: 'edge.verdictCoincidence',
};

export default function EdgeTooltip() {
  const t = useT();
  const hoveredEdgeId = useCanvasStore((s) => s.hoveredEdgeId);
  const tree = useTreeStore((s) => s.tree);
  const edge = tree?.edges.find((e) => e.id === hoveredEdgeId);

  if (!tree || !edge || edge.type !== 'convergence') return null;
  const a = tree.nodes[edge.source];
  const b = tree.nodes[edge.target];
  if (!a || !b) return null;

  const pct = Math.round((edge.similarity ?? 0) * 100);
  const verdict = edge.verdict ? t(VERDICT_KEY[edge.verdict]) : '';

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-40 max-w-sm rounded-md border bg-background/95 p-3 text-xs shadow-lg backdrop-blur">
      <div className="mb-1.5 flex items-center gap-2">
        {verdict && <span className="font-semibold">{verdict}</span>}
        <span className="text-muted-foreground">
          {t('edge.similarity')} {pct}%
        </span>
      </div>
      <p className="mb-1 leading-snug">
        <span className="mr-1 font-semibold text-blue-600 dark:text-blue-400">
          A
        </span>
        {a.thought}
      </p>
      <p className="mb-1 leading-snug">
        <span className="mr-1 font-semibold text-blue-600 dark:text-blue-400">
          B
        </span>
        {b.thought}
      </p>
      {edge.explanation && (
        <p className="leading-snug text-muted-foreground">{edge.explanation}</p>
      )}
    </div>
  );
}
