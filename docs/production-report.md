# GOT Production Report — Design Spec

> 目标：把 Graph-of-Thought 树转化为可交付的结构化报告，
> 支持工程师（系统设计）、经理（战略方向）、研究人员（知识图谱）三类受众，
> 展示完整「闭环」——所有推理分支如何收敛到核心结论。

---

## 1. 核心概念：闭环（Closed Loop）

```
           Topic
          /  |  \  \
        A    B    C   D      ← Layer 1 branches
       /|   /|   |    |
      A1 A2 B1 B2 C1  D1    ← Layer 2 nodes
        \        /
         CONVERGENCE         ← 不同路径得到同一结论
              ↓
         KEY INSIGHT          ← 闭环：结论被多路径独立验证
```

**闭环**不是循环，而是：多条独立推理路径最终指向同一结论，这个结论因此获得跨维度的验证支撑。报告的核心价值就是把这些收敛点可视化并解释清楚。

---

## 2. 报告受众与内容模板

### 2.1 Engineer — System Design Report

**适用场景**：架构评审、技术方案选型、系统设计讨论

| 章节 | 内容 |
|---|---|
| Executive Summary | 最高分（≥7分）分支，收敛点列表 |
| Branch Analysis | 每条分支的技术可行性、风险、依赖 |
| Convergence Signals | 哪些技术方向被多路径独立推导出 |
| System Design Recommendations | 收敛节点 → 直接转化为架构决策 |
| Pruned Paths | 被 prune 的方向 + 原因（避免重复踩坑）|
| Next Expansion Targets | 评分中等（4-6分）、尚未充分展开的节点 |

### 2.2 Manager — Strategic Direction Report

**适用场景**：周会汇报、战略规划、部门 OKR 制定

| 章节 | 内容 |
|---|---|
| Topic Goal | 问题陈述（一句话） |
| Top Directions | 最高分 3-5 个方向，不含技术细节 |
| Convergence → Decisions | 闭环 = 跨团队达成共识的决策点 |
| Risk Matrix | 低分分支 = 已识别风险，汇总成风险表 |
| Department Mapping | 哪个方向归哪个部门/团队负责 |
| Recommended Next Steps | 优先级排序的行动项 |

### 2.3 Researcher — Knowledge Map Report

**适用场景**：课题研究、文献综述、知识图谱构建

| 章节 | 内容 |
|---|---|
| Research Question | 原始 topic 作为研究问题 |
| Hypothesis Space | 所有 Layer 1 分支 = 候选假设 |
| Evidence Convergence | 多路径收敛 = 跨维度证据支持 |
| Knowledge Gaps | 尚未展开、评分低、被 prune 的区域 |
| Semantic Similarity Map | embedding 可视化（未来：力导向图） |
| Research Directions | 未充分探索的节点 = 未来研究方向 |

---

## 3. 报告配置参数

```typescript
interface ReportConfig {
  audience: 'engineer' | 'manager' | 'researcher';
  maxDepth?: number;        // 只报告到第几层（默认：全树）
  minScore?: number;        // 只包含评分 ≥ 此值的节点（默认：0 = 全部）
  includeConvergence: boolean; // 是否显示收敛边分析（默认：true）
  includePruned: boolean;   // 是否显示被剪枝路径（默认：true，作为风险提示）
  language: 'en' | 'zh' | 'ms';
  format: 'markdown' | 'json';
}
```

---

## 4. 闭环 Summary 生成逻辑

```
1. 收集所有 convergence 边
2. 对每条边：找到两端节点的 root → node 路径
3. LLM 生成「闭环摘要」：
   - "Branch A (via X→Y→Z) and Branch B (via P→Q) both arrive at [conclusion]"
   - "This cross-path convergence suggests [insight] is independently valid"
4. 聚合所有闭环摘要 → Executive Summary
5. 高分 + 多次收敛的结论 → 加粗为 KEY INSIGHT
```

---

## 5. 报告生成 Prompt 规范

```
系统：You are a [engineer/strategic/research] analyst. You synthesize a
      Graph-of-Thought tree into a structured report.

用户：
  Topic: {rootTopic}
  Audience: {audience}
  
  Tree Summary:
  - Total nodes: {N}
  - Layers: {L}
  - Convergence edges: {C}
  - High-score nodes (≥7): {list}
  - Key convergence pairs: [{nodeA.thought} ↔ {nodeB.thought} (sim={sim}, verdict={verdict})]
  
  Full tree (JSON): {compact_tree_json}
  
  Generate a {audience}-targeted report in {language}.
  Focus on: convergence insights, actionable conclusions, 闭环 summary.
  Output: Markdown.
```

---

## 6. 「闭环」可视化（Phase 4 UI）

当报告生成后，画布上：
- **收敛边高亮**：报告中提到的关键收敛边变为橙色实线 + 加粗
- **KEY INSIGHT 标记**：被多路径指向的节点加星标 ★ + 放大
- **报告面板**：右侧面板切换到 Report 视图，显示 Markdown 渲染报告

---

## 7. 宽度 / 深度 / 方向控制（GOT Dimensions）

| 维度 | 参数 | 含义 |
|---|---|---|
| **Width** | `initialBranches` (default: 4) | Layer 1 有几条主要方向 |
| **Depth** | `maxExpansionLayers` (新增, default: 3) | 最多展开到第几层 |
| **Focus** | `focusBranches: string[]` (新增) | 只深入展开特定分支 |
| **Audience** | `reportAudience` (新增) | 报告语气和重点 |

**宽而浅**：`initialBranches=8, maxDepth=2` → 发散探索，适合 brainstorm
**窄而深**：`initialBranches=3, maxDepth=5` → 深度钻研一个方向，适合系统设计
**平衡**：默认 4×3 → 适合大多数战略/研究场景

---

## 8. 输出格式

### Markdown 样例（Manager 受众）

```markdown
# Strategic Report: How to reduce customer churn

**Generated**: 2026-05-22 | **Audience**: Manager | **Nodes**: 16 | **Convergence**: 3

## 🎯 Executive Summary
Three independent analysis paths converge on **onboarding improvement** as the
single highest-leverage intervention. This conclusion is supported by:
- UX analysis branch (score 9/10)
- Customer lifecycle analysis branch (score 8/10)  
- Data analytics branch (score 7/10)

## 🔗 Key Convergence Points (闭环)
| Insight | Paths That Converge | Confidence |
|---|---|---|
| Onboarding is the #1 churn driver | UX + Lifecycle + Data | High (3 paths) |
| Week-1 retention = long-term predictor | Lifecycle + Behavioral | Medium (2 paths) |

## 📋 Recommended Next Steps
1. **[HIGH]** Launch guided onboarding redesign (Q3 priority)
2. **[MEDIUM]** Build week-1 health score dashboard
3. **[LOW]** A/B test proactive check-in emails
```

---

## 9. 实现路线图（→ task.md Phase 4）

见 `task.md` Phase 4 — Production Report Generation。
