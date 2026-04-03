import type { Vec3, Mat3 } from './types';
import { OBLIQUITY_J2000_RAD } from '../ephemeris/constants';

/** Dot product of two 3-vectors */
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Apply a 3×3 rotation matrix (row-major) to a vector */
function matVec(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/**
 * Rotation matrix around Z by angle θ (radians)
 * Used for ECI ↔ ECEF (GMST rotation).
 */
export function rotZ(theta: number): Mat3 {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [c, s, 0, -s, c, 0, 0, 0, 1];
}

/**
 * Rotation matrix around X by angle θ (radians)
 * Used for ECI ↔ Ecliptic (obliquity rotation).
 */
export function rotX(theta: number): Mat3 {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [1, 0, 0, 0, c, s, 0, -s, c];
}

/** Transpose a 3×3 matrix */
export function transpose(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

/**
 * Convert ECI J2000 → ECEF.
 * @param pos Position in ECI (km)
 * @param gmst Greenwich Mean Sidereal Time (radians)
 */
export function eciToEcef(pos: Vec3, gmst: number): Vec3 {
  return matVec(rotZ(gmst), pos);
}

/**
 * Convert ECEF → ECI J2000.
 * @param pos Position in ECEF (km)
 * @param gmst Greenwich Mean Sidereal Time (radians)
 */
export function ecefToEci(pos: Vec3, gmst: number): Vec3 {
  return matVec(transpose(rotZ(gmst)), pos);
}

/**
 * Convert ECI J2000 → Ecliptic J2000.
 * Rotates by +obliquity around X axis.
 */
export function eciToEcliptic(pos: Vec3): Vec3 {
  return matVec(rotX(OBLIQUITY_J2000_RAD), pos);
}

/**
 * Convert Ecliptic J2000 → ECI J2000.
 */
export function eclipticToEci(pos: Vec3): Vec3 {
  return matVec(transpose(rotX(OBLIQUITY_J2000_RAD)), pos);
}

/** Normalize a vector to unit length */
export function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(dot(v, v));
  if (len === 0) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

/** Vector length */
export function length(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

/** Scale a vector */
export function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

/** Add two vectors */
export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** Convert ECI (km) to geographic (lat deg, lon deg, alt km) via ECEF */
export function eciToGeographic(
  pos: Vec3,
  gmst: number,
): { lat: number; lon: number; alt: number } {
  const ecef = eciToEcef(pos, gmst);
  const [x, y, z] = ecef;
  const EARTH_RADIUS = 6371.0;
  const lon = (Math.atan2(y, x) * 180) / Math.PI;
  const p = Math.sqrt(x * x + y * y);
  const lat = (Math.atan2(z, p) * 180) / Math.PI;
  const alt = Math.sqrt(x * x + y * y + z * z) - EARTH_RADIUS;
  return { lat, lon, alt };
}
