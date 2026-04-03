import type { Vec3 } from '../coordinates/types';

/** Pre-computed ephemeris data from Python pipeline */
export interface EphemerisData {
  /** Start Julian Date of the series */
  startJD: number;
  /** Step size in hours */
  intervalHours: number;
  /** Number of samples */
  count: number;
  /** Moon positions in ECI J2000 (km), one entry per step */
  moonPosECI: Vec3[];
  /** Sun positions in ECI J2000 (km), one entry per step */
  sunPosECI: Vec3[];
  /** GMST angles (radians) at each step */
  gmstRad: number[];
  /**
   * Moon orientation [poleRA_deg, poleDec_deg, W_deg] per step.
   * Derived from IAU 2009 model.
   */
  moonOrientation: [number, number, number][];
}

/** Pre-computed trajectory data from Python pipeline */
export interface TrajectoryData {
  /** Start Julian Date */
  startJD: number;
  /** End Julian Date */
  endJD: number;
  /** Step size in minutes */
  intervalMinutes: number;
  /** Number of trajectory points */
  count: number;
  /** Mission phases */
  phases: MissionPhase[];
  /** Spacecraft positions in ECI J2000 (km) */
  posECI: Vec3[];
  /** Spacecraft velocities in ECI J2000 (km/s) */
  velECI: Vec3[];
}

export interface MissionPhase {
  name: string;
  /** Start Julian Date */
  startJD: number;
  /** End Julian Date */
  endJD: number;
  /** CSS-compatible color string for timeline display */
  color: string;
}

/** Interpolated state at a given epoch */
export interface SpacecraftState {
  posECI: Vec3;
  velECI: Vec3;
  phase: MissionPhase | null;
}

export interface EphemerisState {
  moonPosECI: Vec3;
  sunPosECI: Vec3;
  gmstRad: number;
  moonOrientation: [number, number, number];
}

/** Catmull-Rom cubic interpolation between four scalars */
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

function interpVec3(
  data: Vec3[],
  count: number,
  idx: number,
  t: number,
): Vec3 {
  const i0 = Math.max(0, idx - 1);
  const i1 = Math.min(count - 1, idx);
  const i2 = Math.min(count - 1, idx + 1);
  const i3 = Math.min(count - 1, idx + 2);
  return [
    catmullRom(data[i0][0], data[i1][0], data[i2][0], data[i3][0], t),
    catmullRom(data[i0][1], data[i1][1], data[i2][1], data[i3][1], t),
    catmullRom(data[i0][2], data[i1][2], data[i2][2], data[i3][2], t),
  ];
}

function interpAngle(
  data: number[],
  count: number,
  idx: number,
  t: number,
): number {
  const i0 = Math.max(0, idx - 1);
  const i1 = Math.min(count - 1, idx);
  const i2 = Math.min(count - 1, idx + 1);
  const i3 = Math.min(count - 1, idx + 2);
  return catmullRom(data[i0], data[i1], data[i2], data[i3], t);
}

/** Interpolate ephemeris data at the given Julian Date */
export function interpolateEphemeris(data: EphemerisData, jd: number): EphemerisState {
  const step = data.intervalHours / 24; // in JD days
  const raw = (jd - data.startJD) / step;
  const idx = Math.floor(raw);
  const t = raw - idx;
  const clampedIdx = Math.max(0, Math.min(data.count - 2, idx));

  return {
    moonPosECI: interpVec3(data.moonPosECI, data.count, clampedIdx, t),
    sunPosECI: interpVec3(data.sunPosECI, data.count, clampedIdx, t),
    gmstRad: interpAngle(data.gmstRad, data.count, clampedIdx, t),
    moonOrientation: interpVec3(
      data.moonOrientation as unknown as Vec3[],
      data.count,
      clampedIdx,
      t,
    ) as unknown as [number, number, number],
  };
}

/** Interpolate spacecraft trajectory at the given Julian Date */
export function interpolateTrajectory(
  data: TrajectoryData,
  jd: number,
): SpacecraftState | null {
  if (jd < data.startJD || jd > data.endJD) return null;

  const step = data.intervalMinutes / (24 * 60); // in JD days
  const raw = (jd - data.startJD) / step;
  const idx = Math.floor(raw);
  const t = raw - idx;
  const clampedIdx = Math.max(0, Math.min(data.count - 2, idx));

  const posECI = interpVec3(data.posECI, data.count, clampedIdx, t);
  const velECI = interpVec3(data.velECI, data.count, clampedIdx, t);
  const phase = data.phases.find(p => jd >= p.startJD && jd <= p.endJD) ?? null;

  return { posECI, velECI, phase };
}
