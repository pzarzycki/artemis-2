import { useMissionTime } from '../../hooks/useMissionTime';
import { useMissionStore } from '../../store/missionStore';
import styles from './StatusBar.module.css';

export default function StatusBar() {
  const { utcString, metString } = useMissionTime();
  const mode = useMissionStore((s) => s.mode);

  return (
    <div className={styles.bar}>
      <div className={styles.mission}>
        <span className={styles.logo}>◈</span>
        <span className={styles.name}>ARTEMIS II</span>
      </div>
      <div className={styles.times}>
        <div className={styles.timeItem}>
          <span className={styles.label}>UTC</span>
          <span className={`${styles.value} mono`}>{utcString}</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.timeItem}>
          <span className={styles.label}>MET</span>
          <span className={`${styles.value} mono`}>{metString}</span>
        </div>
      </div>
      <div className={styles.status}>
        {mode === 'live' && (
          <span className={styles.liveBadge}>
            <span className={styles.liveDot} />
            LIVE
          </span>
        )}
      </div>
    </div>
  );
}
