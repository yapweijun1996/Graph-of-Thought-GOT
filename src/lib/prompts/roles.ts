import type { RoleId } from '@/types/tree';

// Multi-role agent branches (Phase 8.1). Each initial branch is generated from
// a distinct analytical persona, so a convergence edge between two *different*
// roles ("the skeptic and the optimist independently agreed") is a genuine
// signal rather than two near-duplicate prompts landing close.

export interface RoleDef {
  id: RoleId;
  label: string; // short UI label shown on the node badge
  // One sentence injected into the expand prompt to steer the branch.
  persona: string;
  // Tailwind classes for the node badge — cool/purple hues, deliberately
  // distinct from the score palette (red/amber/emerald) so the two encodings
  // never read as the same thing (8.1.4).
  badgeClass: string;
}

export const ROLE_CATALOG: RoleDef[] = [
  {
    id: 'optimist',
    label: 'Optimist',
    persona:
      'the Optimist — surface the highest-upside, most ambitious version of ' +
      'this direction; assume resources and goodwill; focus on what becomes ' +
      'possible if it works.',
    badgeClass:
      'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300',
  },
  {
    id: 'skeptic',
    label: 'Skeptic',
    persona:
      'the Skeptic — probe the weakest assumption; surface the failure mode, ' +
      'the hidden cost, the reason this direction could go wrong.',
    badgeClass:
      'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300',
  },
  {
    id: 'pragmatist',
    label: 'Pragmatist',
    persona:
      'the Pragmatist — favour the cheapest, fastest, lowest-risk path that ' +
      'actually ships; cut scope to what is realistic right now.',
    badgeClass:
      'bg-slate-200 text-slate-700 dark:bg-slate-700/70 dark:text-slate-200',
  },
  {
    id: 'first-principles',
    label: 'First Principles',
    persona:
      'the First-Principles thinker — ignore convention and analogy; rebuild ' +
      'the direction from the fundamental truths of the problem.',
    badgeClass:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300',
  },
  {
    id: 'contrarian',
    label: 'Contrarian',
    persona:
      'the Contrarian — deliberately take the angle most people would ' +
      'reject; invert the obvious assumption and defend the inversion.',
    badgeClass:
      'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/60 dark:text-fuchsia-300',
  },
];

export const ROLE_BY_ID: Record<RoleId, RoleDef> = Object.fromEntries(
  ROLE_CATALOG.map((r) => [r.id, r]),
) as Record<RoleId, RoleDef>;

// Roles assigned to the first N initial branches, one per branch. When the
// user asks for more branches than the catalog has, roles cycle.
export function rolesForBranches(count: number): RoleId[] {
  const out: RoleId[] = [];
  for (let i = 0; i < count; i++) {
    out.push(ROLE_CATALOG[i % ROLE_CATALOG.length].id);
  }
  return out;
}
