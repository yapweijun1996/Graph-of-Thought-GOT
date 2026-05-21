# GOT Task List

> SSOT for all implementation tasks. Update status and notes here as work progresses.
> See CLAUDE.md for architecture decisions and DESIGN.md for background context.

---

## Phase 1 — Core ✅ COMPLETE

| # | Task | Status | Notes |
|---|---|---|---|
| 1.1 | Vite + React + TS scaffold (Tailwind v4 + shadcn + React Flow) | ✅ | |
| 1.2 | GitHub Actions deploy.yml → GitHub Pages | ✅ | |
| 1.3 | `/public/agrun.js` — agrun runtime UMD bundle | ✅ | |
| 1.4 | `src/types/tree.ts` — all TS types SSOT | ✅ | |
| 1.5 | `src/lib/store/treeStore.ts` — Zustand store | ✅ | |
| 1.6 | `App.tsx` — root component + IndexedDB persistence | ✅ | |
| 1.7 | `TopBar.tsx` — topic input + provider/model/key controls | ✅ | |
| 1.8 | `lib/agent/expand.ts` — Gemini expand via requestGeminiContent | ✅ | |
| 1.9 | `ThoughtCanvas.tsx` + `ThoughtNode.tsx` + dagre layout | ✅ | |
| 1.10 | Layer 1 generation → canvas render (verified with real Gemini) | ✅ | |

---

## Phase 2 — Intelligence ✅ COMPLETE

| # | Task | Status | Notes |
|---|---|---|---|
| 2.1 | `lib/agent/evaluate.ts` — node scoring (0-10) | ✅ | |
| 2.2 | `lib/embedder.ts` — Xenova/all-MiniLM-L6-v2 browser embedding | ✅ | 384-dim |
| 2.3 | `lib/similarity.ts` — cosine sim + convergence candidate finder | ✅ | threshold: 0.6 |
| 2.4 | Convergence edge rendering — inline in ThoughtCanvas (dashed teal) | ✅ | |
| 2.5 | `lib/agent/convergence.ts` — LLM verdict (convergence/redundancy/coincidence) | ✅ | |

---

## Phase 3 — Polish ✅ COMPLETE (2026-05-22)

| # | Task | Status | Notes |
|---|---|---|---|
| 3.1 | `RightPanel.tsx` — Prune / Favorite action buttons | ✅ | + evaluator reasoning display; hidden for root |
| 3.2 | `LeftPanel.tsx` — tree list + token cost display | ✅ | graph overview: nodes/layers/convergence/tokens/pruned/favorited |
| 3.3 | IndexedDB: persist embeddings as Float32Array (not number[]) | ✅ | converted at the IDB boundary; in-memory stays number[] |
| 3.4 | Export JSON / Markdown | ✅ | `lib/export.ts`; buttons in LeftPanel |
| 3.5 | Embedding loading progress bar ("loading semantic model ~23MB…") | ✅ | floating pill; `embedderStore` status; % bar deferred to 6.5 |
| 3.6 | Double-click node → expand (CLAUDE.md §10) | ✅ | onNodeDoubleClick on canvas; in-node button replaced with hint |
| 3.7 | Fix: tokenCost always 0 (expand.ts:177 drops tokenCost from destructure) | ✅ | expansion cost split evenly across N children |
| 3.8 | Fix: evaluate reasoning discarded (ThoughtNode needs `reasoning?` field) | ✅ | `reasoning?` added; evaluator cost folded into tokenCost |
| 3.9 | Fix: duplicate convergence edges on concurrent expansions | ✅ | addEdges dedupes convergence by ordered pair-key |

---

## Phase 4 — Default GPT Gateway Provider ✅ COMPLETE (2026-05-22)

> Built-in demo provider — no API key required. Uses owner's self-hosted
> GPT Gateway (`https://gpt.yapweijun1996.com/v1/responses`) with XOR-obfuscated key.
> See `src/lib/agent/gateway.ts` for implementation.

| # | Task | Status | Notes |
|---|---|---|---|
| 4.1 | `src/lib/agent/gateway.ts` — XOR decrypt + Responses API fetch | ✅ | key: 20260515 |
| 4.2 | Add `'default'` to `ProviderId` type | ✅ | |
| 4.3 | `src/lib/models.ts` — default catalog: `gpt-5.4-mini` | ✅ | |
| 4.4 | `sessionStore.ts` — default provider = 'default' on first load | ✅ | |
| 4.5 | `expand.ts` — default provider branch | ✅ | |
| 4.6 | `evaluate.ts` — default provider branch | ✅ | |
| 4.7 | `convergence.ts` — default provider branch + stale-tree fix | ✅ | |
| 4.8 | `TopBar.tsx` — show "Demo key (built-in)" badge, hide key input | ✅ | |
| 4.9 | i18n keys: `topbar.demoKey` for en/zh/ms | ✅ | |

**Gateway spec:**
- Endpoint: `https://gpt.yapweijun1996.com/v1/responses`
- API format: OpenAI Responses API (`input[]`, `instructions`, `stream: false`)
- Model: `gpt-5.4-mini`, reasoning effort: `medium`
- XOR key (obfuscation, NOT encryption): `20260515`
- Encrypted hex: `55476d03020157540302540f015606015100535702045502015650575102530c0551000151025557015207570657020605000a`

---

## Phase 5 — Production Report Generation ✅ COMPLETE (2026-05-22, 5.5.3 deferred)

> **Vision**: GOT generates structured, audience-aware reports that engineers,
> managers, and researchers can directly use. The "闭环 (closed loop)" summary
> shows how independent reasoning paths converge to the same key conclusions —
> this is the unique GOT value proposition beyond a simple AI mindmap.
>
> Full spec: `docs/production-report.md`

### 5.1 Report Config UI

| # | Task | Status | Notes |
|---|---|---|---|
| 5.1.1 | Add `reportAudience: 'engineer' \| 'manager' \| 'researcher'` to TOTConfig | ✅ | + `ReportConfig` type |
| 5.1.2 | Add `maxExpansionLayers: number` config param (default: 3) | ✅ | persisted via `settingsStore` |
| 5.1.3 | Report button in TopBar or RightPanel ("Generate Report") | ✅ | TopBar; disabled until a graph exists |
| 5.1.4 | Report config modal: audience, depth, min-score, language | ✅ | audience/min-score/convergence/pruned toggles; language from prefs |

### 5.2 Report Engine

| # | Task | Status | Notes |
|---|---|---|---|
| 5.2.1 | `src/lib/agent/report.ts` — buildReportPrompt() | ✅ | per audience |
| 5.2.2 | `src/lib/prompts/report.ts` — 3 audience prompt templates | ✅ | engineer/manager/researcher |
| 5.2.3 | `runReportGeneration()` — tree → LLM → Markdown string | ✅ | Default + Gemini; writes `reportStore` |
| 5.2.4 | Tree compaction: build compact JSON summary for prompt (nodes + scores + convergence) | ✅ | drops embeddings; honours minScore/includePruned |

### 5.3 Closed-Loop Summary (闭环)

| # | Task | Status | Notes |
|---|---|---|---|
| 5.3.1 | Identify KEY INSIGHT nodes: score ≥ 7 AND target of ≥ 2 convergence edges | ✅ | `findKeyInsightIds` |
| 5.3.2 | Per convergence edge: generate "path A + path B → conclusion" one-liner | ✅ | `buildClosedLoops` reuses verdict explanation (no extra LLM call) |
| 5.3.3 | Aggregate all closed-loop one-liners into Executive Summary section | ✅ | fed into report prompt; LLM writes the 闭环 summary |

### 5.4 Report UI

| # | Task | Status | Notes |
|---|---|---|---|
| 5.4.1 | `ReportPanel.tsx` — full-screen Markdown-rendered report view | ✅ | no-dep `Markdown.tsx` renderer |
| 5.4.2 | Canvas: highlight KEY INSIGHT nodes (★ + larger + orange ring) | ✅ | ★ + orange ring; physical resize skipped (breaks dagre layout) |
| 5.4.3 | Canvas: highlight key convergence edges (orange bold line) | ✅ | edges touching a key-insight node go orange + bold |
| 5.4.4 | Export as Markdown file download | ✅ | `exportReportMarkdown` |
| 5.4.5 | Export as JSON (structured tree + report) | ✅ | `exportReportJson` — bundle of tree + report |

### 5.5 GOT Dimensions Config (Width × Depth × Direction)

| # | Task | Status | Notes |
|---|---|---|---|
| 5.5.1 | Width: `initialBranches` already configurable (TopBar hidden for now) | ✅ | `SettingsModal` exposes width/branching/depth/audience |
| 5.5.2 | Depth: add `maxExpansionLayers` guard in `runExpansion` | ✅ | silent no-op past max layer; canvas hides hint |
| 5.5.3 | Focus: `focusBranches: string[]` — only auto-expand these subtrees | 🚧 | See Phase 7.2 for full implementation plan |
| 5.5.4 | Auto-expand: button "Expand all pending nodes" respecting depth limit | ✅ | `expandAllPending` — one pass; LeftPanel button |

---

## Phase 6 — Production Hardening ✅ COMPLETE (2026-05-22)

| # | Task | Status | Notes |
|---|---|---|---|
| 6.1 | Rate-limit gateway calls (max N requests/minute) to protect demo key | ✅ | sliding window, 30/min; gateway path only |
| 6.2 | Error boundary + retry UI for expansion failures | ✅ | `ErrorBoundary` + dismissible retry toast (replaces window.alert) |
| 6.3 | Multiple tree management (LeftPanel: tree list, switch, delete) | ✅ | id-keyed IDB store + legacy migration; `libraryStore`; LeftPanel library |
| 6.4 | Share tree via URL (base64-encoded compact JSON) | ✅ | `#tree=` hash fragment; embeddings stripped; imports as fresh library entry |
| 6.5 | Embedding progress bar with % (Phase 3.5 dependency) | ✅ | `progress_callback` → `embedderStore.progress`; % bar in pill |
| 6.6 | Mobile layout: TopBar collapses to hamburger on narrow viewport | ✅ | `md:contents` trick — config drawer behind hamburger < md; verified both widths |

---

## Phase 7 — Intelligence Improvements 🚧 IN PROGRESS

### 7.1 Evaluator Score Bias Fix

> **Problem**: Generator and evaluator use the same model. The model rates its own outputs
> 8-9/10 systematically → score ≥ 7 threshold in KEY INSIGHT detection selects nearly
> every node → reports are undifferentiated and 闭环 summary loses meaning.
>
> **Fix strategy**: Replace absolute single-shot scoring with relative pairwise ranking
> among sibling nodes, or route evaluation to a separate independent judge model.

| # | Task | Status | Notes |
|---|---|---|---|
| 7.1.1 | Research: pairwise relative ranking vs independent judge model trade-offs | 🔲 | Pairwise: O(n²) calls but no model-dependency; judge: cheap but needs 2nd model |
| 7.1.2 | Implement sibling-relative scoring in `evaluate.ts` — rank N siblings, map to 0-10 | 🔲 | `evaluateSiblingBatch(parentId)` replaces per-node `evaluateNode()` calls |
| 7.1.3 | Update `runEvaluationBatch` to call batch ranker after all siblings are created | 🔲 | Trigger: after `expandNode` resolves, pass `nodes` array to ranker |
| 7.1.4 | Adjust KEY INSIGHT threshold in `findKeyInsightIds` to use top-N percentile instead of fixed score≥7 | 🔲 | e.g. top 20% of scored nodes AND convergence target ≥ 2 |
| 7.1.5 | Verify report quality: 闭环 summary now highlights genuinely differentiated insights | 🔲 | E2E test with 3-layer tree, confirm ≤30% nodes flagged as KEY INSIGHT |

### 7.2 focusBranches — Auto-expand Specific Subtrees (Phase 5.5.3)

> **Spec**: User marks nodes as "focus" via RightPanel. `expandAllPending` only expands
> within focused subtrees. Enables depth-first exploration of promising branches without
> expanding the entire graph.

| # | Task | Status | Notes |
|---|---|---|---|
| 7.2.1 | Add `focusBranches: string[]` to `TOTConfig` (type field already stubbed) | 🔲 | Expose toggle in RightPanel: "Focus this branch" adds node.id to config |
| 7.2.2 | `settingsStore`: persist `focusBranches` alongside other config | 🔲 | Clear on new tree generation |
| 7.2.3 | `expandAllPending`: when `focusBranches.length > 0`, filter targets to nodes whose ancestor path intersects `focusBranches` | 🔲 | Helper: `isInFocusSubtree(nodeId, focusBranches, tree)` |
| 7.2.4 | RightPanel: "Focus" / "Unfocus" toggle button; focused nodes get visual indicator (blue ring) on canvas | 🔲 | Reuse pattern from KEY INSIGHT orange ring |
| 7.2.5 | LeftPanel: show "Focus mode active (N branches)" badge when `focusBranches.length > 0`; "Clear focus" button | 🔲 | |

---

## Known Bugs (from 2026-05-22 review)

| # | Severity | Description | File | Fix |
|---|---|---|---|---|
| B1 | 🔴 HIGH | *(Fixed 2026-05-22)* `tokenCost` always 0 | expand.ts, evaluate.ts | Fixed in 3.7 |
| B2 | 🔴 HIGH | *(Fixed 2026-05-22)* evaluate `reasoning` discarded | evaluate.ts, tree.ts | Fixed in 3.8 |
| B3 | 🟡 MED | *(Fixed 2026-05-22)* Concurrent `detectConvergence` duplicate edges | treeStore.ts | Fixed in 3.9 |
| B4 | 🟡 MED | *(Fixed 2026-05-22)* Stale tree in convergence verdict loop | convergence.ts | Fixed in Phase 4.7 |
| B5 | 🟡 MED | *(Fixed 2026-05-22)* OpenAI provider selectable but throws on use | TopBar | Fixed in Phase 4.8 |
| B6 | 🔵 LOW | *(Fixed 2026-05-22)* Embedding stored as number[] in IndexedDB | indexeddb.ts | Fixed in 3.3 |
