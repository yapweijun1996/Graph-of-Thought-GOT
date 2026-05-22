# UX Research — Canvas Readability at Scale & Outcome Focus

> Date: 2026-05-22
> Trigger: user report — "turn on auto-explore and the canvas conflicts, hard
> to read." Plus the broader ask: "how can this project be productive and
> actually help an end user resolve their issue?"
>
> This doc is the research backing **Phase 18** (Canvas Readability & Scale)
> and **Phase 19** (Outcome-Focused Productivity) in [`../task.md`](../task.md).
>
> **Status: both phases implemented 2026-05-22** — semantic zoom, fit-once,
> exploration feed, Tidy, the answer-first Insights panel and the
> recommended-path trace all shipped and live-verified. This doc is kept as
> the research record.

---

## 1. The problem, observed

Auto-explore grows a graph to 30–40+ nodes within a couple of minutes. At
`fitView` zoom, a 4-layer tree (≈ 4 → 12 → 36 nodes per layer — geometric fan)
renders as an **extremely wide, roughly one-row-tall band of unreadable tiny
boxes**. Convergence edges crisscross the band. Worse: the canvas calls
`fitView` on every new-node batch, so as auto-explore adds nodes the view
**zooms further out** — watching the graph grow becomes watching it shrink
into a hairball.

Concretely (live, 2026-05-22): a 38-node / 4-layer tree at fit-view has each
node at roughly 5% of its real size — the structure is visible, the content is
not. There is no zoom level that shows both structure *and* readable text.

## 2. Research — the four canonical scale techniques

Cockburn, Karlson & Bederson, *"A review of overview+detail, zooming, and
focus+context interfaces"* (ACM Computing Surveys) defines the four ways to
present more information than fits at once:

| Technique | What it does | GOT status |
|---|---|---|
| **Overview + detail** | a separate small overview alongside the detail view | ✅ minimap (Phase 14.3) |
| **Zooming** | temporal separation — change representation with zoom (**semantic / level-of-detail zoom**) | ❌ **missing** |
| **Focus + context** | show the focus embedded in dimmed context | ✅ isolate-branch (14.9), layer dim (14.6) |
| **Cue-based** | selectively highlight / suppress items | ✅ layer filter (14.6), convergence toggle (14.4) |

GOT has three of the four. **The missing one — zooming / semantic zoom — is
the direct cause of the "wall of tiny boxes".** Semantic zoom (see *Semantic
Zoom: Interactive Multi-Level Visualization*, and *Semantic Zoom and Mini-Maps
for Software Cities*, arXiv 2510.00003) adapts the *representation* to the zoom
level: zoomed out, a node is a compact glyph (here: a score-coloured chip with
its role and layer — a structural map); zoomed in, it is the full card. There
is then always a useful altitude — overview *or* reading — and no dead zone.

Incremental-layout stability (when a graph grows, existing nodes must not jump)
is a separate known concern (*An Incremental Layout Method for Visualizing
Online Dynamic Graphs*, UC Davis). GOT already handles this: `settledPositions`
freezes existing node coordinates and only lays out new ids.

## 3. Fix plan — Phase 18 (Canvas Readability & Scale)

Priority pair — these two alone resolve ~80% of the complaint:

- **18.2 Semantic-zoom node** — `ThoughtNode` renders by zoom bucket: chip
  (no text) → title-only → full. Closes the missing "zooming" technique.
- **18.3 Fit once, never auto-refit on growth** — stop the zoom-out. Fit on
  tree create / hydrate only; the user keeps the Fit View button + minimap.

Then progressive polish: 18.1 off-screen virtualization (done), 18.4 fit
reading-altitude floor, 18.5 exploration feed (a text activity channel,
readable at any zoom), 18.6 "Tidy"/progressive collapse, 18.7 hide convergence
edges at overview zoom, 18.8 new-node affordance.

**Rejected**: switching the dagre layout TB → LR. A geometric-fan tree is
"different-bad" in LR (a tall narrow stripe). Layout direction is not the
lever; semantic zoom + virtualization is.

## 4. The deeper question — is GOT *productive*?

The user's second ask reframes the whole project. **GOT's value to an end user
is the answer, not the graph.** The graph is the reasoning *process*; the
productive *output* is the synthesis — the key insights, the convergence
(闭环), the single recommended path, the Report.

Today the UI makes the graph the star and buries the answer behind a "Report"
button. A user who simply wants their problem solved must read a 38-node graph
to extract value. That is the productivity gap, and a prettier graph does not
close it.

**Phase 19 (Outcome-Focused Productivity)** addresses it: an answer-first
results panel, promoting the Report to a first-class output, ending
auto-explore with a synthesis rather than a bigger graph, tracing the single
highest-scoring root→leaf path, and framing the product as "bring a problem →
get a reasoned recommendation."

The graph remains GOT's differentiator — convergence between *independent*
reasoning paths (especially cross-role) is real signal. But the graph should
be the *evidence* behind the answer, not the deliverable the user has to
decode themselves.

---

See [`../task.md`](../task.md) Phases 18–19 for the task-by-task breakdown.
