# GOT Task List

> SSOT for all implementation tasks. Update status and notes here as work progresses.
> See CLAUDE.md for architecture decisions and DESIGN.md for background context.

---

## Status — 2026-05-22

**Phases 1–17 complete.** All ~114 implementable sub-tasks across Phases 8–17
were built this session, verified (`npm run build` + 70 Vitest tests + live
Chrome E2E), and committed one phase at a time (15 commits, not yet pushed).
`docs/` and the project KB are synced.

Two rows are in a **terminal non-✅ state by explicit user decision** — they are
resolved, not pending:

- **Phase 15 §14.1** ⛔ BLOCKED — a live test that `gemini-3.1-flash-lite`
  supports `google_search` grounding. Needs a real Gemini API key the dev
  environment does not have; the grounding code (§14.2–§14.7) is implemented
  and build-verified. Mark ✅ once a key is supplied and the test is run.
- **Phase 17 §16.6** ⏭️ SKIPPED — privacy telemetry. Intentionally not built: a
  pure static front-end cannot host counters without adding a backend service,
  which the cost model forbids.

Open follow-ups (not phase-scoped): bugs **B18 / B20 / B21** — see Known Bugs.

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

## Phase 5 — Production Report Generation ✅ COMPLETE (2026-05-22)

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
| 5.5.3 | Focus: `focusBranches: string[]` — only auto-expand these subtrees | ✅ | Implemented in Phase 7.2 (2026-05-22) |
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

## Phase 7 — Intelligence Improvements ✅ COMPLETE (2026-05-22)

### 7.1 Evaluator Score Bias Fix ✅ COMPLETE (2026-05-22)

> **Problem**: Generator and evaluator use the same model. The model rates its own outputs
> 8-9/10 systematically → score ≥ 7 threshold in KEY INSIGHT detection selects nearly
> every node → reports are undifferentiated and 闭环 summary loses meaning.
>
> **Fix strategy**: Replace absolute single-shot scoring with relative pairwise ranking
> among sibling nodes, or route evaluation to a separate independent judge model.

| # | Task | Status | Notes |
|---|---|---|---|
| 7.1.1 | Research: pairwise relative ranking vs independent judge model trade-offs | ✅ | Chose sibling-relative ranking: one call per sibling set, no 2nd-model dependency |
| 7.1.2 | Implement sibling-relative scoring in `evaluate.ts` — rank N siblings, map to 0-10 | ✅ | `buildSiblingRankPrompt` + `parseSiblingRankResponse` + `applyScoreSpread` (deterministic remap if model collapses scores) |
| 7.1.3 | Update `runEvaluationBatch` to call batch ranker after all siblings are created | ✅ | `runEvaluationBatch` now does ONE ranking call over the sibling set; `runEvaluation`/`evaluateNode` kept as the single-sibling fallback |
| 7.1.4 | Adjust KEY INSIGHT threshold in `findKeyInsightIds` to use top-N percentile instead of fixed score≥7 | ✅ | top 20% of scored non-root nodes AND ≥ 2 convergence edges; floor of 5; report prompt text updated |
| 7.1.5 | Verify report quality: 闭环 summary now highlights genuinely differentiated insights | ✅ | Live E2E (Default gateway): 20-node 4-layer tree — every sibling group spread 6-7 pts (was 8-9 flat); report ranks 9/10 directions correctly; 0 console errors |

### 7.2 focusBranches — Auto-expand Specific Subtrees (Phase 5.5.3) ✅ COMPLETE (2026-05-22)

> **Spec**: User marks nodes as "focus" via RightPanel. `expandAllPending` only expands
> within focused subtrees. Enables depth-first exploration of promising branches without
> expanding the entire graph.

| # | Task | Status | Notes |
|---|---|---|---|
| 7.2.1 | Add `focusBranches: string[]` to `TOTConfig` (type field already stubbed) | ✅ | `toggleFocus` action; RightPanel "Focus branch" / "Focused" toggle |
| 7.2.2 | `settingsStore`: persist `focusBranches` alongside other config | ✅ | DEVIATION: kept in `tree.config` (node ids are tree-scoped, cannot be a global setting) — persisted with the tree to IndexedDB; auto-cleared on new tree since DEFAULT_TOT_CONFIG omits it |
| 7.2.3 | `expandAllPending`: when `focusBranches.length > 0`, filter targets to nodes whose ancestor path intersects `focusBranches` | ✅ | `isInFocusSubtree(tree, nodeId, focusBranches)` in treeStore; LeftPanel expand-all count is focus-aware |
| 7.2.4 | RightPanel: "Focus" / "Unfocus" toggle button; focused nodes get visual indicator (blue ring) on canvas | ✅ | blue `outline` (separate CSS property — stacks with the score ring rather than overriding it) |
| 7.2.5 | LeftPanel: show "Focus mode active (N branches)" badge when `focusBranches.length > 0`; "Clear focus" button | ✅ | `clearFocus` action |

---

## Phase 8 — Enhanced Reasoning UX ✅ COMPLETE (2026-05-22)

> From the 2026-05-22 codebase review. Three workstreams, ordered by leverage:
> multi-role agents amplify the core differentiator (convergence edges),
> auto-explore raises demo impact, tech debt keeps the base healthy.
> Status legend: 🔲 not started · 🔵 deferred · ✅ done.

### 8.1 Multi-Role Agent Branches ✅ COMPLETE (2026-05-22)

> **Why**: today every branch is generated by the same anonymous model, so a
> convergence edge only means "two prompts landed nearby". If each branch is
> generated by a distinct persona (optimist / skeptic / pragmatist /
> first-principles / contrarian), then convergence between *different* roles
> becomes a genuinely strong signal — the unique GOT value proposition.

| # | Task | Status | Notes |
|---|---|---|---|
| 8.1.1 | Add `role` field to `ThoughtNode` type | ✅ | `RoleId` union + optional `ThoughtNode.role` in `types/tree.ts` |
| 8.1.2 | Role catalog in `lib/prompts/` — one system persona per role | ✅ | `lib/prompts/roles.ts` — 5 roles, each with persona text + badge class; `rolesForBranches` cycles when count > 5 |
| 8.1.3 | `expand.ts`: assign one role per initial branch, inject persona into prompt | ✅ | initial branches: role-per-index; children inherit parent role (subtree keeps one voice); persona injected into both initial + child prompts |
| 8.1.4 | `ThoughtNode.tsx`: render role badge / colour band | ✅ | header pill with cool-hue palette (sky/violet/slate/indigo/fuchsia) — distinct from the red/amber/emerald score border |
| 8.1.5 | Report: surface cross-role convergence ("skeptic + optimist agreed") | ✅ | `ClosedLoop.roleA/roleB` + `isCrossRoleLoop`; report prompt tags `[cross-role: …]` loops and instructs the LLM to weight them highest |

### 8.2 Auto-Explore Mode ✅ COMPLETE (2026-05-22)

> **Why**: after Layer 1 the user must manually double-click every node. An
> auto-explore mode makes the demo self-demonstrating — type a topic, watch the
> graph grow. Building blocks exist (`expandAllPending`, `runExpansion`).
> **Risk**: runaway token spend — budget cap + Stop button are mandatory.
> Complements Phase 7.2 focusBranches (focus = where to expand; auto = whether
> to expand automatically).

| # | Task | Status | Notes |
|---|---|---|---|
| 8.2.1 | Add node-count budget cap to `TOTConfig` (e.g. `maxNodes: 40`) | ✅ | `TOTConfig.maxNodes` (default 40) + `settingsStore.maxNodes` + SettingsModal slider (10–120) |
| 8.2.2 | Auto-explore loop: repeat expansion until maxLayers or budget hit | ✅ | `lib/agent/autoExplore.ts` — `runAutoExplore`; shallow-first target pick; honours focusBranches + depth + `maxNodes` |
| 8.2.3 | Toggle "Auto-explore" + Stop button | ✅ | DEVIATION: placed in LeftPanel (with "Expand all"), not TopBar — TopBar is already full; LeftPanel is the graph-control panel. Stop flips `autoExploreStore.running`, checked between expansions |
| 8.2.4 | Progress indicator: nodes created / budget remaining | ✅ | "Budget: N / max nodes" line in the auto-explore section |
| 8.2.5 | Lightweight steer: optional `hint` text fed into `buildChildExpandPrompt` | ✅ | `autoExploreStore.hint` → injected as an advisory steer line into child prompts (also steers manual double-click expansion) |
| 8.2.6 | Agentic mode: score-driven selection — keep top-N children, prune the rest | ✅ | `runExpansion({ awaitEval })` awaits scores; `pruneLowScoringChildren` keeps top 2 per sibling group — OODA loop on the graph |

> **Phase 8 live E2E (2026-05-22, Default gateway)**: topic "How to make a city
> more walkable" → 4 L1 branches with distinct role badges (Optimist 8 / Skeptic 3
> / Pragmatist 6 / First Principles 9 — well spread). Auto-explore grew the graph
> to 14 nodes across 3 layers; children inherited parent personas; Stop aborted
> the loop cleanly after the in-flight expansion. 0 app console errors.

### 8.3 Tech Debt Cleanup ✅ COMPLETE (2026-05-22)

> **Why**: debt found in the 2026-05-22 review. Pay down before 8.1 / 8.2
> build on top of it.

| # | Task | Status | Notes |
|---|---|---|---|
| 8.3.1 | MERGE path: `similarityThreshold.merge` (0.92) is in config but no code reads it | ✅ | REMOVED — at 384-dim all-MiniLM even paraphrases only reach ~0.67, so a 0.92 gate could never fire. `SimilarityThreshold` is now `{ convergence }` only |
| 8.3.2 | Remove stale comment in `expand.ts` ("when similarity lands, flip order") | ✅ | rewritten to describe the actual async-embedding flow |
| 8.3.3 | Unit tests for pure functions | ✅ | covered by Phase 12 — `parseExpandResponse`, `compactTree`, `findKeyInsightIds`, `parseConvergenceResponse` + more |
| 8.3.4 | Wire Gemini JSON mode (`responseSchema`) if agrun exposes it | ✅ | CONFIRMED NOT EXPOSED — agrun's `requestGeminiContent` → `buildGeminiProviderOptions` only reads `geminiThinkingConfig`. `responseSchema` exists only inside the bundled AI-SDK provider, unreachable from our call path. Prompt + strip-fence stays |

---

## Phase 9 — Error Handling & Resilience ✅ COMPLETE (2026-05-22)

> **Audit date**: 2026-05-22. Silent failure is the #1 quality problem — errors in
> evaluate/convergence/share/IDB are swallowed with only `console.error`, leaving
> the user in a broken state with no indication of what went wrong.
>
> **Foundation**: `noticeStore` + `NoticeToast` — a shared dismissible,
> auto-hiding toast for non-blocking notices (info / warn / error).

| # | Task | Status | Notes |
|---|---|---|---|
| 9.1 | `evaluate.ts`: surface evaluation failures to UI | ✅ | `reportEvaluateFailure` → warn toast; both `runEvaluation` + `runEvaluationBatch` catch paths |
| 9.2 | `convergence.ts`: surface verdict failures to UI | ✅ | dropped verdict → warn toast (edge silently missing otherwise) |
| 9.3 | `share.ts`: show error banner when shared tree fails to decode | ✅ | `noticeShareFailure` → error toast on decode or shape failure |
| 9.4 | `LeftPanel.tsx`: clipboard write failure → show visual feedback | ✅ | clipboard catch → error toast (was silent; button stuck on "Copy link") |
| 9.5 | `App.tsx`: show error when IndexedDB fails to load on startup | ✅ | IDB load catch → error toast |
| 9.6 | `App.tsx`: add `beforeunload` handler to force-save pending tree | ✅ | `flushOnUnload` clears the debounce timer + best-effort `saveTree` |
| 9.7 | `share.ts`: strengthen config validation on imported trees | ✅ | `sanitizeConfig` backfills missing config from `DEFAULT_TOT_CONFIG` (fixes B10); rejects non-object `nodes` / non-array `edges` |
| 9.8 | `settingsStore.ts`: add min/max guards for branch/layer/node counts | ✅ | `clampInt` on all four setters (NaN → floor) — fixes B13 |
| 9.9 | `gateway.ts`: assert `getGatewayApiKey()` non-empty before fetch | ✅ | empty key → thrown error before fetch instead of a confusing 401 |
| 9.10 | `report.ts`: truncate raw error message shown in ReportPanel | ✅ | 200-char preview + "Show details" toggle in ReportPanel |

---

## Phase 10 — UX & Accessibility ✅ COMPLETE (2026-05-22)

> Audit findings from 2026-05-22. Grouped into UX polish and a11y (WCAG 2.1 AA).

### 10.1 UX Polish

| # | Task | Status | Notes |
|---|---|---|---|
| 10.1.1 | Double-click node expand: show loading state within ~200ms | ✅ | confirmed `markPending` fires synchronously in `runExpansion` before any await — the spinner shows next paint; added `cursor-pointer` affordance + keyboard expand (10.2.5) for instant-feedback paths |
| 10.1.2 | RightPanel: add "Un-favorite" button | ✅ | `unfavoriteNode` restores status to expanded/pending; favorite button toggles |
| 10.1.3 | RightPanel: tooltip on disabled favorite/prune explaining *why* | ✅ | `title={panel.disabledPruned}` on all three action buttons when pruned |
| 10.1.4 | LeftPanel "Expand all pending": disable button while running, show progress | ✅ | local `expandingAll` flag holds the button disabled for the whole pass; label → "Expanding…" |
| 10.1.5 | ReportConfigModal: live node count preview as score slider moves | ✅ | "{n} / {total} nodes included at this score" under the slider |
| 10.1.6 | `EmbeddingStatus.tsx`: remove or narrow `pointer-events-none` | ✅ | confirmed correct — `pointer-events-none` on the wrapper passes clicks through (B8 non-issue); documented intent in a comment |
| 10.1.7 | Prune: add undo mechanism | ✅ | `pruneNode` records `lastPrune` (id + prevStatus); `undoPrune` restores; RightPanel shows an "Undo" toast |
| 10.1.8 | `sessionStore.ts`: detect private/incognito; warn when `rememberKey` can't persist | ✅ | `canPersist()` probe; toggle reverts + warns if writes are blocked |

### 10.2 Accessibility (WCAG 2.1 AA)

| # | Task | Status | Notes |
|---|---|---|---|
| 10.2.1 | `EmbeddingStatus.tsx`: add `role="status"` + `aria-live="polite"` | ✅ | progress announced to screen readers |
| 10.2.2 | `RightPanel.tsx`: add `aria-label` to action buttons | ✅ | favorite / un-favorite / prune / focus all carry an explicit `aria-label` |
| 10.2.3 | `LeftPanel.tsx`: i18n the delete button `aria-label` | ✅ | `aria-label={t('left.deleteGraph')}` |
| 10.2.4 | `ReportConfigModal.tsx`: add `name` attributes to `<select>` / inputs | ✅ | `name="audience"` + `name="minScore"` |
| 10.2.5 | `ThoughtNode.tsx`: keyboard-accessible expand (Enter / Space) | ✅ | `onKeyDown` → `runExpansion`; expandable nodes are `tabIndex={0}` |
| 10.2.6 | Canvas: expose nodes as ARIA tree items | ✅ | scoped to the minimum: each node is `role="treeitem"` + `aria-level` + `aria-label` + `aria-expanded`, keyboard-reachable |

> Also fixed B19 — favorited nodes now use a pink ♥, visually distinct from the
> KEY INSIGHT orange ★.

---

## Phase 11 — Performance & Infrastructure ✅ COMPLETE (2026-05-22)

> Performance findings from 2026-05-22 audit.

| # | Task | Status | Notes |
|---|---|---|---|
| 11.1 | `similarity.ts`: cap convergence candidates | ✅ | `MAX_CANDIDATES = 200` — sort by similarity + slice when a node is over-connected |
| 11.2 | `embedder.ts`: throttle progress callback | ✅ | 100ms time-throttle on `setProgress`; the 100%/done tick always flushes |
| 11.3 | `ThoughtCanvas.tsx`: skip layout/fitView on metadata-only changes | ✅ | `layoutTree` (dagre) + `fitView` now run only when the node set actually grew, not on score/status ticks |
| 11.4 | `index.html`: defer agrun.js load | ✅ | `defer` attribute — `window.Agrun` is read lazily at call time, never at load |
| 11.5 | `libraryStore.ts`: monitor IndexedDB quota | ✅ | `checkStorageQuota` via `navigator.storage.estimate()`; warns once at >80% |
| 11.6 | `deploy.yml`: pin action versions | ✅ | all 5 actions pinned to commit SHA + `# vN` comment (checkout/setup-node/configure-pages/upload-pages-artifact/deploy-pages) |
| 11.7 | mutual exclusion for delete-during-expansion race | ✅ | LeftPanel `locked = busy \|\| autoRunning` gates switch/delete (covers auto-explore inter-pass gaps); runExpansion's B17 id-check drops any stale write as backup |

---

## Phase 12 — Testing Infrastructure ✅ COMPLETE (2026-05-22)

> No tests currently exist. Add vitest; focus on pure functions and data boundaries.
> Result: 56 unit tests across 8 files, all passing. Run with `npm test`.

| # | Task | Status | Notes |
|---|---|---|---|
| 12.1 | Install and configure `vitest` + `@vitest/ui` | ✅ | devDependencies + `test`/`test:ui` scripts + `test` block in `vite.config.ts` (node env) |
| 12.2 | Unit tests: `parseExpandResponse` — valid JSON, missing fields, code fences, empty branches | ✅ | `expand.test.ts` (8 tests) |
| 12.3 | Unit tests: `parseConvergenceResponse` / `parseEvaluateResponse` | ✅ | `convergence.test.ts` (5) + `evaluate.test.ts` (13, also covers `parseSiblingRankResponse`/`applyScoreSpread`) |
| 12.4 | Unit tests: `cosineSimilarity` — zero vector, length mismatch, 384-dim normalized | ✅ | `embedder.test.ts` (5 tests) |
| 12.5 | Unit tests: `findKeyInsightIds` + `buildClosedLoops` + `compactTree` — edge cases | ✅ | `report.test.ts` (10 tests) |
| 12.6 | Unit tests: IndexedDB round-trip — Float32Array ↔ number[] boundary | ✅ | `indexeddb.test.ts` (3 tests); guards B6 regression |
| 12.7 | Unit tests: `getGatewayApiKey` XOR decrypt in `gateway.ts` | ✅ | `gateway.test.ts` (2 tests); verifies decrypted key |
| 12.8 | Unit tests: `stripCodeFences` + `readTotalTokens` in `lib/agent/response.ts` | ✅ | `response.test.ts` (10 tests) |

---

## Phase 13 — SEO, PWA & Security Hardening ✅ COMPLETE (2026-05-22)

| # | Task | Status | Notes |
|---|---|---|---|
| 13.1 | `index.html`: SEO + social metadata | ✅ | `description`, `og:type/title/description/image`, `twitter:card`, light/dark `theme-color` |
| 13.2 | Create `/public/og-image.png` (1200×630) | ✅ | live Chrome screenshot of the 14-node walkability graph, downscaled to exactly 1200×630 |
| 13.3 | `Markdown.tsx`: prevent XSS in rendered node text | ✅ | confirmed safe-by-construction — no `dangerouslySetInnerHTML`, every value is a JSX text child (React-escaped). Documented the invariant + added `Markdown.test.tsx` (renderToStaticMarkup) asserting `<img onerror>` / `<script>` render escaped. Closes B14 |
| 13.4 | Add `manifest.json` for PWA installability | ✅ | `public/manifest.json` — name/short_name/standalone/theme_color + SVG icon; linked from index.html |
| 13.5 | Add minimal service worker | ✅ | `public/sw.js` — network-first navigations, cache-first hashed assets + agrun.js; registered (prod only) in `main.tsx` |
| 13.6 | Gateway key rotation plan documented in `gateway.ts` | ✅ | step-by-step re-obfuscation + redeploy procedure in a code comment beside `_EK` |

---

## Phase 14 — Canvas UX & Graph Readability ✅ COMPLETE (2026-05-22)

> **Problem** (from user screenshot 2026-05-22): with 9+ nodes per layer the canvas becomes
> a dense wall of boxes; dashed convergence edges crisscross every tree edge forming a
> "hairball"; users cannot tell which edge goes where, or navigate to a specific node.
> Current config: `nodesep=60, ranksep=120, nodeWidth=248` — too tight for this data volume.
>
> **Root cause**: two edge types (tree vs convergence) are rendered with the same grey color
> and similar stroke, so the visual cortex cannot separate signal from noise.
> Layout spacing is sized for 5-node trees, not 9+-node layers.
>
> **Solution order**: 14.1–14.3 unlock 80% of the gain in under 50 lines; 14.4–14.10 are
> progressive improvements that raise perceived quality to "professional tool" level.

### 14.1 Layout Spacing ✅ COMPLETE (2026-05-22)

| # | Task | Status | Notes |
|---|---|---|---|
| 14.1.1 | Increase `nodesep` 60 → 80 in `layout/dagre.ts` | ✅ | |
| 14.1.2 | Increase `ranksep` 120 → 150 | ✅ | |
| 14.1.3 | Switch dagre `ranker` to `'network-simplex'` | ✅ | |

### 14.2 Convergence Edge Visual Overhaul ✅ COMPLETE (2026-05-22)

| # | Task | Status | Notes |
|---|---|---|---|
| 14.2.1 | Convergence edge colour teal → blue `#2563eb` | ✅ | key-insight edges stay orange |
| 14.2.2 | Scale opacity by similarity | ✅ | `opacity = 0.35 + similarity * 0.55` |
| 14.2.3 | Convergence stroke 2 → 1.5; tree edges at default | ✅ | |
| 14.2.4 | Tighten bezier curvature (`0.2`) | ✅ | `pathOptions.curvature` (cast — React Flow's generic `Edge` type omits the field but the bezier edge reads it at runtime) |

### 14.3 MiniMap ✅ COMPLETE (2026-05-22)

| # | Task | Status | Notes |
|---|---|---|---|
| 14.3.1 | Add `<MiniMap />` to `ThoughtCanvas` | ✅ | `bottom-right`, `pannable` + `zoomable` |
| 14.3.2 | Colour minimap nodes by score | ✅ | `minimapNodeColor` mirrors the ThoughtNode buckets |
| 14.3.3 | Hide minimap on mobile | ✅ | `className="hidden md:block"` |

### 14.4 Convergence Edge Toggle ✅ COMPLETE (2026-05-22)

| # | Task | Status | Notes |
|---|---|---|---|
| 14.4.1 | `showConvergenceEdges` in `prefsStore` (default `true`, persisted) | ✅ | + `toggleConvergenceEdges` |
| 14.4.2 | `ThoughtCanvas`: filter convergence edges when off | ✅ | `deriveFlowEdges` skips them |
| 14.4.3 | LeftPanel toggle button with count badge | ✅ | "Convergence edges (N) ✓/○", `aria-pressed` |

### 14.5 Convergence Edge Hover Tooltip ✅ COMPLETE (2026-05-22)

> Transient canvas view state lives in a new `canvasStore` (hover / layer /
> isolate) — kept out of treeStore so it never trips the IDB autosave.

| # | Task | Status | Notes |
|---|---|---|---|
| 14.5.1 | `onEdgeMouseEnter` / `onEdgeMouseLeave` → `canvasStore.hoveredEdgeId` | ✅ | |
| 14.5.2 | Tooltip component (A / B thought, similarity %, verdict, explanation) | ✅ | `EdgeTooltip.tsx`, bottom-left, `pointer-events-none` |
| 14.5.3 | Highlight endpoint nodes (blue ring) + dim all other edges on hover | ✅ | ThoughtNode `isHoverEndpoint` ring; `deriveFlowEdges` dims non-hovered edges |

### 14.6 Layer Highlight Filter ✅ COMPLETE (2026-05-22)

| # | Task | Status | Notes |
|---|---|---|---|
| 14.6.1 | LeftPanel layer filter chips (L0, L1, …) | ✅ | `toggleHighlightedLayer`; live-verified — clicking L1 dims L0/L2 |
| 14.6.2 | `ThoughtNode` dims when another layer is highlighted | ✅ | `opacity-30` derived from `canvasStore.highlightedLayer` |
| 14.6.3 | Edge dimming when both endpoints are outside the highlighted layer | ✅ | `deriveFlowEdges` |

### 14.7 Collapse / Expand Subtrees ✅ COMPLETE (2026-05-22)

| # | Task | Status | Notes |
|---|---|---|---|
| 14.7.1 | RightPanel "Collapse / Expand subtree" button | ✅ | `ThoughtNode.collapsed` field + `toggleCollapse`; shown only for non-leaf nodes |
| 14.7.2 | Descendants of a collapsed node hidden from the canvas | ✅ | `collapsedHiddenIds` filters both node and edge derivation |
| 14.7.3 | Collapsed node badge `▶ N` with hidden-child count | ✅ | |

### 14.8 Node Hover Tooltip ✅ COMPLETE (2026-05-22)

| # | Task | Status | Notes |
|---|---|---|---|
| 14.8.1 | `NodeToolbar` on hover — full thought + rationale + score | ✅ | |
| 14.8.2 | Tooltip only when the thought is actually clamped | ✅ | `useLayoutEffect` measures `scrollHeight > clientHeight` |

### 14.9 Focus Branch Mode ✅ COMPLETE (2026-05-22)

> Distinct from Phase 7.2 `focusBranches` (auto-expand scope). This is a
> view-only isolation — labelled "Isolate this branch" to avoid confusion.

| # | Task | Status | Notes |
|---|---|---|---|
| 14.9.1 | RightPanel "Isolate this branch" button | ✅ | sets `canvasStore.focusBranchId`; isolates selected + ancestors + immediate children |
| 14.9.2 | Non-focus nodes dimmed (kept visible for context) | ✅ | `opacity-30` via `ThoughtNode` `inFocus` derivation |
| 14.9.3 | "Show all branches" exit button | ✅ | LeftPanel banner when isolation is active |

---

## Phase 15 — Evidence & Web Grounding ⚠️ CODE-COMPLETE (2026-05-22) — §14.1 BLOCKED

> **Why**: today branches and reports rest on the model's training priors only.
> Production reports must be backed by *real* web evidence. agrun ships a
> first-class `window.Agrun.searchGeminiGrounding()` API (Gemini Google-Search
> grounding) — see `docs/production-roadmap.md` §2.
> Gemini-provider-only (Default demo gateway cannot ground).
>
> **§14.1 is BLOCKED** — verifying `gemini-3.1-flash-lite` grounding needs a
> real Gemini API key, which the dev environment does not have. Per the user's
> 2026-05-22 decision, §14.2–§14.7 are implemented and §14.1 is deferred until
> a key is supplied. The grounding path cannot be exercised end-to-end without
> a key; build + typecheck verify the code is wired correctly.

| # | Task | Status | Notes |
|---|---|---|---|
| 14.1 | Live test: confirm `gemini-3.1-flash-lite` supports `google_search` grounding | ⛔ BLOCKED | needs a real Gemini API key — deferred per user decision (2026-05-22) |
| 14.2 | Extend `src/agrun.d.ts` with `searchGeminiGrounding` types | ✅ | `AgrunGroundingRequest/Item/Response` declared |
| 14.3 | `src/lib/agent/grounding.ts` — wrapper over `searchGeminiGrounding` | ✅ | `searchEvidence` normalises URL-chunk + synthetic items; 30s timeout; `evidenceToPromptText` helper |
| 14.4 | Evidence types: `EvidenceItem` + `ThoughtNode.evidence?` | ✅ | `synthetic` flags a no-URL grounded answer |
| 14.5 | Grounded report: search key directions, cite sources | ✅ | `runReportGeneration` searches top-5 key insights (Gemini + toggle on), dedupes, injects into the report prompt with a cite-as-Markdown-link rule; Markdown.tsx now renders links |
| 14.6 | Grounded expansion (opt-in): search a direction before expanding | ✅ | `runExpansion` searches the parent thought, stores `node.evidence`, weaves it into the expand prompt; best-effort (a grounding failure falls back to ungrounded) |
| 14.7 | UI: "Web grounding" toggle (Gemini only); evidence list; citations | ✅ | `sessionStore.webGrounding` (session-only) + TopBar toggle hidden unless Gemini; RightPanel evidence list (link or synthetic badge); report citations render via Markdown links |

---

## Phase 16 — Long-Form Input & Agent Export ✅ COMPLETE (2026-05-22)

> **Why**: (input) users want to paste README.md / DESIGN.md-length context,
> not a one-line topic. (output) the winning reasoning path should export as a
> dev brief that Claude Code / Codex CLI can build software from.

### 15.1 Long-Form Input

| # | Task | Status | Notes |
|---|---|---|---|
| 15.1.1 | Topic input → autosizing `<textarea>`; Cmd/Ctrl+Enter submits | ✅ | `onInput` auto-grow (cap 120px); plain Enter inserts a newline |
| 15.1.2 | `contextDocument?` on `ThoughtTree`; two-field model | ✅ | collapsible "+ Context" row in TopBar — never dumped into `rootTopic` |
| 15.1.3 | Summarize `contextDocument` once into a fixed-size brief | ✅ | `lib/agent/context.ts` `summarizeContext` — docs ≤1500 chars used raw, longer ones LLM-summarised; brief woven into expand prompts via `contextBlock` |
| 15.1.4 | `.md` file drop / picker → fills the context field | ✅ | `FileReader`, drag-drop + file input, no upload |

### 15.2 Agent Export

| # | Task | Status | Notes |
|---|---|---|---|
| 15.2.1 | `'agent'` ReportAudience + dev-brief prompt template | ✅ | `REPORT_TEMPLATES.agent` — Goal / Chosen Approach / Build Plan / Key Decisions / Constraints / Verification |
| 15.2.2 | `PLAN.md` export — winning-path walk | ✅ | `exportAgentPlan` saves the agent report as `PLAN.md` |
| 15.2.3 | `agent-brief.json` — structured for CLI ingestion | ✅ | `exportAgentBrief` — `{ schema, topic, contextDocument, plan, keyInsights[], convergence[] }` |
| 15.2.4 | UI: "Export for AI Agent" — copy + download | ✅ | ReportPanel shows Copy / PLAN.md / agent-brief.json when audience = agent |

> **Phase 16 live E2E (2026-05-22, Default gateway)**: topic "Improve our
> onboarding flow" + a context document → branches were context-aware
> ("define the activation event", "first meaningful outcome"); async
> `handleGenerate` + summarisation path ran cleanly; 0 console errors.

---

## Phase 17 — Cost Governance & Go-to-Production ✅ COMPLETE (2026-05-22)

> **Why**: covers the production gaps NOT filed under Phases 9–13.

| # | Task | Status | Notes |
|---|---|---|---|
| 16.1 | Hard $ budget cap (`maxSessionCostUsd`) — estimate cost, block past cap | ✅ | `TOTConfig.maxSessionCostUsd` (default $0.50) + settingsModal slider; `runExpansion` blocks + toasts when `treeCostUsd` ≥ cap |
| 16.2 | Global concurrency cap — max 2 concurrent LLM calls | ✅ | `lib/agent/concurrency.ts` `withLlmSlot` (FIFO semaphore, limit 2) wraps every gateway + Gemini + grounding round-trip |
| 16.3 | Live cost display — running $ spend + per-call breakdown | ✅ | `lib/cost.ts` `estimateUsd`/`treeCostUsd`; "Est. cost" row in LeftPanel; per-node token cost in RightPanel |
| 16.4 | Empty state / first-run onboarding | ✅ | `EmptyState.tsx` — what-is-GOT blurb + one-click example topics; shown until the first graph exists |
| 16.5 | BYOK product model | ✅ | DECISION (user, 2026-05-22): **no hard limit** — a soft "shared demo key, bring your own for heavy use" note in EmptyState + on the demo-key badge tooltip |
| 16.6 | Privacy-respecting telemetry | ⏭️ SKIPPED | DECISION (user, 2026-05-22): a pure static front-end with no backend cannot host telemetry without adding a service — violates the "no extra paid service" rule. Intentionally not implemented |

---

## Known Bugs

### Fixed (historical)

| # | Severity | Description | File | Fix |
|---|---|---|---|---|
| B1 | 🔴 HIGH | *(Fixed 2026-05-22)* `tokenCost` always 0 | expand.ts, evaluate.ts | Fixed in 3.7 |
| B2 | 🔴 HIGH | *(Fixed 2026-05-22)* evaluate `reasoning` discarded | evaluate.ts, tree.ts | Fixed in 3.8 |
| B3 | 🟡 MED | *(Fixed 2026-05-22)* Concurrent `detectConvergence` duplicate edges | treeStore.ts | Fixed in 3.9 |
| B4 | 🟡 MED | *(Fixed 2026-05-22)* Stale tree in convergence verdict loop | convergence.ts | Fixed in Phase 4.7 |
| B5 | 🟡 MED | *(Fixed 2026-05-22)* OpenAI provider selectable but throws on use | TopBar | Fixed in Phase 4.8 |
| B6 | 🔵 LOW | *(Fixed 2026-05-22)* Embedding stored as number[] in IndexedDB | indexeddb.ts | Fixed in 3.3 |
| B7 | 🟡 MED | *(Fixed 2026-05-22)* Alert fires on Default provider (no API key check) | expand.ts | Fixed in f4a528f |
| B16 | 🔴 HIGH | *(Fixed 2026-05-22)* `favoriteNode` overwrites `'expanded'` → re-expansion duplicates children | expand.ts | Idempotency guard now checks for existing tree children, not status |
| B17 | 🔴 HIGH | *(Fixed 2026-05-22)* In-flight expansion writes children into a newly generated tree | expand.ts | `runExpansion` aborts the write when `live.tree.id !== tree.id` |

### Open (from 2026-05-22 code audit — confirmed by reading source)

> B8 from previous list **CLOSED as false positive**: `EmbeddingStatus` pill uses
> `pointer-events-none` on its outer div, which *passes* clicks through rather than
> blocking them. The pill also sits at `bottom-4`, nowhere near TopBar. Non-issue.

#### 🔴 HIGH — Data Corruption / Crash Risk

> B16 and B17 **FIXED 2026-05-22** — see the Fixed (historical) table above.
> No open HIGH-severity bugs remain.

#### 🟡 MED — Silent Failures / Wrong Behavior

| # | Description | Root Cause | File | Fix Plan |
|---|---|---|---|---|
| B9 | *(Fixed 2026-05-22, Phase 9.4)* Clipboard write failure is silent | — | LeftPanel.tsx | clipboard catch now raises an error toast |
| B10 | *(Fixed 2026-05-22, Phase 9.7)* Shared URL import: `config: {}` crash | — | share.ts | `sanitizeConfig` backfills every config field from `DEFAULT_TOT_CONFIG` |
| B11 | *(Fixed 2026-05-22, Phase 9.5)* IndexedDB load failure on startup is silent | — | App.tsx | IDB load catch now raises an error toast |
| B18 | **`tree.config.provider` vs `sessionStore.provider` mismatch after loading a saved tree** | A tree saved under `provider: 'gemini'` is loaded; TopBar shows Default. API-key guard uses `sessionStore.provider` ('default' → passes), but `expandNode` uses `tree.config.provider` ('gemini' → no key → throws). Expansion silently fails via error toast. | expand.ts, convergence.ts | OPEN — on `hydrate()`, sync `sessionStore.provider` from loaded tree, OR always use `sessionStore.provider` inside `expandNode`. Not yet assigned to a phase |

#### 🔵 LOW — Minor / Edge Cases

| # | Description | Root Cause | File | Fix Plan |
|---|---|---|---|---|
| B12 | *(Fixed 2026-05-22, Phase 9.6)* `beforeunload` missing — debounce loses last edits | — | App.tsx | `flushOnUnload` force-saves on unload |
| B13 | *(Fixed 2026-05-22, Phase 9.8)* `settingsStore` has no input guards | — | settingsStore.ts | `clampInt` on every numeric setter |
| B14 | *(Closed 2026-05-22, Phase 13.3)* `Markdown.tsx` XSS concern | — | Markdown.tsx | confirmed safe — no `dangerouslySetInnerHTML`; JSX text-child escaping covers every insertion point; `Markdown.test.tsx` guards the invariant |
| B15 | *(Fixed 2026-05-22, Phase 11.5)* `navigator.storage` not monitored | — | libraryStore.ts | `checkStorageQuota` warns once at >80% usage |
| B19 | *(Fixed 2026-05-22, Phase 10)* Duplicate `★` for KEY INSIGHT + favorited | — | ThoughtNode.tsx | favorited now renders a pink `♥`; KEY INSIGHT keeps the orange `★` |
| B20 | `share.ts` uses deprecated `escape()` / `unescape()` for base64 UTF-8 encoding | Built on deprecated browser APIs (removed from strict-mode proposals) | share.ts:20-26 | Replace with `TextEncoder` + `btoa` (modern equivalent, zero-dep) |
| B21 | `compactTree`: nodes with `score === 0` (not yet evaluated) are excluded when `minScore > 0` | `if (n.score < cfg.minScore) continue` — score 0 means "pending evaluation", not "low quality" | report.ts:82 | Treat `score === 0` as "unscored, keep if minScore ≤ 1" or show count of excluded unscored nodes in modal |
