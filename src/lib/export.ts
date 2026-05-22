import type { ReportAudience, ThoughtTree } from '@/types/tree';
import { getChildren, getRootNode } from '@/lib/store/treeStore';
import { buildClosedLoops, findKeyInsightIds } from '@/lib/agent/report';

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

// Phase 5.4.4 — the generated report as a standalone Markdown file.
export function exportReportMarkdown(markdown: string, topic: string): void {
  download(`got-report-${slug(topic)}.md`, markdown, 'text/markdown');
}

// Phase 5.4.5 — structured bundle: the full tree plus the rendered report.
export function exportReportJson(
  tree: ThoughtTree,
  markdown: string,
  audience: ReportAudience,
): void {
  const bundle = {
    exportedAt: new Date().toISOString(),
    audience,
    report: markdown,
    tree,
  };
  download(
    `got-report-${slug(tree.rootTopic)}.json`,
    JSON.stringify(bundle, null, 2),
    'application/json',
  );
}

// 16 (15.2.2) — the agent-audience report saved as a PLAN.md the user can
// hand straight to an AI coding agent.
export function exportAgentPlan(markdown: string): void {
  download('PLAN.md', markdown, 'text/markdown');
}

// 16 (15.2.3) — a structured agent brief for programmatic CLI ingestion:
// the winning-path plan plus the key insights and convergence points that
// justify it, so an agent does not have to re-parse the prose.
export function exportAgentBrief(tree: ThoughtTree, plan: string): void {
  const keyInsights = findKeyInsightIds(tree)
    .map((id) => tree.nodes[id])
    .filter((n): n is NonNullable<typeof n> => Boolean(n))
    .map((n) => ({
      thought: n.thought,
      rationale: n.rationale,
      score: n.score,
      role: n.role ?? null,
    }));
  const convergence = buildClosedLoops(tree).map((l) => ({
    a: l.thoughtA,
    b: l.thoughtB,
    roleA: l.roleA ?? null,
    roleB: l.roleB ?? null,
    verdict: l.verdict,
    explanation: l.explanation,
  }));
  const brief = {
    schema: 'got-agent-brief/1',
    exportedAt: new Date().toISOString(),
    topic: tree.rootTopic,
    contextDocument: tree.contextDocument ?? null,
    plan,
    keyInsights,
    convergence,
  };
  download(
    `agent-brief-${slug(tree.rootTopic)}.json`,
    JSON.stringify(brief, null, 2),
    'application/json',
  );
}
