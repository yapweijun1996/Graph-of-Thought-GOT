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
| 12 | Testing infrastructure — vitest + 70 unit tests | ✅ |
| 13 | SEO, PWA & security — meta, manifest, service worker, XSS audit | ✅ |
| 14 | Canvas UX — layout, edge overhaul, minimap, filters, collapse, isolate | ✅ |
| 15 | Evidence & web grounding | ⚠️ code-complete — live key test (§14.1) BLOCKED |
| 16 | Long-form input & agent export (PLAN.md / agent-brief.json) | ✅ |
| 17 | Cost governance — budget cap, concurrency cap, cost display, onboarding | ✅ (§16.6 telemetry intentionally skipped) |

### Notes

- **Phase 15 §14.1** — verifying that `gemini-3.1-flash-lite` supports
  `google_search` grounding needs a real Gemini API key, which the dev
  environment does not have. The grounding code (§14.2–§14.7) is implemented
  and build-verified; the live confirmation is deferred until a key is
  supplied (user decision, 2026-05-22).
- **Phase 17 §16.6** — privacy-respecting telemetry was intentionally skipped:
  a pure static front-end has no backend to host counters without adding a
  paid service, which the cost model forbids (user decision, 2026-05-22).

## Earlier production-readiness review

The original blocker — a non-discriminative evaluator (self-enhancement bias +
uncalibrated pointwise scoring) — was resolved in **Phase 7.1** with
sibling-relative scoring. See [PRODUCTION-REVIEW.md](./PRODUCTION-REVIEW.md)
for the original analysis.

## Open known bugs (not phase-scoped)

Tracked in [`../task.md`](../task.md) → "Known Bugs": B18 (provider mismatch
on tree load), B20 (deprecated `escape`/`unescape` in share encoding), B21
(`compactTree` excludes score-0 nodes under `minScore > 0`). All low/medium
severity; none assigned to a phase.
