import { useMissionStore } from '../../store/missionStore';
import type { AnchorTarget } from '../../store/missionStore';
import styles from './CameraPresets.module.css';

const PRESETS: { id: AnchorTarget; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '⊛' },
  { id: 'earth',    label: 'Earth',    icon: '◉' },
  { id: 'moon',     label: 'Moon',     icon: '◌' },
  { id: 'spacecraft', label: 'Spacecraft', icon: '◈' },
];

export default function CameraPresets() {
  const { anchorTarget, setAnchorTarget, clearLookTarget } = useMissionStore();

  return (
    <div className={`${styles.group} hud-panel`}>
      {PRESETS.map(({ id, label, icon }) => (
        <button
          key={id}
          className={`${styles.btn} ${anchorTarget === id ? styles.active : ''}`}
          onClick={(event) => {
            clearLookTarget();
            setAnchorTarget(id, { preserveView: event.shiftKey });
          }}
          title={`${label}${anchorTarget === id ? '' : ' (Shift+click: keep current view)'}`}
        >
          <span className={styles.icon}>{icon}</span>
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </div>
  );
}
