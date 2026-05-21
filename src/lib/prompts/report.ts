import type { ReportAudience } from '@/types/tree';

// Audience-specific report templates (production-report.md §2). The `system`
// string sets the analyst persona; `sections` is the exact section list the
// model must produce. The user prompt (built in agent/report.ts) supplies the
// compact tree, closed-loop pairs and key insights.
export interface ReportTemplate {
  system: string;
  sections: string;
}

export const REPORT_TEMPLATES: Record<ReportAudience, ReportTemplate> = {
  engineer: {
    system:
      'You are a senior systems engineer. You synthesize a Graph-of-Thought ' +
      'reasoning tree into a precise, technical System Design Report that an ' +
      'engineering team can act on directly.',
    sections: [
      '## Executive Summary — the highest-scoring directions and the convergence points, framed as the closed loop (闭环)',
      '## Branch Analysis — technical feasibility, risks and dependencies of each major branch',
      '## Convergence Signals — which technical directions were independently derived by more than one path',
      '## System Design Recommendations — turn the convergence nodes into concrete architecture decisions',
      '## Pruned Paths — discarded directions and why (so the team avoids repeating dead ends)',
      '## Next Expansion Targets — mid-score, under-explored nodes worth deepening',
    ].join('\n'),
  },
  manager: {
    system:
      'You are a strategic advisor. You synthesize a Graph-of-Thought ' +
      'reasoning tree into a Strategic Direction Report for leadership — ' +
      'decisions and priorities, not technical detail.',
    sections: [
      '## Topic Goal — the problem stated in one sentence',
      '## Top Directions — the 3-5 highest-scoring directions, no technical jargon',
      '## Convergence → Decisions — each closed loop is a cross-team consensus decision point',
      '## Risk Matrix — low-scoring branches summarised as identified risks',
      '## Department Mapping — which direction each team / department should own',
      '## Recommended Next Steps — priority-ordered action items',
    ].join('\n'),
  },
  researcher: {
    system:
      'You are a research analyst. You synthesize a Graph-of-Thought ' +
      'reasoning tree into a Knowledge Map Report — hypotheses, evidence and ' +
      'open questions.',
    sections: [
      '## Research Question — the original topic as a research question',
      '## Hypothesis Space — every Layer-1 branch treated as a candidate hypothesis',
      '## Evidence Convergence — multi-path convergence as cross-dimensional evidence support',
      '## Knowledge Gaps — under-explored, low-scoring or pruned regions',
      '## Semantic Similarity Map — narrative summary of how branches cluster',
      '## Research Directions — under-explored nodes that are promising future work',
    ].join('\n'),
  },
};
