import { describe, it, expect } from 'vitest';
import {
  computeGravityProjection,
  computeNeutralRadius,
  computeGravityFieldMaxProj,
  GM_EARTH,
  GM_MOON,
} from '../gravity';

const MOON_DIST = 384_400; // km, nominal Earth-Moon distance

// ── computeGravityProjection ──────────────────────────────────────────────────

describe('computeGravityProjection', () => {
  it('is negative (towards Earth) well inside the neutral point', () => {
    // 100 000 km from Earth, far from Moon → Earth dominates
    const proj = computeGravityProjection([100_000, 0, 0], [MOON_DIST, 0, 0]);
    expect(proj).toBeLessThan(0);
  });

  it('is positive (towards Moon) just inside the Hill sphere near Moon', () => {
    // 5 000 km from Moon, between neutral point and Moon → Moon dominates
    const proj = computeGravityProjection([MOON_DIST - 5_000, 0, 0], [MOON_DIST, 0, 0]);
    expect(proj).toBeGreaterThan(0);
  });

  it('is approximately zero at the neutral point on the Earth-Moon axis', () => {
    const nr = computeNeutralRadius(MOON_DIST);
    const proj = computeGravityProjection([nr, 0, 0], [MOON_DIST, 0, 0]);
    // The closed-form neutral radius satisfies the balance exactly
    expect(Math.abs(proj)).toBeLessThan(1e-9);
  });

  it('is symmetric about the Earth-Moon axis', () => {
    // Rotating 90° about the Earth-Moon axis must not change the projection
    const p1 = computeGravityProjection([200_000, 50_000, 0], [MOON_DIST, 0, 0]);
    const p2 = computeGravityProjection([200_000, -50_000, 0], [MOON_DIST, 0, 0]);
    const p3 = computeGravityProjection([200_000, 0, 50_000], [MOON_DIST, 0, 0]);
    expect(p1).toBeCloseTo(p2, 12);
    expect(p1).toBeCloseTo(p3, 12);
  });

  it('returns 0 for a point at the Earth centre (degenerate)', () => {
    const proj = computeGravityProjection([0, 0, 0], [MOON_DIST, 0, 0]);
    expect(proj).toBe(0);
  });

  it('returns 0 for a point at the Moon centre (degenerate)', () => {
    const proj = computeGravityProjection(
      [MOON_DIST, 0, 0],
      [MOON_DIST, 0, 0],
    );
    expect(proj).toBe(0);
  });

  it('works when the Moon is not on the x-axis', () => {
    // Moon at 45° in the XY plane
    const md = MOON_DIST / Math.SQRT2;
    const moonPos: [number, number, number] = [md, md, 0];
    // Point on the Earth-Moon axis at half distance
    const proj = computeGravityProjection([md / 2, md / 2, 0], moonPos);
    // Earth gravity dominates at half the Moon distance
    expect(proj).toBeLessThan(0);
  });

  it('matches the analytic formula exactly on the Earth-Moon axis', () => {
    const r = 200_000; // km from Earth
    const proj = computeGravityProjection([r, 0, 0], [MOON_DIST, 0, 0]);

    // Manual: acc_moon (towards Moon) minus acc_earth (away from Moon)
    const dr = MOON_DIST - r;
    const expected = GM_MOON / (dr * dr) - GM_EARTH / (r * r);
    expect(proj).toBeCloseTo(expected, 12);
  });
});

// ── computeNeutralRadius ──────────────────────────────────────────────────────

describe('computeNeutralRadius', () => {
  it('is between Earth and Moon', () => {
    const nr = computeNeutralRadius(MOON_DIST);
    expect(nr).toBeGreaterThan(0);
    expect(nr).toBeLessThan(MOON_DIST);
  });

  it('is approximately 346 000 km for nominal Moon distance', () => {
    // Closed-form: r = moonDist · √(GM_EARTH/GM_MOON) / (1 + √(GM_EARTH/GM_MOON))
    // ≈ 384400 · 9.016 / 10.016 ≈ 346 024 km
    const nr = computeNeutralRadius(MOON_DIST);
    expect(nr).toBeGreaterThan(335_000);
    expect(nr).toBeLessThan(360_000);
  });

  it('scales proportionally as Moon distance changes', () => {
    const nr_near = computeNeutralRadius(MOON_DIST * 0.9);
    const nr_nom = computeNeutralRadius(MOON_DIST);
    const nr_far = computeNeutralRadius(MOON_DIST * 1.1);
    expect(nr_near).toBeLessThan(nr_nom);
    expect(nr_nom).toBeLessThan(nr_far);
  });

  it('satisfies the force-balance condition (gravity projection ≈ 0)', () => {
    const nr = computeNeutralRadius(MOON_DIST);
    const dr = MOON_DIST - nr;
    const balance = GM_MOON / (dr * dr) - GM_EARTH / (nr * nr);
    expect(Math.abs(balance)).toBeLessThan(1e-15);
  });
});

// ── computeGravityFieldMaxProj ────────────────────────────────────────────────

describe('computeGravityFieldMaxProj', () => {
  it('returns a positive finite value', () => {
    const max = computeGravityFieldMaxProj(MOON_DIST);
    expect(max).toBeGreaterThan(0);
    expect(isFinite(max)).toBe(true);
  });

  it('the neutral-point projection is smaller than maxProj (transition zone is unsaturated)', () => {
    const nr = computeNeutralRadius(MOON_DIST);
    const maxProj = computeGravityFieldMaxProj(MOON_DIST);

    // On the axis just inside the neutral point — value must be less than maxProj
    const nearNeutral = computeGravityProjection([nr - 5_000, 0, 0], [MOON_DIST, 0, 0]);
    expect(Math.abs(nearNeutral)).toBeLessThan(maxProj);
  });

  it('the near-Moon projection is larger than maxProj (region saturates to full blue)', () => {
    const maxProj = computeGravityFieldMaxProj(MOON_DIST);

    // 2 000 km from Moon – well inside the transition zone
    const nearMoon = computeGravityProjection([MOON_DIST - 2_000, 0, 0], [MOON_DIST, 0, 0]);
    expect(nearMoon).toBeGreaterThan(maxProj);
  });
});
