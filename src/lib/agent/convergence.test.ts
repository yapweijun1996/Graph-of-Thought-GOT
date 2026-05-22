import { describe, it, expect } from 'vitest';
import { parseConvergenceResponse } from './convergence';

describe('parseConvergenceResponse', () => {
  it('accepts each valid verdict', () => {
    for (const verdict of ['convergence', 'redundancy', 'coincidence']) {
      const out = parseConvergenceResponse(
        JSON.stringify({ verdict, explanation: 'why' }),
      );
      expect(out.verdict).toBe(verdict);
      expect(out.explanation).toBe('why');
    }
  });

  it('strips code fences', () => {
    const out = parseConvergenceResponse(
      '```json\n{"verdict":"convergence","explanation":"x"}\n```',
    );
    expect(out.verdict).toBe('convergence');
  });

  it('throws on an invalid verdict', () => {
    expect(() =>
      parseConvergenceResponse('{"verdict":"maybe","explanation":"x"}'),
    ).toThrow(/invalid "verdict"/);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseConvergenceResponse('garbage')).toThrow(/valid JSON/);
  });

  it('defaults explanation to empty string when missing', () => {
    const out = parseConvergenceResponse('{"verdict":"redundancy"}');
    expect(out.explanation).toBe('');
  });
});
