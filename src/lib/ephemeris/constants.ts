/** Physical and mission constants — all distances in km, speeds in km/s, masses in kg */

export const EARTH_RADIUS_KM = 6371.0;
export const MOON_RADIUS_KM = 1737.4;

/** Semi-major axis of Moon's orbit (mean), km */
export const MOON_MEAN_DISTANCE_KM = 384_400;

/** 1 AU in km */
export const AU_KM = 149_597_870.7;

/** Sun radius in km */
export const SUN_RADIUS_KM = 695_700;

/** Earth gravitational parameter (km³/s²) */
export const EARTH_GM = 398_600.4418;

/** Moon gravitational parameter (km³/s²) */
export const MOON_GM = 4_902.8001;

/** Sun gravitational parameter (km³/s²) */
export const SUN_GM = 132_712_440_018;

/** Speed of light (km/s) */
export const SPEED_OF_LIGHT_KM_S = 299_792.458;

/** J2000 epoch as Julian Date */
export const J2000_JD = 2_451_545.0;

/** Orion Command Module diameter (m) */
export const ORION_DIAMETER_M = 5.03;

/** Orion Service Module length (m) */
export const ORION_SM_LENGTH_M = 4.78;

/** Obliquity of the ecliptic at J2000 epoch (radians) */
export const OBLIQUITY_J2000_RAD = 23.439_291_1 * (Math.PI / 180);

/** Three.js scene scale: 1 Three.js unit = 1 km */
export const SCENE_SCALE = 1.0;

/** Minimum spacecraft visual radius in scene units (for visibility at long range) */
export const SPACECRAFT_MIN_VISUAL_KM = 50;
