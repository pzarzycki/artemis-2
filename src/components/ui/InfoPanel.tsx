import { useMissionTime } from '../../hooks/useMissionTime';
import { useTrajectory } from '../../hooks/useTrajectory';
import { useEphemeris } from '../../hooks/useEphemeris';
import { length, eciToGeographic } from '../../lib/coordinates/transforms';
import { EARTH_RADIUS_KM, MOON_RADIUS_KM } from '../../lib/ephemeris/constants';
import styles from './InfoPanel.module.css';

function fmt(n: number, decimals = 1): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

export default function InfoPanel() {
  const { julianDate } = useMissionTime();
  const { state, unavailable } = useTrajectory(julianDate);
  const ephemeris = useEphemeris(julianDate);

  if (unavailable || !state) {
    return (
      <div className={`${styles.panel} hud-panel`}>
        <div className={styles.title}>ORION / ARTEMIS II</div>
        <div className={styles.noData}>
          {unavailable ? 'Trajectory data unavailable' : 'Pre-launch'}
        </div>
      </div>
    );
  }

  const { posECI, velECI, phase } = state;
  const speed = length(velECI as [number, number, number]);
  const distToEarthCenter = length(posECI as [number, number, number]);
  const altEarth = distToEarthCenter - EARTH_RADIUS_KM;

  const moonVec: [number, number, number] = [
    posECI[0] - ephemeris.moonPosECI[0],
    posECI[1] - ephemeris.moonPosECI[1],
    posECI[2] - ephemeris.moonPosECI[2],
  ];
  const distToMoonCenter = length(moonVec);
  const altMoon = distToMoonCenter - MOON_RADIUS_KM;

  const geo = eciToGeographic(posECI as [number, number, number], ephemeris.gmstRad);

  return (
    <div className={`${styles.panel} hud-panel`}>
      <div className={styles.title}>
        ORION / ARTEMIS II
        {phase && <span className={styles.phase} style={{ borderColor: phase.color }}>{phase.name}</span>}
      </div>

      <div className={styles.grid}>
        <div className={styles.item}>
          <span className={styles.label}>Alt (Earth)</span>
          <span className={`${styles.value} mono`}>{fmt(altEarth)} km</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Alt (Moon)</span>
          <span className={`${styles.value} mono`}>{fmt(altMoon)} km</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Speed</span>
          <span className={`${styles.value} mono`}>{fmt(speed, 3)} km/s</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Dist Moon</span>
          <span className={`${styles.value} mono`}>{fmt(distToMoonCenter)} km</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Lat</span>
          <span className={`${styles.value} mono`}>{fmt(geo.lat, 2)}°</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Lon</span>
          <span className={`${styles.value} mono`}>{fmt(geo.lon, 2)}°</span>
        </div>
      </div>
    </div>
  );
}
