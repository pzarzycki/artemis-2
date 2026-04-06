import { useMissionStore } from '../../store/missionStore';
import type { CameraTarget } from '../../store/missionStore';
import styles from './CameraPresets.module.css';

const PRESETS: { id: CameraTarget; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '⊛' },
  { id: 'earth',    label: 'Earth',    icon: '◉' },
  { id: 'moon',     label: 'Moon',     icon: '◌' },
  { id: 'spacecraft', label: 'Spacecraft', icon: '◈' },
];

export default function CameraPresets() {
  const { cameraTarget, setCameraTarget, clearCameraPointTarget } = useMissionStore();

  return (
    <div className={`${styles.group} hud-panel`}>
      {PRESETS.map(({ id, label, icon }) => (
        <button
          key={id}
          className={`${styles.btn} ${cameraTarget === id ? styles.active : ''}`}
          onClick={(event) => {
            clearCameraPointTarget();
            setCameraTarget(id, { preserveView: event.shiftKey });
          }}
          title={`${label}${cameraTarget === id ? '' : ' (Shift+click: keep current view)'}`}
        >
          <span className={styles.icon}>{icon}</span>
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </div>
  );
}
