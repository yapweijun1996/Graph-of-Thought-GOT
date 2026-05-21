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

## Phase 5 — Production Report Generation 🆕 PLANNED

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
| 5.1.3 | Report button in TopBar or RightPanel ("Generate Report") | ⬜ | |
| 5.1.4 | Report config modal: audience, depth, min-score, language | ⬜ | |

### 5.2 Report Engine

| # | Task | Status | Notes |
|---|---|---|---|
| 5.2.1 | `src/lib/agent/report.ts` — buildReportPrompt() | ⬜ | per audience |
| 5.2.2 | `src/lib/prompts/report.ts` — 3 audience prompt templates | ⬜ | see docs/production-report.md §5 |
| 5.2.3 | `runReportGeneration()` — tree → LLM → Markdown string | ⬜ | calls Default or Gemini |
| 5.2.4 | Tree compaction: build compact JSON summary for prompt (nodes + scores + convergence) | ⬜ | avoid token overflow |

### 5.3 Closed-Loop Summary (闭环)

| # | Task | Status | Notes |
|---|---|---|---|
| 5.3.1 | Identify KEY INSIGHT nodes: score ≥ 7 AND target of ≥ 2 convergence edges | ⬜ | |
| 5.3.2 | Per convergence edge: generate "path A + path B → conclusion" one-liner | ⬜ | |
| 5.3.3 | Aggregate all closed-loop one-liners into Executive Summary section | ⬜ | |

### 5.4 Report UI

| # | Task | Status | Notes |
|---|---|---|---|
| 5.4.1 | `ReportPanel.tsx` — full-screen Markdown-rendered report view | ⬜ | replaces RightPanel when open |
| 5.4.2 | Canvas: highlight KEY INSIGHT nodes (★ + larger + orange ring) | ⬜ | |
| 5.4.3 | Canvas: highlight key convergence edges (orange bold line) | ⬜ | |
| 5.4.4 | Export as Markdown file download | ⬜ | |
| 5.4.5 | Export as JSON (structured tree + report) | ⬜ | |

### 5.5 GOT Dimensions Config (Width × Depth × Direction)

| # | Task | Status | Notes |
|---|---|---|---|
| 5.5.1 | Width: `initialBranches` already configurable (TopBar hidden for now) | ⬜ | expose in config panel |
| 5.5.2 | Depth: add `maxExpansionLayers` guard in `runExpansion` | ✅ | silent no-op past max layer; canvas hides hint |
| 5.5.3 | Focus: `focusBranches: string[]` — only auto-expand these subtrees | ⬜ | future |
| 5.5.4 | Auto-expand: button "Expand all pending nodes" respecting depth limit | ⬜ | |

---

## Phase 6 — Production Hardening 🆕 PLANNED

| # | Task | Status | Notes |
|---|---|---|---|
| 6.1 | Rate-limit gateway calls (max N requests/minute) to protect demo key | ⬜ | |
| 6.2 | Error boundary + retry UI for expansion failures | ⬜ | currently: window.alert |
| 6.3 | Multiple tree management (LeftPanel: tree list, switch, delete) | ⬜ | |
| 6.4 | Share tree via URL (base64-encoded compact JSON) | ⬜ | no backend needed |
| 6.5 | Embedding progress bar with % (Phase 3.5 dependency) | ⬜ | |
| 6.6 | Mobile layout: TopBar collapses to hamburger on narrow viewport | ⬜ | |

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
