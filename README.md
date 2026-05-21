# Graph-of-Thought (GOT) Visualizer

Enter a problem, let an LLM reason about it in branching directions, and watch
the reasoning unfold as an interactive graph. When two different branches
arrive at the same idea, GOT draws a **convergence edge** between them — turning
a one-way mind map into a true graph of thought.

**Live demo:** https://yapweijun1996.github.io/Graph-of-Thought-GOT/

> A pure-frontend demo. No backend, no server, no database — it runs entirely
> in your browser and is hosted as a static site on GitHub Pages.

---

## What it is

You type a topic (e.g. *"How to improve team collaboration"*). Gemini generates
several distinct high-level directions. Each direction becomes a node; you
expand any node to deepen that branch. An evaluator scores every node 0–10, and
the canvas colours nodes by score (red → amber → green).

The differentiator is **convergence detection**: every node is embedded into a
semantic vector in-browser, and when branches from different parts of the tree
become semantically similar, GOT links them with a dashed edge. Without that,
it would just be an AI mind map.

## Features

- **Branching reasoning tree** rendered with React Flow + dagre auto-layout
- **Node scoring** — an LLM evaluator rates each node 0–10
- **In-browser embeddings** — semantic vectors via ONNX/WASM, no embedding API
- **Convergence edges** — dashed links where branches reach similar conclusions
- **Dark / light theme**, persisted
- **Trilingual UI** — English / 中文 / Bahasa Melayu
- **Persistence** — the tree is auto-saved to IndexedDB and restored on reload
- **Bring your own key** — your Gemini API key stays in memory, never stored

## Tech stack

| Layer | Choice |
|---|---|
| Build | Vite 6 |
| UI | React 18 + TypeScript |
| Graph | [@xyflow/react](https://reactflow.dev) (React Flow v12) |
| Layout | [@dagrejs/dagre](https://github.com/dagrejs/dagre) |
| State | Zustand |
| LLM transport | `agrun.js` (UMD bundle in `public/`, called via `requestGeminiContent`) |
| Embeddings | [@xenova/transformers](https://github.com/xenova/transformers.js) — `Xenova/all-MiniLM-L6-v2`, 384-dim, browser-local |
| Styling | Tailwind CSS v4 |
| Persistence | IndexedDB (tree) + localStorage (preferences) |
| Hosting | GitHub Pages via GitHub Actions |

## Cost model

Only **LLM text generation** costs money, and you pay it with your own API key.
Everything else is free:

| Capability | How | Cost |
|---|---|---|
| Branch + score generation | Gemini, your key | Paid (your key) |
| Embeddings | `all-MiniLM-L6-v2` in-browser (ONNX/WASM) | Free |
| Hosting | GitHub Pages | Free |
| Storage | IndexedDB / localStorage | Free |

A typical session costs well under $0.10 of Gemini usage.

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

## Using the app

1. Enter a topic in the top bar.
2. Pick a provider and model (Gemini is wired; OpenAI is selectable but not yet
   connected).
3. Paste your **Gemini API key**. The field is read-only until focused (to
   block browser autofill) and the key lives only in memory — it is never
   written to localStorage or IndexedDB.
4. Press **Generate**. The root topic expands into the first layer of branches.
5. Click **Expand** on any node to deepen that branch. Click a node to see its
   full thought, rationale, and score in the right panel.

The first time embeddings run, the ~23 MB semantic model downloads once and is
then cached by the browser.

## How it works

```
Browser (client only)
├── React + React Flow        — UI + interactive graph canvas
├── Zustand stores            — tree state, session credentials, preferences
├── agrun.js                  — LLM transport to Gemini (your API key)
├── @xenova/transformers      — in-browser embeddings (ONNX/WASM)
└── IndexedDB + localStorage   — persistence

GitHub Actions → GitHub Pages — static deploy, no server involved
```

There is no backend. The app calls `window.Agrun.requestGeminiContent` directly
for each structured generation (expand / evaluate); the agrun OODAE planner is
not used. See [`CLAUDE.md`](./CLAUDE.md) for the architectural decisions and
[`DESIGN.md`](./DESIGN.md) for the data model and pipeline design.

## Project status

This is an in-progress demo built in phases:

- **Phase 1 — Core** ✅ scaffold, tree store, canvas rendering, node expansion,
  i18n, theming, persistence.
- **Phase 2 — Intelligence** 🚧 evaluator scoring and in-browser embeddings are
  wired; cross-branch convergence-edge detection is in active development.
- **Phase 3 — Polish** 🚧 node detail panel landed; prune/favorite actions,
  cost display, and export are still to come.

`DESIGN.md` §16 tracks the planned expansion-pipeline refactor.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site
and publishes `dist/` to GitHub Pages. The Vite `base` is set to
`/Graph-of-Thought-GOT/` so asset paths resolve under the project page URL.

## Privacy

Your API key is session-only — it is held in memory, cleared on reload, and
never persisted or transmitted anywhere except directly to the Gemini API.
