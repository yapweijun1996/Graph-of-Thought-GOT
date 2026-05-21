// Data model SSOT for the Graph-of-Thought tree.
// Mirrors DESIGN.md §3.2; see CLAUDE.md §5 before changing anything here.

export type NodeStatus = 'pending' | 'expanded' | 'pruned' | 'favorited';

export type EdgeType = 'tree' | 'convergence';

// LLM signal/noise verdict on a convergence pair (DESIGN.md §5.4).
export type ConvergenceVerdict = 'convergence' | 'redundancy' | 'coincidence';

export type ProviderId = 'gemini' | 'openai';

export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

export interface NodeMetadata {
  generatedAt: number;
  model: string;
  tokenCost: number;
}

export interface ThoughtNode {
  id: string;
  parentIds: string[]; // graph: a node may have multiple parents
  layer: number; // depth from root; root is layer 0
  thought: string;
  rationale: string;
  score: number; // 0-10, assigned by the evaluator
  embedding: number[]; // 384-dim, from Xenova/all-MiniLM-L6-v2 (browser-local)
  status: NodeStatus;
  metadata: NodeMetadata;
}

export interface ThoughtEdge {
  id: string;
  source: string; // node id
  target: string; // node id
  type: EdgeType;
  similarity?: number; // 0-1, only set on convergence edges
  verdict?: ConvergenceVerdict; // LLM judgment, only set on convergence edges
  explanation?: string; // LLM's one-line reason, only set on convergence edges
}

export interface SimilarityThreshold {
  merge: number; // > this → suggest merge instead of creating a node
  convergence: number; // > this → create node + draw a convergence edge
}

export interface TOTConfig {
  initialBranches: number; // branches generated from the root topic
  expansionBranches: number; // branches generated when expanding a node
  similarityThreshold: SimilarityThreshold;
  provider: ProviderId;
  generatorModel: string;
  evaluatorModel: string;
  thinkingLevel: ThinkingLevel; // Gemini thinking budget (CLAUDE.md §3)
}

export interface ThoughtTree {
  rootTopic: string;
  config: TOTConfig;
  nodes: Record<string, ThoughtNode>;
  edges: ThoughtEdge[];
  createdAt: number;
}
