import Scene from '../scene/Scene';
import StatusBar from './StatusBar';
import Timeline from './Timeline';
import InfoPanel from './InfoPanel';
import CameraPresets from './CameraPresets';
import ModeToggle from './ModeToggle';
import styles from './Layout.module.css';

export default function Layout() {
  return (
    <div className={styles.root}>
      <div className={styles.canvas}>
        <Scene />
      </div>
      <div className={styles.hud}>
        <StatusBar />
        <div className={styles.sides}>
          <CameraPresets />
          <InfoPanel />
        </div>
        <div className={styles.bottom}>
          <ModeToggle />
          <Timeline />
        </div>
      </div>
    </div>
  );
}
