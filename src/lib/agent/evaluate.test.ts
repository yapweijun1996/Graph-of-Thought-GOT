import { describe, it, expect } from 'vitest';
import {
  parseEvaluateResponse,
  parseSiblingRankResponse,
  applyScoreSpread,
  type SiblingRanking,
} from './evaluate';

describe('parseEvaluateResponse', () => {
  it('parses a valid score + reasoning', () => {
    const out = parseEvaluateResponse('{"score":7,"reasoning":"solid"}');
    expect(out).toEqual({ score: 7, reasoning: 'solid' });
  });

  it('throws when score is missing', () => {
    expect(() => parseEvaluateResponse('{"reasoning":"x"}')).toThrow(/score/);
  });

  it('throws when score is not a number', () => {
    expect(() => parseEvaluateResponse('{"score":"high"}')).toThrow(/score/);
  });

  it('defaults reasoning to empty string when missing', () => {
    expect(parseEvaluateResponse('{"score":5}').reasoning).toBe('');
  });
});

describe('parseSiblingRankResponse', () => {
  it('parses a full ranking list', () => {
    const text = JSON.stringify({
      rankings: [
        { index: 0, score: 8, reasoning: 'a' },
        { index: 1, score: 4, reasoning: 'b' },
      ],
    });
    expect(parseSiblingRankResponse(text, 2)).toHaveLength(2);
  });

  it('drops out-of-range indices', () => {
    const text = JSON.stringify({
      rankings: [
        { index: 0, score: 8 },
        { index: 5, score: 4 },
      ],
    });
    const out = parseSiblingRankResponse(text, 2);
    expect(out).toHaveLength(1);
    expect(out[0].index).toBe(0);
  });

  it('de-duplicates repeated indices', () => {
    const text = JSON.stringify({
      rankings: [
        { index: 0, score: 8 },
        { index: 0, score: 2 },
      ],
    });
    expect(parseSiblingRankResponse(text, 2)).toHaveLength(1);
  });

  it('clamps scores into 0-10', () => {
    const text = JSON.stringify({ rankings: [{ index: 0, score: 99 }] });
    expect(parseSiblingRankResponse(text, 1)[0].score).toBe(10);
  });

  it('throws when nothing usable is returned', () => {
    expect(() =>
      parseSiblingRankResponse('{"rankings":[]}', 3),
    ).toThrow(/no usable rankings/);
  });

  it('throws when the rankings array is missing', () => {
    expect(() => parseSiblingRankResponse('{"foo":1}', 3)).toThrow(/rankings/);
  });
});

describe('applyScoreSpread', () => {
  it('remaps collapsed scores into a wide spread', () => {
    const collapsed: SiblingRanking[] = [
      { index: 0, score: 8, reasoning: '' },
      { index: 1, score: 8, reasoning: '' },
      { index: 2, score: 9, reasoning: '' },
    ];
    const out = applyScoreSpread(collapsed);
    const scores = out.map((r) => r.score);
    expect(Math.max(...scores) - Math.min(...scores)).toBeGreaterThanOrEqual(3);
  });

  it('leaves a genuine spread untouched', () => {
    const spread: SiblingRanking[] = [
      { index: 0, score: 9, reasoning: '' },
      { index: 1, score: 2, reasoning: '' },
    ];
    expect(applyScoreSpread(spread)).toEqual(spread);
  });

  it('returns a single-element list unchanged', () => {
    const one: SiblingRanking[] = [{ index: 0, score: 7, reasoning: '' }];
    expect(applyScoreSpread(one)).toEqual(one);
  });
});
