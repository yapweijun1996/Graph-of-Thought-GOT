import { describe, it, expect } from 'vitest';
import { encodeBase64, decodeBase64 } from './share';

// B20 — the share encoding moved off the deprecated escape/unescape to
// TextEncoder/TextDecoder. These tests guard the UTF-8 round-trip and the
// backward-compatibility claim (byte-identical to the old scheme).
describe('share base64 (B20)', () => {
  it('round-trips ASCII', () => {
    expect(decodeBase64(encodeBase64('hello world'))).toBe('hello world');
  });

  it('round-trips multi-byte UTF-8 (accents, CJK, emoji)', () => {
    const s = 'café — 中文 — Bahasa — 🎉🧠';
    expect(decodeBase64(encodeBase64(s))).toBe(s);
  });

  it('round-trips a JSON payload', () => {
    const json = JSON.stringify({ topic: 'café', nodes: { a: { x: 1 } } });
    expect(decodeBase64(encodeBase64(json))).toBe(json);
  });

  it('stays byte-identical to the legacy escape/unescape scheme', () => {
    // the old implementation — encodeBase64 must produce the same string,
    // so links shared by an earlier build still decode.
    const legacy = (str: string) =>
      btoa(unescape(encodeURIComponent(str)));
    for (const s of ['plain', 'café 中文 🎉', '{"k":"v"}']) {
      expect(encodeBase64(s)).toBe(legacy(s));
    }
  });
});
