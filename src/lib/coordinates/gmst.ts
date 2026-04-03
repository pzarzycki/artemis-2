import { julianCenturies } from '../time';

/**
 * Greenwich Mean Sidereal Time (GMST) in radians.
 * Uses IAU 1982 formula.
 */
export function gmstFromJD(jd: number): number {
  // GMST in arc-seconds at 0h UT1 for the given Julian date
  const jd0 = Math.floor(jd - 0.5) + 0.5; // JD at preceding midnight
  const H = (jd - jd0) * 24; // hours past midnight
  const T0 = julianCenturies(jd0);
  const gmst0 =
    24110.54841 +
    8640184.812866 * T0 +
    0.093104 * T0 * T0 -
    6.2e-6 * T0 * T0 * T0;
  // Convert to radians: 24h = 2π, 86400s = 2π
  const gmstSeconds = gmst0 + 86636.55536790872 * (H / 24); // sidereal rate: 360.98564736629°/day × 240 s/°
  const gmstRad = ((gmstSeconds % 86400) / 86400) * 2 * Math.PI;
  return gmstRad < 0 ? gmstRad + 2 * Math.PI : gmstRad;
}

/** Convert GMST in radians to degrees */
export function gmstDeg(jd: number): number {
  return (gmstFromJD(jd) * 180) / Math.PI;
}
