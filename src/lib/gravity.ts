// Gravitational constants (km³/s²)
export const GM_EARTH = 398600.4418;
export const GM_MOON = 4902.8;

// Physical radii (km)
export const EARTH_RADIUS_KM = 6371;
export const MOON_RADIUS_KM = 1737.4;

/**
 * Computes the net gravitational acceleration from Earth and Moon at a given
 * point, projected onto the Earth-Moon direction (unit vector from Earth to Moon).
 *
 * Positive result  → net force component towards Moon  (Moon dominates)
 * Negative result  → net force component towards Earth (Earth dominates)
 * Zero             → neutral point (L1 Lagrange point on the Earth-Moon axis)
 *
 * @param posKm     - Point position in Earth-centred coordinates (km)
 * @param moonPosKm - Moon position in Earth-centred coordinates (km)
 * @returns Projection of net gravitational acceleration onto the Earth-Moon
 *          axis (km/s²). Returns 0 for degenerate inputs.
 */
export function computeGravityProjection(
  posKm: [number, number, number],
  moonPosKm: [number, number, number],
): number {
  const [px, py, pz] = posKm;
  const [mx, my, mz] = moonPosKm;

  const r_earth = Math.sqrt(px * px + py * py + pz * pz);
  if (r_earth < 1) return 0;

  const dmx = mx - px;
  const dmy = my - py;
  const dmz = mz - pz;
  const r_moon = Math.sqrt(dmx * dmx + dmy * dmy + dmz * dmz);
  if (r_moon < 1) return 0;

  // Gravitational acceleration magnitudes (km/s²)
  const a_earth = GM_EARTH / (r_earth * r_earth);
  const a_moon = GM_MOON / (r_moon * r_moon);

  // Acceleration vectors (towards respective body)
  const aex = (-px / r_earth) * a_earth;
  const aey = (-py / r_earth) * a_earth;
  const aez = (-pz / r_earth) * a_earth;

  const amx = (dmx / r_moon) * a_moon;
  const amy = (dmy / r_moon) * a_moon;
  const amz = (dmz / r_moon) * a_moon;

  // Earth-Moon unit vector
  const moonDist = Math.sqrt(mx * mx + my * my + mz * mz);
  if (moonDist < 1) return 0;
  const ex = mx / moonDist;
  const ey = my / moonDist;
  const ez = mz / moonDist;

  // Net acceleration projected onto Earth-Moon direction
  return (aex + amx) * ex + (aey + amy) * ey + (aez + amz) * ez;
}

/**
 * Finds the "gravity neutral radius" – the distance from Earth along the
 * Earth-Moon axis at which the gravitational acceleration projections from
 * Earth and Moon are exactly equal in magnitude:
 *
 *   GM_MOON / (moonDist - r)² = GM_EARTH / r²
 *
 * This has a closed-form solution:
 *   r = moonDist · √(GM_EARTH/GM_MOON) / (1 + √(GM_EARTH/GM_MOON))
 *
 * (approximately 346 000 km for the nominal Moon distance of 384 400 km)
 *
 * Note: this is NOT the L1 Lagrange point, which is defined in the rotating
 * co-moving frame and includes the centrifugal term (~323 000 km for the
 * nominal Moon distance).
 *
 * @param moonDist - Earth-to-Moon distance (km)
 * @returns Neutral-point distance from Earth centre (km)
 */
export function computeNeutralRadius(moonDist: number): number {
  const k = Math.sqrt(GM_EARTH / GM_MOON); // ≈ 9.016
  return moonDist * k / (1 + k);
}

/**
 * Computes the colour-scale normalisation factor for the gravity-field
 * visualisation.  Values at ±maxProj saturate to full blue / full orange;
 * the L1 transition zone sits comfortably within the unsaturated range.
 *
 * Reference point: half-way between L1 and the Moon (inside the Hill sphere),
 * where the Moon's gravity just exceeds Earth's.
 *
 * @param moonDist - Earth-to-Moon distance (km)
 * @returns Normalisation constant (km/s²)
 */
export function computeGravityFieldMaxProj(moonDist: number): number {
  const rHill = moonDist * Math.cbrt(GM_MOON / (3 * GM_EARTH));
  // Reference point is halfway between L1 and Moon surface
  const refFromEarth = moonDist - rHill * 0.5;
  const refFromMoon = moonDist - refFromEarth; // = rHill * 0.5

  if (refFromEarth <= 0 || refFromMoon <= 0) return 1e-6;

  const earthGrav = GM_EARTH / (refFromEarth * refFromEarth);
  const moonGrav = GM_MOON / (refFromMoon * refFromMoon);

  return Math.max(Math.abs(moonGrav - earthGrav), 1e-9);
}
