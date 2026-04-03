import { describe, it, expect } from 'vitest';
import { gmstFromJD, gmstDeg } from '../coordinates/gmst';
import { J2000_JD } from '../ephemeris/constants';

const TWO_PI = 2 * Math.PI;

describe('gmstFromJD', () => {
  it('returns value in [0, 2π)', () => {
    for (const jd of [J2000_JD, 2_461_132.441111111, 2_461_137.0, 2_440_587.5]) {
      const g = gmstFromJD(jd);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThan(TWO_PI);
    }
  });

  it('J2000 epoch GMST = 280.46061837° = 4.8950 rad (IAU 1982, known value)', () => {
    // Standard reference: GMST at J2000.0 (2000-01-01 12:00 UT) = 280.46061837°
    const g = gmstFromJD(J2000_JD);
    expect(g).toBeCloseTo(4.8950, 3); // 280.46° × π/180 = 4.8950 rad
  });

  it('advances by ~2π per sidereal day (86164.09 s)', () => {
    const jd = 2_461_133.0;
    const siderealDayJD = 86164.09054 / 86400;
    const g1 = gmstFromJD(jd);
    const g2 = gmstFromJD(jd + siderealDayJD);
    // g2 should be within tiny epsilon of g1 (wraps back to same angle)
    const diff = Math.abs(((g2 - g1 + Math.PI) % TWO_PI) - Math.PI);
    expect(diff).toBeLessThan(1e-4); // < 0.006°
  });

  it('rate ≈ 0.26252 rad/hr (sidereal rate)', () => {
    const jd = 2_461_133.0;
    const dt = 1 / 24; // 1 hour in JD
    const g1 = gmstFromJD(jd);
    // compute unwrapped advance
    let dg = gmstFromJD(jd + dt) - g1;
    if (dg < 0) dg += TWO_PI;
    expect(dg).toBeCloseTo(0.26252, 4);
  });

  it('consistent with gmstDeg (× 180/π)', () => {
    const jd = 2_461_133.0;
    const rad = gmstFromJD(jd);
    const deg = gmstDeg(jd);
    expect(deg).toBeCloseTo((rad * 180) / Math.PI, 10);
  });
});
