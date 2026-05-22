# Phase Status — Graph-of-Thought

> Last updated: 2026-05-22
> High-level snapshot. The authoritative, task-by-task status lives in
> [`../task.md`](../task.md); architecture decisions in
> [`../CLAUDE.md`](../CLAUDE.md) and [`../DESIGN.md`](../DESIGN.md).

---

## MVP — Phases 1–7 ✅ complete

| Phase | Scope | Status |
|---|---|---|
| 1 | Core — scaffold, agrun transport, expand, canvas, dagre | ✅ |
| 2 | Intelligence — embeddings, evaluate, similarity, convergence | ✅ |
| 3 | Polish — RightPanel/LeftPanel, IndexedDB, export, progress bar | ✅ |
| 4 | Default GPT-Gateway provider (no API key needed) | ✅ |
| 5 | Production report generation (audience-aware + 闭环 summary) | ✅ |
| 6 | Production hardening — rate limit, error boundary, multi-tree, share | ✅ |
| 7 | Intelligence improvements — sibling-relative scoring, focusBranches | ✅ |

## Production hardening — Phases 8–17 ✅ complete (2026-05-22)

| Phase | Scope | Status |
|---|---|---|
| 8 | Enhanced reasoning UX — multi-role branches, auto-explore, tech debt | ✅ |
| 9 | Error handling & resilience — `noticeStore` toasts for silent failures | ✅ |
| 10 | UX & accessibility — undo, tooltips, WCAG 2.1 AA pass | ✅ |
| 11 | Performance & infrastructure — caps, throttles, SHA-pinned CI | ✅ |
| 12 | Testing infrastructure — vitest + 75 unit tests | ✅ |
| 13 | SEO, PWA & security — meta, manifest, service worker, XSS audit | ✅ |
| 14 | Canvas UX — layout, edge overhaul, minimap, filters, collapse, isolate | ✅ |
| 15 | Evidence & web grounding — Gemini Google-Search grounding | ✅ |
| 16 | Long-form input & agent export (PLAN.md / agent-brief.json) | ✅ |
| 17 | Cost governance — budget cap, concurrency cap, cost display, onboarding | ✅ (§16.6 telemetry intentionally skipped) |

### Notes

- **Phase 15 §14.1** — verified 2026-05-22: with a real Gemini key, a live
  `searchGeminiGrounding` call against `gemini-3.1-flash-lite` returned 4 real
  sourced items, and the full app flow produced evidence-driven branches. Known
  agrun-side quirk: redirect-URL resolution does a cross-origin `HEAD` that
  browsers CORS-block — caught by agrun, the redirect URL stays a valid link.
- **Phase 17 §16.6** — privacy-respecting telemetry was intentionally skipped:
  a pure static front-end has no backend to host counters without adding a
  paid service, which the cost model forbids (user decision, 2026-05-22).

## Planned — Phases 18–19 (added 2026-05-22)

| Phase | Scope | Status |
|---|---|---|
| 18 | Canvas Readability & Scale — semantic zoom, no auto-refit on growth, exploration feed, progressive collapse | 🔲 planned (18.1 done) |
| 19 | Outcome-Focused Productivity — answer-first panel, promote the Report, recommended-path trace | 🔲 planned |

From the 2026-05-22 auto-explore canvas-readability report. Research write-up:
[ux-readability-research.md](./ux-readability-research.md); task breakdown in
[`../task.md`](../task.md) Phases 18–19. The headline gap: GOT has three of the
four canonical scale techniques (overview+detail, focus+context, cue-based)
but lacks *semantic zoom* — hence the unreadable "wall of tiny boxes" once
auto-explore grows the graph.

## Earlier production-readiness review

The original blocker — a non-discriminative evaluator (self-enhancement bias +
uncalibrated pointwise scoring) — was resolved in **Phase 7.1** with
sibling-relative scoring. See [PRODUCTION-REVIEW.md](./PRODUCTION-REVIEW.md)
for the original analysis.

## Known bugs

All resolved as of 2026-05-22 — B18 (provider mismatch on tree load), B20
(deprecated `escape`/`unescape` in share encoding) and B21 (`compactTree`
dropped score-0 nodes under `minScore > 0`) are fixed. See
[`../task.md`](../task.md) → "Known Bugs".
