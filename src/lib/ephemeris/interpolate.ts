import type { Vec3 } from '../coordinates/types';

/** Pre-computed ephemeris data from Python pipeline */
export interface EphemerisData {
  startJD: number;
  intervalHours: number;
  count: number;
  timeScale?: string;
  coordinateFrame?: string;
  barycentricFrame?: string;
  earthRotationModel?: string;
  moonOrientationModel?: string;
  /** Moon positions in GCRS J2000 (km) */
  moonPosECI: Vec3[];
  /** Sun positions in GCRS J2000 (km) */
  sunPosECI: Vec3[];
  /** Mercury positions in GCRS J2000 (km) */
  mercuryPosECI: Vec3[];
  /** Venus positions in GCRS J2000 (km) */
  venusPosECI: Vec3[];
  /** Mars positions in GCRS J2000 (km) */
  marsPosECI: Vec3[];
  /** Jupiter positions in GCRS J2000 (km) */
  jupiterPosECI: Vec3[];
  /** Saturn positions in GCRS J2000 (km) */
  saturnPosECI: Vec3[];
  gmstRad: number[];
  moonOrientation: [number, number, number][];
  /**
   * Earth position in BCRS J2000 (km from Solar System Barycenter).
   * Used to shift origin from GCRS→BCRS for the reference frame selector.
   * Optional: absent in older ephemeris files (BCRS frame will be unavailable).
   */
  earthPosBCRS?: Vec3[];
}

/** Pre-computed trajectory data from Python pipeline */
export interface TrajectoryData {
  /** Start Julian Date */
  startJD: number;
  /** End Julian Date */
  endJD: number;
  timeScale?: string;
  coordinateFrame?: string;
  sourceTimeScale?: string;
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
  mercuryPosECI: Vec3;
  venusPosECI: Vec3;
  marsPosECI: Vec3;
  jupiterPosECI: Vec3;
  saturnPosECI: Vec3;
  gmstRad: number;
  moonOrientation: [number, number, number];
  /** Earth position in BCRS J2000 (km from SSB). Null if not in ephemeris data. */
  earthPosBCRS: Vec3 | null;
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
const TWO_PI = 2 * Math.PI;

export function interpolateEphemeris(data: EphemerisData, jd: number): EphemerisState {
  const step = data.intervalHours / 24; // in JD days
  const raw = (jd - data.startJD) / step;
  const idx = Math.floor(raw);
  const t = raw - idx;
  const clampedIdx = Math.max(0, Math.min(data.count - 2, idx));

  // GMST is stored unwrapped (monotonically increasing) for correct Catmull-Rom interpolation.
  // Normalize back to [0, 2π) after interpolating.
  const gmstRaw = interpAngle(data.gmstRad, data.count, clampedIdx, t);
  const gmstRad = ((gmstRaw % TWO_PI) + TWO_PI) % TWO_PI;

  // Moon W is also stored unwrapped — normalize back to [0°, 360°) after interpolating.
  const moonOrientRaw = interpVec3(
    data.moonOrientation as unknown as Vec3[],
    data.count,
    clampedIdx,
    t,
  ) as unknown as [number, number, number];
  const moonOrientation: [number, number, number] = [
    moonOrientRaw[0],
    moonOrientRaw[1],
    ((moonOrientRaw[2] % 360) + 360) % 360,
  ];

  return {
    moonPosECI: interpVec3(data.moonPosECI, data.count, clampedIdx, t),
    sunPosECI: interpVec3(data.sunPosECI, data.count, clampedIdx, t),
    mercuryPosECI: interpVec3(data.mercuryPosECI, data.count, clampedIdx, t),
    venusPosECI: interpVec3(data.venusPosECI, data.count, clampedIdx, t),
    marsPosECI: interpVec3(data.marsPosECI, data.count, clampedIdx, t),
    jupiterPosECI: interpVec3(data.jupiterPosECI, data.count, clampedIdx, t),
    saturnPosECI: interpVec3(data.saturnPosECI, data.count, clampedIdx, t),
    gmstRad,
    moonOrientation,
    earthPosBCRS: data.earthPosBCRS
      ? interpVec3(data.earthPosBCRS, data.count, clampedIdx, t)
      : null,
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
