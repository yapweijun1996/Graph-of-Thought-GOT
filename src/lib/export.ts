import type { ThoughtTree } from '@/types/tree';
import { getChildren, getRootNode } from '@/lib/store/treeStore';

// Triggers a client-side file download — no backend (CLAUDE.md §2.1).
function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function slug(topic: string): string {
  return (
    topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'graph'
  );
}

// Renders the tree as an indented Markdown outline plus a convergence section.
export function treeToMarkdown(tree: ThoughtTree): string {
  const lines: string[] = [
    `# ${tree.rootTopic}`,
    '',
    `> Graph-of-Thought export · ${new Date(tree.createdAt)
      .toISOString()
      .slice(0, 10)}`,
    '',
  ];

  const root = getRootNode(tree);
  const visited = new Set<string>();
  const walk = (nodeId: string, depth: number): void => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = tree.nodes[nodeId];
    if (!node) return;
    if (depth > 0) {
      const indent = '  '.repeat(depth - 1);
      const score = node.score > 0 ? ` _(score ${node.score}/10)_` : '';
      const fav = node.status === 'favorited' ? ' ★' : '';
      const pruned = node.status === 'pruned' ? ' ~~(pruned)~~' : '';
      lines.push(`${indent}- **${node.thought}**${score}${fav}${pruned}`);
      if (node.rationale) lines.push(`${indent}  ${node.rationale}`);
    }
    for (const child of getChildren(tree, nodeId)) walk(child.id, depth + 1);
  };
  if (root) walk(root.id, 0);

  const conv = tree.edges.filter((e) => e.type === 'convergence');
  if (conv.length > 0) {
    lines.push('', '## Convergence edges', '');
    for (const e of conv) {
      const a = tree.nodes[e.source]?.thought ?? e.source;
      const b = tree.nodes[e.target]?.thought ?? e.target;
      const verdict = e.verdict ? ` — ${e.verdict}` : '';
      const why = e.explanation ? `: ${e.explanation}` : '';
      lines.push(`- **${a}** ↔ **${b}**${verdict}${why}`);
    }
  }

  return lines.join('\n') + '\n';
}

export function exportTreeJson(tree: ThoughtTree): void {
  download(
    `got-${slug(tree.rootTopic)}.json`,
    JSON.stringify(tree, null, 2),
    'application/json',
  );
}

export function exportTreeMarkdown(tree: ThoughtTree): void {
  download(
    `got-${slug(tree.rootTopic)}.md`,
    treeToMarkdown(tree),
    'text/markdown',
  );
}
