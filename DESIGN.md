# TOT Visualizer — Design Document

> Interactive Tree-of-Thoughts web application powered by Gemini API.
> Users input a topic; an AI agent expands the reasoning tree branch by branch.
> Cross-layer similar branches are detected and linked into a graph.

---

## 1. Project Overview

### 1.1 What it is

A **single-page web application** that visualizes Tree-of-Thoughts (TOT) reasoning as an interactive node graph. The user enters a problem/topic, and an AI agent (Gemini) generates multiple branches of thought. The user can click any node to expand it further, prune dead-ends, and discover where different branches converge.

### 1.2 Core user flow

```
1. User enters a topic (e.g., "How to build a profitable B2B SaaS in 60 days")
2. AI generates Layer 1: N initial directions (default N=4)
3. UI renders nodes in a tree layout
4. User clicks any node → AI expands that direction into M sub-branches (default M=3)
5. As tree grows, similarity detector finds cross-layer matches and draws graph edges
6. User can score/favorite nodes, prune branches, export final reasoning path
```

### 1.3 Why this is useful

- **Decision-making**: Compare multiple reasoning paths visually instead of linearly
- **Brainstorming**: AI generates angles the user wouldn't think of
- **Convergence discovery**: See when different approaches lead to the same conclusion (strong signal)
- **Pruning**: Kill bad directions early, focus compute on promising ones

---

## 2. Tech Stack

### 2.1 Required

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | **Next.js 15+ (App Router)** | SSR for SEO, API routes for backend, easy Vercel deploy |
| Language | **TypeScript** | Type safety for tree state |
| AI Runtime | **agrun (existing)** + Vercel AI SDK | User already owns this; native Gemini support |
| Model | **Gemini 3.1 Flash Lite** for evaluator, **Gemini 3 Pro** for generator | Cost/quality split |
| Graph UI | **React Flow (@xyflow/react)** | Industry standard, custom node support |
| Embeddings | **Gemini text-embedding-004** | For cross-layer similarity detection |
| Storage | **Zustand** (client state) + **IndexedDB** (persistence) | No backend DB needed for MVP |
| Styling | **Tailwind CSS v4** + **shadcn/ui** | Fast iteration |

### 2.2 Optional (V2)

- **Supabase**: persist trees, share via URL
- **Cloudflare Workers**: serverless backend for shared trees
- **Recharts**: side-panel showing branch scores over time

---

## 3. Architecture

### 3.1 High-level diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                       │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Input Panel  │  │ Tree Canvas  │  │  Node Inspector  │   │
│  │ (topic +     │  │ (React Flow) │  │  (score, prompt, │   │
│  │  config)     │  │              │  │   actions)       │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                  │                    │              │
│         └──────────────────┴────────────────────┘              │
│                            │                                    │
│              ┌─────────────▼──────────────┐                    │
│              │   Zustand Store (tree)     │                    │
│              │   - nodes, edges, scores   │                    │
│              │   - embedding cache        │                    │
│              └─────────────┬──────────────┘                    │
└────────────────────────────┼───────────────────────────────────┘
                             │
                  ┌──────────▼──────────┐
                  │  /api/expand        │
                  │  /api/evaluate      │
                  │  /api/embed         │
                  └──────────┬──────────┘
                             │
              ┌──────────────▼──────────────┐
              │      agrun (runtime)        │
              │  - Gemini generator         │
              │  - Gemini evaluator         │
              │  - Embedding service        │
              └─────────────────────────────┘
```

### 3.2 Data model

```typescript
// Core node type
interface ThoughtNode {
  id: string;                    // uuid
  parentIds: string[];           // graph: multiple parents allowed
  layer: number;                 // depth from root (0 = root topic)
  thought: string;               // the reasoning content
  rationale: string;             // why this direction matters
  score: number;                 // 0-10, from evaluator
  embedding: number[];           // for similarity detection
  status: "pending" | "expanded" | "pruned" | "favorited";
  metadata: {
    generatedAt: number;
    model: string;
    tokenCost: number;
  };
}

// Edge type (covers tree + graph edges)
interface ThoughtEdge {
  id: string;
  source: string;                // node id
  target: string;                // node id
  type: "tree" | "convergence";  // tree = parent→child, convergence = cross-layer link
  similarity?: number;           // 0-1, only for convergence edges
}

// Full tree state
interface ThoughtTree {
  rootTopic: string;
  config: TOTConfig;
  nodes: Record<string, ThoughtNode>;
  edges: ThoughtEdge[];
  createdAt: number;
}

interface TOTConfig {
  initialBranches: number;        // default 4
  expansionBranches: number;      // default 3
  similarityThreshold: {
    merge: number;                // > this → suggest merge (default 0.92)
    convergence: number;          // > this → draw convergence edge (default 0.75)
  };
  generatorModel: string;         // "gemini-3-pro"
  evaluatorModel: string;         // "gemini-3.1-flash-lite"
  embeddingModel: string;         // "text-embedding-004"
}
```

---

## 4. Core Algorithms

### 4.1 Node expansion algorithm

```
function expandNode(node):
  1. Build context = path from root to this node
  2. Call generator with EXPAND_PROMPT
  3. Parse N candidate thoughts
  4. For each candidate:
     a. Generate embedding
     b. Check similarity against ALL existing nodes (across all layers)
     c. If similarity > merge threshold:
        - Skip creation, suggest merge instead
     d. If similarity > convergence threshold (but < merge):
        - Create node + add convergence edge to similar node
     e. Else:
        - Create node as new branch
  5. Call evaluator on each new node to assign score
  6. Update tree state
```

### 4.2 Cross-layer similarity detection

```
For new node N at layer L:
  For each existing node E in tree:
    if E.layer == L and same parent: skip (siblings)
    
    sim = cosineSimilarity(N.embedding, E.embedding)
    
    if sim > 0.92:
      → MERGE: don't create N, link E to N's intended parent
    elif sim > 0.75:
      → CONVERGENCE: create N normally, add convergence edge N ↔ E
    else:
      → INDEPENDENT: create N normally
```

### 4.3 Pruning suggestions

```
Auto-prune signals (UI suggests, user confirms):
  - Score < 3 AND siblings have score > 6
  - Node has been expanded but all children scored < 4
  - Node converges with a higher-scored node (suggest pruning the lower-scored one)
```

---

## 5. Prompts (Critical — these define output quality)

### 5.1 Initial expansion prompt (Layer 1 from root topic)

```
SYSTEM:
You are a strategic reasoning engine. Given a problem, you generate
DISTINCT, MUTUALLY EXCLUSIVE high-level directions to approach it.

USER:
Topic: {topic}

Generate exactly {N} different high-level directions to approach this problem.
Each direction must:
- Represent a fundamentally different angle (not variations of the same idea)
- Be actionable and specific
- Have a clear rationale for why it matters

Return strict JSON:
{
  "branches": [
    {
      "thought": "<one-sentence direction>",
      "rationale": "<2-3 sentence explanation of why this angle>"
    }
  ]
}

Do not include markdown code fences. Return raw JSON only.
```

### 5.2 Node expansion prompt (any non-root node)

```
SYSTEM:
You are extending a tree of reasoning. You will be given the path from root
to the current node, and asked to generate child directions that DEEPEN
this specific branch (not restart from scratch).

USER:
Original topic: {rootTopic}

Reasoning path so far (root → current node):
{pathBreadcrumb}

Current node to expand:
"{currentThought}"
Rationale: {currentRationale}

Generate exactly {M} child directions that build ON this specific node.
Each child must:
- Logically follow from the current node (not jump to a different topic)
- Explore a different sub-aspect
- Be more concrete/specific than the parent

Return strict JSON:
{
  "branches": [
    {
      "thought": "<sub-direction>",
      "rationale": "<why this sub-direction>"
    }
  ]
}
```

### 5.3 Evaluator prompt

```
SYSTEM:
You score reasoning quality. You assign a number 0-10 based on how promising
a reasoning direction is toward solving the original problem.

USER:
Original problem: {rootTopic}

Full reasoning path:
{pathBreadcrumb}

Score the FINAL node in this path:
"{thought}"

Scoring rubric:
- 0-2: dead end, off-topic, or trivially wrong
- 3-4: weak, unlikely to lead anywhere useful
- 5-6: plausible but unproven
- 7-8: strong, clear path forward
- 9-10: exceptional insight, high conviction

Return strict JSON:
{
  "score": <number 0-10>,
  "reasoning": "<one sentence justification>"
}
```

### 5.4 Convergence interpretation prompt (when two branches match)

```
SYSTEM:
Two different reasoning branches have arrived at similar conclusions.
Determine if this is meaningful convergence (signal) or accidental
overlap (noise).

USER:
Original topic: {rootTopic}

Branch A (path):
{pathA}

Branch B (path):
{pathB}

Similarity score: {cosineSim}

Question: Do these branches represent meaningful convergence (same insight
reached via different paths), or are they accidentally similar?

Return strict JSON:
{
  "verdict": "convergence" | "redundancy" | "coincidence",
  "explanation": "<short reason>",
  "suggestedAction": "merge" | "link" | "keep_separate"
}
```

---

## 6. API Routes

### 6.1 `/api/expand` (POST)

```typescript
// Request
{
  rootTopic: string;
  parentNodeId: string | null;  // null = expanding root
  pathBreadcrumb: string[];     // ancestor thoughts
  count: number;                // how many branches to generate
  config: TOTConfig;
}

// Response
{
  branches: Array<{
    thought: string;
    rationale: string;
    embedding: number[];
    similarities: Array<{       // pre-computed similarity to existing nodes
      nodeId: string;
      score: number;
    }>;
  }>;
  tokenCost: number;
}
```

### 6.2 `/api/evaluate` (POST)

```typescript
// Request
{
  rootTopic: string;
  pathBreadcrumb: string[];
  thought: string;
}

// Response
{
  score: number;          // 0-10
  reasoning: string;
  tokenCost: number;
}
```

### 6.3 `/api/embed` (POST)

```typescript
// Request
{
  texts: string[];
}

// Response
{
  embeddings: number[][];
  tokenCost: number;
}
```

### 6.4 `/api/convergence` (POST)

```typescript
// Request
{
  rootTopic: string;
  pathA: string[];
  pathB: string[];
  similarity: number;
}

// Response
{
  verdict: "convergence" | "redundancy" | "coincidence";
  explanation: string;
  suggestedAction: "merge" | "link" | "keep_separate";
}
```

---

## 7. UI/UX Specification

### 7.1 Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Header: Logo | Topic input | Settings (gear) | Export       │
├──────────┬──────────────────────────────────┬────────────────┤
│          │                                   │                │
│  Left    │      Tree Canvas                  │  Right Panel  │
│  Panel   │      (React Flow)                 │  (Selected    │
│          │                                   │   Node Info)  │
│  - Tree  │      - Nodes draggable            │                │
│    list  │      - Click to select             │  - Thought   │
│  - Stats │      - Double-click to expand      │  - Rationale │
│  - Cost  │      - Right-click for menu        │  - Score     │
│          │      - Convergence edges = dashed  │  - Actions:  │
│          │                                    │    Expand,   │
│          │                                    │    Score,    │
│          │                                    │    Prune,    │
│          │                                    │    Favorite  │
│          │                                    │              │
└──────────┴────────────────────────────────────┴──────────────┘
```

### 7.2 Node visual design

- **Color by score**: red (0-3) → yellow (4-6) → green (7-10)
- **Size by score**: bigger node = higher score
- **Icon overlays**: ⭐ favorited, 🔥 user-marked-strong, ✂ pruned (greyed out)
- **Edge styles**:
  - Solid line = parent-child (tree edge)
  - Dashed line = convergence (graph edge)
  - Edge thickness = similarity strength

### 7.3 Interactions

| Action | Trigger | Effect |
|--------|---------|--------|
| Expand node | Double-click OR "Expand" button | Generate M children |
| Select node | Single-click | Show in right panel |
| Prune branch | Right-click menu | Grey out node + descendants |
| Favorite | Star button | Mark as important |
| Drag node | Click + drag | Manual reposition (overrides auto-layout) |
| Pan canvas | Click empty + drag | Move view |
| Zoom | Scroll wheel | Zoom in/out |

### 7.4 Layout algorithm

Use **dagre** (already in React Flow) with:
- Direction: top-to-bottom (root at top)
- Rank separation: 120px
- Node separation: 60px
- Convergence edges drawn AFTER layout (don't affect positioning)

---

## 8. Cost Estimation

Per session (assuming user explores 5 layers, 4 branches each = ~30 nodes):

| Operation | Calls | Model | Est. Cost |
|-----------|-------|-------|-----------|
| Initial expansion | 1 | Gemini 3 Pro | ~$0.01 |
| Node expansions | ~10 | Gemini 3 Pro | ~$0.05 |
| Evaluations | ~30 | Gemini 3.1 Flash Lite | ~$0.005 |
| Embeddings | ~30 | text-embedding-004 | ~$0.001 |
| Convergence checks | ~5 | Gemini 3.1 Flash Lite | ~$0.002 |
| **Total per session** | | | **~$0.07** |

At $0.07/session and a $5/month pricing tier with 50 sessions allowed, gross margin is ~30%. Increase to $9/month for healthy margin.

---

## 9. MVP Scope (What to Build First)

### Phase 1: Core (Week 1)
- [ ] Next.js project setup with TypeScript + Tailwind + shadcn/ui
- [ ] Zustand store for tree state
- [ ] React Flow canvas with custom node component
- [ ] `/api/expand` route using agrun + Gemini
- [ ] Topic input → Layer 1 generation
- [ ] Click node → manual expansion

### Phase 2: Intelligence (Week 2)
- [ ] `/api/evaluate` route + score display
- [ ] `/api/embed` route + embedding storage
- [ ] Cross-layer similarity detection
- [ ] Convergence edges rendered
- [ ] `/api/convergence` for verdict on matches

### Phase 3: Polish (Week 3)
- [ ] Right panel with node inspector
- [ ] Prune / favorite / score actions
- [ ] IndexedDB persistence (auto-save)
- [ ] Export to JSON / Markdown
- [ ] Mobile responsive (read-only on mobile, edit on desktop)

### Out of MVP scope
- User accounts / cloud sync
- Sharing trees via URL
- Collaborative editing
- Custom prompt templates
- Multi-language UI

---

## 10. Critical Implementation Notes

### 10.1 Gemini schema flattening (existing pain point)

User has hit Gemini's nested schema limitations before. For this project:
- Keep response schemas FLAT (one level of nesting max)
- Use `propertyOrdering` explicitly in schemas
- Use Vercel AI SDK's `generateObject` with Zod schemas (already battle-tested in agrun)

### 10.2 Embedding storage strategy

- Embeddings are 768-dim floats → 3KB per node
- 100 nodes = 300KB → fine for client memory
- For persistence: store embeddings in IndexedDB as `Float32Array`, not JSON (10x smaller)

### 10.3 Race conditions

When user rapidly clicks "expand" on multiple nodes:
- Queue requests in client (max 2 concurrent)
- Show pending state on node being expanded
- Disable re-expansion of nodes already in flight

### 10.4 Layout reflows

Each new node triggers dagre re-layout. To avoid jarring UX:
- Animate position transitions (React Flow has built-in support, use `fitView: false` after first render)
- Only auto-fit view on initial load
- Preserve user's manual node positions if they've dragged

---

## 11. File Structure

```
tot-visualizer/
├── app/
│   ├── api/
│   │   ├── expand/route.ts
│   │   ├── evaluate/route.ts
│   │   ├── embed/route.ts
│   │   └── convergence/route.ts
│   ├── page.tsx                    # main app
│   └── layout.tsx
├── components/
│   ├── canvas/
│   │   ├── ThoughtCanvas.tsx       # React Flow wrapper
│   │   ├── ThoughtNode.tsx         # custom node component
│   │   └── ConvergenceEdge.tsx     # custom edge component
│   ├── panels/
│   │   ├── LeftPanel.tsx
│   │   ├── RightPanel.tsx
│   │   └── TopBar.tsx
│   └── ui/                          # shadcn components
├── lib/
│   ├── agent/
│   │   ├── generator.ts             # uses agrun for expansion
│   │   ├── evaluator.ts             # uses agrun for scoring
│   │   ├── embedder.ts              # Gemini embeddings
│   │   └── similarity.ts            # cosine sim + thresholds
│   ├── prompts/
│   │   ├── expand.ts
│   │   ├── evaluate.ts
│   │   └── convergence.ts
│   ├── store/
│   │   └── treeStore.ts             # Zustand
│   └── layout/
│       └── dagre.ts                 # tree layout
├── types/
│   └── tree.ts                      # shared types
└── package.json
```

---

## 12. Environment Variables

```bash
# .env.local
GEMINI_API_KEY=your_key_here
GEMINI_GENERATOR_MODEL=gemini-3-pro
GEMINI_EVALUATOR_MODEL=gemini-3.1-flash-lite
GEMINI_EMBEDDING_MODEL=text-embedding-004

# Optional V2
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

---

## 13. Success Metrics (How to know it's working)

- **Generation quality**: User-rated "useful" branches > 60% of generated nodes
- **Convergence detection**: When user manually identifies similar branches, system already linked them > 70% of the time
- **Performance**: Node expansion completes in < 5 seconds
- **Cost**: Average session cost < $0.10
- **Engagement**: Average session = 4+ expansions (means users find it useful)

---

## 14. Known Risks & Open Questions

| Risk | Mitigation |
|------|-----------|
| Gemini hallucinates branches that don't follow from parent | Strong prompt anchoring + show breadcrumb in expansion prompt |
| 100-layer trees become unusable | Hard cap at 10 layers, show warning beyond 6 |
| Embedding similarity is noisy | Tune thresholds per use case; let user adjust in settings |
| User confused by graph vs tree | Default to tree view, opt-in to "show convergence edges" toggle |
| Cost runs away if user spams expand | Rate limit + show running cost in UI |

---

## 15. Instructions for AI Builder (Claude Code / Codex)

If you are an AI agent implementing this:

1. **Read this entire document first.** Do not start coding until you've internalized the data model and prompts.
2. **Start with Phase 1 (Core)** in section 9. Get the canvas rendering nodes before touching AI calls.
3. **Use existing agrun runtime** for all Gemini calls. Do not write a new wrapper around the Gemini SDK.
4. **Validate prompts with real Gemini calls** before building UI on top — bad prompts = bad UX.
5. **Test cross-layer similarity early** — this is the hardest part. Mock it first if needed, then replace with real embeddings.
6. **Do not add features outside MVP scope.** Section 9 is the spec, not section 1.2.
7. **Ask the user before adding new dependencies** beyond what's listed in section 2.

---

*End of design document.*
