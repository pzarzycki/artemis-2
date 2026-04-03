/** Coordinate frame identifiers */
export type Frame = 'ECI' | 'ECEF' | 'ECLIPTIC' | 'MOON_FIXED';
export const Frame = {
  ECI: 'ECI' as Frame,
  ECEF: 'ECEF' as Frame,
  ECLIPTIC: 'ECLIPTIC' as Frame,
  MOON_FIXED: 'MOON_FIXED' as Frame,
} as const;

/** 3-component vector (km or unit vector) */
export type Vec3 = [number, number, number];

/** 3×3 rotation matrix (row-major) */
export type Mat3 = [
  number, number, number,
  number, number, number,
  number, number, number,
];

/** A position with an associated reference frame */
export interface CoordPoint {
  pos: Vec3;
  frame: Frame;
}
