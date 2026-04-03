import { useState, useEffect } from 'react';
import type { EphemerisData, EphemerisState } from '../lib/ephemeris/interpolate';
import { interpolateEphemeris } from '../lib/ephemeris/interpolate';
import { gmstFromJD } from '../lib/coordinates/gmst';
import { getMoonOrientation } from '../lib/coordinates/moonOrientation';
import type { Vec3 } from '../lib/coordinates/types';

let cachedData: EphemerisData | null = null;
let fetchPromise: Promise<EphemerisData> | null = null;

async function loadEphemeris(): Promise<EphemerisData> {
  if (cachedData) return cachedData;
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch('/data/ephemeris.json')
    .then((r) => r.json())
    .then((d) => { cachedData = d; return d; });
  return fetchPromise;
}

/** Fallback ephemeris using analytical approximations (no data file needed) */
function analyticalEphemeris(jd: number): EphemerisState {
  // Simplified Moon position (good to ~0.5°)
  const d = jd - 2_451_545.0;
  const L = (218.316 + 13.176396 * d) * (Math.PI / 180);
  const M = (134.963 + 13.064993 * d) * (Math.PI / 180);
  const F = (93.272 + 13.229350 * d) * (Math.PI / 180);
  const lon = L + (6.289 * Math.sin(M)) * (Math.PI / 180);
  const lat = (5.128 * Math.sin(F)) * (Math.PI / 180);
  const dist = 385_001 - 20_905 * Math.cos(M); // km
  const moonPosECI: Vec3 = [
    dist * Math.cos(lat) * Math.cos(lon),
    dist * Math.cos(lat) * Math.sin(lon),
    dist * Math.sin(lat),
  ];

  // Simplified Sun position
  const g = (357.529 + 0.98560028 * d) * (Math.PI / 180);
  const q = 280.459 + 0.98564736 * d;
  const eLon = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * (Math.PI / 180);
  const eps = 23.439 * (Math.PI / 180);
  const R = 1.00014 - 0.01671 * Math.cos(g) - 0.00014 * Math.cos(2 * g);
  const AU = 149_597_870.7;
  const sunPosECI: Vec3 = [
    R * AU * Math.cos(eLon),
    R * AU * Math.cos(eps) * Math.sin(eLon),
    R * AU * Math.sin(eps) * Math.sin(eLon),
  ];

  const orientation = getMoonOrientation(jd);
  return {
    moonPosECI,
    sunPosECI,
    gmstRad: gmstFromJD(jd),
    moonOrientation: [orientation.poleRA, orientation.poleDec, orientation.W],
    earthPosBCRS: null,
  };
}

export function useEphemeris(julianDate: number): EphemerisState {
  const [data, setData] = useState<EphemerisData | null>(null);

  useEffect(() => {
    loadEphemeris()
      .then(setData)
      .catch(() => { /* fall back to analytical */ });
  }, []);

  if (data) {
    // Check if JD is within data range
    const endJD = data.startJD + (data.count - 1) * (data.intervalHours / 24);
    if (julianDate >= data.startJD && julianDate <= endJD) {
      return interpolateEphemeris(data, julianDate);
    }
  }

  // Analytical fallback
  return analyticalEphemeris(julianDate);
}
