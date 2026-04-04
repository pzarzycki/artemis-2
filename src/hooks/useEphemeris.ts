import type { EphemerisData, EphemerisState } from '../lib/ephemeris/interpolate';
import { interpolateEphemeris } from '../lib/ephemeris/interpolate';
import { assetUrl } from '../config/assets';

let cachedData: EphemerisData | null = null;
let fetchPromise: Promise<EphemerisData> | null = null;
let cachedError: Error | null = null;

async function loadEphemeris(): Promise<EphemerisData> {
  if (cachedData) return cachedData;
  if (cachedError) throw cachedError;
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch(assetUrl('assets/data/ephemeris.json'))
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load ephemeris.json: HTTP ${r.status}`);
      return r.json();
    })
    .then((d) => {
      cachedData = d;
      return d;
    })
    .catch((err: unknown) => {
      cachedError = err instanceof Error ? err : new Error('Failed to load ephemeris data');
      throw cachedError;
    });
  return fetchPromise;
}

export function useEphemeris(julianDate: number): EphemerisState {
  if (cachedError) throw cachedError;
  if (!cachedData) throw loadEphemeris();

  const data = cachedData;
  const endJD = data.startJD + (data.count - 1) * (data.intervalHours / 24);
  if (julianDate < data.startJD || julianDate > endJD) {
    throw new Error(
      `Julian date ${julianDate.toFixed(6)} is outside ephemeris coverage ` +
      `[${data.startJD.toFixed(6)}, ${endJD.toFixed(6)}]`,
    );
  }

  return interpolateEphemeris(data, julianDate);
}
