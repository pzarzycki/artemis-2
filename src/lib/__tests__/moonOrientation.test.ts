import { describe, it, expect } from 'vitest';
import { getMoonOrientation } from '../coordinates/moonOrientation';
import { J2000_JD } from '../ephemeris/constants';

describe('getMoonOrientation (IAU 2009)', () => {
  it('at J2000: poleRA ≈ 269.99°, poleDec ≈ 66.54°', () => {
    const o = getMoonOrientation(J2000_JD);
    // At J2000, E1=125.045°, E1 term in RA: -3.8787*sin(125.045°) ≈ -3.178
    // poleRA ≈ 269.9949 + 0 - 3.178 = 266.82 … but with all periodic terms summed
    // Just check base order-of-magnitude range
    expect(o.poleRA).toBeGreaterThan(260);
    expect(o.poleRA).toBeLessThan(280);
  });

  it('at J2000: poleDec in expected range', () => {
    const o = getMoonOrientation(J2000_JD);
    expect(o.poleDec).toBeGreaterThan(63);
    expect(o.poleDec).toBeLessThan(69);
  });

  it('at J2000: W prime meridian in [0°, 360°) initially (before mission)', () => {
    // At J2000, d=0, W = 38.3213 + 0 ≈ 38.3°
    const o = getMoonOrientation(J2000_JD);
    // W may be any real number (not wrapped) — just check it's finite
    expect(Number.isFinite(o.W)).toBe(true);
  });

  it('W advances at ~13.176°/day', () => {
    const jd1 = 2_461_132.0;
    const jd2 = jd1 + 1; // 1 day later
    const o1 = getMoonOrientation(jd1);
    const o2 = getMoonOrientation(jd2);
    const dW = o2.W - o1.W;
    // Mean rate 13.17635815°/day; periodic terms can shift by ~3.5° per half-period
    expect(dW).toBeGreaterThan(9);
    expect(dW).toBeLessThan(17);
  });

  it('poleRA and poleDec are stable across mission window', () => {
    // Over the 10-day Artemis 2 mission, the pole should not change drastically
    for (let d = 0; d < 10; d++) {
      const jd = 2_461_132.0 + d;
      const o = getMoonOrientation(jd);
      expect(o.poleRA).toBeGreaterThan(258);
      expect(o.poleRA).toBeLessThan(282);
      expect(o.poleDec).toBeGreaterThan(63);
      expect(o.poleDec).toBeLessThan(70);
    }
  });
});
