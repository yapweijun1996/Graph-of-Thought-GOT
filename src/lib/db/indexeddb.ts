import type { ThoughtNode, ThoughtTree } from '@/types/tree';

// Minimal IndexedDB wrapper for the multi-tree library (Phase 6.3). Each tree
// is stored under its own `tree.id`. We do NOT use agrun's session store — we
// call requestGeminiContent directly, so the GOT library is its own tiny store
// (CLAUDE.md §3).

const DB_NAME = 'got-visualizer';
const DB_VERSION = 1;
const STORE = 'trees';
// Pre-multi-tree builds saved a single tree under this fixed key with no `id`.
const LEGACY_KEY = 'current';
// localStorage pointer to the tree shown on the next load.
const CURRENT_TREE_LS = 'got:currentTreeId';

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
      tx.objectStore(STORE).put(stored, tree.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadTree(id: string): Promise<ThoughtTree | null> {
  const db = await openDb();
  try {
    return await new Promise<ThoughtTree | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => {
        const raw = req.result as ThoughtTree | undefined;
        resolve(raw ? mapEmbeddings(raw, (e) => Array.from(e)) : null);
      };
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function deleteTree(id: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

// Loads every saved tree. Migrates the pre-multi-tree single-tree record
// (stored under LEGACY_KEY with no `id`) into an id-keyed entry on first run,
// so users upgrading from an earlier build keep their graph.
export async function loadAllTrees(): Promise<ThoughtTree[]> {
  const db = await openDb();
  let raw: ThoughtTree[];
  try {
    raw = await new Promise<ThoughtTree[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as ThoughtTree[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }

  const trees = raw.map((t) => mapEmbeddings(t, (e) => Array.from(e)));
  const legacy = trees.find((t) => !t.id);
  if (legacy) {
    legacy.id = crypto.randomUUID();
    await saveTree(legacy);
    await deleteTree(LEGACY_KEY);
  }
  return trees.filter((t) => Boolean(t.id));
}

export function getCurrentTreeId(): string | null {
  try {
    return localStorage.getItem(CURRENT_TREE_LS);
  } catch {
    return null;
  }
}

export function setCurrentTreeId(id: string | null): void {
  try {
    if (id) localStorage.setItem(CURRENT_TREE_LS, id);
    else localStorage.removeItem(CURRENT_TREE_LS);
  } catch {
    // localStorage unavailable (private mode etc.) — non-fatal
  }
}
