import { describe, it, expect } from 'vitest';
import {
  eciToEcef, ecefToEci,
  eciToEcliptic, eclipticToEci,
  eciToGeographic, normalize, length,
} from '../coordinates/transforms';
import { OBLIQUITY_J2000_RAD } from '../ephemeris/constants';
import type { Vec3 } from '../coordinates/types';

describe('eciToEcef / ecefToEci round-trip', () => {
  const cases: Array<{ label: string; pos: Vec3; gmst: number }> = [
    { label: 'GMST=0, on X axis', pos: [7000, 0, 0], gmst: 0 },
    { label: 'GMST=π/2', pos: [7000, 3000, 500], gmst: Math.PI / 2 },
    { label: 'GMST=π', pos: [-5000, 2000, 6000], gmst: Math.PI },
    { label: 'GMST=2π (same as 0)', pos: [1000, 2000, 3000], gmst: 2 * Math.PI },
    { label: 'KSC position in ECI', pos: [1518.5, -5167.4, 3431.0], gmst: 1.23456 },
  ];

  for (const { label, pos, gmst } of cases) {
    it(`round-trip: ${label}`, () => {
      const ecef = eciToEcef(pos, gmst);
      const back = ecefToEci(ecef, gmst);
      expect(back[0]).toBeCloseTo(pos[0], 8);
      expect(back[1]).toBeCloseTo(pos[1], 8);
      expect(back[2]).toBeCloseTo(pos[2], 8);
    });

    it(`preserves vector length: ${label}`, () => {
      const ecef = eciToEcef(pos, gmst);
      expect(length(ecef)).toBeCloseTo(length(pos), 8);
    });
  }

  it('GMST=0: ECI X axis → ECEF X axis (prime meridian aligned)', () => {
    const ecef = eciToEcef([7000, 0, 0], 0);
    expect(ecef[0]).toBeCloseTo(7000, 6);
    expect(ecef[1]).toBeCloseTo(0, 6);
    expect(ecef[2]).toBeCloseTo(0, 6);
  });

  it('GMST=π/2: ECI X → ECEF -Y', () => {
    const ecef = eciToEcef([1, 0, 0], Math.PI / 2);
    expect(ecef[0]).toBeCloseTo(0, 6);
    expect(ecef[1]).toBeCloseTo(-1, 6); // rotZ(π/2) maps X → -Y
    expect(ecef[2]).toBeCloseTo(0, 6);
  });

  it('Z component unchanged by GMST rotation', () => {
    const pos: Vec3 = [3000, 4000, 5678];
    const ecef = eciToEcef(pos, 1.234);
    expect(ecef[2]).toBeCloseTo(pos[2], 10);
  });
});

describe('eciToEcliptic / eclipticToEci round-trip', () => {
  it('round-trip preserves vector', () => {
    const pos: Vec3 = [100_000, 50_000, 25_000];
    const ecl = eciToEcliptic(pos);
    const back = eclipticToEci(ecl);
    expect(back[0]).toBeCloseTo(pos[0], 8);
    expect(back[1]).toBeCloseTo(pos[1], 8);
    expect(back[2]).toBeCloseTo(pos[2], 8);
  });

  it('obliquity rotation: ECI Y → Ecliptic (Y cos ε, Z -sin ε)', () => {
    // rotX(ε) applied to (0,1,0): y' = cos(ε), z' = -sin(ε)
    const pos: Vec3 = [0, 1, 0];
    const ecl = eciToEcliptic(pos);
    const cosE = Math.cos(OBLIQUITY_J2000_RAD);
    const sinE = Math.sin(OBLIQUITY_J2000_RAD);
    expect(ecl[0]).toBeCloseTo(0, 10);
    expect(ecl[1]).toBeCloseTo(cosE, 10);
    expect(ecl[2]).toBeCloseTo(-sinE, 10);
  });

  it('ECI Z (north pole) → Ecliptic (Y sin ε, Z cos ε)', () => {
    // rotX(ε) applied to (0,0,1): y' = sin(ε), z' = cos(ε)
    const pos: Vec3 = [0, 0, 1];
    const ecl = eciToEcliptic(pos);
    const cosE = Math.cos(OBLIQUITY_J2000_RAD);
    const sinE = Math.sin(OBLIQUITY_J2000_RAD);
    expect(ecl[0]).toBeCloseTo(0, 10);
    expect(ecl[1]).toBeCloseTo(sinE, 10);
    expect(ecl[2]).toBeCloseTo(cosE, 10);
  });

  it('Sun at vernal equinox: ECI ≈ Ecliptic (X axis, no rotation effect)', () => {
    const sunAtEquinox: Vec3 = [149_597_870.7, 0, 0];
    const ecl = eciToEcliptic(sunAtEquinox);
    // X unchanged; Y and Z ≈ 0
    expect(ecl[0]).toBeCloseTo(149_597_870.7, 1);
    expect(ecl[1]).toBeCloseTo(0, 6);
    expect(ecl[2]).toBeCloseTo(0, 6);
  });
});

describe('eciToGeographic', () => {
  it('KSC approximate location: lat~28.6°, lon~-80.6°', () => {
    // KSC Launch Complex 39A: 28.6082°N, 80.6041°W (sea level)
    // ECEF position (computed from lat/lon/alt=0):
    const lat = 28.6082 * Math.PI / 180;
    const lon = -80.6041 * Math.PI / 180;
    const R = 6371.0;
    const kscEcef: Vec3 = [
      R * Math.cos(lat) * Math.cos(lon),
      R * Math.cos(lat) * Math.sin(lon),
      R * Math.sin(lat),
    ];
    const result = eciToGeographic(kscEcef, 0); // GMST=0 → ECI=ECEF
    expect(result.lat).toBeCloseTo(28.6, 1);
    expect(result.lon).toBeCloseTo(-80.6, 1);
    expect(result.alt).toBeCloseTo(0, 3);
  });

  it('altitude at Earth surface ≈ 0', () => {
    const surfacePos: Vec3 = [6371, 0, 0];
    const result = eciToGeographic(surfacePos, 0);
    expect(result.alt).toBeCloseTo(0, 3);
  });

  it('altitude 400 km above equator', () => {
    const orbPos: Vec3 = [6771, 0, 0]; // 400 km + 6371
    const result = eciToGeographic(orbPos, 0);
    expect(result.alt).toBeCloseTo(400, 3);
    expect(result.lat).toBeCloseTo(0, 3);
  });

  it('north pole: lat ≈ 90°', () => {
    const np: Vec3 = [0, 0, 6371];
    const result = eciToGeographic(np, 0);
    expect(result.lat).toBeCloseTo(90, 1);
  });
});

describe('normalize', () => {
  it('unit vector remains unit', () => {
    const v: Vec3 = [1, 0, 0];
    const n = normalize(v);
    expect(length(n)).toBeCloseTo(1, 10);
  });

  it('general vector has length 1 after normalize', () => {
    const v: Vec3 = [3, 4, 5];
    const n = normalize(v);
    expect(length(n)).toBeCloseTo(1, 10);
  });

  it('zero vector returns safe fallback', () => {
    const n = normalize([0, 0, 0]);
    expect(length(n)).toBeCloseTo(1, 10);
  });
});
