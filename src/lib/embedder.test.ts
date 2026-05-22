import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from './embedder';

describe('cosineSimilarity', () => {
  it('returns 0 for an empty vector', () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([], [1, 2, 3])).toBe(0);
  });

  it('returns 0 when vector lengths disagree', () => {
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
  });

  it('returns 1 for identical normalized unit vectors', () => {
    const v = [0.6, 0.8]; // magnitude 1
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it('handles a 384-dim normalized vector', () => {
    const dim = 384;
    const val = 1 / Math.sqrt(dim);
    const v = Array.from({ length: dim }, () => val);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6);
  });
});
