# Phase Status — Graph-of-Thought

> Date: 2026-05-22
> Tracks the MVP phases from `CLAUDE.md §11`. For *why this is not yet
> production-ready*, see [PRODUCTION-REVIEW.md](./PRODUCTION-REVIEW.md).

---

## Phase 1 — Core ✅ complete

- Vite + React + TypeScript scaffold (Tailwind v4, shadcn-ready, React Flow)
- GitHub Actions `deploy.yml`
- `public/agrun.js` runtime
- `types/tree.ts` data model SSOT
- `store/treeStore.ts` Zustand store
- `App.tsx` + `TopBar.tsx` (topic, provider, model, API key, language, theme)
- `lib/agent/expand.ts` — node expansion via `requestGeminiContent`
- `ThoughtCanvas.tsx` + `ThoughtNode.tsx` + `lib/layout/dagre.ts`
- Layer-1 generation → canvas render (verified with real Gemini)

## Phase 2 — Intelligence ✅ complete

- `lib/embedder.ts` — Xenova `all-MiniLM-L6-v2`, 384-dim, in-browser ONNX/WASM.
  Loaded via dynamic `import()` (kept off the boot path; onnxruntime-web
  pinned in `optimizeDeps.include` so its UMD bundle loads under Vite).
- `lib/agent/evaluate.ts` + `prompts/evaluate.ts` — 0–10 node scoring.
- `lib/similarity.ts` — cross-branch convergence candidate detection.
- `lib/agent/convergence.ts` + `prompts/convergence.ts` — convergence edges,
  threshold pre-filter + LLM signal/noise verdict.
- Convergence threshold tuned to **0.60** for 384-dim `all-MiniLM-L6-v2`
  (measured: distinct same-topic branches ≤0.52, paraphrases ~0.67; the
  original 0.75 was sized for 768-dim `text-embedding-004`).

> ⚠️ Phase 2 works mechanically but the scoring has no discriminative power
> in practice — see [PRODUCTION-REVIEW.md](./PRODUCTION-REVIEW.md) §1–2.

## Phase 3 — Polish (partial)

Done early / out of original Phase 3 order:

- `panels/RightPanel.tsx` — selected-node detail (full thought + rationale +
  score; the canvas node truncates thought and hides rationale).
- TopBar thinking-level / reasoning-effort selector — provider-aware
  (Gemini "Thinking", OpenAI "Effort"; levels minimal/low/medium/high).
- "Remember key" checkbox — opt-in API-key persistence to `localStorage`
  (`got:apiKey`), default off (`CLAUDE.md §2.3`).

Still pending:

- `LeftPanel.tsx` — tree list + token cost display
- Multi-tree persistence (IndexedDB currently holds one tree)
- Export to JSON / Markdown
- Embedding model load progress indicator
- Concurrency cap (max 2, `CLAUDE.md §10.3`)
- OpenAI generation path (currently `expand.ts` throws for non-Gemini)

## Known gaps blocking production

See [PRODUCTION-REVIEW.md](./PRODUCTION-REVIEW.md). Headline: the evaluator is
non-discriminative (self-enhancement bias + uncalibrated pointwise scoring),
which disables score colour, pruning, and best-path guidance.
