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

## Phase 8 — Enhanced Reasoning UX 📋 PLANNED (added 2026-05-22)

> From the 2026-05-22 codebase review. Three workstreams, ordered by leverage:
> multi-role agents amplify the core differentiator (convergence edges),
> auto-explore raises demo impact, tech debt keeps the base healthy.
> Status legend: 🔲 not started · 🔵 deferred · ✅ done.

### 8.1 Multi-Role Agent Branches

> **Why**: today every branch is generated by the same anonymous model, so a
> convergence edge only means "two prompts landed nearby". If each branch is
> generated by a distinct persona (optimist / skeptic / pragmatist /
> first-principles / contrarian), then convergence between *different* roles
> becomes a genuinely strong signal — the unique GOT value proposition.

| # | Task | Status | Notes |
|---|---|---|---|
| 8.1.1 | Add `role` field to `ThoughtNode` type | 🔲 | persona id; SSOT in `types/tree.ts` |
| 8.1.2 | Role catalog in `lib/prompts/` — one system persona per role | 🔲 | optimist / skeptic / pragmatist / first-principles / contrarian |
| 8.1.3 | `expand.ts`: assign one role per initial branch, inject persona into prompt | 🔲 | `initialBranches` count maps onto N roles |
| 8.1.4 | `ThoughtNode.tsx`: render role badge / colour band | 🔲 | visual encoding distinct from score colour |
| 8.1.5 | Report: surface cross-role convergence ("skeptic + optimist agreed") | 🔲 | strongest closed-loop signal |

### 8.2 Auto-Explore Mode

> **Why**: after Layer 1 the user must manually double-click every node. An
> auto-explore mode makes the demo self-demonstrating — type a topic, watch the
> graph grow. Building blocks exist (`expandAllPending`, `runExpansion`).
> **Risk**: runaway token spend — budget cap + Stop button are mandatory.
> Complements Phase 7.2 focusBranches (focus = where to expand; auto = whether
> to expand automatically).

| # | Task | Status | Notes |
|---|---|---|---|
| 8.2.1 | Add node-count budget cap to `TOTConfig` (e.g. `maxNodes: 40`) | 🔲 | hard stop protecting token spend |
| 8.2.2 | Auto-explore loop: repeat `expandAllPending()` until maxLayers or budget hit | 🔲 | sequential, bounded; honours Phase 7.2 focusBranches if set |
| 8.2.3 | TopBar toggle "Auto-explore" + Stop button | 🔲 | Stop must abort the loop mid-pass |
| 8.2.4 | Progress indicator: nodes created / budget remaining | 🔲 | |
| 8.2.5 | Lightweight steer: optional `hint` text fed into `buildChildExpandPrompt` | 🔲 | scoped-down "chatbox" idea — no full chat loop |
| 8.2.6 | Agentic mode: score-driven branch selection — after evaluate, auto-expand only top-N nodes, auto-prune lowest | 🔲 | OODA loop on the graph; depends on Phase 7.1 (needs a real score signal) |

### 8.3 Tech Debt Cleanup

> **Why**: debt found in the 2026-05-22 review. Pay down before 8.1 / 8.2
> build on top of it.

| # | Task | Status | Notes |
|---|---|---|---|
| 8.3.1 | MERGE path: `similarityThreshold.merge` (0.92) is in config but no code reads it | 🔲 | decide: implement (cosine > 0.92 → skip node, link to existing) OR remove dead config |
| 8.3.2 | Remove stale comment in `expand.ts:54-57` ("when similarity lands, flip order") | 🔲 | convergence already landed — comment misleads |
| 8.3.3 | Unit tests for pure functions | 🔲 | `parseExpandResponse`, `compactTree`, `findKeyInsightIds`, `parseConvergenceResponse` — guard malformed LLM output |
| 8.3.4 | Wire Gemini JSON mode (`responseSchema`) if agrun exposes it | 🔲 | Phase 1 leftover; currently prompt + strip-fence fallback |

---

## Phase 9 — Error Handling & Resilience 🔲 PLANNED

> **Audit date**: 2026-05-22. Silent failure is the #1 quality problem — errors in
> evaluate/convergence/share/IDB are swallowed with only `console.error`, leaving
> the user in a broken state with no indication of what went wrong.

| # | Task | Status | Notes |
|---|---|---|---|
| 9.1 | `evaluate.ts`: surface evaluation failures to UI (toast or node badge) | 🔲 | currently only `console.error`; user sees score = 0 forever with no hint |
| 9.2 | `convergence.ts`: surface verdict failures to UI | 🔲 | convergence edge silently missing; pair should retry or show warning |
| 9.3 | `share.ts`: show error banner when shared tree fails to decode | 🔲 | currently returns `null` silently; user sees blank canvas |
| 9.4 | `LeftPanel.tsx`: clipboard write failure → show visual feedback | 🔲 | `copied` state never set on failure; button text stays "Copy link" |
| 9.5 | `App.tsx`: show error when IndexedDB fails to load on startup | 🔲 | currently `console.error('[idb] load failed')` only |
| 9.6 | `App.tsx`: add `beforeunload` handler to force-save pending tree | 🔲 | 600ms debounce means close-on-tab loses last edits |
| 9.7 | `share.ts`: strengthen config validation on imported trees | 🔲 | `config: {}` passes current check; missing fields crash on first use |
| 9.8 | `settingsStore.ts`: add min/max guards for `initialBranches`, `maxExpansionLayers` | 🔲 | invalid values silently accepted; e.g. `maxExpansionLayers = 0` breaks depth guard |
| 9.9 | `gateway.ts`: assert `getGatewayApiKey()` non-empty before fetch | 🔲 | XOR decrypt could return empty string; currently no guard |
| 9.10 | `report.ts`: truncate raw error message shown in ReportPanel | 🔲 | full stack trace shown to user; add "Show details" collapse |

---

## Phase 10 — UX & Accessibility 🔲 PLANNED

> Audit findings from 2026-05-22. Grouped into UX polish and a11y (WCAG 2.1 AA).

### 10.1 UX Polish

| # | Task | Status | Notes |
|---|---|---|---|
| 10.1.1 | Double-click node expand: show loading state within ~200ms | 🔲 | currently spinner appears 1-2s later; user re-clicks |
| 10.1.2 | RightPanel: add "Un-favorite" button (allow reversing favorite state) | 🔲 | once favorited, only option is prune — no undo |
| 10.1.3 | RightPanel: tooltip on disabled favorite/prune explaining *why* disabled | 🔲 | disabled state gives no feedback |
| 10.1.4 | LeftPanel "Expand all pending": disable button while running, show progress | 🔲 | can be clicked repeatedly, queuing duplicate expansions |
| 10.1.5 | ReportConfigModal: live node count preview as score slider moves | 🔲 | "X / Y nodes will be included at this score threshold" |
| 10.1.6 | `EmbeddingStatus.tsx`: remove or narrow `pointer-events-none` | 🔲 | loading pill blocks clicks to TopBar buttons behind it |
| 10.1.7 | Prune: add undo mechanism (or confirmation + undo toast) | 🔲 | `pruneNode` marks entire subtree; no reversal path |
| 10.1.8 | `sessionStore.ts`: detect private/incognito mode; warn when `rememberKey` cannot persist | 🔲 | localStorage throws in private mode; user thinks key is saved |

### 10.2 Accessibility (WCAG 2.1 AA)

| # | Task | Status | Notes |
|---|---|---|---|
| 10.2.1 | `EmbeddingStatus.tsx`: add `role="status"` + `aria-live="polite"` | 🔲 | screen readers don't announce progress updates |
| 10.2.2 | `RightPanel.tsx`: add `aria-label` to all icon-only buttons | 🔲 | prune/favorite buttons read as "button" to screen readers |
| 10.2.3 | `LeftPanel.tsx`: i18n the delete button `aria-label` | 🔲 | currently hardcoded `aria-label="delete graph"` |
| 10.2.4 | `ReportConfigModal.tsx`: add `name` attributes to all `<select>` elements | 🔲 | form accessibility tools won't recognize nameless selects |
| 10.2.5 | `ThoughtNode.tsx`: keyboard-accessible expand (Enter / Space on focused node) | 🔲 | currently only mouse double-click triggers expansion |
| 10.2.6 | Canvas: expose node graph as ARIA tree widget (`role="tree"`, `role="treeitem"`) | 🔲 | complex; scope to at-minimum keyboard-reachable node list |

---

## Phase 11 — Performance & Infrastructure 🔲 PLANNED

> Performance findings from 2026-05-22 audit.

| # | Task | Status | Notes |
|---|---|---|---|
| 11.1 | `similarity.ts`: O(n²) convergence detection — add indexed lookup or cap candidates | 🔲 | 500-node tree = 500 comparisons per new node; add max-candidates cap (e.g. 200) |
| 11.2 | `embedder.ts`: debounce progress callback (requestAnimationFrame or 100ms throttle) | 🔲 | 1000 store updates on a single download; triggers 1000 re-renders |
| 11.3 | `ThoughtCanvas.tsx`: skip `fitView` when only node metadata changes (score/status) | 🔲 | currently re-pans on every tree update, including score badge updates |
| 11.4 | `index.html`: defer agrun.js load (`defer` or dynamic import on first use) | 🔲 | 3.1 MB synchronous script blocks first paint |
| 11.5 | `libraryStore.ts`: monitor IndexedDB quota with `navigator.storage.estimate()` | 🔲 | large embedding trees (100+ nodes × 384-dim) can fill browser quota silently |
| 11.6 | GitHub Actions (`deploy.yml`): pin action versions to SHA or patch tag | 🔲 | current: `@v3/@v4/@v5` — breaking changes can silently break CI |
| 11.7 | `treeStore.ts`: add mutual exclusion for delete-during-expansion race | 🔲 | deleting current tree while expansion in-flight can clobber new tree |

---

## Phase 12 — Testing Infrastructure 🔲 PLANNED

> No tests currently exist. Add vitest; focus on pure functions and data boundaries.

| # | Task | Status | Notes |
|---|---|---|---|
| 12.1 | Install and configure `vitest` + `@vitest/ui` | 🔲 | zero test infrastructure; add to `package.json` devDependencies + `vite.config.ts` |
| 12.2 | Unit tests: `parseExpandResponse` — valid JSON, missing fields, code fences, empty branches | 🔲 | pure function; easy to test; guards malformed LLM output |
| 12.3 | Unit tests: `parseConvergenceResponse` / `parseEvaluateResponse` | 🔲 | same pattern; protect against schema drift |
| 12.4 | Unit tests: `cosineSimilarity` — zero vector, NaN, 384-dim normalized | 🔲 | `lib/embedder.ts` or `lib/similarity.ts` |
| 12.5 | Unit tests: `findKeyInsightIds` + `buildClosedLoops` — various edge cases | 🔲 | convergence count = 0, all scores identical, no edges |
| 12.6 | Unit tests: IndexedDB round-trip — Float32Array ↔ number[] boundary | 🔲 | `lib/indexeddb.ts` mapEmbeddings; guard regression of B6 |
| 12.7 | Unit tests: `xorDecrypt` in `gateway.ts` | 🔲 | verify decrypted key matches expected value |
| 12.8 | Unit tests: `stripCodeFences` in `lib/agent/response.ts` | 🔲 | nested fences, no fence, empty string |

---

## Phase 13 — SEO, PWA & Security Hardening 🔲 PLANNED

| # | Task | Status | Notes |
|---|---|---|---|
| 13.1 | `index.html`: add `<meta name="description">`, `og:title`, `og:description`, `theme-color` | 🔲 | currently missing all SEO metadata; important for GitHub Pages discoverability |
| 13.2 | Create `/public/og-image.png` (1200×630) — screenshot of a sample GOT graph | 🔲 | used by `og:image` meta tag for link previews |
| 13.3 | `Markdown.tsx`: sanitize node thoughts before rendering to prevent XSS | 🔲 | LLM-injected `<img onerror="...">` in node text currently renders as HTML |
| 13.4 | Add `manifest.json` for PWA installability | 🔲 | name, icons, theme_color, display: standalone |
| 13.5 | Add minimal service worker (cache agrun.js + app shell) | 🔲 | offline resilience; prevents 3.1MB re-download on every visit |
| 13.6 | Gateway key rotation plan: document rotation procedure in `gateway.ts` | 🔲 | XOR key is obfuscation only; rotation when abused requires redeploy |

---

## Phase 14 — Canvas UX & Graph Readability 🔲 PLANNED (added 2026-05-22)

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

### 14.1 Layout Spacing (Quick Win — dagre tuning)

| # | Task | Status | Notes |
|---|---|---|---|
| 14.1.1 | Increase `nodesep` from 60 → 80 in `layout/dagre.ts` | 🔲 | rule: ~1/3 of node width (248px); 80 = breathing room without overflow |
| 14.1.2 | Increase `ranksep` from 120 → 150 | 🔲 | prevents vertical layer bleed when nodes contain 3 lines of text |
| 14.1.3 | Switch dagre `ranker` to `'network-simplex'` | 🔲 | default ranker produces more edge crossings in wide trees; network-simplex minimises |

### 14.2 Convergence Edge Visual Overhaul (Quick Win — biggest UX gain)

| # | Task | Status | Notes |
|---|---|---|---|
| 14.2.1 | Change convergence edge color from teal `#0f766e` to distinct blue `#2563eb` | 🔲 | chromatic separation from tree edges (grey) = instant visual categorisation |
| 14.2.2 | Scale convergence edge opacity by similarity score (stronger = more opaque) | 🔲 | `opacity: 0.35 + similarity * 0.55`; weak pairs fade to near-invisible |
| 14.2.3 | Reduce convergence stroke width from 2→1.5 and tree edges stay at default | 🔲 | thinner convergence = visually subordinate to tree hierarchy |
| 14.2.4 | Tighten bezier curvature for convergence edges (`curvature: 0.2`) | 🔲 | tight curves take shorter paths, reducing crossing density vs default 0.5 |

### 14.3 MiniMap (Quick Win — navigation)

| # | Task | Status | Notes |
|---|---|---|---|
| 14.3.1 | Add `<MiniMap />` from `@xyflow/react` to `ThoughtCanvas.tsx` (no new dep) | 🔲 | position `bottom-right`; `pannable` + `zoomable` enabled |
| 14.3.2 | Color minimap nodes by score — red / amber / green matching ThoughtNode buckets | 🔲 | `nodeColor` prop accepts function `(node) => colorString` |
| 14.3.3 | Hide minimap on mobile viewport (it overlaps canvas on narrow screens) | 🔲 | wrap in `className="hidden md:block"` or conditional render |

### 14.4 Convergence Edge Toggle

| # | Task | Status | Notes |
|---|---|---|---|
| 14.4.1 | Add `showConvergenceEdges: boolean` to `prefsStore` (default: `true`), persisted to localStorage | 🔲 | persisted so user preference survives reload |
| 14.4.2 | `ThoughtCanvas`: filter convergence edges out when `showConvergenceEdges = false` | 🔲 | `deriveFlowEdges` already separates edge types — easy to add filter |
| 14.4.3 | LeftPanel: toggle button "Show convergence edges" with current count badge | 🔲 | e.g. "Convergence (12) ✓" / "Convergence (12) ○" |

### 14.5 Convergence Edge Hover Tooltip

| # | Task | Status | Notes |
|---|---|---|---|
| 14.5.1 | React Flow `onEdgeMouseEnter` handler in `ThoughtCanvas` — store hovered edge id | 🔲 | `onEdgeMouseEnter`, `onEdgeMouseLeave` props on `<ReactFlow>` |
| 14.5.2 | Tooltip component: position-fixed panel showing node A thought, node B thought, similarity %, verdict, explanation | 🔲 | shown at bottom-left; avoid obstructing canvas; dismiss on mouse-leave |
| 14.5.3 | On hover, highlight the two endpoint nodes (blue ring) and dim all other edges | 🔲 | pass `hoveredEdgeId` to `ThoughtNode` and `deriveFlowEdges` via store or ref |

### 14.6 Layer Highlight Filter

| # | Task | Status | Notes |
|---|---|---|---|
| 14.6.1 | LeftPanel: layer filter row — one chip per layer (L0, L1, L2…) computed from tree | 🔲 | clicking a chip highlights all nodes at that layer; click again to clear |
| 14.6.2 | `ThoughtNode`: receive `dimmed` prop; apply `opacity-30` when another layer is highlighted | 🔲 | pass via node `data`; transition `opacity 150ms` for smooth effect |
| 14.6.3 | Edge dimming: convergence edges between dimmed nodes also fade | 🔲 | `deriveFlowEdges` checks if both endpoints are in highlighted layer |

### 14.7 Collapse / Expand Subtrees

| # | Task | Status | Notes |
|---|---|---|---|
| 14.7.1 | RightPanel: "Collapse subtree" button for expanded non-leaf nodes | 🔲 | sets `collapsed: boolean` on node; stored in `treeStore` node metadata |
| 14.7.2 | `ThoughtCanvas`: nodes with collapsed ancestors get `hidden: true` in React Flow | 🔲 | walk tree in `deriveFlowNodes`; skip descendants of collapsed nodes |
| 14.7.3 | Collapsed node badge: show child count `[▶ 3]` next to the node text | 🔲 | visual cue that content is hidden; double-click un-collapses |

### 14.8 Node Hover Tooltip (full text)

| # | Task | Status | Notes |
|---|---|---|---|
| 14.8.1 | React Flow `NodeToolbar` on canvas hover — show full `thought` + `rationale` + `score` | 🔲 | `NodeToolbar` is built into `@xyflow/react`; shown on `isVisible={selected}` or hover state |
| 14.8.2 | Tooltip only when node text is actually truncated (line-clamp-3 is active) | 🔲 | check `scrollHeight > clientHeight` on mount to decide if tooltip is needed |

### 14.9 Focus Branch Mode

| # | Task | Status | Notes |
|---|---|---|---|
| 14.9.1 | RightPanel: "Focus branch" button on selected node | 🔲 | enters focus mode: shows selected + all ancestors + immediate children only |
| 14.9.2 | Non-focus nodes: set `opacity-20` (dim but still visible for context) | 🔲 | better than `hidden: true` — user retains spatial orientation |
| 14.9.3 | LeftPanel / canvas: "Exit focus" button while in focus mode | 🔲 | clears `focusBranchId` from treeStore; restores full opacity |

---

## Phase 15 — Evidence & Web Grounding 🔲 PLANNED (added 2026-05-22)

> **Why**: today branches and reports rest on the model's training priors only.
> Production reports must be backed by *real* web evidence. agrun ships a
> first-class `window.Agrun.searchGeminiGrounding()` API (Gemini Google-Search
> grounding) — see `docs/production-roadmap.md` §2.
> **Gate**: depends on Phase 7.1 (evaluator signal) and Phase 16.1–16.3
> (cost/concurrency guards) — grounding adds one Gemini call per searched
> direction. Gemini-provider-only (Default demo gateway cannot ground).

| # | Task | Status | Notes |
|---|---|---|---|
| 14.1 | Live test: confirm `gemini-3.1-flash-lite` supports `google_search` grounding | 🔲 | one-shot real-key test via `searchGeminiGrounding`; BLOCKS the rest — do first |
| 14.2 | Extend `src/agrun.d.ts` with `searchGeminiGrounding` request/response types | 🔲 | currently only `requestGeminiContent` is declared |
| 14.3 | `src/lib/agent/grounding.ts` — wrapper over `window.Agrun.searchGeminiGrounding` | 🔲 | normalise URL-chunk vs `synthetic` items; timeout + error handling |
| 14.4 | Evidence types: `EvidenceItem { url?, title, snippet, synthetic }` + `ThoughtNode.evidence?` | 🔲 | `synthetic` items have no source URL — citation UI must handle both |
| 14.5 | Grounded report: targeted searches per key direction before report gen; cite sources | 🔲 | inject evidence into `buildReportPrompt`; report references real URLs |
| 14.6 | Grounded expansion (opt-in): search a direction before expanding it | 🔲 | decision D3 in roadmap §5 — may defer to grounded-report-only |
| 14.7 | UI: per-session "Web grounding" toggle (Gemini only); evidence list in RightPanel; citations in ReportPanel | 🔲 | toggle hidden under Default provider; handle synthetic = no link |

---

## Phase 16 — Long-Form Input & Agent Export 🔲 PLANNED (added 2026-05-22)

> **Why**: (input) users want to paste README.md / DESIGN.md-length context,
> not a one-line topic. (output) the winning reasoning path should export as a
> dev brief that Claude Code / Codex CLI can build software from.
> **Design**: two-field input + agent-export as a report-template variant —
> see `docs/production-roadmap.md` §3.1–3.2.

### 15.1 Long-Form Input

| # | Task | Status | Notes |
|---|---|---|---|
| 15.1.1 | Topic input → autosizing `<textarea>`; submit via Cmd/Ctrl+Enter | 🔲 | plain Enter inserts newline; rework `TopBar` submit handler |
| 15.1.2 | Add `contextDocument?: string` to `ThoughtTree`; two-field model (short topic + optional context doc) | 🔲 | roadmap §3.1 — do NOT dump long text into `rootTopic` |
| 15.1.3 | Summarize `contextDocument` once on tree creation into a fixed-size brief | 🔲 | brief (not raw text) injected into expand prompts — bounds token cost |
| 15.1.4 | Optional `.md` file drop / picker → fills the context document field | 🔲 | client-side `FileReader`, no upload |

### 15.2 Agent Export

| # | Task | Status | Notes |
|---|---|---|---|
| 15.2.1 | Add `'agent'` to `ReportAudience`; agent dev-brief prompt template in `prompts/report.ts` | 🔲 | reuses Phase 5 report engine — not a new subsystem |
| 15.2.2 | `PLAN.md` export — opinionated winning-path walk → ordered task list + rationale + convergence key insights | 🔲 | human- and agent-readable |
| 15.2.3 | `agent-brief.json` export — same content, structured for programmatic CLI ingestion | 🔲 | extend `lib/export.ts` |
| 15.2.4 | UI: "Export for AI Agent" action — copy-to-clipboard + file download | 🔲 | LeftPanel or ReportPanel |

---

## Phase 17 — Cost Governance & Go-to-Production 🔲 PLANNED (added 2026-05-22)

> **Why**: covers the production gaps NOT filed under Phases 9–13 (which handle
> error/UX/perf/testing/security). 16.1–16.3 are GATE prerequisites — they must
> ship before Phase 14 grounding work. See `docs/production-roadmap.md` §4.

| # | Task | Status | Notes |
|---|---|---|---|
| 16.1 | Hard $ budget cap in `TOTConfig` (`maxSessionCostUsd`) — estimate cost/call, block past cap | 🔲 | **build before Phase 14**; distinct from 8.2.1 node-count cap |
| 16.2 | Global concurrency cap — max 2 concurrent LLM calls across expand/evaluate/convergence/grounding | 🔲 | **build before Phase 14**; CLAUDE.md §10.3; distinct from 11.7 delete-race |
| 16.3 | Live cost display — running session $ spend in LeftPanel + per-call breakdown | 🔲 | **build before Phase 14**; today `tokenCost` exists but no $ rollup |
| 16.4 | Empty state / first-run onboarding — example topics, "what is GOT" hint, guided first generation | 🔲 | placeholder text is the entire onboarding today |
| 16.5 | BYOK product model — gate Default demo gateway after N free generations, or split build modes | 🔲 | **DECISION PENDING (D1)** — roadmap §5; shared key cannot absorb prod traffic |
| 16.6 | Privacy-respecting telemetry — feature-usage counters, never user content | 🔲 | **DECISION PENDING (D2)** — roadmap §5 |

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
| B9 | Clipboard write failure is silent — "Copy link" button never changes to "Copied" | `setCopied(true)` is inside `try` after `await`; no error feedback shown on catch | LeftPanel.tsx:99-108 | Show error toast on clipboard failure (Phase 9.4) |
| B10 | Shared URL import: `config: {}` passes shape validation; missing nested fields crash on first expand | `readSharedTree` checks `typeof config === 'object'` but not sub-fields like `config.similarityThreshold` | share.ts:41-48 | Validate `edges` is Array, `config.similarityThreshold` exists, `config.provider` is valid (Phase 9.7) |
| B11 | IndexedDB load failure on startup is silent — user sees blank canvas with no explanation | `catch (e) { console.error('[idb] load failed:', e) }` only | App.tsx:64 | Surface error banner (Phase 9.5) |
| B18 | **`tree.config.provider` vs `sessionStore.provider` mismatch after loading a saved tree** | A tree saved under `provider: 'gemini'` is loaded; TopBar shows Default. API-key guard uses `sessionStore.provider` ('default' → passes), but `expandNode` uses `tree.config.provider` ('gemini' → no key → throws). Expansion silently fails via error toast. | expand.ts:207-140, convergence.ts:62 | On `hydrate()`, sync `sessionStore.provider` from loaded tree, OR always use `sessionStore.provider` inside `expandNode` |

#### 🔵 LOW — Minor / Edge Cases

| # | Description | Root Cause | File | Fix Plan |
|---|---|---|---|---|
| B12 | `beforeunload` missing — 600ms debounce loses last edits if tab is closed quickly | No `window.addEventListener('beforeunload', …)` to force-flush pending save | App.tsx:74-77 | Add beforeunload handler that calls `saveTree` synchronously (Phase 9.6) |
| B13 | `settingsStore` has no input guards — invalid values silently corrupt config | `setInitialBranches`, `setMaxExpansionLayers` etc. accept any number; UI sliders prevent it but programmatic calls don't | settingsStore.ts:26-30 | SettingsModal already clamps via `min/max` attrs; low risk in practice (Phase 9.8) |
| B14 | `Markdown.tsx` renders text directly without HTML sanitization | Custom inline renderer does not escape `<`, `>`, `&` before inserting into DOM via JSX — JSX escapes strings, so direct XSS from node text is **not possible**; BUT if a future code path uses `dangerouslySetInnerHTML`, this becomes critical | Markdown.tsx:7-39 | Confirm JSX auto-escaping covers all insertion points; close if confirmed safe (Phase 13.3) |
| B15 | `navigator.storage` not monitored — many large trees can silently fill IDB quota | No `navigator.storage.estimate()` call anywhere in the app | indexeddb.ts | Warn user when IDB > 80% full (Phase 11.5) |
| B19 | Duplicate `★` when node is both KEY INSIGHT and favorited — visually confusing, screen reader gets no distinction | Both `isKeyInsight` and `status === 'favorited'` render `★` with no disambiguation | ThoughtNode.tsx:59-64 | KEY INSIGHT: keep `★` orange; favorited: use `♥` or distinct symbol |
| B20 | `share.ts` uses deprecated `escape()` / `unescape()` for base64 UTF-8 encoding | Built on deprecated browser APIs (removed from strict-mode proposals) | share.ts:20-26 | Replace with `TextEncoder` + `btoa` (modern equivalent, zero-dep) |
| B21 | `compactTree`: nodes with `score === 0` (not yet evaluated) are excluded when `minScore > 0` | `if (n.score < cfg.minScore) continue` — score 0 means "pending evaluation", not "low quality" | report.ts:82 | Treat `score === 0` as "unscored, keep if minScore ≤ 1" or show count of excluded unscored nodes in modal |
