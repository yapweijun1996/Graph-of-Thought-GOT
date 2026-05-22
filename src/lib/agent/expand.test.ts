import { describe, it, expect } from 'vitest';
import { parseExpandResponse } from './expand';

const valid = JSON.stringify({
  branches: [
    { thought: 'Direction A', rationale: 'Because A' },
    { thought: 'Direction B', rationale: 'Because B' },
  ],
});

describe('parseExpandResponse', () => {
  it('parses a well-formed response', () => {
    const out = parseExpandResponse(valid);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ thought: 'Direction A', rationale: 'Because A' });
  });

  it('strips code fences before parsing', () => {
    expect(parseExpandResponse('```json\n' + valid + '\n```')).toHaveLength(2);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseExpandResponse('not json')).toThrow(/valid JSON/);
  });

  it('throws when the branches array is missing', () => {
    expect(() => parseExpandResponse('{"foo":1}')).toThrow(/branches/);
  });

  it('throws when no branch is usable', () => {
    expect(() => parseExpandResponse('{"branches":[]}')).toThrow(
      /no usable branches/,
    );
  });

  it('drops branches with a non-string thought or missing rationale', () => {
    const mixed = JSON.stringify({
      branches: [
        { thought: 'Good', rationale: 'ok' },
        { thought: 123, rationale: 'bad type' },
        { thought: 'No rationale' },
      ],
    });
    const out = parseExpandResponse(mixed);
    expect(out).toHaveLength(1);
    expect(out[0].thought).toBe('Good');
  });

  it('drops branches whose thought is whitespace only', () => {
    const blank = JSON.stringify({
      branches: [
        { thought: '   ', rationale: 'ok' },
        { thought: 'Real', rationale: 'ok' },
      ],
    });
    expect(parseExpandResponse(blank)).toHaveLength(1);
  });

  it('trims whitespace around thought and rationale', () => {
    const padded = JSON.stringify({
      branches: [{ thought: '  T  ', rationale: '  R  ' }],
    });
    expect(parseExpandResponse(padded)[0]).toEqual({
      thought: 'T',
      rationale: 'R',
    });
  });
});
