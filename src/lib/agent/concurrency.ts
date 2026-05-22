// Global LLM concurrency cap (Phase 17.2 / CLAUDE.md §10.3). Expansion fires
// background evaluate + convergence passes, and auto-explore queues more — so
// without a cap a burst can open a dozen simultaneous LLM round-trips. Every
// provider round-trip goes through `withLlmSlot`, so at most MAX_CONCURRENT
// run at once and the rest queue FIFO.
const MAX_CONCURRENT = 2;

let active = 0;
const waiters: Array<() => void> = [];

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiters.push(resolve));
}

function release(): void {
  const next = waiters.shift();
  if (next) {
    // hand the slot straight to the next waiter — `active` stays unchanged
    next();
  } else {
    active = Math.max(0, active - 1);
  }
}

// Runs `fn` inside a concurrency slot, releasing it even if `fn` throws.
export async function withLlmSlot<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}
