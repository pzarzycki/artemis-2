import { describe, it, expect } from 'vitest';
import { toJulianDate, fromJulianDate, julianCenturies, formatMET, getMET, ARTEMIS2_LAUNCH_JD } from '../time';

const J2000_JD = 2_451_545.0;

describe('toJulianDate / fromJulianDate', () => {
  it('J2000 epoch: 2000-01-01 12:00:00 UTC = JD 2451545.0', () => {
    const d = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    expect(toJulianDate(d)).toBeCloseTo(J2000_JD, 6);
  });

  it('Unix epoch: 1970-01-01 00:00:00 UTC = JD 2440587.5', () => {
    const d = new Date(0);
    expect(toJulianDate(d)).toBeCloseTo(2_440_587.5, 6);
  });

  it('Artemis 2 launch: 2026-04-01 22:35:12 UTC', () => {
    const d = new Date(Date.UTC(2026, 3, 1, 22, 35, 12));
    expect(toJulianDate(d)).toBeCloseTo(ARTEMIS2_LAUNCH_JD, 7);
  });

  it('round-trip JD → Date → JD with 1ms precision', () => {
    const jd = 2_461_133.5; // arbitrary mission-time JD
    const d = fromJulianDate(jd);
    expect(toJulianDate(d)).toBeCloseTo(jd, 8);
  });

  it('fromJulianDate: J2000 → 2000-01-01T12:00:00Z', () => {
    const d = fromJulianDate(J2000_JD);
    expect(d.getUTCFullYear()).toBe(2000);
    expect(d.getUTCMonth()).toBe(0); // January
    expect(d.getUTCDate()).toBe(1);
    expect(d.getUTCHours()).toBe(12);
    expect(d.getUTCMinutes()).toBe(0);
  });
});

describe('julianCenturies', () => {
  it('J2000 → T = 0', () => {
    expect(julianCenturies(J2000_JD)).toBeCloseTo(0, 10);
  });

  it('J2000 + 36525 days → T = 1 (one Julian century)', () => {
    expect(julianCenturies(J2000_JD + 36_525)).toBeCloseTo(1, 10);
  });

  it('Artemis 2 launch is ~26.24 Julian years after J2000', () => {
    const T = julianCenturies(ARTEMIS2_LAUNCH_JD);
    expect(T).toBeCloseTo(0.2624, 3);
  });
});

describe('getMET', () => {
  it('at launch JD → MET = 0 seconds', () => {
    expect(getMET(ARTEMIS2_LAUNCH_JD)).toBeCloseTo(0, 3);
  });

  it('MET at T+1 day = 86400 seconds', () => {
    expect(getMET(ARTEMIS2_LAUNCH_JD + 1)).toBeCloseTo(86_400, 2);
  });

  it('MET negative before launch', () => {
    expect(getMET(ARTEMIS2_LAUNCH_JD - 1 / 24)).toBeLessThan(0);
  });
});

describe('formatMET', () => {
  it('T+0 → T+00:00:00', () => {
    expect(formatMET(0)).toBe('T+00:00:00');
  });

  it('T+1 day → T+1d 00:00:00', () => {
    expect(formatMET(86_400)).toBe('T+1d 00:00:00');
  });

  it('T+25h 26m → T+1d 01:26:00', () => {
    expect(formatMET(25 * 3600 + 26 * 60)).toBe('T+1d 01:26:00');
  });

  it('negative T- format', () => {
    expect(formatMET(-3661)).toBe('T-01:01:01');
  });
});
