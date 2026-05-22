# CLAUDE.md — Graph-of-Thought (GOT) Visualizer

> 这是 GOT 项目的本地规则，覆盖全局 `~/.claude/CLAUDE.md` 中的冲突项。
> 最后更新：2026-05-21

---

## 1. 项目身份

**是什么**：纯前端 Demo Web App。用户输入问题，AI（Gemini/OpenAI）生成多分支推理树，渲染成可交互节点图。不同分支若语义相似，系统画「收敛边」，形成 Graph-of-Thought。

**核心差异化**：`收敛边（convergence edge）` — 不同推理路径发现同一结论时自动连线。没有它就只是 AI mindmap。

**设计文档 SSOT**：[DESIGN.md](./DESIGN.md)

---

## 2. 架构决策（已定，不重新讨论）

### 2.1 纯静态前端，无 Backend

```
Browser（Client Only）
├── Vite + React + TypeScript     ← 框架
├── @xyflow/react (React Flow)    ← 图可视化
├── Zustand                       ← 状态管理
├── agrun.js (/public/agrun.js)   ← AI Agent runtime（用户输入 API key）
├── @xenova/transformers          ← 免费 Embedding（浏览器内 ONNX）
└── IndexedDB + localStorage      ← 持久化（自写封装）

GitHub Actions → GitHub Pages（静态托管）
```

**没有 Next.js，没有 API Routes，没有 Express，没有任何 Server。**

### 2.2 费用模型（严格遵守）

| 功能 | 方案 | 费用 |
|---|---|---|
| 文字生成（LLM） | Gemini / OpenAI / 用户自己的 GPT Gateway | ✅ 可付费，用户自备 key |
| Embedding | `@xenova/transformers` + `Xenova/all-MiniLM-L6-v2` | ✅ 免费，浏览器内跑 |
| 静态托管 | GitHub Pages | ✅ 免费 |
| 数据库 | 无（IndexedDB） | ✅ 免费 |

**绝对不引入任何额外付费服务**（Supabase、Vercel Functions、OpenAI Embeddings API、Pinecone 等）。

### 2.3 API Key 处理（2026-05-22 更新：opt-in localStorage）

- 用户在 UI 里输入自己的 API key。**默认 session 级别**（仅内存，刷新即清）
- TopBar 有「记住密钥」勾选框，**默认关**。勾选后 key 才写入 localStorage（键 `got:apiKey`）；取消勾选立即清除
- localStorage 是明文、任意 XSS 可读 —— 所以默认关、必须用户主动 opt-in。勾选框带安全提示 tooltip
- agrun.js 的标准模式：`session.run({ provider: "gemini", apiKey: userKey, ... })`
- 不能 hardcode 任何 key，不能 commit 任何 key

### 2.4 agrun.js 作为 LLM transport 层

- 放在 `/public/agrun.js`，通过 `<script src="./agrun.js">` 加载，暴露全局 `window.Agrun`
- **结构化生成直接调 `window.Agrun.requestGeminiContent(request, fetch)`** —— 不走 planner / `createRuntime`
- 原因：expand / evaluate / convergence 都是「确定性单次结构化生成」。agrun 的 OODAE planner 是为多步 agent 循环设计的，对单次结构化调用不可预测（Explore + advisor 2026-05-21 核实）
- agrun 提供的价值：Gemini transport、鉴权、错误处理、超时、thinking config
- `requestGeminiContent` 是**纯文本生成**，不支持 Gemini structured-output / responseSchema。JSON 形状靠 prompt 钉死，`parseExpandResponse` 负责 strip 围栏 + 校验（2026-05-21 核实 agrun.js:56382）
- Thinking level 通过 request 的 `geminiThinkingConfig: { thinkingLevel: 'low' }` 传入
- `window.Agrun` 的类型在 `src/agrun.d.ts` 声明

### 2.5 Embedding 方案

```javascript
// lib/embedder.ts
import { pipeline } from '@xenova/transformers';

let extractor = null;

export async function getEmbedding(text: string): Promise<number[]> {
  if (!extractor) {
    extractor = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'  // 23MB, 首次下载后 browser cache
    );
  }
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);  // 384 维 Float32
}

export function cosineSimilarity(a: number[], b: number[]): number {
  // a 和 b 都已 normalize，点积 = cosine similarity
  return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
}
```

**Embedding 维度**：384（all-MiniLM-L6-v2），不是 768（text-embedding-004）。DESIGN.md 的阈值仍适用（0.75 / 0.92），但实际运行后可能需要微调。

---

## 3. 技术栈（完整列表）

### 必须用

| 层 | 选型 |
|---|---|
| 构建 | **Vite 6** |
| 框架 | **React 18 + TypeScript** |
| 路由 | **无**（单页应用，不需要路由） |
| 图 UI | **@xyflow/react**（React Flow v12）|
| 布局算法 | **@dagrejs/dagre** |
| 状态 | **Zustand** |
| Embedding | **@xenova/transformers**（Xenova/all-MiniLM-L6-v2）|
| AI Runtime | **agrun.js**（`/public/agrun.js` UMD bundle）|
| 样式 | **Tailwind CSS v4**（Vite plugin 版）|
| UI 组件 | **shadcn/ui**（Vite 兼容版）|
| 持久化 | **IndexedDB**（思维树 + embedding）+ **localStorage**（UI 偏好）|
| 主题 | 明 / 暗双模式（`index.css` CSS 变量已就绪）|
| 托管 | **GitHub Pages**（GitHub Actions 部署，`deploy.yml` 已就绪）|
| LLM 模型 | **gemini-3.1-flash-lite**（generator + evaluator 共用）|
| i18n | 自定义轻量方案（en / zh / ms），不引入 i18n 库 |

### 模型与语言决策（2026-05-21，用户确认 + KB 核实）

- **首选 provider：Gemini**，模型统一 `gemini-3.1-flash-lite`。KB 核实：1M context、$0.25/$1.50 per 1M、363 tok/s、支持 structured output、是 thinking model。
- **Thinking level = `low`**。agrun 支持 `geminiThinkingConfig: { thinkingLevel: 'low' }`（KB `agrun.long-task-lab` 2026-05-20）。
- **绝不 cap `maxOutputTokens`**：flash-lite 是 thinking model，thinking token 与输出共用预算，cap 会把 JSON 截断在半句（KB postmortem `globe3.ai-chatbox`）。
- **i18n**：UI 文案支持 English / 中文 / Bahasa Melayu；prompt 可按 UI 语言要求 Gemini 用对应语言生成分支。
- OpenAI 为次选，默认 model id `gpt-5`（5.x 精确 API id 未在 KB 确认）。

### 持久化与主题决策（2026-05-21，用户确认）

两层持久化，职责分明：

| 机制 | 存什么 | 不存什么 |
|---|---|---|
| **localStorage**（`got:` 前缀键） | 主题（明/暗）、语言（en/zh/ms）、TOTConfig 设置；API key（**仅当**用户勾选「记住密钥」，键 `got:apiKey`，默认关） | —— |
| **IndexedDB**（db `got-visualizer`） | 思维树（nodes/edges）、embedding（`Float32Array`） | —— |
| **内存（sessionStore）** | API key（默认 —— 未勾选「记住密钥」时只在内存） | —— |

- 注意：agrun 的 `createIndexedDBSessionStore` 是给 agrun runtime/session 用的 —— 我们直接调 `requestGeminiContent`、不用 runtime，所以**自己写一个极简 IndexedDB 封装**（约 40 行），不依赖 agrun session store。
- 主题：`<html>` 加/去 `.dark` class，首屏读 `prefers-color-scheme`，之后跟随 localStorage。`ThoughtNode` 的评分色（红/黄/绿）需补 dark 变体。

### 禁止引入

- ❌ Next.js（有 server 组件，不适合纯静态）
- ❌ 任何付费 API（除 LLM text generation）
- ❌ Express / Fastify / Hono（无 backend）
- ❌ Prisma / Drizzle / 任何 ORM
- ❌ Redux / Jotai / Recoil（已选 Zustand）
- ❌ styled-components / emotion（已选 Tailwind）
- ❌ 任何 SSR 框架

**新依赖必须先问用户确认再装。**

---

## 4. 文件结构

```
Graph-of-Thought-GOT/             ← 仓库根目录（直接 scaffold，不嵌套子目录）
├── public/
│   ├── agrun.js                  ← agrun runtime UMD bundle
│   └── favicon.svg
├── src/
│   ├── main.tsx                  ← Vite entry
│   ├── App.tsx                   ← 根组件（API key 输入 + Canvas）
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── ThoughtCanvas.tsx ← React Flow 画布
│   │   │   ├── ThoughtNode.tsx   ← 自定义节点（颜色/大小按 score）
│   │   │   └── ConvergenceEdge.tsx ← 虚线收敛边
│   │   ├── panels/
│   │   │   ├── TopBar.tsx        ← 话题输入 + API key + 设置
│   │   │   ├── LeftPanel.tsx     ← 树列表 + 统计 + cost
│   │   │   └── RightPanel.tsx    ← 选中节点详情 + 操作
│   │   └── ui/                   ← shadcn/ui 组件
│   ├── lib/
│   │   ├── agent/
│   │   │   ├── expand.ts         ← 节点展开：调 requestGeminiContent + 解析 + runExpansion 编排
│   │   │   ├── evaluate.ts       ← 节点评分（Phase 2）
│   │   │   └── convergence.ts    ← 收敛判断（Phase 2）
│   │   ├── embedder.ts           ← Xenova embedding + cosine sim
│   │   ├── similarity.ts         ← 阈值判断逻辑
│   │   ├── prompts/
│   │   │   ├── expand.ts
│   │   │   ├── evaluate.ts
│   │   │   └── convergence.ts
│   │   ├── store/
│   │   │   └── treeStore.ts      ← Zustand store
│   │   └── layout/
│   │       └── dagre.ts          ← dagre 布局计算
│   └── types/
│       └── tree.ts               ← 所有 TypeScript 类型 SSOT
├── .github/
│   └── workflows/
│       └── deploy.yml            ← GitHub Actions → GitHub Pages
├── .gitignore                    ← 忽略 node_modules / dist / Agent-Runtime-JavaScript
├── components.json               ← shadcn/ui 配置
├── index.html
├── package.json
├── tsconfig.json                 ← + tsconfig.app.json + tsconfig.node.json
└── vite.config.ts                ← Tailwind v4 用 CSS 配置，无 tailwind.config.ts
```

---

## 5. 核心数据模型（不得随意修改）

```typescript
// src/types/tree.ts — SSOT
interface ThoughtNode {
  id: string;
  parentIds: string[];           // 图：允许多父节点
  layer: number;                 // 从 root 算的深度（0 = root）
  thought: string;
  rationale: string;
  score: number;                 // 0-10，来自 evaluateSkill
  embedding: number[];           // 384 维（all-MiniLM-L6-v2）
  status: "pending" | "expanded" | "pruned" | "favorited";
  metadata: {
    generatedAt: number;
    model: string;
    tokenCost: number;
  };
}

interface ThoughtEdge {
  id: string;
  source: string;
  target: string;
  type: "tree" | "convergence";
  similarity?: number;           // 仅 convergence 边有值（0-1）
}

interface ThoughtTree {
  rootTopic: string;
  config: TOTConfig;
  nodes: Record<string, ThoughtNode>;
  edges: ThoughtEdge[];
  createdAt: number;
}

interface TOTConfig {
  initialBranches: number;       // 默认 4
  expansionBranches: number;     // 默认 3
  similarityThreshold: {
    convergence: number;         // > 0.60 → 创建 + 收敛边（384 维实测值）
  };                             // 注：原 merge 阈值已移除（Phase 8.3.1）
  provider: "gemini" | "openai"; // 用户选择
  generatorModel: string;
  evaluatorModel: string;
}
```

> **配置项范围（SSOT：`settingsStore.ts` 的 `clampInt` + `SettingsModal` 滑块；2026-05-22 更新）**
>
> | 配置 | 默认 | 范围 |
> |---|---|---|
> | `initialBranches`（宽度） | 4 | 2–8 |
> | `expansionBranches`（分叉） | 3 | 2–6 |
> | `maxExpansionLayers`（深度） | 3 | 1–50 |
> | `maxNodes`（节点预算，auto-explore 上限） | 40 | 10–1000 |
> | `maxSessionCostUsd`（硬性成本上限） | $0.50 | $0.25–20 |
>
> 注：上方 `interface TOTConfig` 为简化展示，缺 `maxExpansionLayers` / `maxNodes` /
> `maxSessionCostUsd` / `thinkingLevel` / `reportAudience` / `focusBranches` 等字段 ——
> 完整定义以 `src/types/tree.ts` 为准。深度、节点数、成本三个闸门串联，最严者先触顶。

---

## 6. agrun.js 集成方式

直接调用 `requestGeminiContent`，不用 runtime/planner：

```typescript
const response = await window.Agrun.requestGeminiContent(
  {
    model: tree.config.generatorModel,
    apiKey,                                       // 用户在 UI 输入
    system: prompt.system,
    prompt: prompt.user,
    geminiThinkingConfig: { thinkingLevel: 'low' }, // tree.config.thinkingLevel
    timeoutMs: 60000,
  },
  window.fetch.bind(window),
);
const branches = JSON.parse(response.text).branches;
```

- 返回结构：`{ text, usage, finishReason, durationMs, ... }`
- `text` 是模型输出 → 解析前先 strip ```` ```json ```` 围栏（防御性，模型常加围栏）
- 没有 JSON 强制模式 —— prompt 必须明确写出 JSON 形状
- IndexedDB 持久化用浏览器原生 API，不依赖 agrun session store

---

## 7. Prompt 工程规则

- **所有 Gemini response schema 必须 FLAT**（最多一层嵌套），否则报错
- Prompt 文件统一放 `src/lib/prompts/`，不要内联在组件里
- **验证顺序**：先用真实 key 测 agrun skill 返回格式，再建 UI

### Prompt 文件对应

| 文件 | 对应 DESIGN.md |
|---|---|
| `prompts/expand.ts` | §5.1（Layer 1）+ §5.2（子节点展开）|
| `prompts/evaluate.ts` | §5.3（0-10 评分）|
| `prompts/convergence.ts` | §5.4（真假收敛判断）|

---

## 8. 相似度算法规则

```
阈值（基于 all-MiniLM-L6-v2 的 384 维 normalized embedding，2026-05-21 实测调定）：
  cosine > 0.60  → CONVERGENCE：正常创建 + 加虚线收敛边
  cosine ≤ 0.60  → INDEPENDENT：正常创建

注意：DESIGN.md 早期的 0.75/0.92 是为 text-embedding-004（768维）设计的。
     384 维 all-MiniLM 下 distinct 同主题分支 ≤0.52、paraphrase ~0.67，
     所以 convergence 调到 0.60。MERGE 路径（原 0.92）已移除（Phase 8.3.1）——
     384 维下连 paraphrase 都到不了 0.92，该 gate 永不可能触发。
```

---

## 9. GitHub Actions 部署配置

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

```typescript
// vite.config.ts
export default defineConfig({
  base: '/Graph-of-Thought-GOT/',   // GitHub repo 名
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@xenova/transformers'],  // WASM 模块不预优化
  },
  worker: {
    format: 'es',
  },
});
```

---

## 10. UI/UX 规则

### 节点视觉

- **颜色按 score**：red（0-3）→ yellow（4-6）→ green（7-10）
- **大小按 score**：score 越高节点越大
- **边样式**：实线 = tree edge，虚线 = convergence edge，粗细 = similarity 强度

### 交互规则

- 双击节点 → 展开子分支
- 单击节点 → 右侧面板显示详情
- 展开中的节点 → 禁止重复点击（防竞态）
- 最多 2 个并发展开请求（client 端排队）

### Layout 规则

- dagre，方向 top-to-bottom，rankSep: 120, nodeSep: 60
- 首次加载 `fitView`，之后 `fitView: false`
- 用户拖动过的节点位置不被 re-layout 覆盖
- 新节点位置变化用 CSS transition

### Embedding 加载 UX

- 首次使用时显示「正在加载语义分析模型（~23MB）...」进度
- 模型加载完成后缓存，后续不再显示

---

## 11. MVP 阶段追踪

### Phase 1 — Core（第 1 周）

- [x] Vite + React + TypeScript 项目初始化（含 Tailwind v4 + shadcn 就绪 + React Flow）
- [x] GitHub Actions deploy.yml 配置
- [x] `/public/agrun.js` — 放入 agrun runtime
- [x] `src/types/tree.ts` — 所有 TypeScript 类型
- [x] `src/lib/store/treeStore.ts` — Zustand store
- [x] `App.tsx` — API key 输入界面（含 `sessionStore` 会话级凭据）
- [x] `TopBar.tsx` — 话题输入框 + provider 选择 + API key
- [x] `lib/agent/expand.ts` — 调 `requestGeminiContent` 展开（取代 agrun skill 方案）
- [x] `ThoughtCanvas.tsx` + `ThoughtNode.tsx` + `lib/layout/dagre.ts` — 画布渲染
- [x] Layer 1 生成 → 节点渲染到画布（已用真实 Gemini 验证）

> ⚠️ Phase 1 遗留待修（见 2026-05-21 session）：
> 1. API key 输入框被浏览器 autofill —— 需加强 anti-autofill
> 2. ~~`responseFormat` 未生效~~ —— 已查清（Phase 8.3.4）：agrun 的 `requestGeminiContent` 根本不暴露 `responseSchema`，JSON 模式无法开。靠 prompt 钉死 + strip fence 是唯一方案，按设计如此
> 3. 一次 Generate 触发了额外的子节点展开 —— 疑似 spurious double-expand，待查

### Phase 2 — Intelligence（第 2 周）

- [ ] `evaluateSkill.ts` — 节点评分
- [ ] `lib/embedder.ts` — Xenova embedding 初始化
- [ ] `lib/similarity.ts` — cosine sim + 阈值判断
- [ ] `ConvergenceEdge.tsx` — 虚线收敛边渲染
- [ ] `convergenceSkill.ts` — 真假收敛 LLM 判断

### Phase 3 — Polish（第 3 周）

- [ ] `RightPanel.tsx` — 节点详情 + Prune / Favorite 操作
- [ ] `LeftPanel.tsx` — 树列表 + token cost 显示
- [ ] IndexedDB 持久化（agrun 已内建，接入即可）
- [ ] 导出 JSON / Markdown
- [ ] Embedding 加载进度条

---

## 12. 工作流程（每次任务前按此顺序）

```
1. 确认在做 Phase 几的哪个任务
2. 读 DESIGN.md 对应章节，理解数据模型或 Prompt 契约
3. 先验证 agrun skill 输出格式（跑真实 LLM call），再建 UI
4. 完成后用 MCP Chrome devtools 做 live e2e 验证
5. 有价值的发现 → kb_add_item 写入 GOT 项目 KB
```

---

## 13. 禁止行为（Anti-patterns）

- ❌ 引入任何 Server / Backend / API Routes
- ❌ 调用任何付费 Embedding API（Gemini Embedding、OpenAI Embedding）
- ❌ Hardcode 或 commit API key
- ❌ Gemini response schema 超过一层嵌套
- ❌ embedding 存为 JSON array（浏览器内用 Float32Array，IndexedDB 直接存）
- ❌ Phase 1 未完成就跳去做 Phase 2
- ❌ 先建 UI 再验证 Prompt 输出格式
- ❌ 不经用户确认就装新 npm 包

---

## 14. 成功标准

- 可通过 GitHub Pages URL 访问，无需任何本地服务器
- 分支生成 < 5 秒
- Embedding 计算（384维，浏览器内）< 500ms / 节点
- 平均 session 有 4+ 次展开操作
- 单 session LLM 成本 < $0.10（用户自备 key）

---

## 15. KB 速查表（session 开始时按需 recall）

### 技能 KB — Skills Factory
**ID**: `ffe981fe-f2d1-45f4-bc0e-926d41431ce3`
```
mcp__kb__kb_search({ kb_id: "ffe981fe-f2d1-45f4-bc0e-926d41431ce3", query: "你的任务描述" })
```

| kbcid | 内容 |
|---|---|
| skill.design | HTML 设计交付 6 步协议 |
| skill.qa | 执行者 ≠ 验证者矩阵 |
| skill.delivery | DONE/BLOCKED/NEEDS_APPROVAL 合约 |
| skill.prompt | Prompt 四层架构 + 写作规则 |
| skill.context | snip / subagent 隔离 / cache TTL |

### 工具 KB — Tool Registry
**ID**: `d76a7d95-162a-435e-906f-25fb3f3d4077`
```
mcp__kb__kb_search({ kb_id: "d76a7d95-162a-435e-906f-25fb3f3d4077", query: "你要用的工具" })
```

| kbcid | 内容 |
|---|---|
| tool.kb | kb_search/recall/remember/add_item + 路由规则 |
| tool.browser | Chrome DevTools 截图/导航/E2E chain |
| tool.agent | Agent / advisor / ToolSearch 编排 |
| tool.file | Read / Edit / Write / Bash 优先级 |
| tool.search | SearXNG + readurl 搜索→抓取 workflow |
| tool.git | Git 安全操作 + commit 规则 |
| tool.kb | KB Write 路由规则 SSOT |

### 使用时机
- 任务开始前：`kb_search` 拿对应 skill 执行协议
- 选工具前：`kb_search` 确认正确 chain 和反模式
- 发现新 pattern：`kb_add_item` 写回对应 KB（3 分钟内完成）
