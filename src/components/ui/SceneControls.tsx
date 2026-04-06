import { useMissionStore } from '../../store/missionStore';
import styles from './SceneControls.module.css';

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={styles.option}>
      <span>{label}</span>
      <button
        type="button"
        className={styles.button}
        data-on={value}
        onClick={onToggle}
      >
        {value ? 'On' : 'Off'}
      </button>
    </div>
  );
}

export default function SceneControls() {
  const showStars = useMissionStore((s) => s.showStars);
  const showObjectAxes = useMissionStore((s) => s.showObjectAxes);
  const showTrajectory = useMissionStore((s) => s.showTrajectory);
  const showGravityField = useMissionStore((s) => s.showGravityField);
  const setShowStars = useMissionStore((s) => s.setShowStars);
  const setShowObjectAxes = useMissionStore((s) => s.setShowObjectAxes);
  const setShowTrajectory = useMissionStore((s) => s.setShowTrajectory);
  const setShowGravityField = useMissionStore((s) => s.setShowGravityField);

  return (
    <div className={`${styles.panel} hud-panel`}>
      <div className={styles.title}>Map</div>
      <ToggleRow label="Stars" value={showStars} onToggle={() => setShowStars(!showStars)} />
      <ToggleRow label="Axes" value={showObjectAxes} onToggle={() => setShowObjectAxes(!showObjectAxes)} />
      <ToggleRow label="Trajectory" value={showTrajectory} onToggle={() => setShowTrajectory(!showTrajectory)} />
      <ToggleRow label="Gravity Field" value={showGravityField} onToggle={() => setShowGravityField(!showGravityField)} />
    </div>
  );
}
