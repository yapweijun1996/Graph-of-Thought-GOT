import { describe, it, expect } from 'vitest';
import { getGatewayApiKey } from './gateway';

describe('getGatewayApiKey', () => {
  it('XOR-decrypts to the expected gateway key', () => {
    // Expected value documented in gateway.ts alongside the obfuscated hex.
    expect(getGatewayApiKey()).toBe(
      'gw_524fa12f91c74c0aa21d73fbaa7b97a27a7db3b5a6b33708',
    );
  });

  it('returns a non-empty string', () => {
    expect(getGatewayApiKey().length).toBeGreaterThan(0);
  });
});
