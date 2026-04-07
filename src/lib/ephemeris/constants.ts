/** Physical and mission constants — all distances in km, speeds in km/s, masses in kg */

export const EARTH_RADIUS_KM = 6371.0;
export const MOON_RADIUS_KM = 1737.4;

/** Semi-major axis of Moon's orbit (mean), km */
export const MOON_MEAN_DISTANCE_KM = 384_400;

/** 1 AU in km */
export const AU_KM = 149_597_870.7;

/** Sun radius in km */
export const SUN_RADIUS_KM = 695_700;

/** Mercury radius in km */
export const MERCURY_RADIUS_KM = 2_439.7;

/** Venus radius in km */
export const VENUS_RADIUS_KM = 6_051.8;

/** Mars radius in km */
export const MARS_RADIUS_KM = 3_389.5;

/** Jupiter equatorial radius in km */
export const JUPITER_RADIUS_KM = 71_492;

/** Saturn equatorial radius in km */
export const SATURN_RADIUS_KM = 60_268;

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

/** Orion Crew Module maximum diameter (m) */
export const ORION_CM_DIAMETER_M = 5.02;

/** Orion Crew Module overall height (m) */
export const ORION_CM_HEIGHT_M = 3.3;

/** Orion Crew Module forward docking tunnel diameter (m, approximate) */
export const ORION_CM_NOSE_DIAMETER_M = 1.3;

/** CM-ESM interface ring length (m, approximate visualized adapter section) */
export const ORION_INTERFACE_RING_LENGTH_M = 0.35;

/** Orion heat shield spherical-cap depth (m, approximate visual depth) */
export const ORION_HEAT_SHIELD_DEPTH_M = 0.55;

/** European Service Module diameter (m) */
export const ORION_ESM_DIAMETER_M = 4.1;

/** European Service Module body length (m) */
export const ORION_ESM_LENGTH_M = 2.7;

/** Main engine bell length (m, approximate visible nozzle) */
export const ORION_MAIN_ENGINE_LENGTH_M = 0.8;

/** Main engine exit diameter (m, approximate visible nozzle) */
export const ORION_MAIN_ENGINE_EXIT_DIAMETER_M = 0.9;

/** Solar array wing count */
export const ORION_SOLAR_WING_COUNT = 4;

/** Number of rectangular panels per deployed solar wing */
export const ORION_SOLAR_PANELS_PER_WING = 3;

/** Deployed length of each solar wing from root to tip (m) */
export const ORION_SOLAR_WING_LENGTH_M = 7.0;

/** Approximate width of each deployed solar wing (m) */
export const ORION_SOLAR_WING_WIDTH_M = 2.0;

/** Approximate panel thickness for the visual model (m) */
export const ORION_SOLAR_PANEL_THICKNESS_M = 0.05;

/** Approximate radial stand-off from the ESM hull to the array root (m) */
export const ORION_SOLAR_ROOT_OFFSET_M = 0.35;

/** Orion Crew Module maximum diameter (km) */
export const ORION_CM_DIAMETER_KM = ORION_CM_DIAMETER_M / 1000;

/** Orion Crew Module overall height (km) */
export const ORION_CM_HEIGHT_KM = ORION_CM_HEIGHT_M / 1000;

/** Orion Crew Module forward docking tunnel diameter (km) */
export const ORION_CM_NOSE_DIAMETER_KM = ORION_CM_NOSE_DIAMETER_M / 1000;

/** CM-ESM interface ring length (km) */
export const ORION_INTERFACE_RING_LENGTH_KM = ORION_INTERFACE_RING_LENGTH_M / 1000;

/** Orion heat shield spherical-cap depth (km) */
export const ORION_HEAT_SHIELD_DEPTH_KM = ORION_HEAT_SHIELD_DEPTH_M / 1000;

/** European Service Module diameter (km) */
export const ORION_ESM_DIAMETER_KM = ORION_ESM_DIAMETER_M / 1000;

/** European Service Module body length (km) */
export const ORION_ESM_LENGTH_KM = ORION_ESM_LENGTH_M / 1000;

/** Main engine bell length (km) */
export const ORION_MAIN_ENGINE_LENGTH_KM = ORION_MAIN_ENGINE_LENGTH_M / 1000;

/** Main engine exit diameter (km) */
export const ORION_MAIN_ENGINE_EXIT_DIAMETER_KM = ORION_MAIN_ENGINE_EXIT_DIAMETER_M / 1000;

/** Deployed length of each solar wing from root to tip (km) */
export const ORION_SOLAR_WING_LENGTH_KM = ORION_SOLAR_WING_LENGTH_M / 1000;

/** Approximate width of each deployed solar wing (km) */
export const ORION_SOLAR_WING_WIDTH_KM = ORION_SOLAR_WING_WIDTH_M / 1000;

/** Approximate panel thickness for the visual model (km) */
export const ORION_SOLAR_PANEL_THICKNESS_KM = ORION_SOLAR_PANEL_THICKNESS_M / 1000;

/** Approximate radial stand-off from the ESM hull to the array root (km) */
export const ORION_SOLAR_ROOT_OFFSET_KM = ORION_SOLAR_ROOT_OFFSET_M / 1000;

/** Obliquity of the ecliptic at J2000 epoch (radians) */
export const OBLIQUITY_J2000_RAD = 23.439_291_1 * (Math.PI / 180);

/** Three.js scene scale: 1 Three.js unit = 1 km */
export const SCENE_SCALE = 1.0;

/** Minimum spacecraft visual radius in scene units (for visibility at long range) */
export const SPACECRAFT_MIN_VISUAL_KM = 50;
