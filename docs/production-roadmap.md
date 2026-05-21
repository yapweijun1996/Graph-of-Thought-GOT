# GOT Production Roadmap — Demo → Production

> Date: 2026-05-22
> Status: **planning**. The path from an accepted demo to a production tool.
> Companion docs: [PRODUCTION-REVIEW.md](./PRODUCTION-REVIEW.md) (why not yet
> ready), [production-report.md](./production-report.md) (report spec).
> Task tracking: Phases 14–16 in [`task.md`](../task.md).

---

## 0. Gate-0 dependency — read this first

**Nothing in this roadmap ships before Phase 7.1 (Evaluator Score Bias Fix).**

`PRODUCTION-REVIEW.md` §1 names the architectural blocker: the evaluator
produces no signal — every node scores 8–9/10 because the generator and the
evaluator are the same model. Until 7.1 lands:

- KEY INSIGHT selection (`findKeyInsightIds` — score ≥ 7 + ≥ 2 convergence
  edges) flags nearly every node → reports are undifferentiated.
- A web-grounded report built on a noise evaluator is still a noise report —
  just a more expensive one.
- Agent-export picks the "winning path" by score. With no score signal, the
  winning path is effectively random.

**Mandatory execution order** (phase *numbers* file as 14→15→16, but the
cost/concurrency guards in Phase 16 must be *built first*):

```
7.1  Evaluator fix
  → 8.3   Tech debt cleanup
  → 16.1–16.3  $ budget cap + concurrency cap + cost display   (guards)
  → 14    Evidence & Web Grounding
  → 15    Long-Form Input & Agent Export
  → 16.4–16.6  Onboarding + product decisions                  (go-to-prod)
```

If 7.1 stalls, the rest of this roadmap is built on quicksand. This is a hard
dependency, not a footnote.

---

## 1. Production vision

The demo proves the concept: topic → reasoning graph → convergence → report.
Production must make GOT **agentic, automatic, and intelligent** — it should
actively help the user produce a *usable deliverable*, not just a pretty graph.

Three new product pillars:

| Pillar | Phase | One-line goal |
|---|---|---|
| A — Evidence-grounded reasoning | 14 | Branches and reports are backed by real web search, not model priors |
| B — Real inputs & outputs | 15 | Accept long-form input (README/DESIGN); export a dev brief AI agents can build from |
| C — Cost governance & go-to-production | 16 | Bounded cost, bounded concurrency, onboarded, product model decided |

**Not in this roadmap** — general hardening is already filed as separate
tracks and proceeds independently: Phase 9 (error handling), Phase 10
(UX & accessibility), Phase 11 (performance), Phase 12 (testing), Phase 13
(SEO/PWA/security). Phase 16 covers *only* the production gaps those phases
do **not** touch: $ cost cap, global concurrency cap, cost display,
onboarding, and the BYOK / telemetry product decisions.

---

## 2. Research findings — agrun grounding capability

Confirmed by reading `public/agrun.js` (2026-05-22):

- **`window.Agrun.searchGeminiGrounding(request)`** is a first-class exported
  function (`agrun.js:32856`, exported at `:83655`). It is a **separate API**
  from `requestGeminiContent` — it issues its own Gemini `generateContent`
  call with `tools: [{ google_search: {} }]`.
  - Request: `{ model, apiKey, query, endpoint?, timeoutMs?, signal?, fetch?, limit?, authMode? }`
  - Response: `{ groundingQueries: string[], items: [...], groundingSupportsCount, synthetic: boolean, raw, status }`
- **`requestGeminiContent` does NOT route grounding.** Its `convertGeminiTools`
  (`agrun.js:56720`) only handles `functionDeclarations`; the
  `google.google_search` provider tool lives in an AI-SDK code path not
  reachable from here. → Grounding **must** go through `searchGeminiGrounding`
  as a distinct call.
- **Synthetic-results caveat** (`agrun.js:32912`): since mid-2025 Gemini often
  returns `webSearchQueries` but no `groundingChunks` (no source URLs). agrun
  then synthesizes evidence items from the model's text answer and sets
  `synthetic: true`. → Citation rendering **must handle both cases**: real URL
  chunks *and* synthetic text-only evidence.
- **Unverified**: that `gemini-3.1-flash-lite` supports `google_search`
  grounding. `agrun.js:54050` requires "Gemini 2.0 or newer" — flash-lite
  should qualify, but this needs a one-shot live test (task 14.1) before any
  consumer code is written. Do not assume from version numbers.
- `src/agrun.d.ts` declares only `requestGeminiContent`; it must be extended
  with `searchGeminiGrounding` types before consumers can be typed (task 14.2).
- Grounding works only with a **real Gemini key** (`authMode: 'client'`) or a
  server endpoint. The Default demo gateway is an OpenAI-format proxy — it
  cannot do Gemini grounding. → **Grounding is a Gemini-provider-only feature**;
  the UI must hide/disable it under the Default provider.

---

## 3. Design decisions (made now, not deferred)

### 3.1 Long-form input — TWO fields, not one

The user wants to paste README.md / DESIGN.md-length text. Two architectures:

- ❌ **Single field** — dump 5000 words into `rootTopic`. Every expand prompt
  then carries the full document × N branches × M layers → token explosion.
- ✅ **Two fields** — a short `rootTopic` (the display label / graph title)
  plus an optional `contextDocument`. The context document is **summarized
  once** into a fixed-size brief; the brief (not the raw text) is injected into
  every expand prompt.

**Decision: two fields.** `contextDocument` is summarized once on tree
creation; downstream calls carry only the bounded brief.

### 3.2 Agent export — a dev brief, not a data dump

"Export GOT to AI Agent CLI" is not a tree dump. Claude Code / Codex CLI want
an **opinionated dev brief**:

- `PLAN.md` — walks the winning path (root → highest-score nodes), turns it
  into an ordered task list with rationale, and surfaces convergence-validated
  key insights. Human- and agent-readable.
- `agent-brief.json` — the same content, structured, for programmatic ingestion.

**Decision: agent-export is a report-template variant** (`ReportAudience:
'agent'`), reusing the Phase 5 report engine. It is *not* a new subsystem.

### 3.3 Grounding is opt-in per session

Web grounding adds one Gemini API call per searched direction. It is **off by
default**, enabled via a per-session UI toggle, and only when the provider is
Gemini (see §2). This bounds cost and protects the demo key.

---

## 4. Cost & concurrency — the prerequisite nobody priced

`CLAUDE.md §14` targets < $0.10 per session. Today's spend is already
unbounded; grounding makes it worse:

- A grounded 4×3×3 tree fires: 1 + 12 expand calls, ~16 evaluate calls,
  ≤ 3 verdict calls per pass — **plus** one `searchGeminiGrounding` call per
  searched direction. A grounded auto-explore run can 10× the budget.
- `PRODUCTION-REVIEW.md §3` flagged the missing **global concurrency cap**
  (`CLAUDE.md §10.3` requires max-2 concurrent); it is still not implemented.
  `runExpansion` guards re-entry *per node*, and Phase 11.7 covers only the
  delete-during-expansion race — nothing caps total in-flight LLM calls.

**Therefore tasks 16.1–16.3 (hard $ budget cap, global concurrency cap, live
cost display) must be built before Phase 14 grounding work begins** — even
though they file under a later phase number.

---

## 5. Decisions still pending (need user input)

| # | Decision | Why it matters |
|---|---|---|
| D1 | **BYOK product model** — keep the Default demo gateway as try-before-you-key and force BYOK after N free generations? Or split build modes? | The shared demo key cannot absorb production traffic; some gate is needed |
| D2 | **Telemetry** — privacy-respecting feature-usage counters (no user content)? | Without it there is no way to know if grounding / agent-export are used |
| D3 | **Grounded expansion vs grounded report only** — search per branch *during* expansion (richer, costlier) or only when generating the report (cheaper)? | Phase 14 scope; affects the cost model in §4 |

These are product calls — they are listed here, not decided.

---

## 6. Phase summary

| Phase | Title | Depends on | Status |
|---|---|---|---|
| 7.1 | Evaluator Score Bias Fix | — | filed (in progress) |
| 8.2 | Auto-Explore (+ agentic score-driven selection 8.2.6) | 7.1 | filed (planned) |
| 8.3 | Tech Debt Cleanup | — | filed (planned) |
| 14 | Evidence & Web Grounding | 7.1, 8.3, 16.1–16.3 | this update |
| 15 | Long-Form Input & Agent Export | 7.1, 14 (grounded agent-export) | this update |
| 16 | Cost Governance & Go-to-Production | 16.1–16.3 build first | this update |

See `task.md` for the task-level breakdown.
