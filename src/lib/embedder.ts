import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers';

// Embedding model runs fully in-browser via ONNX/WASM — no API key, no cost.
// 384-dim normalized vectors (CLAUDE.md §2.5 — overrides DESIGN.md §10.2's 768).
export const EMBEDDING_DIM = 384;

const MODEL = 'Xenova/all-MiniLM-L6-v2';

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

// Lazily downloads + caches the model on first call (~23MB, then browser-cached).
function loadExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL);
  }
  return extractorPromise;
}

// Embeds a string into a 384-dim normalized vector.
export async function getEmbedding(text: string): Promise<number[]> {
  const extractor = await loadExtractor();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}

// Cosine similarity. Inputs are already normalized, so the dot product
// equals the cosine — no magnitude division needed. Returns 0 when either
// vector is empty (a node not yet embedded) or the lengths disagree.
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}
