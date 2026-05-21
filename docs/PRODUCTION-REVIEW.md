# Production Readiness Review — Graph-of-Thought

> Date: 2026-05-22
> Verdict: **NOT production-ready.** One architectural blocker, several fixable polish items.

---

## 1. The fatal problem: the evaluator produces no signal

A real run (topic: "develop a GOT") produced a tree 7 layers deep where
**every node scored 8–9/10**. The whole tree is green.

GOT's value proposition is "guide the user to the most promising reasoning
path" — via score-driven node colour (red/yellow/green), prune suggestions,
and score gaps between branches. When every node scores 8–9:

- Colour coding is dead — the whole canvas is green.
- Prune suggestions can never fire — `DESIGN.md §4.3`'s rule
  ("score < 3 AND siblings > 6") can never be satisfied.
- The user cannot tell which of 7 layers is worth pursuing — which is *why*
  the user kept expanding to L7. **Tree depth is a symptom, not a separate
  problem**: nothing ever flagged a branch as weak.

A scoring system with no discriminative power degrades GOT into an expensive
auto-mindmap generator. This is the reason it cannot ship.

## 2. Root cause — two independent defects

Fixing only one of these will NOT fix the symptom.

### 2.1 Self-enhancement bias

`DEFAULT_TOT_CONFIG` sets `generatorModel === evaluatorModel ===
'gemini-3.1-flash-lite'`. **The same model generates the branches and then
scores them** — it grades its own homework and will not call its own ideas
weak.

Research: ["Judging LLM-as-a-judge with MT-Bench", arXiv 2306.05685](https://arxiv.org/pdf/2306.05685.pdf)
names this exact failure mode — *self-enhancement bias*: LLM judges favour
outputs from themselves / similar models.

### 2.2 Uncalibrated pointwise scoring

`prompts/evaluate.ts` asks the model to score one node 0–10 *in isolation* —
no comparison, no anchor. "Is this a 7 or a 9?" has no answer without a
reference. LLMs default to the high end of a rubric for plausible-sounding
content, and the generator is explicitly told to produce "actionable,
specific" branches — so the evaluator only ever sees plausible content.

Research: [FairJudge, arXiv 2602.06625](https://arxiv.org/pdf/2602.06625.pdf)
and [Sage, arXiv 2512.16041](https://arxiv.org/pdf/2512.16041.pdf) show that
even Gemini-2.5-Pro and GPT-5 are inconsistent in pointwise scoring mode.

> Swapping in a different judge model fixes 2.1 but leaves 2.2. Pointwise
> absolute scoring of plausible content inflates regardless of the judge.

### 2.3 The convergence verdict inherits the same bias

The LLM signal/noise verdict (`agent/convergence.ts`, commit `590df61`) asks
the *same* model whether two of *its own* branches are a meaningful
convergence. It will lean toward "meaningful." One root cause, two
manifestations (scoring + convergence) — they must be fixed together.

## 3. Secondary blockers (fixable polish, not architectural)

| Area | Issue |
|---|---|
| Cost | Unbounded. A deep tree fires dozens of LLM calls (expand + N×evaluate + ≤3×verdict). `DESIGN.md §8` / `CLAUDE.md §14` budget (<$0.10/session) is blown. `metadata.tokenCost` is hardwired to 0 — token accounting is not wired. No cost display. |
| Concurrency | `CLAUDE.md §10.3` requires a max-2 concurrent cap; not implemented. Deep trees + overlapping fire-and-forget chains can burst many concurrent Gemini calls → rate limits. |
| Error UX | Failures surface via `window.alert()`. |
| Persistence | IndexedDB stores a single tree (key `'current'`); generating a new tree overwrites the old. No history, no multi-project. |
| API key model | Client-side, user-supplied key — a demo / dev-tool model, not a consumer product shape. |

## 4. Research-backed fix directions (not yet implemented)

- **Separate judge model** — evaluate with a model different from the
  generator, to remove self-enhancement bias.
- **Replace pointwise scoring with sibling-relative ranking / pairwise
  comparison** — let the judge see the alternatives and rank, instead of
  emitting an isolated absolute score. Sage shows explicit rubrics + criteria
  improve consistency.
- **Anchor the rubric to concrete worst/best examples**, not prose.
- **Panel / multi-agent judging** ([CollabEval, arXiv 2603.00993](https://arxiv.org/pdf/2603.00993.pdf))
  — heavier, higher cost.

## 5. Underlying principle

An AI that judges its own output is a bias loop, not an evaluation
(see `KB skill.qa` — "actor ≠ verifier"). GOT currently violates this:
generator and evaluator are the same model. Meaningful discrimination
requires (a) an independent judge and (b) relative comparison rather than
isolated absolute scoring.
