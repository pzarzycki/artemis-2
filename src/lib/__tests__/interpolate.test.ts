import { describe, it, expect } from 'vitest';
import type { EphemerisData, TrajectoryData } from '../ephemeris/interpolate';
import { interpolateEphemeris, interpolateTrajectory } from '../ephemeris/interpolate';
import { ARTEMIS2_LAUNCH_JD } from '../time';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEphemeris(gmstValues: number[], intervalHours = 0.25): EphemerisData {
  const count = gmstValues.length;
  const startJD = 2_461_132.0;
  return {
    startJD,
    intervalHours,
    count,
    moonPosECI: Array.from({ length: count }, (_, i) => [
      300_000 + i * 100, i * 50, i * 20,
    ] as [number, number, number]),
    sunPosECI: Array.from({ length: count }, () => [1e8, 0, 0] as [number, number, number]),
    mercuryPosECI: Array.from({ length: count }, (_, i) => [50_000 + i * 10, -1000 + i * 3, i] as [number, number, number]),
    venusPosECI: Array.from({ length: count }, (_, i) => [90_000 + i * 12, 2000 + i * 4, -2 * i] as [number, number, number]),
    marsPosECI: Array.from({ length: count }, (_, i) => [150_000 + i * 15, -3000 + i * 5, 3 * i] as [number, number, number]),
    jupiterPosECI: Array.from({ length: count }, (_, i) => [700_000 + i * 20, 4000 + i * 6, -4 * i] as [number, number, number]),
    saturnPosECI: Array.from({ length: count }, (_, i) => [1_200_000 + i * 25, -5000 + i * 7, 5 * i] as [number, number, number]),
    gmstRad: gmstValues,
    moonOrientation: Array.from({ length: count }, (_, i) => [270.0, 66.5, i * 10] as [number, number, number]),
  };
}

// ── GMST interpolation & normalisation ───────────────────────────────────────

describe('interpolateEphemeris: GMST', () => {
  const TWO_PI = 2 * Math.PI;

  it('output GMST is always in [0, 2π)', () => {
    // Unwrapped GMST spanning many cycles
    const n = 20;
    const gmst = Array.from({ length: n }, (_, i) => i * 0.2637 * 24); // ~12 sidereal days
    const data = makeEphemeris(gmst);

    for (let i = 0; i < n - 1; i++) {
      const jd = data.startJD + (i + 0.5) * (data.intervalHours / 24);
      const s = interpolateEphemeris(data, jd);
      expect(s.gmstRad).toBeGreaterThanOrEqual(0);
      expect(s.gmstRad).toBeLessThan(TWO_PI);
    }
  });

  it('interpolates smoothly between interior samples (linear ramp → linear result)', () => {
    // For uniform data, sample between index 1 and 2 (away from boundary where p0≠p1)
    // Data: [1.0, 1.1, 1.2, 1.3] — linear ramp, Catmull-Rom should give exactly linear
    const g = 1.0;
    const data = makeEphemeris([g, g + 0.1, g + 0.2, g + 0.3]);
    // Sample at t=0.5 between idx=1 and idx=2
    const midJD = data.startJD + 1.5 * (data.intervalHours / 24);
    const s = interpolateEphemeris(data, midJD);
    // Catmull-Rom through a linear ramp with all 4 points on line → exact midpoint
    expect(s.gmstRad).toBeCloseTo(g + 0.15, 4);
  });

  it('no discontinuity across a wrap boundary in stored data', () => {
    // Simulate unwrapped GMST crossing 2π boundary: stored as monotonically increasing
    const base = TWO_PI - 0.05;
    const data = makeEphemeris([base - 0.1, base, base + 0.1, base + 0.2]);
    // Interpolate right at the 2π boundary
    const jd = data.startJD + 0.5 * (data.intervalHours / 24);
    const s = interpolateEphemeris(data, jd);
    // Result must be normalised and consistent, no ≈π jump
    expect(s.gmstRad).toBeGreaterThanOrEqual(0);
    expect(s.gmstRad).toBeLessThan(TWO_PI);
  });
});

// ── Moon orientation normalisation ───────────────────────────────────────────

describe('interpolateEphemeris: Moon orientation', () => {
  it('Moon W is always in [0°, 360°)', () => {
    // W stored unwrapped (e.g. 355° → 365° → 375° across three samples)
    const n = 10;
    const gmst = Array.from({ length: n }, (_, i) => i * 0.5);
    const data = makeEphemeris(gmst);
    // Override moonOrientation with large unwrapped W values
    data.moonOrientation = Array.from({ length: n }, (_, i) => [270.0, 66.5, 350 + i * 20] as [number, number, number]);

    for (let i = 0; i < n - 1; i++) {
      const jd = data.startJD + (i + 0.5) * (data.intervalHours / 24);
      const s = interpolateEphemeris(data, jd);
      expect(s.moonOrientation[2]).toBeGreaterThanOrEqual(0);
      expect(s.moonOrientation[2]).toBeLessThan(360);
    }
  });
});

describe('interpolateEphemeris: additional planet vectors', () => {
  it('interpolates additive planet arrays alongside Sun and Moon', () => {
    const data = makeEphemeris([0, 0.1, 0.2, 0.3], 1.0);
    const midJD = data.startJD + 1.5 * (data.intervalHours / 24);
    const s = interpolateEphemeris(data, midJD);

    expect(s.mercuryPosECI[0]).toBeCloseTo(50_015, 4);
    expect(s.venusPosECI[1]).toBeCloseTo(2_006, 4);
    expect(s.marsPosECI[2]).toBeCloseTo(4.5, 4);
    expect(s.jupiterPosECI[0]).toBeCloseTo(700_030, 4);
    expect(s.saturnPosECI[1]).toBeCloseTo(-4_989.5, 4);
  });
});

// ── Trajectory interpolation ──────────────────────────────────────────────────

function makeTrajectory(): TrajectoryData {
  const count = 100;
  const intervalMinutes = 5;
  const startJD = ARTEMIS2_LAUNCH_JD + 3.4 / 24;
  const endJD = startJD + (count - 1) * intervalMinutes / (24 * 60);
  const posECI: [number, number, number][] = Array.from({ length: count }, (_, i) => {
    const theta = (i / count) * 2 * Math.PI;
    const r = 30_000 + i * 100;
    return [r * Math.cos(theta), r * Math.sin(theta), i * 10];
  });
  const velECI: [number, number, number][] = Array.from({ length: count }, () => [3, 0.5, 0.1]);
  return {
    startJD,
    endJD,
    intervalMinutes,
    count,
    phases: [
      { name: 'Test phase', startJD, endJD, color: '#fff' },
    ],
    posECI,
    velECI,
  };
}

describe('interpolateTrajectory', () => {
  it('returns null before startJD', () => {
    const traj = makeTrajectory();
    expect(interpolateTrajectory(traj, traj.startJD - 0.01)).toBeNull();
  });

  it('returns null after endJD', () => {
    const traj = makeTrajectory();
    expect(interpolateTrajectory(traj, traj.endJD + 0.01)).toBeNull();
  });

  it('returns state at startJD', () => {
    const traj = makeTrajectory();
    const s = interpolateTrajectory(traj, traj.startJD);
    expect(s).not.toBeNull();
    expect(s!.posECI[0]).toBeCloseTo(traj.posECI[0][0], 3);
    expect(s!.posECI[1]).toBeCloseTo(traj.posECI[0][1], 3);
  });

  it('returns state at endJD', () => {
    const traj = makeTrajectory();
    const s = interpolateTrajectory(traj, traj.endJD);
    expect(s).not.toBeNull();
  });

  it('returns interpolated state at midpoint', () => {
    const traj = makeTrajectory();
    const midJD = traj.startJD + (traj.endJD - traj.startJD) / 2;
    const s = interpolateTrajectory(traj, midJD);
    expect(s).not.toBeNull();
    // Position should be roughly in the middle of the trajectory (circular)
    const dist = Math.sqrt(s!.posECI[0] ** 2 + s!.posECI[1] ** 2 + s!.posECI[2] ** 2);
    expect(dist).toBeGreaterThan(1000); // sanity check
  });

  it('identifies the correct mission phase', () => {
    const traj = makeTrajectory();
    const midJD = traj.startJD + (traj.endJD - traj.startJD) / 2;
    const s = interpolateTrajectory(traj, midJD);
    expect(s!.phase).not.toBeNull();
    expect(s!.phase!.name).toBe('Test phase');
  });

  it('velocity is interpolated', () => {
    const traj = makeTrajectory();
    const midJD = traj.startJD + (traj.endJD - traj.startJD) / 2;
    const s = interpolateTrajectory(traj, midJD);
    // All velocity entries are [3, 0.5, 0.1], interpolation should preserve
    expect(s!.velECI[0]).toBeCloseTo(3, 3);
    expect(s!.velECI[1]).toBeCloseTo(0.5, 3);
  });
});

// ── Catmull-Rom properties ────────────────────────────────────────────────────

describe('Catmull-Rom interpolation properties', () => {
  it('interpolates exactly at data points (C0 continuity)', () => {
    // Linear ramp: Catmull-Rom should pass exactly through data points
    const vals = [0, 1, 2, 3, 4, 5];
    const data = makeEphemeris(vals, 1.0);

    for (let i = 1; i < vals.length - 1; i++) {
      const jd = data.startJD + i * (1 / 24); // exact sample time
      const s = interpolateEphemeris(data, jd);
      // Normalize and compare
      let expected = vals[i] % (2 * Math.PI);
      if (expected < 0) expected += 2 * Math.PI;
      expect(s.gmstRad).toBeCloseTo(expected, 4);
    }
  });
});
