import { describe, it, expect } from 'vitest';
import { stripCodeFences, readTotalTokens } from './response';

describe('stripCodeFences', () => {
  it('strips a ```json fence', () => {
    expect(stripCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('strips a bare ``` fence', () => {
    expect(stripCodeFences('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('returns text unchanged when there is no fence', () => {
    expect(stripCodeFences('{"a":1}')).toBe('{"a":1}');
  });

  it('handles an empty string', () => {
    expect(stripCodeFences('')).toBe('');
  });

  it('keeps only the first fenced block when content has inner fences', () => {
    // The regex is non-greedy, so it captures up to the first closing fence.
    const out = stripCodeFences('```json\n{"a":1}\n```\ntrailing');
    expect(out).toBe('{"a":1}');
  });

  it('trims surrounding whitespace', () => {
    expect(stripCodeFences('   {"a":1}   ')).toBe('{"a":1}');
  });
});

describe('readTotalTokens', () => {
  it('reads camelCase totalTokens', () => {
    expect(readTotalTokens({ totalTokens: 42 })).toBe(42);
  });

  it('reads snake_case total_tokens', () => {
    expect(readTotalTokens({ total_tokens: 17 })).toBe(17);
  });

  it('returns 0 for null/undefined usage', () => {
    expect(readTotalTokens(null)).toBe(0);
    expect(readTotalTokens(undefined)).toBe(0);
  });

  it('returns 0 when no token field is present', () => {
    expect(readTotalTokens({ promptTokens: 5 })).toBe(0);
  });
});
