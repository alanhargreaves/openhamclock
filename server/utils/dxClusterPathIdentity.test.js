import { describe, expect, it } from 'vitest';
import dxClusterPathIdentity from './dxClusterPathIdentity.js';

const { buildDXPathIdentityKey, areDXPathsDuplicate } = dxClusterPathIdentity;

describe('dxClusterPathIdentity', () => {
  it('builds the identity key from dxCall, freq, and spotter', () => {
    expect(
      buildDXPathIdentityKey({
        dxCall: 'pj2/w9wi',
        freq: '14.074',
        spotter: 'n3fto',
      }),
    ).toBe('PJ2/W9WI|14.074|N3FTO');
  });

  it('treats same dx call and freq from different spotters as different paths', () => {
    const now = 1_700_000_000_000;
    const existing = {
      dxCall: 'PJ2/W9WI',
      freq: '14.074',
      spotter: 'N3FTO',
      timestamp: now - 30_000,
    };
    const candidate = {
      dxCall: 'PJ2/W9WI',
      freq: '14.074',
      spotter: 'K1ABC',
      timestamp: now,
    };

    expect(areDXPathsDuplicate(existing, candidate, now)).toBe(false);
  });

  it('treats matching dx call, freq, and spotter inside the dedup window as duplicates', () => {
    const now = 1_700_000_000_000;
    const existing = {
      dxCall: 'PJ2/W9WI',
      freq: '14.074',
      spotter: 'N3FTO',
      timestamp: now - 30_000,
    };
    const candidate = {
      dxCall: 'PJ2/W9WI',
      freq: '14.074',
      spotter: 'N3FTO',
      timestamp: now,
    };

    expect(areDXPathsDuplicate(existing, candidate, now)).toBe(true);
  });
});
