import { useMissionStore } from '../../store/missionStore';
import styles from './ModeToggle.module.css';

export default function ModeToggle() {
  const { mode, setMode } = useMissionStore();

  return (
    <div className={`${styles.toggle} hud-panel`}>
      <button
        className={`${styles.btn} ${mode === 'live' ? styles.active : ''}`}
        onClick={() => setMode('live')}
      >
        {mode === 'live' && <span className={styles.dot} />}
        Live
      </button>
      <button
        className={`${styles.btn} ${mode === 'scrub' ? styles.active : ''}`}
        onClick={() => setMode('scrub')}
      >
        Scrub
      </button>
    </div>
  );
}
