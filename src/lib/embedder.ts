import type { FeatureExtractionPipeline } from '@xenova/transformers';
import { useEmbedderStore } from '@/lib/store/embedderStore';

// Embedding model runs fully in-browser via ONNX/WASM — no API key, no cost.
// 384-dim normalized vectors (CLAUDE.md §2.5 — overrides DESIGN.md §10.2's 768).
export const EMBEDDING_DIM = 384;

const MODEL = 'Xenova/all-MiniLM-L6-v2';

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

// 11.2 — transformers fires progress_callback once per downloaded chunk
// (hundreds of times for a 23MB model). Throttle store writes to ~10/s so the
// progress pill does not trigger a re-render storm.
const PROGRESS_THROTTLE_MS = 100;
let lastProgressAt = 0;

// Lazily loads the model on first call (~23MB, then browser-cached). The
// transformers library and its heavy onnxruntime-web dependency are pulled in
// via dynamic import() so they stay out of the app's boot path and main bundle.
function loadExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    const store = useEmbedderStore.getState();
    store.setStatus('loading');
    store.setProgress(0);
    extractorPromise = import('@xenova/transformers')
      .then(({ pipeline, env }) => {
        // Skip the default local-model probe. transformers tries
        // `/models/Xenova/...` first; this is a static site with no model
        // directory, so that probe is a guaranteed 404 (console noise)
        // before the Hugging Face CDN fallback. Go straight to the CDN.
        env.allowLocalModels = false;
        return pipeline('feature-extraction', MODEL, {
          // transformers reports per-file download progress (0-100); surface
          // the latest value, throttled, so the UI can show a percentage bar
          // without re-rendering on every chunk.
          progress_callback: (data: { progress?: number }) => {
            if (typeof data.progress !== 'number') return;
            const now = Date.now();
            const done = data.progress >= 100;
            if (!done && now - lastProgressAt < PROGRESS_THROTTLE_MS) return;
            lastProgressAt = now;
            useEmbedderStore.getState().setProgress(data.progress / 100);
          },
        });
      })
      .then((extractor) => {
        useEmbedderStore.getState().setStatus('ready');
        return extractor;
      })
      .catch((error) => {
        useEmbedderStore.getState().setStatus('error');
        extractorPromise = null; // allow a later call to retry the load
        throw error;
      });
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
