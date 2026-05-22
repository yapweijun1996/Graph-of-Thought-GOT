# Graph-of-Thought (GOT) Visualizer

Enter a problem, let an LLM reason about it in branching directions, and watch
the reasoning unfold as an interactive graph. When two *independent* branches
arrive at the same idea, GOT draws a **convergence edge** between them — turning
a one-way mind map into a true graph of thought.

**Live demo:** https://yapweijun1996.github.io/Graph-of-Thought-GOT/

> A pure-frontend demo. No backend, no server, no database — it runs entirely
> in your browser and is hosted as a static site on GitHub Pages. It works with
> **zero setup**: a built-in demo provider means you don't even need an API key
> to try it.

---

## What it is

You type a topic (e.g. *"How to improve team collaboration"*). The model
generates several distinct high-level directions — each from a different
**analytical persona** (optimist, skeptic, pragmatist, first-principles
thinker, contrarian). Each direction becomes a node; you expand any node to
deepen that branch. An evaluator ranks sibling nodes against each other and the
canvas colours them by score (red → amber → green).

The differentiator is **convergence detection**: every node is embedded into a
semantic vector in-browser, and when branches from different parts of the tree
become semantically similar, GOT links them with a convergence edge and asks
the model to confirm it is a real signal. A convergence between two *different
personas* — the skeptic and the optimist independently landing in the same
place — is the strongest signal the conclusion is robust. Without that, it
would just be an AI mind map.

## Features

**Reasoning**
- **Multi-role branches** — each initial branch is argued by a distinct persona
- **Branching reasoning tree** rendered with React Flow + dagre auto-layout
- **Sibling-relative scoring** — the evaluator ranks siblings against each other
  (avoids the self-enhancement bias of absolute pointwise scoring)
- **Convergence edges** — links where independent branches reach similar
  conclusions, confirmed by an LLM signal/noise verdict
- **In-browser embeddings** — semantic vectors via ONNX/WASM, no embedding API
- **Auto-explore** — a bounded, stoppable loop that grows the graph on its own;
  optional agentic mode keeps only the top-scoring branches
- **Web grounding** *(Gemini only)* — searches the web before expanding and
  cites real sources in the report

**Reports & export**
- **Production reports** for four audiences — engineer, manager, researcher, and
  an **AI-agent dev brief** (exportable as `PLAN.md` / `agent-brief.json`)
- **Long-form context input** — paste a README/spec or drop a `.md` file; it is
  summarised once and grounds every branch
- Export the tree as JSON / Markdown, or share a graph via a URL link

**Canvas & UX**
- Minimap, layer filter, subtree collapse, branch isolation, hover tooltips
- Multi-tree library — switch between saved graphs, auto-saved to IndexedDB
- **Dark / light theme** and **trilingual UI** (English / 中文 / Bahasa Melayu)
- Keyboard-accessible nodes, WCAG 2.1 AA pass, installable as a PWA
- Cost governance — live $ estimate, per-session budget cap, concurrency cap

**Providers**
- **Default (Demo)** — a built-in provider, no API key required
- **Gemini** — bring your own key; held in memory by default, opt-in to persist

## Tech stack

| Layer | Choice |
|---|---|
| Build | Vite 6 |
| UI | React 18 + TypeScript |
| Graph | [@xyflow/react](https://reactflow.dev) (React Flow v12) |
| Layout | [@dagrejs/dagre](https://github.com/dagrejs/dagre) |
| State | Zustand |
| LLM transport | `agrun.js` (UMD bundle in `public/`, called via `requestGeminiContent` / `searchGeminiGrounding`) |
| Embeddings | [@xenova/transformers](https://github.com/xenova/transformers.js) — `Xenova/all-MiniLM-L6-v2`, 384-dim, browser-local |
| Styling | Tailwind CSS v4 |
| Tests | Vitest (70 unit tests over the pure functions) |
| Persistence | IndexedDB (trees) + localStorage (preferences) |
| Hosting | GitHub Pages via GitHub Actions |

## Cost model

Only **LLM text generation** costs money. Everything else is free:

| Capability | How | Cost |
|---|---|---|
| Try it with zero setup | Built-in demo provider | Free (shared, rate-limited) |
| Branch + score generation | Gemini, your own key | Paid (your key) |
| Embeddings | `all-MiniLM-L6-v2` in-browser (ONNX/WASM) | Free |
| Hosting | GitHub Pages | Free |
| Storage | IndexedDB / localStorage | Free |

A typical Gemini session costs well under $0.10. A per-session budget cap
(configurable in Settings) hard-stops spend as a safety rail.

## Getting started

Prerequisites: **Node.js 22+**.

```bash
git clone https://github.com/yapweijun1996/Graph-of-Thought-GOT.git
cd Graph-of-Thought-GOT
npm install
npm run dev
```

Then open the URL Vite prints — note the project base path:
`http://localhost:5173/Graph-of-Thought-GOT/`.

### Scripts

| Script | Does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check only |
| `npm test` | Run the Vitest unit suite |

## Using the app

1. Enter a topic in the top bar. Optionally click **+ Context** to paste or drop
   a longer background document.
2. Pick a provider. **Default (Demo)** works immediately with no key. For
   **Gemini**, paste your API key — the field is read-only until focused (to
   block browser autofill) and the key lives only in memory unless you tick
   "Remember key".
3. Press **Generate** (or Cmd/Ctrl+Enter). The root topic expands into the first
   layer of branches.
4. Double-click a node — or focus it and press Enter — to deepen that branch.
   Click a node to see its full thought, rationale, score and evidence in the
   right panel.
5. Use **Auto-explore** to grow the graph automatically, or **Report** to
   synthesise the tree into an audience-targeted document.

The first time embeddings run, the ~23 MB semantic model downloads once and is
then cached by the browser.

## How it works

```
Browser (client only)
├── React + React Flow        — UI + interactive graph canvas
├── Zustand stores            — tree, session, canvas view, cost, library …
├── agrun.js                  — LLM transport (Default gateway / Gemini)
├── @xenova/transformers      — in-browser embeddings (ONNX/WASM)
└── IndexedDB + localStorage   — persistence

GitHub Actions → GitHub Pages — static deploy, no server involved
```

There is no backend. The app calls `window.Agrun.requestGeminiContent` directly
for each structured generation (expand / evaluate / convergence / report); the
agrun OODAE planner is not used. See [`CLAUDE.md`](./CLAUDE.md) for the
architectural decisions, [`DESIGN.md`](./DESIGN.md) for the data model and
pipeline design, and [`task.md`](./task.md) for the task-by-task build log.

## Project status

Phases 1–17 are complete — core reasoning, intelligence, polish, the default
demo provider, production reports, hardening, multi-role branches, auto-explore,
error handling, accessibility, performance, testing, SEO/PWA, canvas UX,
long-form input, agent export, and cost governance. See
[`docs/PHASE-STATUS.md`](./docs/PHASE-STATUS.md) for the snapshot.

One item is deferred: end-to-end verification of Gemini web grounding needs a
real Gemini API key — the grounding code is implemented and build-verified.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site
and publishes `dist/` to GitHub Pages. The Vite `base` is set to
`/Graph-of-Thought-GOT/` so asset paths resolve under the project page URL.
GitHub Actions are pinned to commit SHAs for reproducible CI.

## Privacy

Your Gemini API key is session-only by default — held in memory, cleared on
reload, and never transmitted anywhere except directly to the Gemini API. You
may opt in to persist it to localStorage via the "Remember key" checkbox. The
Default demo provider uses a shared, rate-limited key — for heavy use, switch to
Gemini with your own key.
