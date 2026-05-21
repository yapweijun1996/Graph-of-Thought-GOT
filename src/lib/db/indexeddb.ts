import type { ThoughtNode, ThoughtTree } from '@/types/tree';

// Minimal IndexedDB wrapper for persisting the current thought tree.
// We do NOT use agrun's session store — we call requestGeminiContent directly,
// so the GOT tree gets its own tiny store (CLAUDE.md §3).

const DB_NAME = 'got-visualizer';
const DB_VERSION = 1;
const STORE = 'trees';
const CURRENT_KEY = 'current';

// Embeddings are stored as Float32Array (4 bytes/value) rather than a tagged
// JS number[] — IndexedDB structured-clones typed arrays compactly (CLAUDE.md
// §13). The in-memory model keeps number[] (tree.ts SSOT is frozen), so the
// conversion happens only here, at the persistence boundary.
function mapEmbeddings(
  tree: ThoughtTree,
  convert: (e: ArrayLike<number>) => unknown,
): ThoughtTree {
  const nodes: Record<string, ThoughtNode> = {};
  for (const [id, n] of Object.entries(tree.nodes)) {
    nodes[id] = { ...n, embedding: convert(n.embedding ?? []) as number[] };
  }
  return { ...tree, nodes };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveTree(tree: ThoughtTree): Promise<void> {
  const db = await openDb();
  try {
    const stored = mapEmbeddings(tree, (e) => Float32Array.from(e));
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(stored, CURRENT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadTree(): Promise<ThoughtTree | null> {
  const db = await openDb();
  try {
    return await new Promise<ThoughtTree | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(CURRENT_KEY);
      req.onsuccess = () => {
        const raw = req.result as ThoughtTree | undefined;
        // Rehydrate Float32Array embeddings back to number[] (also tolerates
        // trees saved before this conversion, where they are already number[]).
        resolve(raw ? mapEmbeddings(raw, (e) => Array.from(e)) : null);
      };
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function clearSavedTree(): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(CURRENT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
