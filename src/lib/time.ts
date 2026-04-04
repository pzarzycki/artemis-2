import { J2000_JD } from './ephemeris/constants';

/** Convert a JavaScript Date to Julian Date */
export function toJulianDate(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

/** Convert a Julian Date to JavaScript Date */
export function fromJulianDate(jd: number): Date {
  return new Date((jd - 2_440_587.5) * 86_400_000);
}

/** Julian centuries since J2000 */
export function julianCenturies(jd: number): number {
  return (jd - J2000_JD) / 36_525;
}

/** Format a Date as "YYYY-MM-DD HH:MM:SS UTC" */
export function formatUTC(date: Date): string {
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

/**
 * Format Mission Elapsed Time in seconds as "T+dd HH:MM:SS"
 * Negative values are shown as "T-..."
 */
export function formatMET(seconds: number): string {
  const sign = seconds < 0 ? '-' : '+';
  const abs = Math.abs(seconds);
  const d = Math.floor(abs / 86_400);
  const h = Math.floor((abs % 86_400) / 3_600);
  const m = Math.floor((abs % 3_600) / 60);
  const s = Math.floor(abs % 60);
  if (d > 0) {
    return `T${sign}${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `T${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Artemis 2 actual launch epoch (Julian Date).
 * Launch: April 1, 2026 22:35:12 UTC
 * Computed: datetime(2026,4,1,22,35,12,UTC).timestamp()/86400 + 2440587.5
 */
export const ARTEMIS2_LAUNCH_JD = 2461132.441111111;
export const ARTEMIS2_DATA_START_JD = ARTEMIS2_LAUNCH_JD - 1;
export const ARTEMIS2_DATA_END_JD = ARTEMIS2_LAUNCH_JD + 11;

export function getDefaultMissionJD(now: Date = new Date()): number {
  const nowJD = toJulianDate(now);
  if (nowJD >= ARTEMIS2_DATA_START_JD && nowJD <= ARTEMIS2_DATA_END_JD) {
    return nowJD;
  }
  return ARTEMIS2_LAUNCH_JD;
}

/** Mission Elapsed Time in seconds from launch JD */
export function getMET(currentJD: number): number {
  return (currentJD - ARTEMIS2_LAUNCH_JD) * 86_400;
}
