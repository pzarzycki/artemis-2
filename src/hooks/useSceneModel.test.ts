import { describe, expect, it } from 'vitest';
import { getBodyWorldPosition } from './useSceneModel';

describe('getBodyWorldPosition', () => {
  it('returns the geocentric vector unchanged in GCRS', () => {
    expect(getBodyWorldPosition('GCRS', [1, 2, 3], [4, 5, 6])).toEqual([4, 5, 6]);
  });

  it('adds earth barycentric translation in BCRS', () => {
    expect(getBodyWorldPosition('BCRS', [10, 20, 30], [4, 5, 6])).toEqual([14, 25, 36]);
  });

  it('falls back to the geocentric vector when BCRS earth data is unavailable', () => {
    expect(getBodyWorldPosition('BCRS', null, [4, 5, 6])).toEqual([4, 5, 6]);
  });
});
