// Gravitational constants (km³/s²)
export const GM_EARTH = 398600.4418;
export const GM_MOON = 4902.8;

// Physical radii (km)
export const EARTH_RADIUS_KM = 6371;
export const MOON_RADIUS_KM = 1737.4;

type Vec3 = [number, number, number];

export function computeNetGravityVector(posKm: Vec3, moonPosKm: Vec3): Vec3 {
  const [px, py, pz] = posKm;
  const [mx, my, mz] = moonPosKm;

  const rEarth = Math.sqrt(px * px + py * py + pz * pz);
  if (rEarth < 1) return [0, 0, 0];

  const dmx = mx - px;
  const dmy = my - py;
  const dmz = mz - pz;
  const rMoon = Math.sqrt(dmx * dmx + dmy * dmy + dmz * dmz);
  if (rMoon < 1) return [0, 0, 0];

  const aEarth = GM_EARTH / (rEarth * rEarth);
  const aMoon = GM_MOON / (rMoon * rMoon);

  return [
    (-px / rEarth) * aEarth + (dmx / rMoon) * aMoon,
    (-py / rEarth) * aEarth + (dmy / rMoon) * aMoon,
    (-pz / rEarth) * aEarth + (dmz / rMoon) * aMoon,
  ];
}

function computeBodyGravityMagnitudes(posKm: Vec3, moonPosKm: Vec3): { earth: number; moon: number } {
  const [px, py, pz] = posKm;
  const [mx, my, mz] = moonPosKm;

  const rEarth = Math.sqrt(px * px + py * py + pz * pz);
  if (rEarth < 1) return { earth: 0, moon: 0 };

  const dmx = mx - px;
  const dmy = my - py;
  const dmz = mz - pz;
  const rMoon = Math.sqrt(dmx * dmx + dmy * dmy + dmz * dmz);
  if (rMoon < 1) return { earth: 0, moon: 0 };

  return {
    earth: GM_EARTH / (rEarth * rEarth),
    moon: GM_MOON / (rMoon * rMoon),
  };
}

/**
 * Computes the net gravitational acceleration from Earth and Moon at a given
 * point, projected onto the Earth-Moon direction (unit vector from Earth to Moon).
 *
 * Positive result  → net force component towards Moon  (Moon dominates)
 * Negative result  → net force component towards Earth (Earth dominates)
 * Zero             → static gravity-balance point on the Earth-Moon axis
 *
 * @param posKm     - Point position in Earth-centred coordinates (km)
 * @param moonPosKm - Moon position in Earth-centred coordinates (km)
 * @returns Projection of net gravitational acceleration onto the Earth-Moon
 *          axis (km/s²). Returns 0 for degenerate inputs.
 */
export function computeGravityProjection(
  posKm: Vec3,
  moonPosKm: Vec3,
): number {
  const [gx, gy, gz] = computeNetGravityVector(posKm, moonPosKm);
  const [mx, my, mz] = moonPosKm;

  const moonDist = Math.sqrt(mx * mx + my * my + mz * mz);
  if (moonDist < 1) return 0;

  return (gx * mx + gy * my + gz * mz) / moonDist;
}

/**
 * Computes the magnitude of the combined Earth+Moon gravitational acceleration
 * at a point in Earth-centred coordinates.
 */
export function computeGravityMagnitude(posKm: Vec3, moonPosKm: Vec3): number {
  const [gx, gy, gz] = computeNetGravityVector(posKm, moonPosKm);
  return Math.sqrt(gx * gx + gy * gy + gz * gz);
}

/**
 * Classifies whether Earth's or Moon's individual gravitational influence is
 * stronger at the point.
 */
export function classifyGravityInfluence(posKm: Vec3, moonPosKm: Vec3): 'earth' | 'moon' | 'neutral' {
  const { earth, moon } = computeBodyGravityMagnitudes(posKm, moonPosKm);
  const difference = moon - earth;
  if (difference > 1e-10) return 'moon';
  if (difference < -1e-10) return 'earth';
  return 'neutral';
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
 * Computes the reference magnitude used to map total gravity strength into the
 * visual intensity range for the gravity-field shader.
 *
 * Reference point: half-way between the static neutral radius and the Moon.
 * The shader uses this as the half-intensity point in a saturating response,
 * so stronger fields still trend brighter without collapsing the whole Earth
 * side of the slice to a single flat colour.
 *
 * @param moonDist - Earth-to-Moon distance (km)
 * @returns Reference magnitude (km/s²)
 */
export function computeGravityFieldMagnitudeScale(moonDist: number): number {
  const neutralRadius = computeNeutralRadius(moonDist);
  const refFromEarth = neutralRadius + (moonDist - neutralRadius) * 0.5;
  if (refFromEarth <= 0 || refFromEarth >= moonDist) return 1e-6;

  return Math.max(
    computeGravityMagnitude([refFromEarth, 0, 0], [moonDist, 0, 0]),
    1e-9,
  );
}
