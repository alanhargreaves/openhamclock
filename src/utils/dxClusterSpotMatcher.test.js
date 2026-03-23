import { describe, expect, it } from 'vitest';
import { buildDXSpotKey, findDXPathForSpot, matchesDXSpotPath } from './dxClusterSpotMatcher.js';

describe('dxClusterSpotMatcher', () => {
  it('prefers a stable id when present', () => {
    expect(buildDXSpotKey({ id: 'pj2-w9wi-14.074-n3fto' })).toBe('pj2-w9wi-14.074-n3fto');
  });

  it('falls back to dx call, freq, and spotter identity', () => {
    expect(
      buildDXSpotKey({
        call: 'pj2/w9wi',
        freq: '14.074',
        spotter: 'n3fto',
      }),
    ).toBe('PJ2/W9WI|14.074|N3FTO');
  });

  it('matches the exact path for a spot with the same dx call and freq but different spotters', () => {
    const spot = {
      call: 'PJ2/W9WI',
      freq: '14.074',
      spotter: 'K1ABC',
    };
    const paths = [
      { dxCall: 'PJ2/W9WI', freq: '14.074', spotter: 'N3FTO', dxLat: 12, dxLon: -68 },
      { dxCall: 'PJ2/W9WI', freq: '14.074', spotter: 'K1ABC', dxLat: 12, dxLon: -68 },
    ];

    expect(matchesDXSpotPath(spot, paths[0])).toBe(false);
    expect(matchesDXSpotPath(spot, paths[1])).toBe(true);
    expect(findDXPathForSpot(paths, spot)).toEqual(paths[1]);
  });

  it('does not throw when call-like fields are non-strings', () => {
    const spot = {
      call: 12345,
      freq: 14074,
      spotter: null,
    };
    const path = {
      dxCall: 12345,
      freq: '14074',
      spotter: undefined,
    };

    expect(() => matchesDXSpotPath(spot, path)).not.toThrow();
    expect(matchesDXSpotPath(spot, path)).toBe(true);
  });

  it('returns false (no crash) when either argument is null', () => {
    const spot = { call: 'W1AW', freq: '14.074', spotter: 'K1ABC' };
    expect(() => matchesDXSpotPath(null, spot)).not.toThrow();
    expect(matchesDXSpotPath(null, spot)).toBe(false);
    expect(() => matchesDXSpotPath(spot, null)).not.toThrow();
    expect(matchesDXSpotPath(spot, null)).toBe(false);
    expect(() => buildDXSpotKey(null)).not.toThrow();
    expect(buildDXSpotKey(null)).toBe('');
  });
});
